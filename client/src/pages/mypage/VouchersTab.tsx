import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Hotel, Loader2, MapPin, Phone, Navigation, Copy, ExternalLink, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function VouchersTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const vouchersQuery = trpc.hotelVoucher.listMy.useQuery(undefined, { enabled: !!user });

  const handleDownloadPdf = async (v: any) => {
    toast.info("PDF 생성 중...");
    try {
      const { downloadVoucherPdf } = await import("@/lib/pdfDownload");
      await downloadVoucherPdf(v);
      toast.success("바우처 PDF가 다운로드되었습니다.");
    } catch {
      toast.error("PDF 생성에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      {vouchersQuery.isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : !vouchersQuery.data?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("myPage.noVouchers")}</CardContent></Card>
      ) : vouchersQuery.data.map((v: any) => (
        <Card key={v.id} className="overflow-hidden">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hotel className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">{v.hotelName}</CardTitle>
              </div>
              <Badge>{v.status}</Badge>
            </div>
            {v.hotelNameLocal && <p className="text-sm text-muted-foreground mt-1">{v.hotelNameLocal}</p>}
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm">{v.hotelAddress}</p>
                  {v.hotelAddressLocal && <p className="text-sm text-muted-foreground">{v.hotelAddressLocal}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  navigator.clipboard.writeText(v.hotelAddress + (v.hotelAddressLocal ? '\n' + v.hotelAddressLocal : ''));
                  toast.success(t("myPage.addressCopied"));
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {v.hotelPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${v.hotelPhone}`} className="text-primary hover:underline">{v.hotelPhone}</a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{t("myPage.checkIn")}</p>
                <p className="font-bold">{v.checkInDate || "-"}</p>
                <p className="text-sm text-green-600">{v.checkInTime || "14:00"}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{t("myPage.checkOut")}</p>
                <p className="font-bold">{v.checkOutDate || "-"}</p>
                <p className="text-sm text-red-600">{v.checkOutTime || "12:00"}</p>
              </div>
            </div>

            <div className="text-sm space-y-1">
              {v.bookingId && <p><strong>Booking ID:</strong> {v.bookingId}</p>}
              {v.guestName && <p><strong>{t("myPage.guestName")}:</strong> {v.guestName}</p>}
              {v.roomType && <p><strong>{t("myPage.roomType")}:</strong> {v.roomType} x{v.roomCount}</p>}
              {v.includes && <p><strong>{t("myPage.includes")}:</strong> {v.includes}</p>}
              {v.specialRequests && <p><strong>{t("myPage.specialRequests")}:</strong> {v.specialRequests}</p>}
            </div>

            {v.cancellationPolicy && (
              <div className="text-xs bg-muted/50 rounded p-2">
                <strong>{t("myPage.cancellationPolicy")}:</strong> {v.cancellationPolicy}
              </div>
            )}

            {v.checkInInstructions && (
              <div className="text-xs bg-muted/50 rounded p-2">
                <strong>{t("myPage.checkInInstructions")}:</strong> {v.checkInInstructions}
              </div>
            )}

            {v.voucherFileUrl && (
              <div className="border rounded-lg p-3">
                {v.voucherFileType === "pdf" ? (
                  <a href={v.voucherFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{t("myPage.viewPdf")}</a>
                ) : (
                  <img src={v.voucherFileUrl} alt="Hotel Voucher" className="max-w-full rounded border" />
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {(v.hotelLatitude && v.hotelLongitude) ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${v.hotelLatitude},${v.hotelLongitude}`, "_blank")}>
                    <MapPin className="w-4 h-4 mr-1" />{t("myPage.googleMap")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${v.hotelLatitude},${v.hotelLongitude}`, "_blank")}>
                    <Navigation className="w-4 h-4 mr-1" />{t("myPage.directions")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(`https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffLatitude=${v.hotelLatitude}&dropOffLongitude=${v.hotelLongitude}&dropOffAddress=${encodeURIComponent(v.hotelName)}`, "_blank")}>
                    <ExternalLink className="w-4 h-4 mr-1" />{t("myPage.callGrab")}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(v.hotelAddress)}`, "_blank")}>
                  <MapPin className="w-4 h-4 mr-1" />{t("myPage.searchGoogleMap")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => {
                const text = `${v.hotelName}\n${v.hotelAddress}${v.hotelAddressLocal ? '\n' + v.hotelAddressLocal : ''}${v.hotelPhone ? '\nTel: ' + v.hotelPhone : ''}`;
                navigator.clipboard.writeText(text);
                toast.success(t("myPage.hotelInfoCopied"));
              }}>
                <Copy className="w-4 h-4 mr-1" />{t("myPage.copyInfo")}
              </Button>
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-300" onClick={() => handleDownloadPdf(v)}>
                <Download className="w-4 h-4 mr-1" />PDF 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
