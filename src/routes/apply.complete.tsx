import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/apply/complete")({
  validateSearch: (search: Record<string, unknown>) => ({
    receipt: (search.receipt as string) ?? "",
  }),
  head: () => ({ meta: [{ title: "신청 완료" }] }),
  component: CompletePage,
});

function CompletePage() {
  const { receipt } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-10 pb-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">신청이 정상적으로 접수되었습니다</h1>
          <p className="text-muted-foreground text-sm mb-6">담당 공무원이 검토 후 결과를 안내해 드립니다.</p>

          <div className="rounded-lg bg-muted p-6 mb-6">
            <p className="text-xs text-muted-foreground mb-1">접수번호</p>
            <p className="text-3xl font-mono font-bold text-primary">{receipt}</p>
            <p className="text-xs text-muted-foreground mt-3">현재 상태</p>
            <p className="text-sm font-semibold mt-1">AI 검토 대기</p>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            처리 결과는 <strong>접수번호와 전화번호</strong>로 결과 조회 화면에서 확인할 수 있습니다.
          </p>

          <div className="flex gap-2 justify-center">
            <Link to="/"><Button variant="outline">메인으로</Button></Link>
            <Link to="/lookup"><Button>결과 조회</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
