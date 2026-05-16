// 주민등록번호 마스킹 유틸리티
// 절대 원문을 저장하지 않는다.
export function parseRrn(rrn: string): { front: string; masked: string } | null {
  const cleaned = rrn.replace(/\s|-/g, "");
  if (!/^\d{13}$/.test(cleaned)) return null;
  const front = cleaned.slice(0, 6);
  const firstBack = cleaned.slice(6, 7);
  return { front, masked: `${firstBack}******` };
}

export function formatMaskedRrn(front?: string | null, masked?: string | null): string {
  if (!front || !masked) return "-";
  return `${front}-${masked}`;
}
