import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Sparkles, RefreshCw, Copy, Loader2 } from "lucide-react";
import { STATUSES, statusBadgeClass } from "@/lib/status";
import { formatMaskedRrn } from "@/lib/rrn";
import { toast } from "sonner";
import { runAiReview, getAiReview } from "@/lib/ai-review.functions";

export const Route = createFileRoute("/officer/applications/$id")({
  head: () => ({ meta: [{ title: "신청 상세" }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const [app, setApp] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  const [aiReview, setAiReview] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [supplement, setSupplement] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const runAiReviewFn = useServerFn(runAiReview);
  const getAiReviewFn = useServerFn(getAiReview);

  async function load() {
    const { data: a } = await supabase
      .from("tax_applications")
      .select("*, applicants(*), exemption_types(*)")
      .eq("id", id)
      .single();
    setApp(a);
    setStatus(a?.status ?? "");
    const { data: d } = await supabase.from("application_documents").select("*").eq("application_id", id);
    setDocs(d ?? []);
    const { data: oa } = await supabase.from("officer_answers").select("*").eq("application_id", id).order("created_at", { ascending: false }).limit(1);
    if (oa && oa[0]) {
      setAnswer(oa[0]);
      setTitle(oa[0].answer_title ?? "");
      setContent(oa[0].answer_content ?? "");
      setSupplement(oa[0].supplement_request ?? "");
      setMemo(oa[0].internal_memo ?? "");
    }
    try {
      const r = await getAiReviewFn({ data: { applicationId: id } });
      setAiReview(r.review);
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => { load(); }, [id]);

  async function runAi() {
    setAiRunning(true);
    try {
      const r = await runAiReviewFn({ data: { applicationId: id } });
      setAiReview(r.review);
      toast.success("AI 사전검토가 완료되었습니다.");
      load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "AI 사전검토 실행 실패");
    } finally {
      setAiRunning(false);
      setConfirmRegen(false);
    }
  }

  async function saveAnswer() {
    setSaving(true);
    try {
      const payload = {
        application_id: id,
        answer_title: title,
        answer_content: content,
        supplement_request: supplement,
        internal_memo: memo,
        final_status: status,
      };
      if (answer) {
        await supabase.from("officer_answers").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", answer.id);
      } else {
        await supabase.from("officer_answers").insert(payload);
      }
      await supabase.from("tax_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("status_logs").insert({ application_id: id, status, memo });
      toast.success("저장되었습니다.");
      load();
    } catch (e) {
      console.error(e);
      toast.error("저장 실패");
    } finally { setSaving(false); }
  }

  function loadAiDraft() {
    if (!aiReview?.draft_answer) {
      toast.error("AI 초안이 없습니다.");
      return;
    }
    setContent(aiReview.draft_answer);
    if (!title) {
      setTitle(`${app?.exemption_types?.title ?? "지방세 감면"} 검토 결과 안내`);
    }
    toast.success("AI 초안을 불러왔습니다.");
  }

  if (!app) return <p>로딩 중...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/officer/applications"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />목록</Button></Link>
        <span className={`px-3 py-1 rounded-md text-sm ${statusBadgeClass(app.status)}`}>{app.status}</span>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold font-mono">{app.receipt_number}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">민원인 정보</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="이름" v={app.applicants?.name} />
            <Row k="주소" v={app.applicants?.address} />
            <Row k="전화번호" v={app.applicants?.phone} />
            <Row k="주민등록번호" v={formatMaskedRrn(app.applicants?.rrn_front, app.applicants?.rrn_masked)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">신청 정보</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row k="세목" v={app.tax_type} />
            <Row k="감면 유형" v={app.exemption_types?.title} />
            <Row k="신청일" v={new Date(app.created_at).toLocaleString("ko-KR")} />
            <div>
              <p className="text-muted-foreground text-xs mt-2">신청 사유</p>
              <p className="whitespace-pre-wrap">{app.application_reason || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mt-2">추가 설명</p>
              <p className="whitespace-pre-wrap">{app.additional_note || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">제출 서류 체크 현황</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <span className={d.is_submitted ? "text-success" : "text-muted-foreground"}>{d.is_submitted ? "✓" : "○"}</span>
                <span>{d.document_name}</span>
              </li>
            ))}
            {docs.length === 0 && <li className="text-muted-foreground">제출 서류 정보가 없습니다.</li>}
          </ul>
        </CardContent>
      </Card>

      <AiReviewPanel
        review={aiReview}
        running={aiRunning}
        onRun={() => (aiReview ? setConfirmRegen(true) : runAi())}
        onLoadDraft={loadAiDraft}
      />

      <Card className="border-2 border-primary/40">
        <CardHeader className="bg-primary/5 border-b border-primary/20">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">✓</span>
            담당 공무원 최종 답변 작성 <span className="text-xs font-normal text-muted-foreground">(공식 답변)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {aiReview?.draft_answer && (
            <Button type="button" variant="outline" size="sm" onClick={loadAiDraft}>
              <Copy className="h-4 w-4 mr-1" />AI 초안 불러오기
            </Button>
          )}
          <div>
            <Label>답변 제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 생애최초 주택 취득세 감면 검토 결과 안내" />
          </div>
          <div>
            <Label>답변 내용</Label>
            <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div>
            <Label>보완 요청 서류</Label>
            <Textarea rows={2} value={supplement} onChange={(e) => setSupplement(e.target.value)} />
          </div>
          <div>
            <Label>담당자 메모 (내부)</Label>
            <Textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <div>
            <Label>처리 상태 변경</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={saveAnswer} disabled={saving} className="w-full">
            {saving ? "저장 중..." : "답변 저장 및 상태 변경"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmRegen} onOpenChange={setConfirmRegen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>AI 사전검토를 다시 생성할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              기존 AI 사전검토 결과는 덮어쓰기 됩니다. 계속 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={aiRunning}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={runAi} disabled={aiRunning}>
              {aiRunning ? "실행 중..." : "다시 생성"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AiReviewPanel({
  review,
  running,
  onRun,
  onLoadDraft,
}: {
  review: any;
  running: boolean;
  onRun: () => void;
  onLoadDraft: () => void;
}) {
  const refs: any[] = Array.isArray(review?.manual_references) ? review.manual_references : [];
  const hasRefs = refs.length > 0;
  const md = review?.missing_documents ?? {};

  return (
    <Card className="border-dashed border-2 border-info/40 bg-info/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-info" />
          AI 사전검토 결과 (참고자료)
        </CardTitle>
        <div className="flex gap-2">
          {review && (
            <Button variant="outline" size="sm" onClick={onLoadDraft}>
              <Copy className="h-4 w-4 mr-1" />AI 초안 불러오기
            </Button>
          )}
          <Button size="sm" onClick={onRun} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : review ? <RefreshCw className="h-4 w-4 mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {running ? "실행 중..." : review ? "다시 생성" : "AI 사전검토 실행"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!review ? (
          <p className="text-muted-foreground italic">아직 AI 사전검토가 실행되지 않았습니다. 위 "AI 사전검토 실행" 버튼을 누르세요.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
                {review.review_result}
              </span>
              {review.risk_level && (
                <span className="text-xs text-muted-foreground">위험도: {review.risk_level}</span>
              )}
              {review.created_at && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(review.created_at).toLocaleString("ko-KR")}
                </span>
              )}
            </div>

            <Section label="검토 요약">{review.summary || "-"}</Section>
            <Section label="감면 가능성 판단 사유">{review.possibility_reason || "-"}</Section>

            <Section label="부족 서류">
              <div className="space-y-2 not-italic text-foreground">
                <DocGroup title="민원인 미제출" items={md.not_submitted} />
                <DocGroup title="매뉴얼상 확인 필요" items={md.manual_required} />
                <DocGroup title="AI 보완 제안" items={md.ai_suggested} />
              </div>
            </Section>

            <Section label="추가 확인 사항">
              <ListBlock items={review.check_points} />
            </Section>

            <Section label="담당 공무원 확인 사항">
              <ListBlock items={review.officer_check_points} />
            </Section>

            <Section label="민원인 답변 초안">
              <p className="whitespace-pre-wrap not-italic text-foreground">{review.draft_answer || "-"}</p>
            </Section>

            <Section label="참고 매뉴얼 근거">
              {hasRefs ? (
                <ul className="space-y-2 not-italic text-foreground">
                  {refs.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 p-2 rounded-md bg-background border border-border">
                      <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded text-xs font-semibold bg-info/15 text-info border border-info/30">
                        {r.volume_number ? `${r.volume_number}권` : "매뉴얼"}
                      </span>
                      {r.page_number && (
                        <span className="inline-flex shrink-0 items-center px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground border border-border">
                          p.{r.page_number}
                        </span>
                      )}
                      <span className="text-sm">
                        {r.manual_title ?? "지방세 감면 매뉴얼"}
                        {r.section_title ? ` · ${r.section_title}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-warning">
                  업로드된 1권 및 2권 매뉴얼에서 직접적인 근거를 찾지 못했습니다. 담당 공무원의 추가 검토가 필요합니다.
                </p>
              )}
            </Section>

            <div className="rounded-md bg-warning/10 border border-warning/30 p-3">
              <p className="text-xs text-foreground font-semibold">⚠ AI는 최종 판단을 하지 않습니다</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                본 AI 검토 결과는 업로드된 감면 매뉴얼을 참고하여 생성된 사전검토 자료입니다.
                최종 감면 여부는 관련 법령, 조례, 제출 서류 및 담당 공무원의 검토에 따라 결정됩니다.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DocGroup({ title, items }: { title: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="ml-3 text-sm">
        {items.map((it, i) => <li key={i}>• {it}</li>)}
      </ul>
    </div>
  );
}

function ListBlock({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <p className="text-muted-foreground">-</p>;
  return (
    <ul className="not-italic text-foreground space-y-1">
      {items.map((it, i) => <li key={i} className="text-sm">• {it}</li>)}
    </ul>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v || "-"}</span>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-muted-foreground border-l-2 border-info/30 pl-3 py-1">{children}</div>
    </div>
  );
}
