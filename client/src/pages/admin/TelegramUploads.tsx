import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, RefreshCw, Check, X, Trash2, Eye, Plane, Hotel, Calendar, Truck, HelpCircle, FileText, Bot } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "대기중", color: "bg-yellow-500/20 text-yellow-400" },
  parsed: { label: "파싱완료", color: "bg-blue-500/20 text-blue-400" },
  approved: { label: "승인됨", color: "bg-green-500/20 text-green-400" },
  applied: { label: "적용됨", color: "bg-emerald-500/20 text-emerald-400" },
  rejected: { label: "거절됨", color: "bg-red-500/20 text-red-400" },
};

const TYPE_MAP: Record<string, { label: string; icon: any; color: string }> = {
  flight: { label: "항공편", icon: Plane, color: "text-blue-400" },
  hotel: { label: "숙소", icon: Hotel, color: "text-purple-400" },
  schedule: { label: "일정", icon: Calendar, color: "text-orange-400" },
  transfer: { label: "교통", icon: Truck, color: "text-green-400" },
  general: { label: "일반", icon: FileText, color: "text-gray-400" },
  unknown: { label: "미분류", icon: HelpCircle, color: "text-gray-500" },
};

export default function TelegramUploads() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedUpload, setSelectedUpload] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [meetupIdInput, setMeetupIdInput] = useState("");

  const { data: uploads, refetch } = trpc.telegramUpload.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    parsedType: typeFilter !== "all" ? typeFilter : undefined,
  });
  const { data: stats } = trpc.telegramUpload.stats.useQuery();
  const { data: meetups } = trpc.meetup.list.useQuery();

  const reparseMutation = trpc.telegramUpload.reparse.useMutation({
    onSuccess: () => { toast.success("재파싱 완료"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const approveMutation = trpc.telegramUpload.approve.useMutation({
    onSuccess: (r) => { toast.success(`승인 완료 (${r.appliedToTable})`); setSelectedUpload(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.telegramUpload.reject.useMutation({
    onSuccess: () => { toast.success("거절 완료"); setSelectedUpload(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.telegramUpload.delete.useMutation({
    onSuccess: () => { toast.success("삭제 완료"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-400" />
            텔레그램 자동 업로드
          </h1>
          <p className="text-muted-foreground mt-1">텔레그램으로 전송된 여행 정보를 AI가 자동으로 파싱하여 백오피스에 등록합니다</p>
        </div>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { label: "전체", value: stats.total, color: "text-foreground" },
            { label: "대기중", value: stats.pending, color: "text-yellow-400" },
            { label: "파싱완료", value: stats.parsed, color: "text-blue-400" },
            { label: "승인됨", value: stats.approved, color: "text-green-400" },
            { label: "적용됨", value: stats.applied, color: "text-emerald-400" },
            { label: "거절됨", value: stats.rejected, color: "text-red-400" },
          ].map((s) => (
            <Card key={s.label} className="bg-card/50">
              <CardContent className="p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="상태" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="pending">대기중</SelectItem>
            <SelectItem value="parsed">파싱완료</SelectItem>
            <SelectItem value="approved">승인됨</SelectItem>
            <SelectItem value="applied">적용됨</SelectItem>
            <SelectItem value="rejected">거절됨</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="유형" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="flight">항공편</SelectItem>
            <SelectItem value="hotel">숙소</SelectItem>
            <SelectItem value="schedule">일정</SelectItem>
            <SelectItem value="transfer">교통</SelectItem>
            <SelectItem value="general">일반</SelectItem>
            <SelectItem value="unknown">미분류</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 업로드 목록 */}
      <div className="space-y-3">
        {uploads?.length === 0 && (
          <Card className="bg-card/50">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>텔레그램에서 업로드된 여행 정보가 없습니다</p>
              <p className="text-sm mt-1">텔레그램 봇으로 여행 정보를 전송하면 여기에 자동으로 표시됩니다</p>
            </CardContent>
          </Card>
        )}
        {uploads?.map((upload: any) => {
          const typeInfo = TYPE_MAP[upload.parsedType] || TYPE_MAP.unknown;
          const statusInfo = STATUS_MAP[upload.status] || STATUS_MAP.pending;
          const TypeIcon = typeInfo.icon;
          return (
            <Card key={upload.id} className="bg-card/50 hover:bg-card/70 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg bg-background/50 ${typeInfo.color}`}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                        <Badge variant="outline">{typeInfo.label}</Badge>
                        {upload.parsedConfidence > 0 && (
                          <Badge variant="outline" className={upload.parsedConfidence >= 80 ? "text-green-400" : upload.parsedConfidence >= 50 ? "text-yellow-400" : "text-red-400"}>
                            신뢰도 {upload.parsedConfidence}%
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">#{upload.id}</span>
                      </div>
                      <p className="text-sm mt-1 line-clamp-2">{upload.parsedSummary || upload.rawText || "(내용 없음)"}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>보낸 사람: {upload.uploadedBy || "알 수 없음"}</span>
                        <span>{new Date(upload.createdAt).toLocaleString("ko-KR")}</span>
                        {upload.appliedToTable && <span>적용: {upload.appliedToTable} #{upload.appliedToId}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedUpload(upload)} title="상세보기">
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(upload.status === "pending" || upload.status === "parsed") && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => reparseMutation.mutate({ id: upload.id })} disabled={reparseMutation.isPending} title="재파싱">
                          <RefreshCw className={`h-4 w-4 ${reparseMutation.isPending ? "animate-spin" : ""}`} />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: upload.id }); }} title="삭제">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 상세 다이얼로그 */}
      <Dialog open={!!selectedUpload} onOpenChange={() => setSelectedUpload(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              텔레그램 업로드 상세 #{selectedUpload?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedUpload && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">상태</label>
                  <Badge className={STATUS_MAP[selectedUpload.status]?.color}>{STATUS_MAP[selectedUpload.status]?.label}</Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">유형</label>
                  <Badge variant="outline">{TYPE_MAP[selectedUpload.parsedType]?.label || "미분류"}</Badge>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">보낸 사람</label>
                  <p className="text-sm">{selectedUpload.uploadedBy || "알 수 없음"}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">신뢰도</label>
                  <p className="text-sm">{selectedUpload.parsedConfidence}%</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">원본 텍스트</label>
                <div className="bg-background/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedUpload.rawText || "(없음)"}
                </div>
              </div>

              {selectedUpload.parsedSummary && (
                <div>
                  <label className="text-xs text-muted-foreground">AI 파싱 요약</label>
                  <div className="bg-blue-500/10 rounded-lg p-3 text-sm">{selectedUpload.parsedSummary}</div>
                </div>
              )}

              {selectedUpload.parsedData && (
                <div>
                  <label className="text-xs text-muted-foreground">파싱된 데이터</label>
                  <pre className="bg-background/50 rounded-lg p-3 text-xs overflow-x-auto max-h-60 overflow-y-auto">
                    {JSON.stringify(selectedUpload.parsedData, null, 2)}
                  </pre>
                </div>
              )}

              {(selectedUpload.status === "parsed" || selectedUpload.status === "pending") && (
                <div className="space-y-3 border-t pt-3">
                  <h4 className="font-medium">승인/거절</h4>
                  <div>
                    <label className="text-xs text-muted-foreground">밋업 선택 (선택사항)</label>
                    <Select value={meetupIdInput} onValueChange={setMeetupIdInput}>
                      <SelectTrigger><SelectValue placeholder="밋업 선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        {meetups?.map((m: any) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">메모</label>
                    <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="검토 메모 (선택사항)" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({
                        id: selectedUpload.id,
                        meetupId: meetupIdInput && meetupIdInput !== "none" ? parseInt(meetupIdInput) : undefined,
                        notes: reviewNotes || undefined,
                      })}
                      disabled={approveMutation.isPending}
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" /> 승인 & 적용
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => rejectMutation.mutate({ id: selectedUpload.id, notes: reviewNotes || undefined })}
                      disabled={rejectMutation.isPending}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" /> 거절
                    </Button>
                  </div>
                </div>
              )}

              {selectedUpload.reviewNotes && (
                <div>
                  <label className="text-xs text-muted-foreground">검토 메모</label>
                  <p className="text-sm">{selectedUpload.reviewNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
