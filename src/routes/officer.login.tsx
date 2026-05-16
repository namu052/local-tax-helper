import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/officer/login")({
  head: () => ({ meta: [{ title: "공무원 로그인" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/officer" });
  }

  async function onSignup() {
    if (!email || !password) return toast.error("이메일과 비밀번호를 입력하세요.");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + "/officer" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.user) {
      // assign default officer role
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: "officer" });
      toast.success("계정이 생성되었습니다. 로그인 해주세요.");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-sm text-muted-foreground inline-flex items-center mb-4"><ArrowLeft className="h-4 w-4 mr-1" />홈으로</Link>
        <Card>
          <CardHeader>
            <CardTitle>공무원 로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="e">이메일</Label>
                <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p">비밀번호</Label>
                <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>로그인</Button>
              <Button type="button" variant="outline" className="w-full" onClick={onSignup} disabled={loading}>
                테스트 계정 생성 (officer)
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                교육용 프로토타입: 임의 이메일/비밀번호로 계정을 생성할 수 있습니다.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
