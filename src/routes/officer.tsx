import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Settings, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/officer")({
  component: OfficerLayout,
});

function OfficerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session && !location.pathname.includes("/login")) {
      navigate({ to: "/officer/login" });
    }
  }, [loading, session, navigate, location.pathname]);

  if (location.pathname === "/officer/login") return <Outlet />;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!session) return null;
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-semibold">권한이 부여되지 않은 계정입니다.</p>
          <p className="text-sm text-muted-foreground mt-2">관리자에게 권한을 요청하세요.</p>
          <Button onClick={() => supabase.auth.signOut()} className="mt-4">로그아웃</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/officer" className="font-semibold text-primary">지방세 감면 시스템</Link>
            <nav className="flex items-center gap-1">
              <NavBtn to="/officer" icon={<LayoutDashboard className="h-4 w-4" />}>대시보드</NavBtn>
              <NavBtn to="/officer/applications" icon={<FileText className="h-4 w-4" />}>신청 목록</NavBtn>
              {role === "admin" && (
                <NavBtn to="/admin" icon={<Settings className="h-4 w-4" />}>관리자</NavBtn>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{session.user.email} · {role}</span>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/" }))}>
              <LogOut className="h-4 w-4 mr-1" />로그아웃
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavBtn({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link to={to} activeOptions={{ exact: to === "/officer" }}>
      {({ isActive }) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
          {icon}{children}
        </span>
      )}
    </Link>
  );
}
