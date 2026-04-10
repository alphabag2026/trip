import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";

/**
 * SuperAdminGuard: admin/superadmin 역할만 접근 가능한 라우트를 보호합니다.
 * organizer나 일반 사용자가 직접 URL로 접근하면 권한 없음 메시지를 표시합니다.
 */
export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = (user as any)?.role;

  if (role === "admin" || role === "superadmin") {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <ShieldAlert className="h-16 w-16 text-destructive/60" />
      <h2 className="text-xl font-semibold">{t("admin.accessDenied", "접근 권한이 없습니다")}</h2>
      <p className="text-muted-foreground max-w-md">
        {t("admin.superadminOnly", "이 페이지는 슈퍼관리자만 접근할 수 있습니다.")}
      </p>
    </div>
  );
}
