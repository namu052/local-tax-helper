import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, FileText, Upload, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "관리자" }] }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!session || role !== "admin")) {
      // for prototype, allow officer to browse but warn
    }
  }, [loading, session, role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p>관리자 화면 접근에는 로그인이 필요합니다.</p>
          <Button onClick={() => navigate({ to: "/officer/login" })} className="mt-4">로그인</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/officer"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />돌아가기</Button></Link>
            <h1 className="font-semibold">관리자 화면</h1>
          </div>
          <span className="text-xs text-muted-foreground">{role !== "admin" && "⚠ 관리자 권한 없음 (보기 전용)"}</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <AdminTabs />
      </main>
    </div>
  );
}

function AdminTabs() {
  const [exemptions, setExemptions] = useState<any[]>([]);
  const [manualSets, setManualSets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("exemption_types").select("*").then(({ data }) => setExemptions(data ?? []));
    supabase.from("manual_sets").select("*").then(({ data }) => setManualSets(data ?? []));
    supabase.from("user_roles").select("user_id, role, created_at").then(({ data }) => setUsers(data ?? []));
  }, []);

  return (
    <Tabs defaultValue="exemption" className="space-y-4">
      <TabsList>
        <TabsTrigger value="exemption">감면 유형</TabsTrigger>
        <TabsTrigger value="documents">필요 서류</TabsTrigger>
        <TabsTrigger value="checklist">체크리스트</TabsTrigger>
        <TabsTrigger value="manual">매뉴얼 관리</TabsTrigger>
        <TabsTrigger value="users">사용자 관리</TabsTrigger>
      </TabsList>

      <TabsContent value="exemption">
        <Card>
          <CardHeader><CardTitle className="text-base">감면 유형 목록</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {exemptions.map((e) => (
                <li key={e.id} className="border rounded-md p-3 text-sm">
                  <div className="flex justify-between">
                    <strong>{e.title}</strong>
                    <span className="text-xs text-muted-foreground">{e.tax_type}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">{e.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents">
        <Card>
          <CardHeader><CardTitle className="text-base">감면 유형별 필요 서류</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {exemptions.map((e) => (
              <div key={e.id} className="border rounded-md p-3">
                <strong>{e.title}</strong>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {(e.required_documents ?? []).map((d: string) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="checklist">
        <Card>
          <CardHeader><CardTitle className="text-base">체크리스트 문항</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {exemptions.map((e) => (
              <div key={e.id} className="border rounded-md p-3">
                <strong>{e.title}</strong>
                <ul className="list-decimal list-inside text-muted-foreground mt-1">
                  {(e.checklist_rules ?? []).map((c: string) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="manual">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">매뉴얼 세트 목록</CardTitle>
              <Button size="sm" onClick={() => alert("2단계에서 구현 예정입니다")}>
                <FileText className="h-4 w-4 mr-1" />새 매뉴얼 세트 생성
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => alert("2단계에서 구현 예정입니다")}>
                <Upload className="h-4 w-4 mr-1" />1권 PDF 업로드
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("2단계에서 구현 예정입니다")}>
                <Upload className="h-4 w-4 mr-1" />2권 PDF 업로드
              </Button>
              <Button variant="outline" size="sm" onClick={() => alert("2단계에서 구현 예정입니다")}>
                <Search className="h-4 w-4 mr-1" />매뉴얼 검색
              </Button>
              <Button variant="destructive" size="sm" onClick={() => alert("2단계에서 구현 예정입니다")}>
                <Trash2 className="h-4 w-4 mr-1" />매뉴얼 비활성화
              </Button>
            </div>

            {manualSets.length === 0 ? (
              <div className="border-dashed border-2 rounded-md p-8 text-center text-sm text-muted-foreground">
                등록된 매뉴얼이 없습니다.
                <br />
                <span className="text-xs">실제 PDF 분석 및 매뉴얼 청크 생성은 2단계에서 구현됩니다.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {manualSets.map((m) => (
                  <li key={m.id} className="border rounded-md p-3 text-sm">
                    <strong>{m.title}</strong> ({m.year})
                    <span className="ml-2 text-xs">{m.is_active ? "✓ 활성" : "○ 비활성"}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border rounded-md p-4">
              <p className="text-sm font-semibold mb-2">매뉴얼 청크 목록</p>
              <p className="text-xs text-muted-foreground">2단계에서 구현 예정입니다.</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="users">
        <Card>
          <CardHeader><CardTitle className="text-base">사용자/권한 목록</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="text-left py-2">User ID</th><th className="text-left">역할</th><th className="text-left">등록일</th></tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{u.user_id}</td>
                    <td>{u.role}</td>
                    <td className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString("ko-KR")}</td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">사용자가 없습니다.</td></tr>}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-3">
              관리자 권한 부여는 데이터베이스에서 user_roles 테이블에 직접 'admin' 행을 추가하면 됩니다.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
