import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Download, Share2, Image, Loader2, QrCode, Eye } from "lucide-react";

export default function InvitationGenerator() {
  const { t } = useTranslation();
  const [selectedMeetupId, setSelectedMeetupId] = useState<number | undefined>(undefined);
  const [selectedLang, setSelectedLang] = useState<"ko" | "en" | "zh">("ko");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: meetups } = trpc.meetup.list.useQuery();

  const generateMutation = trpc.attendeeDashboard.generateInvitation.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.url);
      toast.success(t("admin.invitation.generated"));
      setIsGenerating(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!selectedMeetupId) {
      toast.error(t("admin.invitation.selectMeetupFirst"));
      return;
    }
    setIsGenerating(true);
    setGeneratedUrl(null);
    generateMutation.mutate({
      meetupId: selectedMeetupId,
      lang: selectedLang,
      origin: window.location.origin,
    });
  };

  const handleDownload = async () => {
    if (!generatedUrl) return;
    try {
      const response = await fetch(generatedUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const meetup = meetups?.find(m => m.id === selectedMeetupId);
      a.download = `invitation-${meetup?.title || "meetup"}-${selectedLang}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleShare = async () => {
    if (!generatedUrl) return;
    if (navigator.share) {
      try {
        const response = await fetch(generatedUrl);
        const blob = await response.blob();
        const file = new File([blob], "invitation.png", { type: "image/png" });
        await navigator.share({
          title: t("admin.invitation.title"),
          files: [file],
        });
      } catch {
        // User cancelled or share failed
        await navigator.clipboard.writeText(generatedUrl);
        toast.success(t("admin.invitation.linkCopied"));
      }
    } else {
      await navigator.clipboard.writeText(generatedUrl);
      toast.success(t("admin.invitation.linkCopied"));
    }
  };

  const selectedMeetup = meetups?.find(m => m.id === selectedMeetupId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.invitation.title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              {t("admin.invitation.settings")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Meetup Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.invitation.selectMeetup")}</label>
              <Select
                value={selectedMeetupId?.toString() || ""}
                onValueChange={(v) => {
                  setSelectedMeetupId(Number(v));
                  setGeneratedUrl(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.invitation.selectMeetupPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {meetups?.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.title} ({m.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("admin.invitation.language")}</label>
              <Select value={selectedLang} onValueChange={(v) => { setSelectedLang(v as any); setGeneratedUrl(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meetup Info Preview */}
            {selectedMeetup && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                <div className="font-medium">{selectedMeetup.title}</div>
                <div className="text-muted-foreground">
                  {selectedMeetup.location && <div>📍 {selectedMeetup.location}</div>}
                  {selectedMeetup.destinationCountry && <div>🌍 {selectedMeetup.destinationCountry}</div>}
                  {selectedMeetup.scheduleStart && (
                    <div>📅 {new Date(selectedMeetup.scheduleStart).toLocaleDateString()} ~ {selectedMeetup.scheduleEnd ? new Date(selectedMeetup.scheduleEnd).toLocaleDateString() : ""}</div>
                  )}
                  {selectedMeetup.maxParticipants && <div>👥 {t("admin.invitation.capacity")}: {selectedMeetup.maxParticipants}</div>}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!selectedMeetupId || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("admin.invitation.generating")}
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  {t("admin.invitation.generate")}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {t("admin.invitation.preview")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generatedUrl ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-border shadow-lg">
                  <img
                    src={generatedUrl}
                    alt="Invitation"
                    className="w-full h-auto"
                    loading="lazy"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    {t("admin.invitation.download")}
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    {t("admin.invitation.share")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                <QrCode className="h-12 w-12 opacity-30" />
                <p className="text-sm">{t("admin.invitation.previewEmpty")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
