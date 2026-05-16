import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Search } from "lucide-react";
import { searchManualChunks, getManualChunk } from "@/lib/manual-ingest.functions";

export const Route = createFileRoute("/officer/manual")({
  head: () => ({ meta: [{ title: "매뉴얼 검색" }] }),
  component: ManualSearch,
});

const TAX_TYPES = ["", "취득세", "자동차세", "재산세", "등록면허세", "지방소득세", "주민세", "미분류"];
const EXEMPTION_TYPES = [
  "",
  "생애최초 주택 구입 취득세 감면",
  "장애인 자동차 관련 감면",
  "다자녀 양육자 자동차 취득세 감면",
  "국가유공자 감면",
  "미분류",
];

function ManualSearch() {
  const search = useServerFn(searchManualChunks);
  const [q, setQ] = useState("");
  const [tax, setTax] = useState("");
  const [ex, setEx] = useState("");
  const [vol, setVol] = useState<string>("");
  const [page, setPage] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const r = await search({
        data: {
          q: q || undefined,
          taxType: tax || undefined,
          exemptionType: ex || undefined,
          volumeNumber: vol ? Number(vol) : undefined,
          pageNumber: page ? Number(page) : undefined,
          limit: 50,
        },
      });
      setResults(r.results);
    } finally {
      setLoading(false);
    }
  }, [search, q, tax, ex, vol, page]);

  useEffect(() => {
    run();
  }, []); // initial load

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">매뉴얼 검색</h1>
        <p className="text-xs text-muted-foreground mt-1">
          지방세 감면 매뉴얼 청크를 키워드·세목·감면 유형·권수·페이지로 검색합니다.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-5">
              <Label className="text-xs">키워드</Label>
              <Input
                placeholder="예: 생애최초, 장애인, 제36조"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="md:col-span-3">
              <Label className="text-xs">세목</Label>
              <select
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {TAX_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || "전체"}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <Label className="text-xs">감면 유형</Label>
              <select
                value={ex}
                onChange={(e) => setEx(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {EXEMPTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t || "전체"}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">권수</Label>
              <select
                value={vol}
                onChange={(e) => setVol(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">전체</option>
                <option value="1">1권</option>
                <option value="2">2권</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">페이지</Label>
              <Input
                type="number"
                value={page}
                onChange={(e) => setPage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="md:col-span-8 flex items-end">
              <Button onClick={run} disabled={loading} className="w-full md:w-auto">
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                검색
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">검색 결과 ({results.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">검색 결과가 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.id} className="border rounded-md p-3 text-sm">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <Badge variant="outline">{r.manual_title ?? "-"}</Badge>
                    <Badge>{r.volume_number ?? "-"}권</Badge>
                    <Badge variant="secondary">p.{r.page_number}</Badge>
                    {r.tax_type && r.tax_type !== "미분류" && (
                      <Badge variant="outline">{r.tax_type}</Badge>
                    )}
                    {r.exemption_type && r.exemption_type !== "미분류" && (
                      <Badge variant="outline">{r.exemption_type}</Badge>
                    )}
                    <div className="ml-auto">
                      <Button size="sm" variant="ghost" onClick={() => setDetailId(r.id)}>상세</Button>
                    </div>
                  </div>
                  <p className="text-muted-foreground line-clamp-3">{r.chunk_summary || r.chunk_text?.slice(0, 200)}</p>
                  {r.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.keywords.slice(0, 8).map((k: string) => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{k}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ChunkDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function ChunkDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const fetchChunk = useServerFn(getManualChunk);
  const [chunk, setChunk] = useState<any | null>(null);
  useEffect(() => {
    if (!id) return;
    setChunk(null);
    fetchChunk({ data: { id } }).then(setChunk).catch(() => setChunk(null));
  }, [id, fetchChunk]);

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>청크 상세</DialogTitle>
          <DialogDescription>매뉴얼 원문 청크 상세 내용입니다.</DialogDescription>
        </DialogHeader>
        {!chunk ? (
          <div className="py-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{chunk.manual_title ?? "-"}</Badge>
              <Badge>{chunk.volume_number ?? "-"}권</Badge>
              <Badge variant="secondary">p.{chunk.page_number}</Badge>
              <Badge variant="outline">{chunk.tax_type ?? "미분류"}</Badge>
              <Badge variant="outline">{chunk.exemption_type ?? "미분류"}</Badge>
            </div>
            {chunk.legal_basis && (
              <div>
                <Label className="text-xs">법적 근거</Label>
                <p className="text-muted-foreground">{chunk.legal_basis}</p>
              </div>
            )}
            {chunk.keywords?.length > 0 && (
              <div>
                <Label className="text-xs">키워드</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {chunk.keywords.map((k: string) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{k}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">청크 요약</Label>
              <p className="text-muted-foreground">{chunk.chunk_summary}</p>
            </div>
            <div>
              <Label className="text-xs">청크 원문</Label>
              <div className="border rounded-md p-3 max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed text-foreground">
                {chunk.chunk_text}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
