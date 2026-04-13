import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Ticket, Loader2, Plane, Calendar, Copy, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function TicketsTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const ticketsQuery = trpc.flightTicket.listMy.useQuery(undefined, { enabled: !!user });

  const handleDownloadPdf = async (ticket: any) => {
    toast.info("PDF 생성 중...");
    try {
      const { downloadTicketPdf } = await import("@/lib/pdfDownload");
      await downloadTicketPdf(ticket);
      toast.success("항공권 PDF가 다운로드되었습니다.");
    } catch {
      toast.error("PDF 생성에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      {ticketsQuery.isLoading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : !ticketsQuery.data?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t("myPage.noTickets")}</CardContent></Card>
      ) : ticketsQuery.data.map((t_ticket: any) => (
        <Card key={t_ticket.id} className="overflow-hidden">
          <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-lg">{t_ticket.airline || t("myPage.flight")}</CardTitle>
              </div>
              <Badge variant={t_ticket.status === "confirmed" ? "default" : "secondary"}>{t_ticket.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Outbound */}
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t("myPage.outbound", "가는 편")}</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold">{t_ticket.departureAirport || "-"}</p>
                  <p className="text-sm text-muted-foreground">{t_ticket.departureCity || ""}</p>
                  <p className="text-sm font-medium">{t_ticket.departureDate || ""} {t_ticket.departureTime || ""}</p>
                </div>
                <div className="flex-1 mx-4 flex flex-col items-center">
                  <p className="text-xs text-muted-foreground">{t_ticket.flightNo || ""}</p>
                  <div className="w-full border-t border-dashed my-1 relative">
                    <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 rotate-90" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{t_ticket.arrivalAirport || "-"}</p>
                  <p className="text-sm text-muted-foreground">{t_ticket.arrivalCity || ""}</p>
                  <p className="text-sm font-medium">{t_ticket.arrivalDate || ""} {t_ticket.arrivalTime || ""}</p>
                </div>
              </div>
            </div>

            {/* Return */}
            {t_ticket.returnFlightNo && (
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t("myPage.returnFlight", "오는 편")}</p>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{t_ticket.arrivalAirport || "-"}</p>
                    <p className="text-sm font-medium">{t_ticket.returnDepartureDate || ""} {t_ticket.returnDepartureTime || ""}</p>
                  </div>
                  <div className="flex-1 mx-4 flex flex-col items-center">
                    <p className="text-xs text-muted-foreground">{t_ticket.returnFlightNo}</p>
                    <div className="w-full border-t border-dashed my-1 relative">
                      <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 -rotate-90" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{t_ticket.departureAirport || "-"}</p>
                    <p className="text-sm font-medium">{t_ticket.returnArrivalDate || ""} {t_ticket.returnArrivalTime || ""}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="text-sm space-y-1">
              {t_ticket.bookingReference && <p><strong>PNR:</strong> {t_ticket.bookingReference}</p>}
              {t_ticket.passengerName && <p><strong>{t("myPage.passenger")}:</strong> {t_ticket.passengerName}</p>}
              {t_ticket.seatClass && <p><strong>{t("myPage.seatClass")}:</strong> {t_ticket.seatClass}</p>}
              {t_ticket.seatNumber && <p><strong>{t("myPage.seat")}:</strong> {t_ticket.seatNumber}</p>}
              {t_ticket.baggageAllowance && <p><strong>{t("myPage.baggage")}:</strong> {t_ticket.baggageAllowance}</p>}
            </div>

            {t_ticket.ticketFileUrl && (
              <div className="border rounded-lg p-3">
                {t_ticket.ticketFileType === "pdf" ? (
                  <a href={t_ticket.ticketFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{t("myPage.viewTicketPdf")}</a>
                ) : (
                  <img loading="lazy" decoding="async" src={t_ticket.ticketFileUrl} alt="Flight Ticket" className="max-w-full rounded border" />
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {t_ticket.bookingReference && (
                <Button variant="outline" size="sm" onClick={() => {
                  navigator.clipboard.writeText(t_ticket.bookingReference);
                  toast.success(t("myPage.pnrCopied"));
                }}>
                  <Copy className="w-4 h-4 mr-1" />PNR {t("myPage.copy")}
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-blue-600 border-blue-300" onClick={() => handleDownloadPdf(t_ticket)}>
                <Download className="w-4 h-4 mr-1" />PDF 저장
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
