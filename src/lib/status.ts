export const STATUSES = [
  "접수",
  "AI 검토 대기",
  "AI 검토 완료",
  "담당자 검토 중",
  "보완 요청",
  "답변 완료",
  "반려",
] as const;

export type Status = (typeof STATUSES)[number];

export const TAX_TYPES = ["취득세", "자동차세", "재산세", "등록면허세", "지방소득세", "주민세"] as const;

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "접수":
      return "bg-muted text-muted-foreground";
    case "AI 검토 대기":
      return "bg-info/15 text-info border border-info/30";
    case "AI 검토 완료":
      return "bg-accent text-accent-foreground";
    case "담당자 검토 중":
      return "bg-primary/10 text-primary border border-primary/20";
    case "보완 요청":
      return "bg-warning/15 text-warning border border-warning/30";
    case "답변 완료":
      return "bg-success/15 text-success border border-success/30";
    case "반려":
      return "bg-destructive/15 text-destructive border border-destructive/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}
