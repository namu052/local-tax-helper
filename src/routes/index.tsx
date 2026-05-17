import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Shield, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI 기반 지방세 감면 신청 시스템" },
      { name: "description", content: "지방세 감면 신청 및 매뉴얼 근거 검토 시스템 (교육용 프로토타입)" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-1.5 flex items-center justify-between">
          <span>○○시청 지방세과 · 감면 신청 민원 포털</span>
          <span className="hidden sm:inline opacity-80">교육용 프로토타입 (Demo)</span>
        </div>
      </div>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">세</div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold text-foreground">AI 기반 지방세 감면 신청 시스템</h1>
              <p className="text-xs text-muted-foreground">매뉴얼 근거 검토 · 사전검토 자동화</p>
            </div>
          </div>
          <Link to="/officer/login">
            <Button variant="outline" size="sm">공무원 로그인</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">교육용 프로토타입 · 개인정보 보호 안내</p>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              본 시스템은 교육용 프로토타입입니다. 실제 주민등록번호·전화번호 등 개인정보 대신
              <strong className="text-foreground"> 테스트용 더미 데이터</strong>만 입력해 주세요.
              주민등록번호는 원문으로 저장되지 않으며 마스킹 처리됩니다. AI는 감면 여부를 확정하지 않으며,
              담당 공무원의 사전검토 참고자료만 생성합니다.
            </p>
          </div>
        </div>

        <section className="mb-10">
          <p className="text-xs font-semibold text-primary tracking-wider uppercase">지방세 감면 민원 서비스</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mt-2">
            감면 신청부터 매뉴얼 근거 검토까지, 한 곳에서
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl text-sm sm:text-base leading-relaxed">
            민원인이 온라인으로 감면 신청을 제출하면, AI가 지방세 감면 매뉴얼 1권·2권에서 관련 근거를 찾아
            사전검토 자료를 생성합니다. 담당 공무원은 이를 참고하여 최종 답변을 작성합니다.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>감면 신청하기</CardTitle>
              <CardDescription>지방세 감면 신청서를 작성하여 제출합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/apply">
                <Button className="w-full">신청서 작성</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Search className="h-8 w-8 text-primary mb-2" />
              <CardTitle>신청 결과 조회</CardTitle>
              <CardDescription>접수번호와 전화번호로 처리 상태를 확인합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/lookup">
                <Button className="w-full" variant="secondary">결과 조회</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-colors">
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>공무원 로그인</CardTitle>
              <CardDescription>담당 공무원·관리자 내부 화면 접근.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/officer/login">
                <Button className="w-full" variant="outline">로그인</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="border-t border-border bg-card mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-xs text-muted-foreground space-y-1">
          <p>본 AI 검토 결과는 업로드된 감면 매뉴얼을 참고하여 생성된 사전검토 자료입니다. 최종 감면 여부는 관련 법령, 조례, 제출 서류 및 담당 공무원의 검토에 따라 결정됩니다.</p>
          <p>© 교육용 프로토타입 · AI 기반 지방세 감면 신청 시스템</p>
        </div>
      </footer>
    </div>
  );
}
