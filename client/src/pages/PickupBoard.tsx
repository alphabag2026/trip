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

const statusLabels: Record<string, string> = {
  pending: "대기", en_route: "이동중", waiting: "대기중", picked_up: "픽업완료", completed: "완료",
};
const statusColors: Record<string, string> = {
  pending: "bg-gray-500", en_route: "bg-blue-500", waiting: "bg-yellow-500", picked_up: "bg-green-500", completed: "bg-emerald-600",
};

export default function PickupBoard() {
  const { meetupId } = useParams<{ meetupId: string }>();
  const mid = Number(meetupId);
  const { data: meetup } = trpc.meetup.getById.useQuery({ id: mid }, { enabled: !!mid });
  const { data: pickups = [], refetch: refetchPickups } = trpc.pickup.list.useQuery({ meetupId: mid }, { enabled: !!mid });
  const { data: photos = [], refetch: refetchPhotos } = trpc.pickupPhoto.list.useQuery({ meetupId: mid }, { enabled: !!mid });
  const uploadMutation = trpc.pickupPhoto.upload.useMutation({
    onSuccess: () => { refetchPhotos(); toast.success("사진이 업로드되었습니다"); },
    onError: () => toast.error("업로드 실패"),
  });

  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [photoType, setPhotoType] = useState<"pickup_location" | "arrival_person" | "vehicle" | "other">("arrival_person");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("사진을 선택해주세요"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("5MB 이하 파일만 가능합니다"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        meetupId: mid, photoType, imageBase64: base64,
        mimeType: file.type || "image/jpeg", uploadedBy: uploaderName || "익명", caption,
      });
    };
    reader.readAsDataURL(file);
  };

  if (!meetup) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">로딩 중...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" /> 픽업 보드 - {meetup.title}
          </h1>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* 픽업 차량 현황 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">차량 배치 현황</h2>
          {pickups.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground">배치된 차량이 없습니다.</CardContent></Card>
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
                        <Clock className="h-3.5 w-3.5" /> {new Date(p.pickupTime).toLocaleString("ko-KR")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      탑승 인원: {Array.isArray(p.assignedRegistrationIds) ? (p.assignedRegistrationIds as number[]).length : 0}/{p.vehicleCapacity}명
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* 사진 업로드 */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> 사진 공유
          </h2>
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">이름</Label>
                  <Input placeholder="이름 입력" value={uploaderName} onChange={e => setUploaderName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">유형</Label>
                  <select value={photoType} onChange={e => setPhotoType(e.target.value as any)}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="arrival_person">도착 인증</option>
                    <option value="pickup_location">픽업 장소</option>
                    <option value="vehicle">차량</option>
                    <option value="other">기타</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">설명 (선택)</Label>
                <Textarea placeholder="사진 설명..." value={caption} onChange={e => setCaption(e.target.value)} className="mt-1" rows={2} />
              </div>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" />
                <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> 사진 선택
                </Button>
                <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="flex-1">
                  {uploadMutation.isPending ? "업로드 중..." : "업로드"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 사진 갤러리 */}
        {photos.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">공유된 사진</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map(photo => (
                <Card key={photo.id} className="overflow-hidden">
                  <img src={photo.photoUrl} alt={photo.caption || ""} className="w-full h-40 object-cover" />
                  <CardContent className="py-2">
                    <p className="text-xs text-muted-foreground">{photo.uploadedBy || "익명"}</p>
                    {photo.caption && <p className="text-xs text-foreground mt-0.5">{photo.caption}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(photo.createdAt).toLocaleString("ko-KR")}</p>
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
