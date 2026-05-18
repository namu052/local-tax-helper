import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/lookup")({
  head: () => ({ meta: [{ title: "신청 결과 조회" }] }),
  component: LookupPage,
});

type ResultRow = {
  receipt_number: string;
  created_at: string;
  tax_type: string;
  status: string;
  application_reason?: string | null;
  additional_note?: string | null;
  exemption_types?: { title: string } | null;
  officer_answers?: Array<{
    answer_title: string | null;
    answer_content: string | null;
    supplement_request: string | null;
  }>;
};

function LookupPage() {
  const [receipt, setReceipt] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<ResultRow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // AI review state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setResult(null); setAiResult(""); setAiError("");
    if (!receipt.trim() && !phone.trim()) {
      setError("접수번호 또는 전화번호 중 하나 이상을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("lookup_application_by_receipt", {
        _receipt: receipt.trim(),
        _phone: phone.trim(),
      });
      if (rpcErr) throw rpcErr;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        setError("접수번호와 전화번호가 일치하는 신청 내역을 찾을 수 없습니다.");
      } else {
        setResult((Array.isArray(data) ? data[0] : data) as unknown as ResultRow);
      }
    } catch (err) {
      console.error(err);
      setError("조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function runAiReview() {
    if (!result) return;
    if (!apiKey.trim().startsWith("sk-")) {
      setAiError("올바른 OpenAI API 키를 입력해 주세요.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResult("");
    try {
      const prompt = `다음은 한국 지방세 감면 신청 내용입니다. 신청 내용을 분석하여 사전검토 의견을 한국어로 작성해 주세요.

- 접수번호: ${result.receipt_number}
- 신청 세목: ${result.tax_type}
- 감면 유형: ${result.exemption_types?.title ?? "(미선택)"}
- 신청 사유: ${result.application_reason ?? "(없음)"}
- 추가 설명: ${result.additional_note ?? "(없음)"}

요청사항:
1. 신청 내용 요약
2. 감면 가능성에 대한 일반적 의견 (확정적 표현 금지)
3. 담당 공무원이 추가로 확인해야 할 사항
4. 민원인에게 안내할 수 있는 보완 서류 또는 주의사항

마지막에 "본 결과는 AI가 생성한 사전검토 자료이며 최종 감면 여부는 담당 공무원의 검토에 따라 결정됩니다." 문구를 포함해 주세요.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "당신은 한국 지방세 감면 신청을 검토하는 친절한 공공기관 AI 보조원입니다. 답변은 한국어로 작성하고, 감면 여부를 확정하지 마세요.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`OpenAI 호출 실패 (${res.status}): ${t.slice(0, 200)}`);
      }
      const json = await res.json();
      const content: string = json.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("AI 응답을 받지 못했습니다.");
      setAiResult(content);
      setAiDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      setAiError(e?.message ?? "AI 검토 중 오류가 발생했습니다.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-6 py-4 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />홈</Button></Link>
          <h1 className="text-base font-semibold">신청 결과 조회</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="rounded-lg border border-info/30 bg-info/5 p-3 text-xs text-muted-foreground">
          신청 시 입력한 <strong className="text-foreground">접수번호 또는 전화번호 중 하나</strong>만 일치해도 결과를 조회할 수 있습니다.
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">조회 정보 입력</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="r">접수번호</Label>
                <Input id="r" value={receipt} onChange={(e) => setReceipt(e.target.value)} placeholder="TAX-2026-000001" />
              </div>
              <div>
                <Label htmlFor="p">전화번호</Label>
                <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "조회 중..." : "조회"}</Button>
            </form>
            {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">조회 결과</CardTitle>
              <Button size="sm" onClick={() => { setAiError(""); setAiDialogOpen(true); }}>
                <Sparkles className="h-4 w-4 mr-1" /> AI검토
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Row label="접수번호" value={<span className="font-mono">{result.receipt_number}</span>} />
              <Row label="신청일" value={new Date(result.created_at).toLocaleDateString("ko-KR")} />
              <Row label="신청 세목" value={result.tax_type} />
              <Row label="감면 유형" value={result.exemption_types?.title ?? "-"} />
              <Row label="처리 상태" value={
                <span className="inline-flex px-2 py-0.5 rounded-md text-xs bg-warning/10 text-warning-foreground border border-warning/30">검토 중</span>
              } />
              {result.officer_answers && result.officer_answers[0] && (
                <>
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">담당 공무원 답변</p>
                    <p className="font-semibold">{result.officer_answers[0].answer_title}</p>
                    <p className="whitespace-pre-wrap mt-2">{result.officer_answers[0].answer_content}</p>
                  </div>
                  {result.officer_answers[0].supplement_request && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">보완 요청 서류</p>
                      <p className="whitespace-pre-wrap">{result.officer_answers[0].supplement_request}</p>
                    </div>
                  )}
                </>
              )}

              {aiResult && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">AI 사전검토 결과</p>
                  </div>
                  <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                    {aiResult}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    본 AI 검토 결과는 사전검토 자료이며, 최종 감면 여부는 관련 법령, 조례 및 담당 공무원의 검토에 따라 결정됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 검토 요청</DialogTitle>
            <DialogDescription>
              API키값을 입력하면 AI가 신청내용을 검토해드립니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="api-key">OpenAI API 키</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground mt-1">
                사용 모델: <span className="font-mono">gpt-4o-mini</span> · 입력하신 키는 저장되지 않습니다.
              </p>
            </div>
            {aiError && <p className="text-sm text-destructive">{aiError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>
              취소
            </Button>
            <Button onClick={runAiReview} disabled={aiLoading || !apiKey.trim()}>
              {aiLoading ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" /> 검토 중...</>) : "AI 검토 실행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}
