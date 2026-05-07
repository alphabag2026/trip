import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Globe, MapPin, Phone, Thermometer, Banknote, Clock, Wifi,
  AlertTriangle, Loader2, Copy, ExternalLink, Plug, Languages,
  Utensils, ShieldCheck, Ambulance, Building2, Train,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// 여행지 기본 정보 (밋업 목적지 기반)
interface DestinationInfo {
  country: string;
  city: string;
  timezone: string;
  currency: string;
  currencySymbol: string;
  language: string;
  emergencyNumber: string;
  policeNumber: string;
  ambulanceNumber: string;
  electricPlug: string;
  voltage: string;
  tipping: string;
  waterSafety: string;
  visaInfo: string;
}

export default function TravelInfoTab() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const travelInfoQuery = trpc.myTravel.travelInfo.useQuery(undefined, { enabled: !!user });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("myPage.copied", "복사되었습니다"));
  };

  if (travelInfoQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const info = travelInfoQuery.data;

  if (!info) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t("myPage.noTravelInfo", "여행지 정보가 없습니다. 밋업에 등록하면 여행지 정보가 표시됩니다.")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {info.city}, {info.country}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={Clock}
              label={t("myPage.timezone", "시간대")}
              value={info.timezone}
              color="text-blue-500"
              bgColor="bg-blue-50 dark:bg-blue-950/30"
            />
            <InfoCard
              icon={Banknote}
              label={t("myPage.currency", "통화")}
              value={`${info.currency} (${info.currencySymbol})`}
              color="text-emerald-500"
              bgColor="bg-emerald-50 dark:bg-emerald-950/30"
            />
            <InfoCard
              icon={Languages}
              label={t("myPage.localLanguage", "현지 언어")}
              value={info.language}
              color="text-purple-500"
              bgColor="bg-purple-50 dark:bg-purple-950/30"
            />
            <InfoCard
              icon={Plug}
              label={t("myPage.electricPlug", "전기 플러그")}
              value={`${info.electricPlug} / ${info.voltage}`}
              color="text-amber-500"
              bgColor="bg-amber-50 dark:bg-amber-950/30"
            />
          </div>
        </CardContent>
      </Card>

      {/* 긴급 연락처 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ambulance className="w-5 h-5 text-red-500" />
            {t("myPage.emergencyContacts", "긴급 연락처")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <EmergencyRow
            icon={Phone}
            label={t("myPage.emergencyGeneral", "긴급 전화")}
            number={info.emergencyNumber}
            color="text-red-500"
            onCopy={copyToClipboard}
          />
          <EmergencyRow
            icon={ShieldCheck}
            label={t("myPage.police", "경찰")}
            number={info.policeNumber}
            color="text-blue-500"
            onCopy={copyToClipboard}
          />
          <EmergencyRow
            icon={Ambulance}
            label={t("myPage.ambulance", "구급차")}
            number={info.ambulanceNumber}
            color="text-red-500"
            onCopy={copyToClipboard}
          />
          {info.embassyPhone && (
            <EmergencyRow
              icon={Building2}
              label={t("myPage.embassy", "대사관")}
              number={info.embassyPhone}
              color="text-indigo-500"
              onCopy={copyToClipboard}
            />
          )}
        </CardContent>
      </Card>

      {/* 실용 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {t("myPage.practicalInfo", "실용 정보")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <PracticalRow
            icon={Utensils}
            label={t("myPage.tipping", "팁 문화")}
            value={info.tipping}
          />
          <PracticalRow
            icon={Thermometer}
            label={t("myPage.waterSafety", "수돗물")}
            value={info.waterSafety}
          />
          {info.visaInfo && (
            <PracticalRow
              icon={Globe}
              label={t("myPage.visaInfo", "비자 정보")}
              value={info.visaInfo}
            />
          )}
          {info.transportTips && (
            <PracticalRow
              icon={Train}
              label={t("myPage.transportTips", "교통 팁")}
              value={info.transportTips}
            />
          )}
          {info.wifiInfo && (
            <PracticalRow
              icon={Wifi}
              label={t("myPage.wifiInfo", "와이파이/SIM")}
              value={info.wifiInfo}
            />
          )}
        </CardContent>
      </Card>

      {/* 유용한 링크 */}
      {info.usefulLinks && info.usefulLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-primary" />
              {t("myPage.usefulLinks", "유용한 링크")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {info.usefulLinks.map((link: any, i: number) => (
              <Button
                key={i}
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => window.open(link.url, "_blank")}
              >
                <ExternalLink className="w-4 h-4 text-primary" />
                <span className="truncate">{link.title}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, color, bgColor }: {
  icon: any; label: string; value: string; color: string; bgColor: string;
}) {
  return (
    <div className={`${bgColor} rounded-lg p-3`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function EmergencyRow({ icon: Icon, label, number, color, onCopy }: {
  icon: any; label: string; number: string; color: string; onCopy: (text: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <a href={`tel:${number}`} className="text-sm text-primary hover:underline">{number}</a>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onCopy(number)}>
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
}

function PracticalRow({ icon: Icon, label, value }: {
  icon: any; label: string; value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}
