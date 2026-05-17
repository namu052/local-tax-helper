import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error("권한 확인 실패: " + error.message);
  if (!data || data.length === 0) throw new Error("담당 공무원 권한이 필요합니다");
}

type ChunkRow = {
  id: string;
  manual_volume_id: string;
  page_number: number | null;
  chunk_text: string | null;
  chunk_summary: string | null;
  tax_type: string | null;
  exemption_type: string | null;
  keywords: any;
};

const REVIEW_RESULTS = [
  "감면 가능성 있음",
  "추가 확인 필요",
  "보완 요청 필요",
  "감면 곤란 가능성 있음",
] as const;

const ReviewSchema = z.object({
  review_result: z.enum(REVIEW_RESULTS),
  summary: z.string(),
  possibility_reason: z.string(),
  missing_documents: z.object({
    not_submitted: z.array(z.string()).default([]),
    manual_required: z.array(z.string()).default([]),
    ai_suggested: z.array(z.string()).default([]),
  }),
  check_points: z.array(z.string()).default([]),
  officer_check_points: z.array(z.string()).default([]),
  draft_answer: z.string(),
  risk_level: z.enum(["낮음", "보통", "높음"]).default("보통"),
});

function tokenize(text: string): string[] {
  return (text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && w.length <= 20);
}

export const runAiReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string }) =>
    z.object({ applicationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);

    // 1. Load application
    const { data: app, error: appErr } = await supabaseAdmin
      .from("tax_applications")
      .select("*, applicants(name, phone), exemption_types(title, tax_type, description, required_documents, checklist_rules)")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (appErr || !app) throw new Error("신청 정보를 찾을 수 없습니다");

    // 2. Submitted documents
    const { data: docs } = await supabaseAdmin
      .from("application_documents")
      .select("document_name, is_submitted")
      .eq("application_id", data.applicationId);

    const submitted = (docs ?? []).filter((d) => d.is_submitted).map((d) => d.document_name);
    const notSubmitted = (docs ?? []).filter((d) => !d.is_submitted).map((d) => d.document_name);

    // 3. Search manual_chunks
    const exemptionTitle: string | null = app.exemption_types?.title ?? null;
    const taxType: string = app.tax_type;
    const queryText = [
      app.application_reason ?? "",
      app.additional_note ?? "",
      exemptionTitle ?? "",
    ].join(" ");
    const tokens = Array.from(new Set(tokenize(queryText))).slice(0, 12);

    const chunkMap = new Map<string, ChunkRow>();

    async function addChunks(rows: ChunkRow[] | null) {
      for (const r of rows ?? []) chunkMap.set(r.id, r);
    }

    // Search by tax_type + exemption_type
    if (exemptionTitle) {
      const { data: r1 } = await supabaseAdmin
        .from("manual_chunks")
        .select("id, manual_volume_id, page_number, chunk_text, chunk_summary, tax_type, exemption_type, keywords")
        .eq("tax_type", taxType)
        .eq("exemption_type", exemptionTitle)
        .limit(8);
      await addChunks(r1 as ChunkRow[] | null);
    }
    const { data: r2 } = await supabaseAdmin
      .from("manual_chunks")
      .select("id, manual_volume_id, page_number, chunk_text, chunk_summary, tax_type, exemption_type, keywords")
      .eq("tax_type", taxType)
      .limit(6);
    await addChunks(r2 as ChunkRow[] | null);

    // Search by keyword ilike
    for (const t of tokens.slice(0, 5)) {
      const { data: r3 } = await supabaseAdmin
        .from("manual_chunks")
        .select("id, manual_volume_id, page_number, chunk_text, chunk_summary, tax_type, exemption_type, keywords")
        .ilike("chunk_text", `%${t}%`)
        .limit(4);
      await addChunks(r3 as ChunkRow[] | null);
    }

    // Rank chunks: score by token matches
    const scored = Array.from(chunkMap.values()).map((c) => {
      const text = (c.chunk_text ?? "") + " " + (Array.isArray(c.keywords) ? c.keywords.join(" ") : "");
      let score = 0;
      for (const t of tokens) if (text.includes(t)) score += 1;
      if (c.exemption_type === exemptionTitle) score += 3;
      if (c.tax_type === taxType) score += 2;
      return { c, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, 8).map((s) => s.c);

    // Enrich volume + set
    const volIds = Array.from(new Set(topChunks.map((c) => c.manual_volume_id)));
    const { data: vols } = volIds.length
      ? await supabaseAdmin.from("manual_volumes").select("id, volume_number, manual_set_id").in("id", volIds)
      : { data: [] };
    const setIds = Array.from(new Set((vols ?? []).map((v) => v.manual_set_id)));
    const { data: sets } = setIds.length
      ? await supabaseAdmin.from("manual_sets").select("id, title").in("id", setIds)
      : { data: [] };
    const volMap = new Map((vols ?? []).map((v) => [v.id, v]));
    const setMap = new Map((sets ?? []).map((s) => [s.id, s]));

    const manual_references = topChunks.map((c) => {
      const v = volMap.get(c.manual_volume_id);
      const s = v ? setMap.get(v.manual_set_id) : null;
      return {
        chunk_id: c.id,
        manual_title: s?.title ?? null,
        volume_number: v?.volume_number ?? null,
        page_number: c.page_number,
        section_title: c.exemption_type ?? c.tax_type ?? null,
        keywords: Array.isArray(c.keywords) ? c.keywords : [],
      };
    });

    // 4. Build prompt and call Lovable AI
    const contextText = topChunks.length
      ? topChunks
          .map((c, i) => {
            const v = volMap.get(c.manual_volume_id);
            return `[근거 ${i + 1}] ${v?.volume_number ?? "?"}권 p.${c.page_number ?? "?"} (${c.exemption_type ?? "미분류"})\n${(c.chunk_text ?? "").slice(0, 600)}`;
          })
          .join("\n\n")
      : "(매뉴얼에서 직접적인 근거를 찾지 못했습니다)";

    const systemPrompt = `당신은 한국 지방세 감면 신청 사전검토를 돕는 AI 보조원입니다.
반드시 지켜야 할 원칙:
- 감면 여부를 절대 확정하지 마세요.
- "감면 확정", "감면 승인", "자동 승인", "최종 결정" 같은 표현을 사용하지 마세요.
- 반드시 "감면 가능성 있음", "추가 확인 필요", "보완 요청 필요", "감면 곤란 가능성 있음" 중 하나로만 review_result를 표시하세요.
- 제공된 매뉴얼 근거만을 바탕으로 작성하세요. 근거가 부족하면 솔직히 표시하세요.
- 모든 응답은 한국어로 작성하세요.
- 민원인 답변 초안은 정중하고 명확한 공공기관 답변 어조로 작성하세요.`;

    const userPrompt = `# 신청 정보
- 접수번호: ${app.receipt_number}
- 세목: ${taxType}
- 감면 유형: ${exemptionTitle ?? "미선택"}
- 신청 사유: ${app.application_reason ?? "(없음)"}
- 추가 설명: ${app.additional_note ?? "(없음)"}

# 제출 서류
- 제출됨: ${submitted.join(", ") || "(없음)"}
- 미제출: ${notSubmitted.join(", ") || "(없음)"}

# 매뉴얼에서 검색된 관련 근거
${contextText}

위 정보를 바탕으로 사전검토 결과를 JSON으로만 작성하세요.`;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY가 설정되지 않았습니다");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tax_exemption_review",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                review_result: { type: "string", enum: [...REVIEW_RESULTS] },
                summary: { type: "string" },
                possibility_reason: { type: "string" },
                missing_documents: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    not_submitted: { type: "array", items: { type: "string" } },
                    manual_required: { type: "array", items: { type: "string" } },
                    ai_suggested: { type: "array", items: { type: "string" } },
                  },
                  required: ["not_submitted", "manual_required", "ai_suggested"],
                },
                check_points: { type: "array", items: { type: "string" } },
                officer_check_points: { type: "array", items: { type: "string" } },
                draft_answer: { type: "string" },
                risk_level: { type: "string", enum: ["낮음", "보통", "높음"] },
              },
              required: [
                "review_result",
                "summary",
                "possibility_reason",
                "missing_documents",
                "check_points",
                "officer_check_points",
                "draft_answer",
                "risk_level",
              ],
            },
          },
        },
      }),
    });

    if (aiRes.status === 429) throw new Error("AI 호출 한도를 초과했습니다. 잠시 후 다시 시도하세요.");
    if (aiRes.status === 402) throw new Error("AI 크레딧이 부족합니다. 워크스페이스 설정에서 크레딧을 추가하세요.");
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI 호출 실패 (${aiRes.status}): ${txt.slice(0, 200)}`);
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: z.infer<typeof ReviewSchema>;
    try {
      parsed = ReviewSchema.parse(JSON.parse(content));
    } catch (e: any) {
      throw new Error("AI 응답 파싱 실패: " + (e?.message ?? String(e)));
    }

    // Ensure not_submitted reflects actual submission state
    if (notSubmitted.length > 0) {
      const merged = Array.from(new Set([...notSubmitted, ...parsed.missing_documents.not_submitted]));
      parsed.missing_documents.not_submitted = merged;
    }

    // 5. Save - overwrite previous
    await supabaseAdmin.from("ai_reviews").delete().eq("application_id", data.applicationId);

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("ai_reviews")
      .insert({
        application_id: data.applicationId,
        review_result: parsed.review_result,
        summary: parsed.summary,
        possibility_reason: parsed.possibility_reason,
        missing_documents: parsed.missing_documents,
        check_points: parsed.check_points,
        officer_check_points: parsed.officer_check_points,
        draft_answer: parsed.draft_answer,
        risk_level: parsed.risk_level,
        manual_references,
      })
      .select()
      .single();
    if (insErr) throw new Error("AI 검토 저장 실패: " + insErr.message);

    // 6. Update status -> "AI 검토 완료"
    if (app.status === "AI 검토 대기" || app.status === "접수") {
      await supabaseAdmin
        .from("tax_applications")
        .update({ status: "AI 검토 완료", updated_at: new Date().toISOString() })
        .eq("id", data.applicationId);
      await supabaseAdmin.from("status_logs").insert({
        application_id: data.applicationId,
        status: "AI 검토 완료",
        memo: "AI 사전검토 실행",
      });
    }

    return { review: inserted, hasReferences: topChunks.length > 0 };
  });

export const getAiReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { applicationId: string }) =>
    z.object({ applicationId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { data: review } = await supabaseAdmin
      .from("ai_reviews")
      .select("*")
      .eq("application_id", data.applicationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { review };
  });
