import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles } from "lucide-react";
import { STATUSES, statusBadgeClass } from "@/lib/status";
import { formatMaskedRrn } from "@/lib/rrn";
import { toast } from "sonner";

export const Route = createFileRoute("/officer/applications/$id")({
  head: () => ({ meta: [{ title: "신청 상세" }] }),
  component: Detail,
});

function Detail() {
  const { id } = Route.useParams();
  const [app, setApp] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [answer, setAnswer] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [supplement, setSupplement] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

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
  }
  useEffect(() => { load(); }, [id]);

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

      <Card className="border-dashed border-2 border-info/40 bg-info/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-info" />
            AI 사전검토 결과 (참고자료)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <Section label="검토 요약">다음 단계에서 생성 예정입니다.</Section>
          <Section label="감면 가능성 판단 근거">다음 단계에서 생성 예정입니다.</Section>
          <Section label="부족 서류">다음 단계에서 생성 예정입니다.</Section>
          <Section label="추가 확인 사항">다음 단계에서 생성 예정입니다.</Section>
          <Section label="AI 답변 초안">다음 단계에서 생성 예정입니다.</Section>
          <Section label="참고 매뉴얼 근거 (1권·2권)">다음 단계에서 생성 예정입니다.</Section>
          <p className="text-xs text-muted-foreground italic">
            ※ AI는 감면 여부를 확정하지 않습니다. 최종 판단은 담당 공무원이 합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">담당 공무원 최종 답변 작성</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>답변 제목</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 생애최초 주택 취득세 감면 검토 결과 안내" />
          </div>
          <div>
            <Label>답변 내용</Label>
            <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
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
    </div>
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
      <div className="text-sm text-muted-foreground border-l-2 border-info/30 pl-3 py-1 italic">{children}</div>
    </div>
  );
}
