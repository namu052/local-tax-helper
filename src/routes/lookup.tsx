import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { statusBadgeClass } from "@/lib/status";

export const Route = createFileRoute("/lookup")({
  head: () => ({ meta: [{ title: "신청 결과 조회" }] }),
  component: LookupPage,
});

type ResultRow = {
  receipt_number: string;
  created_at: string;
  tax_type: string;
  status: string;
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      // applicants는 공무원만 SELECT 가능. 익명 조회는 서버에서 receipt+phone 일치만 노출하기 위해
      // tax_applications + applicants 조인 RPC가 이상적이나, 1단계 단순화를 위해
      // anon에게 매칭 검사용 RPC를 제공한다 (마스킹된 정보만 반환).
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-6 py-4 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />홈</Button></Link>
          <h1 className="text-base font-semibold">신청 결과 조회</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8 space-y-6">
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
            <CardHeader><CardTitle className="text-base">조회 결과</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Row label="접수번호" value={<span className="font-mono">{result.receipt_number}</span>} />
              <Row label="신청일" value={new Date(result.created_at).toLocaleDateString("ko-KR")} />
              <Row label="신청 세목" value={result.tax_type} />
              <Row label="감면 유형" value={result.exemption_types?.title ?? "-"} />
              <Row label="처리 상태" value={
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs ${statusBadgeClass(result.status)}`}>{result.status}</span>
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
            </CardContent>
          </Card>
        )}
      </main>
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
