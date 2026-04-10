import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Hotel, Plus, Wand2, Trash2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import AIUploader from "@/components/AIUploader";

export default function AdminAccommodations() {
  const { t } = useTranslation();
  const roomTypeLabels: Record<string, string> = { single: t("admin.accommodations.single"), double: t("admin.accommodations.double"), twin: t("admin.accommodations.twin"), suite: t("admin.accommodations.suite") };

  const { data: meetups = [] } = trpc.meetup.list.useQuery();
  const [selectedMeetup, setSelectedMeetup] = useState<number | undefined>();
  const { data: accommodations = [], refetch } = trpc.accommodation.list.useQuery({ meetupId: selectedMeetup });
  const [createOpen, setCreateOpen] = useState(false);
  const [photoDialogId, setPhotoDialogId] = useState<number | null>(null);

  const createMut = trpc.accommodation.create.useMutation({ onSuccess: () => { refetch(); setCreateOpen(false); resetForm(); toast.success(t("admin.accommodations.created")); } });
  const deleteMut = trpc.accommodation.delete.useMutation({ onSuccess: () => { refetch(); toast.success(t("admin.accommodations.deleted")); } });
  const autoAssignMut = trpc.accommodation.autoAssign.useMutation({ onSuccess: (data) => { refetch(); toast.success(t("admin.accommodations.autoAssigned", { rooms: data.roomCount, people: data.totalAssigned })); } });

  const [form, setForm] = useState({
    hotelName: "", roomNumber: "", roomType: "twin" as "single" | "double" | "twin" | "suite",
    checkIn: "", checkOut: "", accommodationPhotoUrl: "",
  });
  const [autoHotelName, setAutoHotelName] = useState("");

  const resetForm = () => setForm({ hotelName: "", roomNumber: "", roomType: "twin", checkIn: "", checkOut: "", accommodationPhotoUrl: "" });

  const handleAIExtracted = (data: any, imageUrl?: string) => {
    setForm(prev => ({
      ...prev,
      hotelName: data.hotelName || prev.hotelName,
      roomNumber: data.roomNumber || prev.roomNumber,
      roomType: (["single", "double", "twin", "suite"].includes(data.roomType?.toLowerCase()) ? data.roomType.toLowerCase() : prev.roomType) as any,
      checkIn: data.checkIn ? data.checkIn.substring(0, 16) : prev.checkIn,
      checkOut: data.checkOut ? data.checkOut.substring(0, 16) : prev.checkOut,
      accommodationPhotoUrl: imageUrl || prev.accommodationPhotoUrl,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Hotel className="h-6 w-6 text-primary" /> {t("admin.accommodations.title")}</h1>
        <div className="flex gap-2">
          <select value={selectedMeetup || ""} onChange={e => setSelectedMeetup(e.target.value ? Number(e.target.value) : undefined)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">{t("admin.accommodations.allMeetups")}</option>
            {meetups.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          {selectedMeetup && (
            <Dialog>
              <DialogTrigger asChild><Button variant="outline"><Wand2 className="h-4 w-4 mr-2" /> {t("admin.accommodations.autoAssign")}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t("admin.accommodations.autoAssignTitle")}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{t("admin.accommodations.autoAssignDesc")}</p>
                  <div><Label>{t("admin.accommodations.hotelName")} *</Label><Input value={autoHotelName} onChange={e => setAutoHotelName(e.target.value)} className="mt-1" /></div>
                  <Button className="w-full" disabled={!autoHotelName || autoAssignMut.isPending}
                    onClick={() => autoAssignMut.mutate({ meetupId: selectedMeetup!, hotelName: autoHotelName })}>
                    {autoAssignMut.isPending ? "..." : t("admin.accommodations.runAutoAssign")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> {t("admin.accommodations.addRoom")}</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t("admin.accommodations.registerRoom")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* AI Uploader */}
                <AIUploader context="accommodation" onExtracted={handleAIExtracted} compact />

                {/* 숙소 사진 미리보기 */}
                {form.accommodationPhotoUrl && (
                  <div className="relative">
                    <img src={form.accommodationPhotoUrl} alt="accommodation" className="w-full h-32 object-cover rounded-md border border-border" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("admin.accommodations.hotelName")} *</Label><Input value={form.hotelName} onChange={e => setForm(p => ({ ...p, hotelName: e.target.value }))} className="mt-1" /></div>
                  <div><Label>{t("admin.accommodations.roomNumber")}</Label><Input value={form.roomNumber} onChange={e => setForm(p => ({ ...p, roomNumber: e.target.value }))} className="mt-1" /></div>
                </div>
                <div><Label>{t("admin.accommodations.roomType")}</Label>
                  <select value={form.roomType} onChange={e => setForm(p => ({ ...p, roomType: e.target.value as any }))} className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    {Object.entries(roomTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t("admin.accommodations.checkIn")}</Label><Input type="datetime-local" value={form.checkIn} onChange={e => setForm(p => ({ ...p, checkIn: e.target.value }))} className="mt-1" /></div>
                  <div><Label>{t("admin.accommodations.checkOut")}</Label><Input type="datetime-local" value={form.checkOut} onChange={e => setForm(p => ({ ...p, checkOut: e.target.value }))} className="mt-1" /></div>
                </div>
                <Button className="w-full" disabled={!form.hotelName || createMut.isPending} onClick={() => createMut.mutate({
                  ...form, meetupId: selectedMeetup,
                  checkIn: form.checkIn ? new Date(form.checkIn).toISOString() : undefined,
                  checkOut: form.checkOut ? new Date(form.checkOut).toISOString() : undefined,
                })}>{createMut.isPending ? "..." : t("admin.accommodations.register")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accommodations.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">{t("admin.accommodations.empty")}</CardContent></Card>
        ) : accommodations.map((a: any) => (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              {/* 숙소 사진 */}
              {a.accommodationPhotoUrl && (
                <div className="relative mb-2 cursor-pointer" onClick={() => setPhotoDialogId(a.id)}>
                  <img src={a.accommodationPhotoUrl} alt={a.hotelName} className="w-full h-28 object-cover rounded-md" />
                </div>
              )}
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Hotel className="h-4 w-4" /> {a.hotelName}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteMut.mutate({ id: a.id })}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {a.roomNumber && <span className="font-medium">Room {a.roomNumber}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{roomTypeLabels[a.roomType]}</span>
              </div>
              <p className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {t("admin.accommodations.assigned")}: {Array.isArray(a.assignedRegistrationIds) ? (a.assignedRegistrationIds as number[]).length : 0}
              </p>
              {a.checkIn && <p className="text-xs text-muted-foreground">{t("admin.accommodations.checkIn")}: {new Date(a.checkIn).toLocaleString()}</p>}
              {a.checkOut && <p className="text-xs text-muted-foreground">{t("admin.accommodations.checkOut")}: {new Date(a.checkOut).toLocaleString()}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 숙소 사진 확대 다이얼로그 */}
      {photoDialogId && (() => {
        const acc = accommodations.find((a: any) => a.id === photoDialogId);
        return acc ? (
          <Dialog open={!!photoDialogId} onOpenChange={() => setPhotoDialogId(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{(acc as any).hotelName} - Room {(acc as any).roomNumber}</DialogTitle></DialogHeader>
              {(acc as any).accommodationPhotoUrl && (
                <img src={(acc as any).accommodationPhotoUrl} alt={(acc as any).hotelName} className="w-full rounded-md" />
              )}
            </DialogContent>
          </Dialog>
        ) : null;
      })()}
    </div>
  );
}
