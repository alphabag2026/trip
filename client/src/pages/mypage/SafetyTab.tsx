import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Phone, Shield, Loader2, CheckCircle2, MapPin, Siren } from "lucide-react";
import { toast } from "sonner";

export default function SafetyTab() {

  const [showSosDialog, setShowSosDialog] = useState(false);
  const [sosMessage, setSosMessage] = useState("");
  const [sosSending, setSosSending] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  // 비상 연락처
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRelation, setContactRelation] = useState("");
  const [contactSaving, setContactSaving] = useState(false);

  const emergencyQuery = trpc.emergencyContact.list.useQuery({});
  const upsertContact = trpc.emergencyContact.upsert.useMutation({
    onSuccess: () => {
      toast.success("비상 연락처가 등록되었습니다");
      emergencyQuery.refetch();
      setContactSaving(false);
    },
    onError: () => {
      toast.error("저장 실패");
      setContactSaving(false);
    },
  });

  const sosMutation = trpc.sos.send.useMutation({
    onSuccess: () => {
      setSosSending(false);
      setSosSent(true);
      toast.success("SOS 전송 완료 - 관리자에게 긴급 알림이 전송되었습니다");
    },
    onError: () => {
      setSosSending(false);
      toast.error("SOS 전송 실패 - 다시 시도해주세요");
    },
  });

  const handleSos = async () => {
    setSosSending(true);
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* 위치 못 가져와도 SOS 전송 */ }
    sosMutation.mutate({ message: sosMessage || undefined, latitude: lat, longitude: lng });
  };

  const handleSaveContact = () => {
    if (!contactName || !contactPhone) {
      toast.error("이름과 전화번호를 입력해주세요");
      return;
    }
    setContactSaving(true);
    upsertContact.mutate({
      contactName,
      phone: contactPhone,
      relationship: contactRelation || "가족",
    });
  };

  const contacts = emergencyQuery.data || [];

  return (
    <div className="space-y-6">
      {/* SOS 긴급 버튼 */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Siren className="w-5 h-5" />
            긴급 SOS
          </CardTitle>
          <CardDescription>위급 상황 시 관리자에게 즉시 알림을 보냅니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            size="lg"
            className="w-full h-20 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all animate-pulse hover:animate-none"
            onClick={() => setShowSosDialog(true)}
          >
            <AlertTriangle className="w-8 h-8 mr-3" />
            SOS 긴급 도움 요청
          </Button>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            버튼을 누르면 현재 위치와 함께 관리자에게 긴급 알림이 전송됩니다
          </p>
        </CardContent>
      </Card>

      {/* SOS 확인 다이얼로그 */}
      <Dialog open={showSosDialog} onOpenChange={setShowSosDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              SOS 긴급 도움 요청
            </DialogTitle>
            <DialogDescription>
              관리자에게 긴급 알림이 전송됩니다. 현재 위치 정보도 함께 전달됩니다.
            </DialogDescription>
          </DialogHeader>
          {sosSent ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-green-600">SOS 전송 완료!</h3>
              <p className="text-sm text-muted-foreground mt-2">관리자가 곧 연락드릴 예정입니다</p>
              <Button className="mt-4" onClick={() => { setShowSosDialog(false); setSosSent(false); setSosMessage(""); }}>
                닫기
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Label>상황 설명 (선택)</Label>
                <Textarea
                  placeholder="현재 상황을 간단히 설명해주세요..."
                  value={sosMessage}
                  onChange={(e) => setSosMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  현재 위치가 자동으로 포함됩니다
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSosDialog(false)}>취소</Button>
                <Button variant="destructive" onClick={handleSos} disabled={sosSending}>
                  {sosSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                  SOS 전송
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 비상 연락처 등록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            비상 연락처
          </CardTitle>
          <CardDescription>긴급 상황 시 연락할 수 있는 보호자/가족 정보를 등록해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 기존 연락처 목록 */}
          {contacts.length > 0 && (
            <div className="space-y-2 mb-4">
              {contacts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.contactName}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </div>
                  {c.relationship && <Badge variant="secondary">{c.relationship}</Badge>}
                </div>
              ))}
            </div>
          )}

          {/* 새 연락처 등록 폼 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">이름 *</Label>
              <Input placeholder="홍길동" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">전화번호 *</Label>
              <Input placeholder="+82-10-1234-5678" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">관계</Label>
              <Input placeholder="배우자, 부모 등" value={contactRelation} onChange={(e) => setContactRelation(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleSaveContact} disabled={contactSaving} className="w-full sm:w-auto">
            {contactSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            비상 연락처 등록
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
