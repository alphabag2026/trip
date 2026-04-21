import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ShieldAlert, AlertTriangle, Phone, Plus, CheckCircle2, Clock, MapPin, Siren, CloudRain, Heart, Globe } from "lucide-react";

const ALERT_TYPES = {
  sos: { label: "SOS 긴급", icon: Siren, color: "text-red-600 bg-red-50" },
  weather: { label: "기상", icon: CloudRain, color: "text-blue-600 bg-blue-50" },
  security: { label: "보안", icon: ShieldAlert, color: "text-orange-600 bg-orange-50" },
  health: { label: "건강", icon: Heart, color: "text-pink-600 bg-pink-50" },
  travel_advisory: { label: "여행주의보", icon: Globe, color: "text-yellow-600 bg-yellow-50" },
  general: { label: "일반", icon: AlertTriangle, color: "text-gray-600 bg-gray-50" },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-blue-500 text-white",
};

export default function SafetyCenter() {
  const meetupsQ = trpc.meetup.list.useQuery();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const alertsQ = trpc.safetyAlert.list.useQuery(
    { meetupId: selectedMeetupId!, activeOnly: !showResolved },
    { enabled: !!selectedMeetupId }
  );
  const contactsQ = trpc.emergencyContact.list.useQuery(
    { meetupId: selectedMeetupId! },
    { enabled: !!selectedMeetupId }
  );

  const createAlertMutation = trpc.safetyAlert.create.useMutation({
    onSuccess: () => { alertsQ.refetch(); toast.success("안전 알림이 생성되었습니다"); setAlertDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const resolveAlertMutation = trpc.safetyAlert.resolve.useMutation({
    onSuccess: () => { alertsQ.refetch(); toast.success("알림이 해결 처리되었습니다"); },
  });

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({
    alertType: "general" as string,
    severity: "medium" as string,
    title: "",
    description: "",
    affectedArea: "",
  });

  useEffect(() => {
    if (meetupsQ.data?.length && !selectedMeetupId) setSelectedMeetupId(meetupsQ.data[0].id);
  }, [meetupsQ.data, selectedMeetupId]);

  const activeAlerts = alertsQ.data?.filter(a => a.status === "active" || a.status === "monitoring") || [];
  const criticalCount = activeAlerts.filter(a => a.severity === "critical").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Safety Center
          </h1>
          <p className="text-muted-foreground mt-1">안전 알림, SOS 신고, 긴급 연락처 관리</p>
        </div>
        <Button onClick={() => { setAlertForm({ alertType: "general", severity: "medium", title: "", description: "", affectedArea: "" }); setAlertDialogOpen(true); }} disabled={!selectedMeetupId}>
          <Plus className="h-4 w-4 mr-2" /> 알림 생성
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Label>이벤트 선택</Label>
          <Select value={selectedMeetupId ? String(selectedMeetupId) : ""} onValueChange={(v) => setSelectedMeetupId(Number(v))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="이벤트를 선택하세요" /></SelectTrigger>
            <SelectContent>
              {meetupsQ.data?.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMeetupId && (
        <>
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={criticalCount > 0 ? "border-red-300 bg-red-50/50" : ""}>
              <CardContent className="pt-4 pb-3 text-center">
                <Siren className={`h-6 w-6 mx-auto mb-1 ${criticalCount > 0 ? "text-red-500 animate-pulse" : "text-muted-foreground"}`} />
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">긴급</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                <p className="text-2xl font-bold">{activeAlerts.length}</p>
                <p className="text-xs text-muted-foreground">활성 알림</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <Phone className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <p className="text-2xl font-bold">{contactsQ.data?.length || 0}</p>
                <p className="text-xs text-muted-foreground">긴급 연락처</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">{alertsQ.data?.filter(a => a.status === "resolved").length || 0}</p>
                <p className="text-xs text-muted-foreground">해결됨</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="alerts">
            <TabsList>
              <TabsTrigger value="alerts">안전 알림</TabsTrigger>
              <TabsTrigger value="contacts">긴급 연락처</TabsTrigger>
            </TabsList>

            <TabsContent value="alerts" className="space-y-3 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Button variant={showResolved ? "default" : "outline"} size="sm" onClick={() => setShowResolved(!showResolved)}>
                  {showResolved ? "전체 보기" : "해결된 알림도 보기"}
                </Button>
              </div>

              {alertsQ.data?.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500/30 mb-3" />
                  <p className="text-muted-foreground">현재 활성 알림이 없습니다</p>
                </Card>
              ) : (
                alertsQ.data?.map((alert) => {
                  const typeInfo = ALERT_TYPES[alert.alertType as keyof typeof ALERT_TYPES] || ALERT_TYPES.general;
                  const Icon = typeInfo.icon;
                  return (
                    <Card key={alert.id} className={`${alert.severity === "critical" ? "border-red-300" : ""}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{alert.title}</h3>
                                <Badge className={SEVERITY_COLORS[alert.severity || "medium"]}>{alert.severity}</Badge>
                                <Badge variant="outline">{typeInfo.label}</Badge>
                                {alert.status === "resolved" && <Badge variant="secondary" className="bg-green-100 text-green-700">해결됨</Badge>}
                              </div>
                              {alert.description && <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {alert.affectedArea && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{alert.affectedArea}</span>}
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(alert.createdAt!).toLocaleString("ko-KR")}</span>
                                {alert.reportedByName && <span>신고자: {alert.reportedByName}</span>}
                              </div>
                            </div>
                          </div>
                          {alert.status !== "resolved" && (
                            <Button variant="outline" size="sm" onClick={() => resolveAlertMutation.mutate({ id: alert.id })} disabled={resolveAlertMutation.isPending}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> 해결
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="contacts" className="mt-4">
              {contactsQ.data?.length === 0 ? (
                <Card className="p-8 text-center">
                  <Phone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">등록된 긴급 연락처가 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-1">참석자들이 마이페이지에서 긴급 연락처를 등록할 수 있습니다</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contactsQ.data?.map((contact) => (
                    <Card key={contact.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-50">
                            <Phone className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{contact.contactName}</p>
                            <p className="text-sm text-muted-foreground">{contact.relationship}</p>
                            <p className="text-sm">{contact.countryCode ? `+${contact.countryCode} ` : ""}{contact.phone}</p>
                            {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Create Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>안전 알림 생성</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>유형</Label>
                <Select value={alertForm.alertType} onValueChange={(v) => setAlertForm(f => ({ ...f, alertType: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sos">SOS 긴급</SelectItem>
                    <SelectItem value="weather">기상</SelectItem>
                    <SelectItem value="security">보안</SelectItem>
                    <SelectItem value="health">건강</SelectItem>
                    <SelectItem value="travel_advisory">여행주의보</SelectItem>
                    <SelectItem value="general">일반</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>심각도</Label>
                <Select value={alertForm.severity} onValueChange={(v) => setAlertForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>제목</Label>
              <Input className="mt-1" value={alertForm.title} onChange={(e) => setAlertForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 태풍 경보 - 외출 자제 요청" />
            </div>
            <div>
              <Label>상세 내용</Label>
              <Textarea className="mt-1" rows={3} value={alertForm.description} onChange={(e) => setAlertForm(f => ({ ...f, description: e.target.value }))} placeholder="상세 설명..." />
            </div>
            <div>
              <Label>영향 지역</Label>
              <Input className="mt-1" value={alertForm.affectedArea} onChange={(e) => setAlertForm(f => ({ ...f, affectedArea: e.target.value }))} placeholder="예: 호찌민시 1군 일대" />
            </div>
            <Button className="w-full" onClick={() => {
              if (!selectedMeetupId || !alertForm.title) return;
              createAlertMutation.mutate({
                meetupId: selectedMeetupId,
                alertType: alertForm.alertType as any,
                severity: alertForm.severity as any,
                title: alertForm.title,
                description: alertForm.description || undefined,
                affectedArea: alertForm.affectedArea || undefined,
              });
            }} disabled={createAlertMutation.isPending}>
              {createAlertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              알림 생성
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
