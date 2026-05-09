import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, RefreshCw, Check, X, Trash2, Eye, Plane, Hotel, Calendar, Truck, HelpCircle, FileText, Bot, Send, MessageSquare, Users, BarChart3, Search, Image } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  register_participants: { label: "참가자 등록", icon: Users, color: "text-cyan-400" },
  list_meetups: { label: "밋업 조회", icon: FileText, color: "text-indigo-400" },
  list_participants: { label: "참가자 조회", icon: Users, color: "text-teal-400" },
  get_stats: { label: "통계", icon: BarChart3, color: "text-pink-400" },
  search: { label: "검색", icon: Search, color: "text-amber-400" },
  assign_flight: { label: "항공편 배정", icon: Plane, color: "text-sky-400" },
  assign_hotel: { label: "숙소 배정", icon: Hotel, color: "text-violet-400" },
  ocr_passport: { label: "여권 OCR", icon: Image, color: "text-rose-400" },
  travel_info: { label: "여행정보", icon: FileText, color: "text-lime-400" },
  general: { label: "일반", icon: FileText, color: "text-gray-400" },
  unknown: { label: "미분류", icon: HelpCircle, color: "text-gray-500" },
  help: { label: "도움말", icon: HelpCircle, color: "text-gray-400" },
};

export default function TelegramUploads() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedUpload, setSelectedUpload] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [meetupIdInput, setMeetupIdInput] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [activeTab, setActiveTab] = useState("history");

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

  const filteredUploads = useMemo(() => {
    return uploads || [];
  }, [uploads]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-400" />
            텔레그램 AI 명령 센터
          </h1>
          <p className="text-muted-foreground mt-1">텔레그램에서 자연어로 전송된 명령을 AI가 자동으로 분석하고 실행합니다</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} size="sm">
          <RefreshCw className="h-4 w-4 mr-1" /> 새로고침
        </Button>
      </div>

      {/* Stats */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history" className="gap-1">
            <MessageSquare className="h-4 w-4" /> 명령 이력
          </TabsTrigger>
          <TabsTrigger value="commands" className="gap-1">
            <Bot className="h-4 w-4" /> 사용 가능 명령
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <FileText className="h-4 w-4" /> 봇 설정
          </TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="상태 필터" /></SelectTrigger>
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
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="유형 필터" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="flight">항공편</SelectItem>
                <SelectItem value="hotel">숙소</SelectItem>
                <SelectItem value="schedule">일정</SelectItem>
                <SelectItem value="transfer">교통</SelectItem>
                <SelectItem value="register_participants">참가자 등록</SelectItem>
                <SelectItem value="ocr_passport">여권 OCR</SelectItem>
                <SelectItem value="general">일반</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Upload List */}
          <div className="space-y-2">
            {filteredUploads.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>텔레그램 명령 이력이 없습니다</p>
                  <p className="text-xs mt-1">텔레그램 봇에 메시지를 보내면 여기에 표시됩니다</p>
                </CardContent>
              </Card>
            ) : (
              filteredUploads.map((upload: any) => {
                const typeInfo = TYPE_MAP[upload.parsedType] || TYPE_MAP.unknown;
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={upload.id} className="bg-card/50 hover:bg-card/80 transition-colors cursor-pointer" onClick={() => setSelectedUpload(upload)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`mt-0.5 ${typeInfo.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
                              <Badge className={`text-xs ${STATUS_MAP[upload.status]?.color}`}>{STATUS_MAP[upload.status]?.label}</Badge>
                              {upload.parsedConfidence && (
                                <span className="text-xs text-muted-foreground">{upload.parsedConfidence}%</span>
                              )}
                            </div>
                            <p className="text-sm mt-1 truncate">{upload.parsedSummary || upload.rawText?.substring(0, 80) || "(내용 없음)"}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>👤 {upload.uploadedBy || "알 수 없음"}</span>
                              <span>{new Date(upload.createdAt).toLocaleString("ko-KR")}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); reparseMutation.mutate({ id: upload.id }); }}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={(e) => { e.stopPropagation(); if (confirm("삭제하시겠습니까?")) deleteMutation.mutate({ id: upload.id }); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Commands Tab */}
        <TabsContent value="commands" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">🤖 AI 자연어 명령 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm text-blue-400 mb-2">👥 참가자 관리</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "김철수 M12345678 KOR 1990-01-01 남 만료 2030-12-31 등록해줘"</p>
                  <p>• "참가자 목록 보여줘"</p>
                  <p>• "김철수 검색해줘"</p>
                  <p>• "승인된 참가자만 보여줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-indigo-400 mb-2">📋 밋업 관리</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "밋업 목록 보여줘"</p>
                  <p>• "하롱베이 2140 Xplay 행사 5/10~5/13 생성해줘"</p>
                  <p>• "현재 모집중인 밋업 알려줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-sky-400 mb-2">✈️ 항공편/숙소</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "아시아나항공 OZ733 ICN→HAN 08:00-10:50 등록해줘"</p>
                  <p>• "귀국편 OZ734 HAN→ICN 12:05-18:35 추가"</p>
                  <p>• "Grand Plaza 호텔 5/10~5/13 배정해줘"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-pink-400 mb-2">📊 통계/현황</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• "현황 알려줘"</p>
                  <p>• "통계 보여줘"</p>
                  <p>• "오늘 등록된 참가자 수"</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-rose-400 mb-2">📸 이미지 분석</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• 여권 사진 전송 → 자동 OCR 분석</p>
                  <p>• 항공권 사진 전송 → 항공편 정보 추출</p>
                  <p>• 예약 확인서 전송 → 예약 정보 파싱</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-lime-400 mb-2">📝 프롬프트 일괄 등록</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• 프롬프트 형식으로 한번에 여러 참가자 등록:</p>
                  <pre className="bg-background/50 rounded p-2 mt-1 text-xs">
{`하롱베이 2140 Xplay 행사 박석봉팀 5월 10일부터 5월 13일까지
항공: 아시아나항공 OZ733 ICN→HAN 08:00-10:50
귀국: OZ734 HAN→ICN 12:05-18:35
예약번호: BQ9VVN

참가자:
김철수 M99731754 KOR 1959-02-10 남 만료 2027-06-28
박영희 M28411732 KOR 1946-03-10 남 만료 2028-08-28`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">⚙️ 텔레그램 봇 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500/10 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-2">📌 설정 방법</h4>
                <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>@BotFather에서 봇 생성 후 토큰 발급</li>
                  <li>백오피스 설정 → 텔레그램 봇 토큰 입력</li>
                  <li>웹훅 URL 자동 등록됨</li>
                  <li>봇에 메시지 전송하면 자동 처리 시작</li>
                </ol>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-2">💡 사용 팁</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 자연어로 자유롭게 입력하면 AI가 의도를 파악합니다</li>
                  <li>• 여러 참가자를 한번에 등록할 때는 줄바꿈으로 구분</li>
                  <li>• 이미지(여권/항공권)를 보내면 자동 OCR 분석</li>
                  <li>• /help 명령으로 상세 도움말 확인</li>
                  <li>• 모든 명령은 이력으로 저장되어 백오피스에서 확인 가능</li>
                </ul>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-2">🔗 웹훅 상태</h4>
                <p className="text-muted-foreground">
                  엔드포인트: <code className="bg-background/50 px-1 rounded">/api/telegram/webhook</code>
                </p>
                <p className="text-muted-foreground mt-1">
                  봇 설정에서 토큰이 등록되면 자동으로 웹훅이 연결됩니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedUpload} onOpenChange={(open) => !open && setSelectedUpload(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> 명령 상세
            </DialogTitle>
          </DialogHeader>
          {selectedUpload && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
              {selectedUpload.rawFileUrl && (
                <div>
                  <label className="text-xs text-muted-foreground">첨부 파일</label>
                  <div className="mt-1">
                    {selectedUpload.rawFileType === "photo" || selectedUpload.rawFileType === "image" ? (
                      <img src={selectedUpload.rawFileUrl} alt="첨부 이미지" className="max-h-48 rounded-lg border" />
                    ) : (
                      <a href={selectedUpload.rawFileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-sm">
                        파일 보기 →
                      </a>
                    )}
                  </div>
                </div>
              )}
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
