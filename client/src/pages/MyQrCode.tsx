import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QrCode, ArrowLeft, CheckCircle2, Clock, Download, Share2, CalendarDays
} from "lucide-react";

export default function MyQrCode() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);

  // 내가 참가한 밋업 목록 가져오기
  const { data: myRegs, isLoading: regsLoading } = trpc.registration.list.useQuery(
    {},
    { enabled: !!user }
  );

  // 밋업 목록 가져오기
  const { data: meetups } = trpc.meetup.list.useQuery({});

  // 선택된 밋업의 QR 코드
  const { data: qrData, isLoading: qrLoading } = trpc.eventCheckin.myQr.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId && !!user }
  );

  // 참가한 밋업 ID 목록
  const myMeetupIds = Array.from(new Set((myRegs || []).filter(r => r.meetupId).map(r => r.meetupId!)));
  const myMeetups = (meetups || []).filter(m => myMeetupIds.includes(m.id));

  const handleDownload = () => {
    if (!qrData?.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrData.qrDataUrl;
    link.download = `checkin-qr-${qrData.registrationName || "my"}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!qrData?.qrDataUrl) return;
    try {
      const response = await fetch(qrData.qrDataUrl);
      const blob = await response.blob();
      const file = new File([blob], "checkin-qr.png", { type: "image/png" });
      if (navigator.share) {
        await navigator.share({ title: "체크인 QR 코드", files: [file] });
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">로그인이 필요합니다</h2>
            <p className="text-muted-foreground mb-4">QR 코드를 확인하려면 먼저 로그인해주세요.</p>
            <Button onClick={() => navigate("/")}>홈으로 이동</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center gap-3 h-14 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <QrCode className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-lg">내 체크인 QR</h1>
        </div>
      </div>

      <div className="container max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Meetup Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              밋업 선택
            </CardTitle>
          </CardHeader>
          <CardContent>
            {regsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : myMeetups.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm">참가 신청한 밋업이 없습니다.</p>
                <Button variant="link" onClick={() => navigate("/")}>밋업 찾아보기</Button>
              </div>
            ) : (
              <Select
                value={selectedMeetupId?.toString() || ""}
                onValueChange={(v) => setSelectedMeetupId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="밋업을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {myMeetups.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* QR Code Display */}
        {selectedMeetupId && (
          <Card>
            <CardContent className="pt-6">
              {qrLoading ? (
                <div className="text-center py-8">
                  <Skeleton className="w-64 h-64 mx-auto rounded-xl" />
                  <Skeleton className="h-6 w-40 mx-auto mt-4" />
                </div>
              ) : !qrData ? (
                <div className="text-center py-8">
                  <QrCode className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">QR 코드가 아직 발급되지 않았습니다</h3>
                  <p className="text-sm text-muted-foreground">
                    주최자가 QR 코드를 발급하면 여기에 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  {/* QR Image */}
                  <div className="relative inline-block">
                    <div className="bg-white p-4 rounded-2xl shadow-lg inline-block">
                      <img
                        src={qrData.qrDataUrl}
                        alt="체크인 QR 코드"
                        className="w-64 h-64"
                      />
                    </div>
                    {qrData.checkedIn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                        <div className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 font-bold">
                          <CheckCircle2 className="w-5 h-5" />
                          체크인 완료
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name & Status */}
                  <div className="mt-4">
                    <h3 className="text-xl font-bold">{qrData.registrationName}</h3>
                    <div className="mt-2">
                      {qrData.checkedIn ? (
                        <Badge className="bg-green-500 gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          체크인 완료
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          체크인 대기
                        </Badge>
                      )}
                    </div>
                    {qrData.checkedInAt && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(qrData.checkedInAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                      <Download className="w-4 h-4" />
                      저장
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare} className="gap-1">
                      <Share2 className="w-4 h-4" />
                      공유
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg text-left">
                    <h4 className="font-semibold text-sm mb-2">사용 방법</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>1. 행사 현장에서 이 QR 코드를 보여주세요</li>
                      <li>2. 관리자가 QR 코드를 스캔하면 자동으로 체크인됩니다</li>
                      <li>3. 체크인이 완료되면 화면에 표시됩니다</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
