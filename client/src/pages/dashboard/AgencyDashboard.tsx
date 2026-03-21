import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Handshake, ArrowLeft, MapPin, Phone, Mail, Star, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function AgencyDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.roleDashboard.agency.useQuery();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const org = data?.organization;
  const partners = data?.partners || [];
  const members = data?.members || [];
  const totalPartners = data?.totalPartners || 0;
  const activePartners = data?.activePartners || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" className="mb-2" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> {t("roleDashboard.agency.goHome")}
            </Button>
            <h1 className="text-2xl font-bold">{t("roleDashboard.agency.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {org ? (
                <span><span className="font-medium text-foreground">{org.name}</span> · {org.region || org.country || "-"}</span>
              ) : (
                <span>{t("roleDashboard.agency.contactAdmin")}</span>
              )}
            </p>
          </div>
        </div>

        {!org ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-lg font-semibold mb-2">{t("roleDashboard.agency.noOrgDesc")}</h2>
              <p className="text-muted-foreground">
                {t("roleDashboard.agency.noOrgHint")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("roleDashboard.agency.managedPartners")}</p>
                      <p className="text-2xl font-bold">{totalPartners}</p>
                    </div>
                    <Handshake className="h-8 w-8 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("roleDashboard.agency.activePartners")}</p>
                      <p className="text-2xl font-bold">{activePartners}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("roleDashboard.agency.teamMembers")}</p>
                      <p className="text-2xl font-bold">{members.length}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Organization Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("roleDashboard.agency.orgInfo")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("roleDashboard.agency.orgName")}</span>
                      <span className="font-medium">{org.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("roleDashboard.agency.region")}</span>
                      <span>{org.region || "-"} {org.country ? `(${org.country})` : ""}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("roleDashboard.agency.phone")}</span>
                      <span>{org.contactPhone || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("roleDashboard.agency.email")}</span>
                      <span>{org.contactEmail || "-"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partners */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("roleDashboard.agency.partnerList")}</CardTitle>
              </CardHeader>
              <CardContent>
                {partners.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Handshake className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t("roleDashboard.agency.noPartners")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {partners.map((partner: any) => (
                      <div key={partner.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Handshake className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{partner.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              <span>{partner.region || "-"}</span>
                              {partner.rating > 0 && (
                                <>
                                  <span className="mx-1">·</span>
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span>{partner.rating}/5</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={partner.isActive ? "default" : "secondary"}>
                          {partner.isActive ? t("roleDashboard.agency.active") : t("roleDashboard.agency.inactive")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
