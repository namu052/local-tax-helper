import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";
import { ingestManualVolume, getManualSetStats } from "@/lib/manual-ingest.functions";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Upload,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  Circle,
  Plus,
  Database,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "관리자" }] }),
  component: Admin,
});

function Admin() {
  const navigate = useNavigate();
  const { session, role, loading } = useAuth();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p>관리자 화면 접근에는 로그인이 필요합니다.</p>
          <Button onClick={() => navigate({ to: "/officer/login" })} className="mt-4">
            로그인
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/officer">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                돌아가기
              </Button>
            </Link>
            <h1 className="font-semibold">관리자 화면</h1>
          </div>
          <span className="text-xs text-muted-foreground">
            {role !== "admin" && "⚠ 관리자 권한 없음 (보기 전용)"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <AdminTabs role={role} />
      </main>
    </div>
  );
}

function AdminTabs({ role }: { role: string | null }) {
  const [exemptions, setExemptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("exemption_types").select("*").then(({ data }) => setExemptions(data ?? []));
    supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  return (
    <Tabs defaultValue="manual" className="space-y-4">
      <TabsList>
        <TabsTrigger value="exemption">감면 유형</TabsTrigger>
        <TabsTrigger value="documents">필요 서류</TabsTrigger>
        <TabsTrigger value="checklist">체크리스트</TabsTrigger>
        <TabsTrigger value="manual">매뉴얼 관리</TabsTrigger>
        <TabsTrigger value="users">사용자 관리</TabsTrigger>
      </TabsList>

      <TabsContent value="exemption">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">감면 유형 목록</CardTitle>
          </CardHeader>
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
          <CardHeader>
            <CardTitle className="text-base">감면 유형별 필요 서류</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {exemptions.map((e) => (
              <div key={e.id} className="border rounded-md p-3">
                <strong>{e.title}</strong>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {(e.required_documents ?? []).map((d: string) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="checklist">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">체크리스트 문항</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {exemptions.map((e) => (
              <div key={e.id} className="border rounded-md p-3">
                <strong>{e.title}</strong>
                <ul className="list-decimal list-inside text-muted-foreground mt-1">
                  {(e.checklist_rules ?? []).map((c: string) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="manual">
        <ManualManager isAdmin={role === "admin"} />
      </TabsContent>

      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용자/권한 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">User ID</th>
                  <th className="text-left">역할</th>
                  <th className="text-left">등록일</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{u.user_id}</td>
                    <td>{u.role}</td>
                    <td className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      사용자가 없습니다.
                    </td>
                  </tr>
                )}
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

// =================== Manual Manager ===================

type ManualSet = {
  id: string;
  title: string;
  year: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ManualVolume = {
  id: string;
  manual_set_id: string;
  volume_number: number;
  title: string | null;
  file_name: string | null;
  file_url: string | null;
  page_count: number | null;
  uploaded_at: string | null;
};

function ManualManager({ isAdmin }: { isAdmin: boolean }) {
  const [sets, setSets] = useState<ManualSet[]>([]);
  const [volumes, setVolumes] = useState<ManualVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, v] = await Promise.all([
      supabase.from("manual_sets").select("*").order("created_at", { ascending: false }),
      supabase.from("manual_volumes").select("*"),
    ]);
    setSets((s.data ?? []) as ManualSet[]);
    setVolumes((v.data ?? []) as ManualVolume[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const volumesFor = (setId: string) => volumes.filter((v) => v.manual_set_id === setId);

  const toggleActive = async (set: ManualSet) => {
    const { error } = await supabase
      .from("manual_sets")
      .update({ is_active: !set.is_active })
      .eq("id", set.id);
    if (error) return toast.error("상태 변경 실패: " + error.message);
    toast.success(set.is_active ? "비활성화 되었습니다" : "활성화 되었습니다");
    reload();
  };

  const detailSet = detailId ? sets.find((s) => s.id === detailId) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardTitle className="text-base">매뉴얼 관리</CardTitle>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              감면 매뉴얼은 1권과 2권을 각각 업로드하세요. 업로드된 파일은 하나의 매뉴얼 세트로 묶여
              관리되며, 이후 AI 사전검토 기능에서 근거 자료로 활용됩니다.
              <br />
              이번 단계에서는 파일 업로드와 권별 관리만 수행하며, PDF 내용 분석은 다음 단계에서
              진행됩니다.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />새 매뉴얼 세트
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="animate-spin h-5 w-5" />
          </div>
        ) : sets.length === 0 ? (
          <div className="border-dashed border-2 rounded-md p-8 text-center text-sm text-muted-foreground">
            등록된 매뉴얼 세트가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 px-2">제목</th>
                  <th className="text-left px-2">연도</th>
                  <th className="text-left px-2">1권</th>
                  <th className="text-left px-2">2권</th>
                  <th className="text-left px-2">상태</th>
                  <th className="text-left px-2">생성일</th>
                  <th className="text-right px-2">관리</th>
                </tr>
              </thead>
              <tbody>
                {sets.map((s) => {
                  const vs = volumesFor(s.id);
                  const v1 = vs.find((v) => v.volume_number === 1);
                  const v2 = vs.find((v) => v.volume_number === 2);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-3 px-2 font-medium">{s.title}</td>
                      <td className="px-2">{s.year ?? "-"}</td>
                      <td className="px-2"><VolumeBadge volume={v1} /></td>
                      <td className="px-2"><VolumeBadge volume={v2} /></td>
                      <td className="px-2">
                        {s.is_active ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">활성</Badge>
                        ) : (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                      </td>
                      <td className="px-2 text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-2 text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setDetailId(s.id)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />상세
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant={s.is_active ? "destructive" : "secondary"}
                            onClick={() => toggleActive(s)}
                          >
                            {s.is_active ? "비활성화" : "활성화"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <CreateSetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={reload}
      />

      <DetailDialog
        set={detailSet ?? null}
        volumes={detailSet ? volumesFor(detailSet.id) : []}
        isAdmin={isAdmin}
        onClose={() => setDetailId(null)}
        onChanged={reload}
      />
    </Card>
  );
}

function VolumeBadge({ volume }: { volume: ManualVolume | undefined }) {
  if (!volume)
    return (
      <Badge variant="secondary" className="gap-1">
        <Circle className="h-3 w-3" />미업로드
      </Badge>
    );
  if (!volume.file_url)
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />오류
      </Badge>
    );
  return (
    <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
      <CheckCircle2 className="h-3 w-3" />
      업로드 완료
      {volume.page_count ? <span className="ml-1 opacity-80">({volume.page_count}p)</span> : null}
    </Badge>
  );
}

function CreateSetDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setYear(new Date().getFullYear().toString());
    setDescription("");
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("제목을 입력하세요");
    const yearNum = Number(year);
    if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > 2100)
      return toast.error("올바른 연도를 입력하세요");
    setSaving(true);
    const { error } = await supabase.from("manual_sets").insert({
      title: title.trim(),
      year: yearNum,
      description: description.trim() || null,
      is_active: isActive,
    });
    setSaving(false);
    if (error) return toast.error("저장 실패: " + error.message);
    toast.success("매뉴얼 세트가 생성되었습니다");
    reset();
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 매뉴얼 세트 생성</DialogTitle>
          <DialogDescription>
            매뉴얼 세트를 먼저 생성한 후, 상세 화면에서 1권/2권 PDF를 업로드하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>제목 *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 2026년 지방세 감면 매뉴얼" maxLength={200} />
          </div>
          <div>
            <Label>연도 *</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <Label>설명</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label>활성화</Label>
              <p className="text-xs text-muted-foreground">활성 매뉴얼만 AI 사전검토에 사용됩니다</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  set,
  volumes,
  isAdmin,
  onClose,
  onChanged,
}: {
  set: ManualSet | null;
  volumes: ManualVolume[];
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  if (!set) return null;
  const v1 = volumes.find((v) => v.volume_number === 1);
  const v2 = volumes.find((v) => v.volume_number === 2);

  return (
    <Dialog open={!!set} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{set.title}</DialogTitle>
          <DialogDescription>
            {set.year}년 ·{" "}
            {set.is_active ? (
              <span className="text-emerald-600">활성</span>
            ) : (
              <span className="text-muted-foreground">비활성</span>
            )}
            {set.description ? <> · {set.description}</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <VolumeCard
            setId={set.id}
            volumeNumber={1}
            volume={v1}
            isAdmin={isAdmin}
            onChanged={onChanged}
          />
          <VolumeCard
            setId={set.id}
            volumeNumber={2}
            volume={v2}
            isAdmin={isAdmin}
            onChanged={onChanged}
          />

          <div className="border-2 border-dashed rounded-md p-4 bg-muted/40">
            <p className="text-sm font-semibold mb-1">PDF 내용 DB화</p>
            <p className="text-xs text-muted-foreground">
              PDF 내용 DB화는 3단계에서 구현 예정입니다.
            </p>
            <Button size="sm" variant="outline" className="mt-3" disabled>
              PDF 내용 DB화 실행 (3단계 예정)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VolumeCard({
  setId,
  volumeNumber,
  volume,
  isAdmin,
  onChanged,
}: {
  setId: string;
  volumeNumber: number;
  volume: ManualVolume | undefined;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDF 파일만 업로드 가능합니다");
      return;
    }
    setUploading(true);
    try {
      // page count
      let pageCount: number | null = null;
      try {
        const buf = await file.arrayBuffer();
        const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
        pageCount = pdf.getPageCount();
      } catch (e) {
        console.warn("page count parse failed", e);
      }

      const path = `${setId}/vol-${volumeNumber}-${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("manuals")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      // delete previous volume row if exists (single volume per set)
      if (volume) {
        await supabase.from("manual_volumes").delete().eq("id", volume.id);
        if (volume.file_url) {
          // best-effort delete previous file from storage
          const prevPath = volume.file_url.split("/manuals/")[1];
          if (prevPath) await supabase.storage.from("manuals").remove([prevPath]);
        }
      }

      const { error: insErr } = await supabase.from("manual_volumes").insert({
        manual_set_id: setId,
        volume_number: volumeNumber,
        title: `${volumeNumber}권`,
        file_name: file.name,
        file_url: path,
        page_count: pageCount,
        uploaded_at: new Date().toISOString(),
      });
      if (insErr) throw insErr;

      toast.success(`${volumeNumber}권이 업로드 되었습니다`);
      onChanged();
    } catch (e: any) {
      toast.error("업로드 실패: " + (e.message ?? String(e)));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handlePreview = async () => {
    if (!volume?.file_url) return;
    const { data, error } = await supabase.storage
      .from("manuals")
      .createSignedUrl(volume.file_url, 60 * 10);
    if (error) return toast.error(error.message);
    setPreviewUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="border rounded-md p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold">{volumeNumber}권</p>
          {volume ? (
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <p>파일명: {volume.file_name}</p>
              <p>페이지 수: {volume.page_count ?? "-"}</p>
              <p>
                업로드 일시:{" "}
                {volume.uploaded_at
                  ? new Date(volume.uploaded_at).toLocaleString("ko-KR")
                  : "-"}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">아직 업로드되지 않았습니다</p>
          )}
        </div>
        <VolumeBadge volume={volume} />
      </div>

      <div className="flex gap-2">
        {volume && (
          <Button size="sm" variant="outline" onClick={handlePreview}>
            <Download className="h-3.5 w-3.5 mr-1" />다운로드 / 미리보기
          </Button>
        )}
        {isAdmin && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1" />
              )}
              {volume ? "다시 업로드" : `${volumeNumber}권 PDF 업로드`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
