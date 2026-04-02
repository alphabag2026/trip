import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Copy, ChevronDown, ChevronRight, Lock, Globe, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-500/20 text-green-400 border-green-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

interface EndpointSpec {
  method: string;
  path: string;
  summary: string;
  description: string;
  permission: string;
  tag: string;
  parameters?: { name: string; in: string; type: string; required: boolean; description: string }[];
  requestBody?: { type: string; properties: Record<string, { type: string; description: string; required?: boolean }> };
  responses: Record<string, { description: string; example?: any }>;
}

const API_SPEC: EndpointSpec[] = [
  {
    method: "GET", path: "/api/v1/meetups", summary: "밋업 목록 조회", description: "등록된 모든 밋업(여행 이벤트) 목록을 조회합니다. type과 status로 필터링할 수 있습니다.",
    permission: "meetups:read", tag: "Meetups",
    parameters: [
      { name: "type", in: "query", type: "string", required: false, description: "밋업 유형 필터 (conference, retreat, tour, etc.)" },
      { name: "status", in: "query", type: "string", required: false, description: "상태 필터 (planning, active, completed, cancelled)" },
    ],
    responses: { "200": { description: "성공", example: { data: [{ id: 1, title: "서울 밋업 2026", type: "conference", status: "active" }], total: 1 } } },
  },
  {
    method: "GET", path: "/api/v1/meetups/:id", summary: "밋업 상세 조회", description: "특정 밋업의 상세 정보를 조회합니다.",
    permission: "meetups:read", tag: "Meetups",
    parameters: [{ name: "id", in: "path", type: "integer", required: true, description: "밋업 ID" }],
    responses: { "200": { description: "성공" }, "404": { description: "밋업을 찾을 수 없음" } },
  },
  {
    method: "GET", path: "/api/v1/registrations", summary: "참가자 목록 조회", description: "등록된 참가자 목록을 조회합니다. meetupId와 status로 필터링할 수 있습니다.",
    permission: "registrations:read", tag: "Registrations",
    parameters: [
      { name: "meetupId", in: "query", type: "integer", required: false, description: "밋업 ID로 필터링" },
      { name: "status", in: "query", type: "string", required: false, description: "상태 필터 (pending, confirmed, cancelled)" },
    ],
    responses: { "200": { description: "성공", example: { data: [{ id: 1, name: "홍길동", meetupId: 1, status: "confirmed" }], total: 1 } } },
  },
  {
    method: "GET", path: "/api/v1/registrations/:id", summary: "참가자 상세 조회", description: "특정 참가자의 상세 정보를 조회합니다.",
    permission: "registrations:read", tag: "Registrations",
    parameters: [{ name: "id", in: "path", type: "integer", required: true, description: "참가자 ID" }],
    responses: { "200": { description: "성공" }, "404": { description: "참가자를 찾을 수 없음" } },
  },
  {
    method: "POST", path: "/api/v1/registrations", summary: "참가자 등록", description: "새로운 참가자를 등록합니다.",
    permission: "registrations:write", tag: "Registrations",
    requestBody: {
      type: "object",
      properties: {
        meetupId: { type: "integer", description: "밋업 ID", required: true },
        name: { type: "string", description: "참가자 이름", required: true },
        phone: { type: "string", description: "연락처", required: true },
        nameEn: { type: "string", description: "영문 이름" },
        email: { type: "string", description: "이메일" },
        nationality: { type: "string", description: "국적" },
        passportNumber: { type: "string", description: "여권번호" },
        organization: { type: "string", description: "소속" },
        role: { type: "string", description: "역할" },
      },
    },
    responses: { "201": { description: "등록 성공", example: { data: { id: 1 }, message: "Registration created successfully" } }, "400": { description: "필수 필드 누락" } },
  },
  {
    method: "PUT", path: "/api/v1/registrations/:id", summary: "참가자 정보 수정", description: "기존 참가자 정보를 수정합니다.",
    permission: "registrations:write", tag: "Registrations",
    parameters: [{ name: "id", in: "path", type: "integer", required: true, description: "참가자 ID" }],
    requestBody: {
      type: "object",
      properties: {
        name: { type: "string", description: "이름" },
        phone: { type: "string", description: "연락처" },
        status: { type: "string", description: "상태 (pending, confirmed, cancelled)" },
      },
    },
    responses: { "200": { description: "수정 성공" }, "404": { description: "참가자를 찾을 수 없음" } },
  },
  {
    method: "GET", path: "/api/v1/flights", summary: "항공편 목록 조회", description: "등록된 항공편 스케줄을 조회합니다.",
    permission: "flights:read", tag: "Flights",
    parameters: [
      { name: "meetupId", in: "query", type: "integer", required: false, description: "밋업 ID로 필터링" },
      { name: "direction", in: "query", type: "string", required: false, description: "방향 (outbound, return)" },
    ],
    responses: { "200": { description: "성공" } },
  },
  {
    method: "GET", path: "/api/v1/hotel-vouchers", summary: "호텔 바우처 목록 조회", description: "호텔 바우처 목록을 조회합니다.",
    permission: "vouchers:read", tag: "Vouchers",
    parameters: [{ name: "meetupId", in: "query", type: "integer", required: false, description: "밋업 ID로 필터링" }],
    responses: { "200": { description: "성공" } },
  },
  {
    method: "GET", path: "/api/v1/flight-tickets", summary: "항공권 목록 조회", description: "항공권 목록을 조회합니다.",
    permission: "tickets:read", tag: "Tickets",
    parameters: [{ name: "meetupId", in: "query", type: "integer", required: false, description: "밋업 ID로 필터링" }],
    responses: { "200": { description: "성공" } },
  },
  {
    method: "GET", path: "/api/v1/bookings/search-history", summary: "예약 검색 이력 조회", description: "항공편/호텔 예약 검색 이력을 조회합니다.",
    permission: "bookings:read", tag: "Bookings",
    parameters: [
      { name: "meetupId", in: "query", type: "integer", required: false, description: "밋업 ID로 필터링" },
      { name: "searchType", in: "query", type: "string", required: false, description: "검색 유형 (flight, hotel)" },
      { name: "limit", in: "query", type: "integer", required: false, description: "결과 수 제한" },
    ],
    responses: { "200": { description: "성공" } },
  },
  {
    method: "GET", path: "/api/v1/stats", summary: "플랫폼 통계", description: "플랫폼 전체 통계 정보를 조회합니다.",
    permission: "stats:read", tag: "Statistics",
    responses: { "200": { description: "성공", example: { data: { totalMeetups: 5, totalRegistrations: 120, totalFlights: 30 } } } },
  },
];

function EndpointCard({ spec }: { spec: EndpointSpec }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="bg-card/50 hover:bg-card/70 transition-colors">
      <CardContent className="p-0">
        <button className="w-full p-4 flex items-center gap-3 text-left" onClick={() => setExpanded(!expanded)}>
          <Badge className={`${METHOD_COLORS[spec.method]} font-mono text-xs px-2 py-0.5 border`}>{spec.method}</Badge>
          <code className="text-sm font-mono flex-1">{spec.path}</code>
          <span className="text-sm text-muted-foreground hidden md:block">{spec.summary}</span>
          <Badge variant="outline" className="text-xs"><Lock className="h-3 w-3 mr-1" />{spec.permission}</Badge>
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>

        {expanded && (
          <div className="border-t px-4 pb-4 space-y-4">
            <p className="text-sm text-muted-foreground pt-3">{spec.description}</p>

            {spec.parameters && spec.parameters.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Parameters</h4>
                <div className="bg-background/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">In</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Required</th>
                        <th className="text-left p-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spec.parameters.map((p) => (
                        <tr key={p.name} className="border-b last:border-0">
                          <td className="p-2 font-mono text-xs">{p.name}</td>
                          <td className="p-2"><Badge variant="outline" className="text-xs">{p.in}</Badge></td>
                          <td className="p-2 text-xs">{p.type}</td>
                          <td className="p-2">{p.required ? <Badge className="bg-red-500/20 text-red-400 text-xs">{t("admin.apiDocs.t1", "필수")}</Badge> : <span className="text-xs text-muted-foreground">{t("admin.apiDocs.t2", "선택")}</span>}</td>
                          <td className="p-2 text-xs text-muted-foreground">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {spec.requestBody && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Request Body</h4>
                <div className="bg-background/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-left p-2">Field</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Required</th>
                        <th className="text-left p-2">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(spec.requestBody.properties).map(([key, val]) => (
                        <tr key={key} className="border-b last:border-0">
                          <td className="p-2 font-mono text-xs">{key}</td>
                          <td className="p-2 text-xs">{val.type}</td>
                          <td className="p-2">{val.required ? <Badge className="bg-red-500/20 text-red-400 text-xs">{t("admin.apiDocs.t3", "필수")}</Badge> : <span className="text-xs text-muted-foreground">{t("admin.apiDocs.t4", "선택")}</span>}</td>
                          <td className="p-2 text-xs text-muted-foreground">{val.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Responses</h4>
              <div className="space-y-2">
                {Object.entries(spec.responses).map(([code, resp]) => (
                  <div key={code} className="bg-background/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={parseInt(code) < 300 ? "bg-green-500/20 text-green-400" : parseInt(code) < 500 ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400"}>{code}</Badge>
                      <span className="text-xs text-muted-foreground">{resp.description}</span>
                    </div>
                    {resp.example && (
                      <pre className="text-xs font-mono bg-background/80 rounded p-2 overflow-x-auto mt-2">
                        {JSON.stringify(resp.example, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* cURL Example */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">cURL Example</h4>
              <div className="bg-background/80 rounded-lg p-3 relative group">
                <pre className="text-xs font-mono overflow-x-auto">
{`curl -X ${spec.method} "${window.location.origin}${spec.path.replace(/:(\w+)/g, '{$1}')}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${spec.requestBody ? ` \\
  -d '${JSON.stringify(Object.fromEntries(Object.entries(spec.requestBody.properties).filter(([, v]) => v.required).map(([k, v]) => [k, v.type === "integer" ? 1 : `example_${k}`])), null, 2)}'` : ""}`}
                </pre>
                <Button
                  variant="ghost" size="icon"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `curl -X ${spec.method} "${window.location.origin}${spec.path}" -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json"`
                    );
                    toast.success(t("admin.apiDocs.t9", "cURL 복사됨"));
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApiDocs() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const tags = Array.from(new Set(API_SPEC.map((s) => s.tag)));

  const filteredSpecs = searchQuery
    ? API_SPEC.filter((s) => s.path.includes(searchQuery) || s.summary.includes(searchQuery) || s.description.includes(searchQuery))
    : API_SPEC;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-green-400" />
            {t("admin.apiDocs.t5", "REST API 문서")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("admin.apiDocs.t6", "외부 파트너 연동을 위한 API 레퍼런스")}</p>
        </div>
        <Badge variant="outline" className="text-sm">v1.0.0</Badge>
      </div>

      {/* Auth Info */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-400">{t("admin.apiDocs.t7", "인증")}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("admin.apiDocs.t8a", "모든 API 요청에는")} <code className="bg-background/50 px-1 rounded">Authorization: Bearer YOUR_API_KEY</code> {t("admin.apiDocs.t8b", "헤더가 필요합니다. API 키는 백오피스 > API 키 관리에서 생성할 수 있습니다.")}
              </p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Base URL: <code className="bg-background/50 px-1 rounded">{window.location.origin}/api/v1</code></span>
                <span>Rate Limit: 1000 req/hour</span>
                <span>Format: JSON</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Input
        placeholder={t("admin.apiDocs.t10", "엔드포인트 검색...")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {/* Endpoints by Tag */}
      {tags.map((tag) => {
        const tagSpecs = filteredSpecs.filter((s) => s.tag === tag);
        if (tagSpecs.length === 0) return null;
        return (
          <div key={tag}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {tag}
            </h2>
            <div className="space-y-2">
              {tagSpecs.map((spec, i) => (
                <EndpointCard key={`${spec.method}-${spec.path}-${i}`} spec={spec} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
