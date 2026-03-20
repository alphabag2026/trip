import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, XCircle, AlertTriangle, Plane, Hotel, Shield,
  FileText, Download, ArrowLeft, Loader2
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import LanguageSelector from "@/components/LanguageSelector";

export default function ImmigrationChecklist() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const { data, isLoading } = trpc.immigration.myStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("common.error")}</h2>
            <p className="text-muted-foreground">{t("immigration.loginRequired")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const passport = data?.passport;
  const vouchers = data?.vouchers || [];
  const tickets = data?.tickets || [];

  const hasPassport = !!passport && !!passport.passportNumber;
  const hasVoucher = vouchers.length > 0;
  const hasTicket = tickets.length > 0;

  const passportExpiringSoon = passport?.expiryDate
    ? new Date(passport.expiryDate) < new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)
    : false;

  const allReady = hasPassport && hasVoucher && hasTicket;
  const readyCount = [hasPassport, hasVoucher, hasTicket].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">{t("brand")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/my-page">
              <Button variant="ghost" size="sm" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                {t("home.myPageBtn")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container max-w-3xl py-8">
        {/* Status Summary */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            allReady ? "bg-green-500/10" : "bg-amber-500/10"
          }`}>
            {allReady ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-amber-500" />
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {allReady ? t("immigration.ready") : t("immigration.checklist")}
          </h1>
          <p className="text-muted-foreground">
            {allReady
              ? t("immigration.allReady")
              : t("immigration.notReady", { count: readyCount })}
          </p>
        </div>

        {/* Checklist Items */}
        <div className="space-y-4">
          {/* Passport */}
          <Card className={`border-2 ${hasPassport ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                {hasPassport ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive shrink-0" />
                )}
                <Shield className="h-5 w-5 text-primary shrink-0" />
                {t("immigration.passport")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasPassport ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("immigration.name")}: </span>
                      <span className="font-medium">{passport?.fullName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("immigration.number")}: </span>
                      <span className="font-medium">
                        {passport?.passportNumber
                          ? `${passport.passportNumber.slice(0, 3)}${"*".repeat(Math.max(0, passport.passportNumber.length - 5))}${passport.passportNumber.slice(-2)}`
                          : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("immigration.nationalityLabel")}: </span>
                      <span className="font-medium">{passport?.nationality || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("immigration.expiry")}: </span>
                      <span className={`font-medium ${passportExpiringSoon ? "text-amber-500" : ""}`}>
                        {passport?.expiryDate || "-"}
                        {passportExpiringSoon && ` ${t("immigration.expiringSoon")}`}
                      </span>
                    </div>
                  </div>
                  {passportExpiringSoon && (
                    <div className="flex items-center gap-2 text-amber-500 text-sm mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{t("immigration.expiryWarning")}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    {t("immigration.noPassport")}
                  </p>
                  <Link href="/onboarding">
                    <Button size="sm" variant="outline">{t("immigration.registerPassport")}</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flight Ticket */}
          <Card className={`border-2 ${hasTicket ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                {hasTicket ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive shrink-0" />
                )}
                <Plane className="h-5 w-5 text-primary shrink-0" />
                {t("immigration.flightTicket")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasTicket ? (
                <div className="space-y-3">
                  {tickets.slice(0, 2).map((ticket) => (
                    <div key={ticket.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{ticket.passengerName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          ticket.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {ticket.outboundFlightNo && (
                          <div>{t("immigration.outbound")}: {ticket.outboundFlightNo} ({ticket.outboundDepartureCode} → {ticket.outboundArrivalCode})</div>
                        )}
                        {ticket.returnFlightNo && (
                          <div>{t("immigration.returnFlight")}: {ticket.returnFlightNo} ({ticket.returnDepartureCode} → {ticket.returnArrivalCode})</div>
                        )}
                        {ticket.outboundDepartureDate && <div>{t("immigration.departure")}: {ticket.outboundDepartureDate}</div>}
                        {ticket.returnDepartureDate && <div>{t("immigration.returnFlight")}: {ticket.returnDepartureDate}</div>}
                      </div>
                      {ticket.isGenerated && (
                        <div className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {t("immigration.generatedTicket")}
                        </div>
                      )}
                    </div>
                  ))}
                  {tickets.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t("immigration.moreTickets", { count: tickets.length - 2 })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("immigration.noTickets")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Hotel Voucher */}
          <Card className={`border-2 ${hasVoucher ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                {hasVoucher ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-destructive shrink-0" />
                )}
                <Hotel className="h-5 w-5 text-primary shrink-0" />
                {t("immigration.hotelVoucher")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasVoucher ? (
                <div className="space-y-3">
                  {vouchers.slice(0, 2).map((voucher) => (
                    <div key={voucher.id} className="border border-border/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{voucher.hotelName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          voucher.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                        }`}>
                          {voucher.status}
                        </span>
                      </div>
                      {voucher.hotelNameLocal && (
                        <p className="text-xs text-muted-foreground mb-1">{voucher.hotelNameLocal}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {voucher.checkInDate && <div>{t("immigration.checkIn")}: {voucher.checkInDate}</div>}
                        {voucher.checkOutDate && <div>{t("immigration.checkOut")}: {voucher.checkOutDate}</div>}
                        {voucher.guestName && <div>{t("immigration.guest")}: {voucher.guestName}</div>}
                      </div>
                    </div>
                  ))}
                  {vouchers.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {t("immigration.moreVouchers", { count: vouchers.length - 2 })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t("immigration.noVouchers")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tips */}
        <Card className="mt-8 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("immigration.tipsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">1.</span>
                <span>{t("immigration.tip1")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">2.</span>
                <span>{t("immigration.tip2")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">3.</span>
                <span>{t("immigration.tip3")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">4.</span>
                <span>{t("immigration.tip4")}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">5.</span>
                <span>{t("immigration.tip5")}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6 mb-16">
          <Link href="/my-page" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("home.myPageBtn")}
            </Button>
          </Link>
          {hasTicket && (
            <Link href="/my-page" className="flex-1">
              <Button className="w-full gap-2">
                <Download className="h-4 w-4" />
                {t("immigration.viewDocuments")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
