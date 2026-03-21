import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, Send, Trash2, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const VOUCHER_TYPES = [
  { value: "flight", label: "항공권" },
  { value: "hotel", label: "숙소" },
  { value: "transport", label: "교통" },
  { value: "other", label: "기타" },
];

export default function Vouchers() {
  const { t } = useTranslation();
  const [showUpload, setShowUpload] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [uploadForm, setUploadForm] = useState({
    registrationId: 0, voucherType: "flight" as string, title: "",
    fileBase64: "", fileName: "", mimeType: "", notes: "",
  });
  const [bulkFiles, setBulkFiles] = useState<{ registrationId: number; title: string; fileBase64: string; fileName: string; mimeType: string }[]>([]);
  const [bulkType, setBulkType] = useState("flight");

  const { data: vouchers, refetch } = trpc.voucher.list.useQuery(
    filterType === "all" ? undefined : { voucherType: filterType }
  );
  const { data: registrations } = trpc.registration.list.useQuery({ status: "approved" });
  const uploadMutation = trpc.voucher.upload.useMutation({
    onSuccess: () => { toast.success("바우처가 업로드되었습니다"); setShowUpload(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const bulkUploadMutation = trpc.voucher.bulkUpload.useMutation({
    onSuccess: (data) => { toast.success(`${data.count}개 바우처가 업로드되었습니다`); setShowBulk(false); setBulkFiles([]); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const sendMutation = trpc.voucher.sendToParticipant.useMutation({
    onSuccess: () => { toast.success("바우처가 전송되었습니다"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.voucher.delete.useMutation({
    onSuccess: () => { toast.success("삭제되었습니다"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const voucherList = useMemo(() => vouchers ?? [], [vouchers]);
  const regList = useMemo(() => registrations ?? [], [registrations]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setUploadForm({ ...uploadForm, fileBase64: base64, fileName: file.name, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const promises = files.map((file) => new Promise<typeof bulkFiles[0]>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        // Try to match registration by filename pattern: "name_phone" or "regId"
        const nameMatch = file.name.match(/^(\d+)/);
        const regId = nameMatch ? parseInt(nameMatch[1]) : 0;
        resolve({ registrationId: regId, title: file.name.replace(/\.[^.]+$/, ""), fileBase64: base64, fileName: file.name, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }));
    Promise.all(promises).then((results) => setBulkFiles(results));
  };

  const handleUpload = () => {
    if (!uploadForm.registrationId || !uploadForm.fileBase64 || !uploadForm.title) {
      toast.error("필수 항목을 입력하세요"); return;
    }
    uploadMutation.mutate({
      registrationId: uploadForm.registrationId,
      voucherType: uploadForm.voucherType as any,
      title: uploadForm.title,
      fileBase64: uploadForm.fileBase64,
      fileName: uploadForm.fileName,
      mimeType: uploadForm.mimeType,
      notes: uploadForm.notes || undefined,
    });
  };

  const handleBulkUpload = () => {
    const validFiles = bulkFiles.filter((f) => f.registrationId > 0);
    if (validFiles.length === 0) { toast.error("유효한 파일이 없습니다"); return; }
    bulkUploadMutation.mutate({ voucherType: bulkType as any, files: validFiles });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("admin.vouchers.title")}</h1>
          <p className="text-muted-foreground text-sm">항공권, 숙소 바우처 업로드 및 개별 전송</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showBulk} onOpenChange={setShowBulk}>
            <DialogTrigger asChild>
              <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> 일괄 업로드</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>바우처 일괄 업로드</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">파일명 앞에 신청 ID를 붙여주세요 (예: 1_항공권.pdf, 2_호텔바우처.pdf)</p>
                <div>
                  <Label>{t("admin.vouchers.voucherType")}</Label>
                  <Select value={bulkType} onValueChange={setBulkType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOUCHER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>파일 선택 (복수 선택 가능)</Label>
                  <Input type="file" multiple onChange={handleBulkFileSelect} />
                </div>
                {bulkFiles.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {bulkFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                        <span className="flex-1 truncate">{f.fileName}</span>
                        <Input type="number" className="w-24" placeholder="신청ID" value={f.registrationId || ""} onChange={(e) => {
                          const updated = [...bulkFiles];
                          updated[i] = { ...f, registrationId: parseInt(e.target.value) || 0 };
                          setBulkFiles(updated);
                        }} />
                      </div>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={handleBulkUpload} disabled={bulkUploadMutation.isPending || bulkFiles.length === 0}>
                  {bulkFiles.length}개 파일 업로드
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> 개별 업로드</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>바우처 업로드</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>참석자 *</Label>
                  <Select value={uploadForm.registrationId?.toString() || "0"} onValueChange={(v) => setUploadForm({ ...uploadForm, registrationId: parseInt(v) })}>
                    <SelectTrigger><SelectValue placeholder="참석자 선택" /></SelectTrigger>
                    <SelectContent>
                      {regList.map((r) => <SelectItem key={r.id} value={r.id.toString()}>{r.name} ({r.phone})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("admin.vouchers.voucherType")}</Label>
                  <Select value={uploadForm.voucherType} onValueChange={(v) => setUploadForm({ ...uploadForm, voucherType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VOUCHER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>제목 *</Label>
                  <Input value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="예: 인천-두바이 항공권" />
                </div>
                <div>
                  <Label>파일 *</Label>
                  <Input type="file" onChange={handleFileSelect} />
                  {uploadForm.fileName && <p className="text-xs text-muted-foreground mt-1">{uploadForm.fileName}</p>}
                </div>
                <div>
                  <Label>메모</Label>
                  <Input value={uploadForm.notes} onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })} placeholder="추가 메모" />
                </div>
                <Button className="w-full" onClick={handleUpload} disabled={uploadMutation.isPending}>업로드</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {VOUCHER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>참석자</TableHead>
                <TableHead>유형</TableHead>
                <TableHead>제목</TableHead>
                <TableHead>파일</TableHead>
                <TableHead>전송 상태</TableHead>
                <TableHead>작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voucherList.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.id}</TableCell>
                  <TableCell>
                    {regList.find((r) => r.id === v.registrationId)?.name || `#${v.registrationId}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{VOUCHER_TYPES.find((t) => t.value === v.voucherType)?.label || v.voucherType}</Badge>
                  </TableCell>
                  <TableCell>{v.title}</TableCell>
                  <TableCell>
                    <a href={v.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                      <Download className="h-3 w-3" /> {v.fileName}
                    </a>
                  </TableCell>
                  <TableCell>
                    {v.sentToParticipant ? (
                      <Badge className="bg-green-500/20 text-green-400">전송됨 ({v.sentMethod})</Badge>
                    ) : (
                      <Badge variant="outline">미전송</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!v.sentToParticipant && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => sendMutation.mutate({ voucherId: v.id, method: "web" })} disabled={sendMutation.isPending}>
                            <Send className="h-3 w-3 mr-1" /> 웹
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => sendMutation.mutate({ voucherId: v.id, method: "telegram" })} disabled={sendMutation.isPending}>
                            <Send className="h-3 w-3 mr-1" /> TG
                          </Button>
                        </>
                      )}
                      <Button variant="destructive" size="sm" onClick={() => { if (confirm("삭제?")) deleteMutation.mutate({ id: v.id }); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {voucherList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    업로드된 바우처가 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
