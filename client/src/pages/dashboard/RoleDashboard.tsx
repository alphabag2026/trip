import { useAuth } from "@/_core/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import OrganizerDashboard from "./OrganizerDashboard";
import AgencyDashboard from "./AgencyDashboard";
import PartnerDashboard from "./PartnerDashboard";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

/**
 * 역할별 대시보드 자동 분기
 * - superadmin/admin → /admin 리다이렉트
 * - organizer → OrganizerDashboard
 * - agency → AgencyDashboard
 * - partner → PartnerDashboard
 * - user → 일반 사용자 안내
 */
export default function RoleDashboard() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">{t("roleDashboard.loginRequired")}</h1>
          <p className="text-muted-foreground">{t("roleDashboard.loginRequiredDesc")}</p>
          <Button onClick={() => { window.location.href = "/login"; }}>
            {t("roleDashboard.loginBtn")}
          </Button>
        </div>
      </div>
    );
  }

  // 관리자는 admin 대시보드로
  if (user.role === "superadmin" || user.role === "admin") {
    setLocation("/admin");
    return null;
  }

  switch (user.role) {
    case "organizer":
      return <OrganizerDashboard />;
    case "agency":
      return <AgencyDashboard />;
    case "partner":
      return <PartnerDashboard />;
    default:
      // 일반 사용자 (user)
      return <OrganizerDashboard />;
  }
}
