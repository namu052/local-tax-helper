import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TAX_TYPES } from "@/lib/status";
import { parseRrn } from "@/lib/rrn";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/apply")({
  head: () => ({ meta: [{ title: "지방세 감면 신청 | 신청서 작성" }] }),
  component: ApplyPage,
});

type ExemptionType = {
  id: string;
  title: string;
  tax_type: string;
  required_documents: string[];
};

function ApplyPage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<ExemptionType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [rrn, setRrn] = useState("");
  const [taxType, setTaxType] = useState<string>("");
  const [exemptionTypeId, setExemptionTypeId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    supabase
      .from("exemption_types")
      .select("id, title, tax_type, required_documents")
      .eq("is_active", true)
      .then(({ data }) => setTypes((data ?? []) as ExemptionType[]));
  }, []);

  const selectedType = types.find((t) => t.id === exemptionTypeId);
  const requiredDocs = selectedType?.required_documents ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) return toast.error("개인정보 수집·이용에 동의해야 신청할 수 있습니다.");
    if (!name || !phone || !taxType || !exemptionTypeId) return toast.error("필수 항목을 모두 입력해 주세요.");

    const parsed = parseRrn(rrn);
    if (!parsed) return toast.error("주민등록번호 형식이 올바르지 않습니다. (예: 900101-1234567)");

    setSubmitting(true);
    try {
      const { data: applicant, error: aErr } = await supabase
        .from("applicants")
        .insert({ name, address, phone, rrn_front: parsed.front, rrn_masked: parsed.masked })
        .select()
        .single();
      if (aErr) throw aErr;

      const { data: app, error: appErr } = await supabase
        .from("tax_applications")
        .insert({
          applicant_id: applicant.id,
          tax_type: taxType,
          exemption_type_id: exemptionTypeId,
          application_reason: reason,
          additional_note: note,
          status: "AI 검토 대기",
        })
        .select("id, receipt_number")
        .single();
      if (appErr) throw appErr;

      if (requiredDocs.length > 0) {
        await supabase.from("application_documents").insert(
          requiredDocs.map((doc) => ({
            application_id: app.id,
            document_name: doc,
            is_submitted: !!checkedDocs[doc],
          })),
        );
      }

      navigate({ to: "/apply/complete", search: { receipt: app.receipt_number } });
    } catch (err) {
      console.error(err);
      toast.error("신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />홈</Button></Link>
          <h1 className="text-base font-semibold">지방세 감면 신청서</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-lg border-2 border-warning bg-warning/10 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">보안 안내 — 실제 개인정보 입력 금지</p>
            <p className="text-muted-foreground mt-1">
              본 시스템은 교육용 프로토타입입니다. <strong>실제 주민등록번호를 입력하지 마시고
              테스트용 더미 데이터를 입력하세요.</strong> 주민등록번호는 원문으로 저장되지 않으며,
              앞 6자리 + 마스킹된 형태(예: 900101-1******)로만 저장됩니다.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">민원인 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
              </div>
              <div>
                <Label htmlFor="address">주소</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="서울시 ○○구 ○○동" />
              </div>
              <div>
                <Label htmlFor="phone">전화번호 *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
              </div>
              <div>
                <Label htmlFor="rrn">주민등록번호 * <span className="text-destructive text-xs">(테스트용 더미 데이터만 입력)</span></Label>
                <Input id="rrn" value={rrn} onChange={(e) => setRrn(e.target.value)} placeholder="900101-1234567" />
                <p className="text-xs text-muted-foreground mt-1">저장 시 자동 마스킹됩니다 (예: 900101-1******)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">신청 내용</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>신청 세목 *</Label>
                <Select value={taxType} onValueChange={setTaxType}>
                  <SelectTrigger><SelectValue placeholder="세목을 선택하세요" /></SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>감면 유형 *</Label>
                <Select value={exemptionTypeId} onValueChange={setExemptionTypeId}>
                  <SelectTrigger><SelectValue placeholder="감면 유형을 선택하세요" /></SelectTrigger>
                  <SelectContent>
                    {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reason">신청 사유</Label>
                <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="감면을 신청하는 사유를 작성해 주세요." />
              </div>
              <div>
                <Label htmlFor="note">추가 설명</Label>
                <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {requiredDocs.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">제출 서류 체크리스트</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {requiredDocs.map((doc) => (
                  <div key={doc} className="flex items-center gap-2">
                    <Checkbox
                      id={doc}
                      checked={!!checkedDocs[doc]}
                      onCheckedChange={(v) => setCheckedDocs((p) => ({ ...p, [doc]: !!v }))}
                    />
                    <Label htmlFor={doc} className="font-normal cursor-pointer">{doc}</Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />
                <Label htmlFor="agree" className="font-normal cursor-pointer text-sm">
                  개인정보 수집·이용에 동의합니다. 수집한 정보는 지방세 감면 검토 목적으로만 사용됩니다.
                </Label>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "제출 중..." : "신청하기"}
          </Button>
        </form>
      </main>
    </div>
  );
}
