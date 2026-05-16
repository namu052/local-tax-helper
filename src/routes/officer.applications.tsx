import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUSES, TAX_TYPES, statusBadgeClass } from "@/lib/status";

export const Route = createFileRoute("/officer/applications")({
  head: () => ({ meta: [{ title: "신청 목록" }] }),
  component: List,
});

function List() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [tax, setTax] = useState<string>("all");

  useEffect(() => {
    supabase
      .from("tax_applications")
      .select("id, receipt_number, tax_type, status, created_at, applicants(name, phone), exemption_types(title)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (tax !== "all" && r.tax_type !== tax) return false;
      if (q) {
        const s = q.toLowerCase();
        const inAny =
          r.receipt_number?.toLowerCase().includes(s) ||
          r.applicants?.name?.toLowerCase().includes(s) ||
          r.applicants?.phone?.includes(q);
        if (!inAny) return false;
      }
      return true;
    });
  }, [rows, q, status, tax]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">신청 목록</h1>

      <Card>
        <CardContent className="pt-6 grid gap-3 md:grid-cols-4">
          <Input placeholder="접수번호 / 이름 / 전화번호" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="상태" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tax} onValueChange={setTax}>
            <SelectTrigger><SelectValue placeholder="세목" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 세목</SelectItem>
              {TAX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setQ(""); setStatus("all"); setTax("all"); }}>초기화</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">접수번호</th>
                <th className="text-left">신청인</th>
                <th className="text-left">세목</th>
                <th className="text-left">감면 유형</th>
                <th className="text-left">상태</th>
                <th className="text-left">신청일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 font-mono">{r.receipt_number}</td>
                  <td>{r.applicants?.name ?? "-"}</td>
                  <td>{r.tax_type}</td>
                  <td>{r.exemption_types?.title ?? "-"}</td>
                  <td><span className={`inline-flex px-2 py-0.5 rounded-md text-xs ${statusBadgeClass(r.status)}`}>{r.status}</span></td>
                  <td className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ko-KR")}</td>
                  <td>
                    <Link to="/officer/applications/$id" params={{ id: r.id }}>
                      <Button size="sm" variant="outline">상세</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">조건에 맞는 신청이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
