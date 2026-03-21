import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Camera, Car, MapPin, Phone, Upload, User, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  pending: "bg-gray-500", en_route: "bg-blue-500", waiting: "bg-yellow-500", picked_up: "bg-green-500", completed: "bg-emerald-600",
};

export default function PickupBoard() {
  const { t } = useTranslation();
  const { meetupId } = useParams<{ meetupId: string }>();
  const mid = Number(meetupId);
  const { data: meetup } = trpc.meetup.getById.useQuery({ id: mid }, { enabled: !!mid });
  const { data: pickups = [], refetch: refetchPickups } = trpc.pickup.list.useQuery({ meetupId: mid }, { enabled: !!mid });
  const { data: photos = [], refetch: refetchPhotos } = trpc.pickupPhoto.list.useQuery({ meetupId: mid }, { enabled: !!mid });
  const uploadMutation = trpc.pickupPhoto.upload.useMutation({
    onSuccess: () => { refetchPhotos(); toast.success(t("pickup.photoUploaded")); },
    onError: () => toast.error(t("pickup.uploadFailed")),
  });

  const statusLabels: Record<string, string> = {
    pending: t("pickup.statusPending"), en_route: t("pickup.statusEnRoute"),
    waiting: t("pickup.statusWaiting"), picked_up: t("pickup.statusPickedUp"),
    completed: t("pickup.statusCompleted"),
  };

  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState<"pickup_location" | "arrival_person" | "vehicle" | "other">("arrival_person");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error(t("pickup.selectPhoto")); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t("pickup.fileSizeLimit")); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        meetupId: mid, photoType, imageBase64: base64,
        mimeType: file.type || "image/jpeg", uploadedBy: uploaderName || t("pickup.anonymous"), caption,
      });
    };
    reader.readAsDataURL(file);
  };

  if (!meetup) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" /> {t("pickup.boardTitle")} - {meetup.title}
          </h1>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t("pickup.vehicleStatus")}</h2>
          {pickups.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">{t("pickup.noVehicles")}</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {pickups.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Car className="h-4 w-4" /> {p.vehicleName}
                      </h3>
                      <Badge className={`${statusColors[p.status]} text-white text-xs`}>{statusLabels[p.status]}</Badge>
                    </div>
                    {p.driverName && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {p.driverName}
                        {p.driverPhone && <span className="ml-2 flex items-center gap-1"><Phone className="h-3 w-3" />{p.driverPhone}</span>}
                      </p>
                    )}
                    {p.pickupLocation && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" /> {p.pickupLocation}
                      </p>
                    )}
                    {p.pickupTime && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3.5 w-3.5" /> {new Date(p.pickupTime).toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {t("pickup.passengers")}: {Array.isArray(p.assignedRegistrationIds) ? (p.assignedRegistrationIds as number[]).length : 0}/{p.vehicleCapacity}{t("pickup.people")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> {t("pickup.photoShare")}
          </h2>
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("pickup.name")}</Label>
                  <Input placeholder={t("pickup.enterName")} value={uploaderName} onChange={e => setUploaderName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">{t("pickup.type")}</Label>
                  <select value={photoType} onChange={e => setPhotoType(e.target.value as any)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="arrival_person">{t("pickup.arrivalVerify")}</option>
                    <option value="pickup_location">{t("pickup.pickupLocation")}</option>
                    <option value="vehicle">{t("pickup.vehicle")}</option>
                    <option value="other">{t("pickup.other")}</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("pickup.descriptionOptional")}</Label>
                <Textarea placeholder={t("pickup.photoDescription")} value={caption} onChange={e => setCaption(e.target.value)} className="mt-1" rows={2} />
              </div>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" />
                <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> {t("pickup.selectPhotoBtn")}
                </Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="flex-1">
                  {uploadMutation.isPending ? t("pickup.uploading") : t("pickup.upload")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {photos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t("pickup.sharedPhotos")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(photo => (
                <Card key={photo.id} className="overflow-hidden">
                  <img src={photo.photoUrl} alt={photo.caption || ""} className="w-full h-40 object-cover" />
                  <CardContent className="py-2">
                    <p className="text-xs text-muted-foreground">{photo.uploadedBy || t("pickup.anonymous")}</p>
                    {photo.caption && <p className="text-xs text-foreground mt-0.5">{photo.caption}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(photo.createdAt).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
