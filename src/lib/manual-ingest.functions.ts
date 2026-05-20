import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  chunkPageText,
  detectExemptionType,
  detectLegalBasis,
  detectTaxType,
  extractKeywords,
  summarize,
} from "./manual-classify";

const PAGE_BATCH = 20;

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("권한 확인 실패: " + error.message);
  if (!data) throw new Error("관리자 권한이 필요합니다");
}

export const ingestManualVolume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { volumeId: string; startPage?: number; reset?: boolean }) =>
    z
      .object({
        volumeId: z.string().uuid(),
        startPage: z.number().int().min(1).max(5000).optional(),
        reset: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: vol, error: ve } = await supabaseAdmin
      .from("manual_volumes")
      .select("id, manual_set_id, volume_number, file_url")
      .eq("id", data.volumeId)
      .maybeSingle();
    if (ve || !vol) throw new Error("매뉴얼 권 정보를 찾을 수 없습니다");
    if (!vol.file_url) throw new Error("업로드된 PDF 파일이 없습니다");

    const startPage = data.startPage ?? 1;
    const reset = data.reset ?? startPage === 1;

    if (reset) {
      await supabaseAdmin.from("manual_chunks").delete().eq("manual_volume_id", vol.id);
    }

    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from("manuals")
      .download(vol.file_url);
    if (dlErr || !blob) throw new Error("PDF 다운로드 실패: " + (dlErr?.message ?? ""));

    const buf = new Uint8Array(await blob.arrayBuffer());
    const { getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const totalPages: number = pdf.numPages;

    const endPage = Math.min(totalPages, startPage + PAGE_BATCH - 1);
    const failedPages: number[] = [];
    let chunksInserted = 0;
    const batch: any[] = [];
    const flush = async () => {
      if (batch.length === 0) return;
      const { error } = await supabaseAdmin.from("manual_chunks").insert(batch);
      if (error) throw new Error("청크 저장 실패: " + error.message);
      chunksInserted += batch.length;
      batch.length = 0;
    };

    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const text = (content.items as any[])
          .map((it) => (typeof it?.str === "string" ? it.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (!text) {
          failedPages.push(pageNum);
          continue;
        }
        const chunks = chunkPageText(text, 600);
        for (const c of chunks) {
          batch.push({
            manual_volume_id: vol.id,
            page_number: pageNum,
            chunk_text: c,
            chunk_summary: summarize(c),
            tax_type: detectTaxType(c),
            exemption_type: detectExemptionType(c),
            legal_basis: detectLegalBasis(c),
            keywords: extractKeywords(c),
          });
          if (batch.length >= 200) await flush();
        }
      } catch {
        failedPages.push(pageNum);
      }
    }
    await flush();

    const done = endPage >= totalPages;
    return {
      volumeId: vol.id,
      volumeNumber: vol.volume_number,
      totalPages,
      startPage,
      endPage,
      nextPage: done ? null : endPage + 1,
      done,
      chunksInserted,
      failedPages,
    };
  });

export const getManualSetStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { setId: string }) =>
    z.object({ setId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: vols } = await supabaseAdmin
      .from("manual_volumes")
      .select("id, volume_number")
      .eq("manual_set_id", data.setId);

    const out: Record<number, { volumeId: string; chunkCount: number; lastIngestAt: string | null }> = {};
    for (const v of vols ?? []) {
      const { count } = await supabaseAdmin
        .from("manual_chunks")
        .select("id", { count: "exact", head: true })
        .eq("manual_volume_id", v.id);
      const { data: latest } = await supabaseAdmin
        .from("manual_chunks")
        .select("created_at")
        .eq("manual_volume_id", v.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      out[v.volume_number] = {
        volumeId: v.id,
        chunkCount: count ?? 0,
        lastIngestAt: latest?.created_at ?? null,
      };
    }
    return out;
  });

export const searchManualChunks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    q?: string;
    taxType?: string;
    exemptionType?: string;
    volumeNumber?: number;
    pageNumber?: number;
    limit?: number;
  }) =>
    z.object({
      q: z.string().max(200).optional(),
      taxType: z.string().max(50).optional(),
      exemptionType: z.string().max(100).optional(),
      volumeNumber: z.number().int().min(1).max(2).optional(),
      pageNumber: z.number().int().min(1).max(2000).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    let volIds: string[] | null = null;
    if (data.volumeNumber) {
      const { data: vs } = await supabaseAdmin
        .from("manual_volumes")
        .select("id")
        .eq("volume_number", data.volumeNumber);
      volIds = (vs ?? []).map((v) => v.id);
      if (volIds.length === 0) return { results: [] };
    }

    let q = supabaseAdmin
      .from("manual_chunks")
      .select(
        "id, manual_volume_id, page_number, chunk_text, chunk_summary, tax_type, exemption_type, legal_basis, keywords",
      )
      .limit(data.limit ?? 30);

    if (data.q && data.q.trim()) q = q.ilike("chunk_text", `%${data.q.trim()}%`);
    if (data.taxType) q = q.eq("tax_type", data.taxType);
    if (data.exemptionType) q = q.eq("exemption_type", data.exemptionType);
    if (data.pageNumber) q = q.eq("page_number", data.pageNumber);
    if (volIds) q = q.in("manual_volume_id", volIds);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set((rows ?? []).map((r) => r.manual_volume_id)));
    const { data: vols } = await supabaseAdmin
      .from("manual_volumes")
      .select("id, volume_number, manual_set_id")
      .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const setIds = Array.from(new Set((vols ?? []).map((v) => v.manual_set_id)));
    const { data: sets } = await supabaseAdmin
      .from("manual_sets")
      .select("id, title")
      .in("id", setIds.length > 0 ? setIds : ["00000000-0000-0000-0000-000000000000"]);

    const volMap = new Map((vols ?? []).map((v) => [v.id, v]));
    const setMap = new Map((sets ?? []).map((s) => [s.id, s]));

    return {
      results: (rows ?? []).map((r) => {
        const v = volMap.get(r.manual_volume_id);
        const s = v ? setMap.get(v.manual_set_id) : null;
        return {
          ...r,
          volume_number: v?.volume_number ?? null,
          manual_title: s?.title ?? null,
        };
      }),
    };
  });

export const getManualChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: chunk, error } = await supabaseAdmin
      .from("manual_chunks")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !chunk) throw new Error("청크를 찾을 수 없습니다");
    const { data: vol } = await supabaseAdmin
      .from("manual_volumes")
      .select("volume_number, manual_set_id")
      .eq("id", chunk.manual_volume_id)
      .maybeSingle();
    const { data: set } = vol
      ? await supabaseAdmin.from("manual_sets").select("title").eq("id", vol.manual_set_id).maybeSingle()
      : { data: null };
    return {
      ...chunk,
      volume_number: vol?.volume_number ?? null,
      manual_title: set?.title ?? null,
    };
  });
