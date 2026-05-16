// Heuristic Korean keyword classifier for manual chunks.
// Used by both server (ingest) and is safe to import client-side.

const TAX_TYPES = [
  "취득세",
  "자동차세",
  "재산세",
  "등록면허세",
  "지방소득세",
  "주민세",
];

const EXEMPTION_TYPES: Array<{ name: string; keywords: string[] }> = [
  { name: "생애최초 주택 구입 취득세 감면", keywords: ["생애최초", "최초 주택", "주택 구입"] },
  { name: "장애인 자동차 관련 감면", keywords: ["장애인"] },
  { name: "다자녀 양육자 자동차 취득세 감면", keywords: ["다자녀", "양육자", "3자녀", "세 자녀"] },
  { name: "국가유공자 감면", keywords: ["국가유공자", "유공자", "보훈"] },
];

const STOPWORDS = new Set([
  "있다", "없다", "또는", "그리고", "이다", "한다", "하는", "에서", "으로", "에는",
  "위한", "관련", "경우", "다음", "각호", "이를", "그", "이", "및", "등", "에", "의",
  "을", "를", "은", "는", "가", "이", "도", "와", "과", "로", "에서", "수", "그것",
]);

export function detectTaxType(text: string): string {
  for (const t of TAX_TYPES) {
    if (text.includes(t)) return t;
  }
  return "미분류";
}

export function detectExemptionType(text: string): string {
  for (const e of EXEMPTION_TYPES) {
    if (e.keywords.some((k) => text.includes(k))) return e.name;
  }
  return "미분류";
}

export function detectLegalBasis(text: string): string | null {
  // Match Korean law citations like "지방세특례제한법 제36조" or "제36조의2 제1항"
  const re = /(?:[가-힣A-Za-z]+법(?:\s*시행령)?\s*)?제\s*\d+\s*조(?:의\s*\d+)?(?:\s*제\s*\d+\s*항)?/g;
  const m = text.match(re);
  if (!m || m.length === 0) return null;
  return Array.from(new Set(m)).slice(0, 5).join(", ");
}

export function extractKeywords(text: string, max = 8): string[] {
  // Tokenize Korean/English words of length >= 2
  const tokens = text
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && w.length <= 20 && !STOPWORDS.has(w));
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export function summarize(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + "…";
}

export function chunkPageText(text: string, maxLen = 600): string[] {
  const clean = text.replace(/\r/g, "").trim();
  if (!clean) return [];
  // Split by paragraph (double newlines), then pack into ~maxLen chunks
  const paras = clean.split(/\n\s*\n+/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  for (const p of paras) {
    if ((buf + " " + p).trim().length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = "";
    }
    if (p.length > maxLen) {
      // hard split overlong paragraph
      if (buf) {
        chunks.push(buf.trim());
        buf = "";
      }
      for (let i = 0; i < p.length; i += maxLen) {
        chunks.push(p.slice(i, i + maxLen));
      }
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length > 0 ? chunks : [clean.slice(0, maxLen)];
}
