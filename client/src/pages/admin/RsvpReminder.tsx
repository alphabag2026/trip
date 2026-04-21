import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bell, Send, Clock, Mail, MessageSquare, Users, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, Loader2, BarChart3,
  Calendar, ChevronRight, Eye, History, Settings
} from "lucide-react";

export default function RsvpReminder() {
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | null>(null);
  const [sendDialog, setSendDialog] = useState(false);
  const [reminderType, setReminderType] = useState<"d7" | "d3" | "d1" | "custom">("d7");
  const [channel, setChannel] = useState<"email" | "sms" | "telegram" | "push">("email");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");

  const meetups = trpc.meetup.list.useQuery();
  const activeMeetupId = selectedMeetupId || meetups.data?.[0]?.id;

  const settings = trpc.rsvpReminder.getSettings.useQuery(
    { meetupId: activeMeetupId! },
    { enabled: !!activeMeetupId }
  );
  const stats = trpc.rsvpReminder.getStats.useQuery(
    { meetupId: activeMeetupId! },
    { enabled: !!activeMeetupId }
  );
  const pending = trpc.rsvpReminder.getPending.useQuery(
    { meetupId: activeMeetupId! },
    { enabled: !!activeMeetupId }
  );
  const logs = trpc.rsvpReminder.getLogs.useQuery(
    { meetupId: activeMeetupId! },
    { enabled: !!activeMeetupId }
  );

  const updateSettings = trpc.rsvpReminder.updateSettings.useMutation({
    onSuccess: () => { toast.success("Settings updated"); settings.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const sendReminders = trpc.rsvpReminder.sendReminders.useMutation({
    onSuccess: (result) => {
      toast.success(`Reminders sent: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
      setSendDialog(false);
      logs.refetch();
      pending.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const statsData = stats.data;
  const pendingList = pending.data || [];
  const logList = logs.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-500" />
            RSVP Reminder Manager
          </h1>
          <p className="text-muted-foreground mt-1">미응답 초대자에게 자동/수동 리마인더를 발송합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(activeMeetupId || "")}
            onValueChange={(v) => setSelectedMeetupId(Number(v))}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select Meetup" />
            </SelectTrigger>
            <SelectContent>
              {meetups.data?.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setSendDialog(true)} className="gap-2">
            <Send className="w-4 h-4" /> Send Reminders
          </Button>
        </div>
      </div>

      {/* RSVP Stats Overview */}
      {statsData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{statsData.total}</div>
              <div className="text-xs text-blue-600">Total Invited</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">{statsData.sent}</div>
              <div className="text-xs text-amber-600">Awaiting RSVP</div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-50 border-cyan-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cyan-700">{statsData.opened}</div>
              <div className="text-xs text-cyan-600">Opened</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{statsData.accepted}</div>
              <div className="text-xs text-green-600">Accepted</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">{statsData.rejected}</div>
              <div className="text-xs text-red-600">Declined</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-700">{statsData.expired}</div>
              <div className="text-xs text-gray-600">Expired</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{statsData.responseRate}%</div>
              <div className="text-xs text-purple-600">Response Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            <Users className="w-4 h-4" /> Pending ({pendingList.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1">
            <History className="w-4 h-4" /> Sent History ({logList.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1">
            <Settings className="w-4 h-4" /> Settings
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Pending RSVP - 미응답 초대자 목록
              </CardTitle>
              <CardDescription>아직 응답하지 않은 초대자들입니다. 리마인더를 발송하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                  <p>모든 초대자가 응답했습니다!</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pendingList.map((inv: any) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium">{inv.recipientName || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {inv.recipientEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{inv.recipientEmail}</span>}
                            {inv.recipientPhone && <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{inv.recipientPhone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <Clock className="w-3 h-3 mr-1" />
                          {inv.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                Reminder History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>아직 발송된 리마인더가 없습니다</p>
                </div>
              ) : (
                <div className="divide-y max-h-[500px] overflow-y-auto">
                  {logList.map((log: any) => (
                    <div key={log.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.status === "sent" ? "bg-green-100" : log.status === "failed" ? "bg-red-100" : "bg-gray-100"
                        }`}>
                          {log.status === "sent" ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                           log.status === "failed" ? <XCircle className="w-4 h-4 text-red-600" /> :
                           <Clock className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{log.recipientName || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.recipientEmail} · {log.channel} · {log.reminderType}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-xs">
                          {log.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Auto-Reminder Settings
              </CardTitle>
              <CardDescription>자동 리마인더 스케줄과 템플릿을 설정합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Auto Reminder</Label>
                  <p className="text-sm text-muted-foreground">이벤트 전 자동으로 리마인더를 발송합니다</p>
                </div>
                <Switch
                  checked={settings.data?.enabled ?? true}
                  onCheckedChange={(checked) => {
                    if (activeMeetupId) {
                      updateSettings.mutate({ meetupId: activeMeetupId, enabled: checked });
                    }
                  }}
                />
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Reminder Schedule</Label>
                <div className="flex gap-3">
                  {[7, 3, 1].map((day) => {
                    const days = (settings.data?.reminderDays as number[]) || [7, 3, 1];
                    const isActive = days.includes(day);
                    return (
                      <Button
                        key={day}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (!activeMeetupId) return;
                          const newDays = isActive ? days.filter(d => d !== day) : [...days, day].sort((a, b) => b - a);
                          updateSettings.mutate({ meetupId: activeMeetupId, reminderDays: newDays });
                        }}
                      >
                        D-{day}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>Email Subject Template</Label>
                <Input
                  placeholder="[Reminder] {{eventName}} - RSVP Required"
                  defaultValue={settings.data?.emailSubjectTemplate || ""}
                  onBlur={(e) => {
                    if (activeMeetupId) {
                      updateSettings.mutate({ meetupId: activeMeetupId, emailSubjectTemplate: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="space-y-3">
                <Label>Email Body Template</Label>
                <Textarea
                  placeholder="Dear {{name}},\n\nThis is a reminder..."
                  rows={6}
                  defaultValue={settings.data?.emailBodyTemplate || ""}
                  onBlur={(e) => {
                    if (activeMeetupId) {
                      updateSettings.mutate({ meetupId: activeMeetupId, emailBodyTemplate: e.target.value });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {"{{name}}"}, {"{{eventName}}"}, {"{{eventDate}}"}, {"{{rsvpLink}}"}
                </p>
              </div>
              {settings.data?.lastRunAt && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last run: {new Date(settings.data.lastRunAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Reminder Dialog */}
      <Dialog open={sendDialog} onOpenChange={setSendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-500" />
              Send RSVP Reminders
            </DialogTitle>
            <DialogDescription>
              미응답 초대자 {pendingList.length}명에게 리마인더를 발송합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reminder Type</Label>
              <Select value={reminderType} onValueChange={(v) => setReminderType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="d7">D-7 (1주 전)</SelectItem>
                  <SelectItem value="d3">D-3 (3일 전)</SelectItem>
                  <SelectItem value="d1">D-1 (하루 전)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reminderType === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Custom Subject</Label>
                  <Input value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder="Custom reminder subject..." />
                </div>
                <div className="space-y-2">
                  <Label>Custom Body</Label>
                  <Textarea value={customBody} onChange={(e) => setCustomBody(e.target.value)} rows={4} placeholder="Custom reminder message..." />
                </div>
              </>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {pendingList.length}명의 미응답 초대자에게 발송됩니다
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!activeMeetupId) return;
                sendReminders.mutate({
                  meetupId: activeMeetupId,
                  reminderType,
                  channel,
                  ...(reminderType === "custom" ? { customSubject, customBody } : {}),
                });
              }}
              disabled={sendReminders.isPending || pendingList.length === 0}
              className="gap-2"
            >
              {sendReminders.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to {pendingList.length} people
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
