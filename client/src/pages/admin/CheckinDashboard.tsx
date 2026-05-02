import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  QrCode, Users, UserCheck, UserX, Search, RefreshCw, Download,
  CheckCircle2, XCircle, Clock, Loader2, BarChart3, Ticket, Undo2
} from "lucide-react";

export default function CheckinDashboard() {
  const { t } = useTranslation();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState("overview");
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedQrToken, setSelectedQrToken] = useState<string | null>(null);

  const { data: meetups } = trpc.meetup.list.useQuery({});
  const { data: checkins, refetch: refetchCheckins, isLoading: checkinsLoading } = trpc.eventCheckin.listByMeetup.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId, refetchInterval: 10000 }
  );
  const { data: stats, refetch: refetchStats } = trpc.eventCheckin.stats.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId, refetchInterval: 10000 }
  );

  const bulkGenerate = trpc.eventCheckin.bulkGenerateTokens.useMutation({
    onSuccess: (result) => {
      toast.success(`QR 토큰 ${result.created}개 생성 (${result.skipped}개 기존)`);
      refetchCheckins();
      refetchStats();
    },
    onError: (err) => toast.error(err.message),
  });

  const manualCheckin = trpc.eventCheckin.manualCheckin.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("수동 체크인 완료");
        refetchCheckins();
        refetchStats();
      } else {
        toast.warning(result.message || "이미 체크인됨");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const undoCheckin = trpc.eventCheckin.undoCheckin.useMutation({
    onSuccess: () => {
      toast.success("체크인 취소됨");
      refetchCheckins();
      refetchStats();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: qrImage } = trpc.eventCheckin.getQrImage.useQuery(
    { qrToken: selectedQrToken! },
    { enabled: !!selectedQrToken }
  );

  const filteredCheckins = useMemo(() => {
    if (!checkins) return [];
    if (!searchQuery) return checkins;
    const q = searchQuery.toLowerCase();
    return checkins.filter(c =>
      c.participantName?.toLowerCase().includes(q) ||
      c.participantPhone?.includes(q) ||
      c.participantTeam?.toLowerCase().includes(q)
    );
  }, [checkins, searchQuery]);

  const checkedInList = filteredCheckins.filter(c => c.checkedIn);
  const notCheckedInList = filteredCheckins.filter(c => !c.checkedIn);
  const checkinRate = stats ? (stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            QR 체크인 관리
          </h1>
          <p className="text-muted-foreground text-sm mt-1">참가자 QR 코드 발급 및 현장 체크인 관리</p>
        </div>
      </div>

      {/* Meetup Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select
              value={selectedMeetupId?.toString() || ""}
              onValueChange={(v) => setSelectedMeetupId(Number(v))}
            >
              <SelectTrigger className="sm:w-[300px]">
                <SelectValue placeholder="밋업 선택..." />
              </SelectTrigger>
              <SelectContent>
                {(meetups || []).map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMeetupId && (
              <>
                <Button
                  onClick={() => bulkGenerate.mutate({ meetupId: selectedMeetupId })}
                  disabled={bulkGenerate.isPending}
                  className="gap-2"
                >
                  {bulkGenerate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                  QR 일괄 발급
                </Button>
                <Button variant="outline" onClick={() => { refetchCheckins(); refetchStats(); }} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  새로고침
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedMeetupId && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.total || 0}</p>
                    <p className="text-xs text-muted-foreground">전체 QR 발급</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.checkedIn || 0}</p>
                    <p className="text-xs text-muted-foreground">체크인 완료</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <UserX className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.notCheckedIn || 0}</p>
                    <p className="text-xs text-muted-foreground">미체크인</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{checkinRate}%</p>
                    <p className="text-xs text-muted-foreground">체크인율</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">체크인 진행률</span>
                <span className="text-sm text-muted-foreground">{stats?.checkedIn || 0} / {stats?.total || 0}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${checkinRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <TabsList>
                <TabsTrigger value="overview" className="gap-1">
                  <Users className="w-3.5 h-3.5" />
                  전체
                </TabsTrigger>
                <TabsTrigger value="checked" className="gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  체크인 ({checkedInList.length})
                </TabsTrigger>
                <TabsTrigger value="unchecked" className="gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  미체크인 ({notCheckedInList.length})
                </TabsTrigger>
              </TabsList>
              <div className="flex-1 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="이름, 전화번호, 팀 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="overview" className="mt-4">
              <CheckinTable
                items={filteredCheckins}
                isLoading={checkinsLoading}
                onManualCheckin={(regId) => manualCheckin.mutate({ registrationId: regId, meetupId: selectedMeetupId })}
                onUndoCheckin={(id) => undoCheckin.mutate({ id })}
                onShowQr={(token) => { setSelectedQrToken(token); setShowQrDialog(true); }}
                isPending={manualCheckin.isPending || undoCheckin.isPending}
              />
            </TabsContent>
            <TabsContent value="checked" className="mt-4">
              <CheckinTable
                items={checkedInList}
                isLoading={checkinsLoading}
                onManualCheckin={(regId) => manualCheckin.mutate({ registrationId: regId, meetupId: selectedMeetupId })}
                onUndoCheckin={(id) => undoCheckin.mutate({ id })}
                onShowQr={(token) => { setSelectedQrToken(token); setShowQrDialog(true); }}
                isPending={manualCheckin.isPending || undoCheckin.isPending}
              />
            </TabsContent>
            <TabsContent value="unchecked" className="mt-4">
              <CheckinTable
                items={notCheckedInList}
                isLoading={checkinsLoading}
                onManualCheckin={(regId) => manualCheckin.mutate({ registrationId: regId, meetupId: selectedMeetupId })}
                onUndoCheckin={(id) => undoCheckin.mutate({ id })}
                onShowQr={(token) => { setSelectedQrToken(token); setShowQrDialog(true); }}
                isPending={manualCheckin.isPending || undoCheckin.isPending}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* QR Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR 코드</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            {qrImage ? (
              <>
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img src={qrImage.qrDataUrl} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="text-xs text-muted-foreground mt-2 break-all">{qrImage.qrToken}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = qrImage.qrDataUrl;
                    link.download = `qr-${qrImage.qrToken.substring(0, 8)}.png`;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4" />
                  다운로드
                </Button>
              </>
            ) : (
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type CheckinItem = {
  id: number;
  registrationId: number;
  qrToken: string;
  checkedIn: boolean;
  checkedInAt: Date | null;
  checkInMethod: string;
  participantName?: string | null;
  participantPhone?: string | null;
  participantTeam?: string | null;
};

function CheckinTable({
  items,
  isLoading,
  onManualCheckin,
  onUndoCheckin,
  onShowQr,
  isPending,
}: {
  items: CheckinItem[];
  isLoading: boolean;
  onManualCheckin: (regId: number) => void;
  onUndoCheckin: (id: number) => void;
  onShowQr: (token: string) => void;
  isPending: boolean;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <QrCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">상태</th>
              <th className="text-left p-3 font-medium">이름</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">전화번호</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">팀</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">체크인 시간</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">방법</th>
              <th className="text-right p-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  {item.checkedIn ? (
                    <Badge className="bg-green-500 text-white gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      완료
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Clock className="w-3 h-3" />
                      대기
                    </Badge>
                  )}
                </td>
                <td className="p-3 font-medium">{item.participantName || "-"}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{item.participantPhone || "-"}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{item.participantTeam || "-"}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">
                  {item.checkedInAt ? new Date(item.checkedInAt).toLocaleString() : "-"}
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {item.checkedIn && (
                    <Badge variant="secondary" className="text-xs">
                      {item.checkInMethod === "qr_scan" ? "QR 스캔" : item.checkInMethod === "manual" ? "수동" : "셀프"}
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onShowQr(item.qrToken)}
                      title="QR 코드 보기"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                    {item.checkedIn ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUndoCheckin(item.id)}
                        disabled={isPending}
                        title="체크인 취소"
                        className="text-orange-500 hover:text-orange-600"
                      >
                        <Undo2 className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onManualCheckin(item.registrationId)}
                        disabled={isPending}
                        title="수동 체크인"
                        className="text-green-500 hover:text-green-600"
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
