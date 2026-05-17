import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBadgeClass, STATUSES } from "@/lib/status";
import { Inbox, Clock, CheckCircle2, UserCheck, AlertTriangle, FileCheck } from "lucide-react";

export const Route = createFileRoute("/officer/")({
  head: () => ({ meta: [{ title: "공무원 대시보드" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: apps } = await supabase
        .from("tax_applications")
        .select("id, receipt_number, tax_type, status, created_at, applicants(name)")
        .order("created_at", { ascending: false });
      const list = apps ?? [];
      setTotal(list.length);
      const c: Record<string, number> = {};
      list.forEach((a) => { c[a.status] = (c[a.status] ?? 0) + 1; });
      setCounts(c);
      setRecent(list.slice(0, 8));
    })();
  }, []);

  const cards = [
    { label: "전체 신청", value: total, icon: Inbox, tone: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "AI 검토 대기", value: counts["AI 검토 대기"] ?? 0, icon: Clock, tone: "text-info", bg: "bg-info/10", border: "border-info/30" },
    { label: "AI 검토 완료", value: counts["AI 검토 완료"] ?? 0, icon: CheckCircle2, tone: "text-accent-foreground", bg: "bg-accent", border: "border-accent" },
    { label: "담당자 검토 중", value: counts["담당자 검토 중"] ?? 0, icon: UserCheck, tone: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
    { label: "보완 요청", value: counts["보완 요청"] ?? 0, icon: AlertTriangle, tone: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
    { label: "답변 완료", value: counts["답변 완료"] ?? 0, icon: FileCheck, tone: "text-success", bg: "bg-success/10", border: "border-success/30" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">공무원 대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">지방세 감면 신청 처리 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className={`${c.border} border`}>
              <CardContent className="pt-5 pb-4">
                <div className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${c.bg} ${c.tone} mb-3`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${c.tone}`}>{c.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">최근 신청 목록</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">접수번호</th>
                <th className="text-left">신청인</th>
                <th className="text-left">세목</th>
                <th className="text-left">상태</th>
                <th className="text-left">신청일</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2">
                    <Link to="/officer/applications/$id" params={{ id: r.id }} className="font-mono text-primary hover:underline">
                      {r.receipt_number}
                    </Link>
                  </td>
                  <td>{r.applicants?.name ?? "-"}</td>
                  <td>{r.tax_type}</td>
                  <td>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs ${statusBadgeClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">신청 내역이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">상태값: {STATUSES.join(" · ")}</p>
    </div>
  );
}
