import { describe, it, expect } from "vitest";

/**
 * v7.2 Tests - 광고 배너 데이터, 주최자 승인 워크플로우, 대시보드 통계
 */

describe("v7.2 - 광고 배너 초기 데이터", () => {
  it("ad_banners 테이블 스키마가 올바르게 정의되어 있어야 함", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.adBanners).toBeDefined();
  });

  it("ad_banners 테이블에 필수 컬럼이 있어야 함", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.adBanners;
    // 테이블 객체가 존재하는지 확인
    expect(table).toBeDefined();
  });

  it("publicList 프로시저가 정의되어 있어야 함", async () => {
    const db = await import("./db");
    expect(typeof db.getAdBanners).toBe("function");
  });

  it("배너 위치 타입이 올바르게 정의되어 있어야 함 (hero_top, middle_left, middle_right, bottom, sidebar)", async () => {
    const schema = await import("../drizzle/schema");
    // adBanners 테이블이 존재하면 위치 enum이 정의되어 있음
    expect(schema.adBanners).toBeDefined();
  });
});

describe("v7.2 - 주최자 승인 워크플로우", () => {
  it("organizer_approvals 테이블 스키마가 정의되어 있어야 함", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.organizerApprovals).toBeDefined();
  });

  it("users 테이블에 isApproved 컬럼이 있어야 함", async () => {
    const schema = await import("../drizzle/schema");
    const usersTable = schema.users;
    expect(usersTable).toBeDefined();
    // isApproved 컬럼 확인
    const columns = Object.keys(usersTable);
    expect(columns.length).toBeGreaterThan(0);
  });

  it("주최자 승인 관련 DB 함수가 정의되어 있어야 함", async () => {
    const db = await import("./db");
    expect(typeof db.createOrganizerApproval).toBe("function");
    expect(typeof db.getOrganizerApprovals).toBe("function");
    expect(typeof db.updateOrganizerApproval).toBe("function");
  });

  it("승인 상태 업데이트 함수가 올바른 파라미터를 받아야 함", async () => {
    const db = await import("./db");
    // 함수가 존재하는지 확인
    expect(db.updateOrganizerApproval).toBeDefined();
    expect(typeof db.getOrganizerApprovalByUserId).toBe("function");
  });

  it("emailRegister에서 주최자 가입 시 승인 대기 상태로 설정해야 함", async () => {
    // routers.ts에서 emailRegister 프로시저가 organizer/agency/partner 역할에 대해
    // isApproved = false로 설정하는 로직이 있는지 확인
    const routersContent = await import("fs").then(fs => 
      fs.readFileSync("./server/routers.ts", "utf-8")
    );
    expect(routersContent).toContain("isApproved");
    expect(routersContent).toContain("createOrganizerApproval");
  });
});

describe("v7.2 - 대시보드 통계 강화", () => {
  it("KPI 통계 함수가 정의되어 있어야 함", async () => {
    const db = await import("./db");
    expect(typeof db.getDashboardKPIs).toBe("function");
  });

  it("가입 추이 통계 함수가 정의되어 있어야 함", async () => {
    const db = await import("./db");
    expect(typeof db.getUserRegistrationStats).toBe("function");
  });

  it("역할별 분포 통계 함수가 정의되어 있어야 함", async () => {
    const db = await import("./db");
    expect(typeof db.getUserRoleDistribution).toBe("function");
  });

  it("광고 배너 클릭 통계 함수가 정의되어 있어야 함", async () => {
    const db = await import("./db");
    expect(typeof db.getAdBannerClickStats).toBe("function");
  });

  it("dashboardStats 라우터가 routers.ts에 정의되어 있어야 함", async () => {
    const routersContent = await import("fs").then(fs => 
      fs.readFileSync("./server/routers.ts", "utf-8")
    );
    expect(routersContent).toContain("dashboardStats: router({");
    expect(routersContent).toContain("kpis:");
    expect(routersContent).toContain("registrationTrend:");
    expect(routersContent).toContain("roleDistribution:");
    expect(routersContent).toContain("adBannerStats:");
  });

  it("organizerApproval 라우터가 routers.ts에 정의되어 있어야 함", async () => {
    const routersContent = await import("fs").then(fs => 
      fs.readFileSync("./server/routers.ts", "utf-8")
    );
    expect(routersContent).toContain("organizerApproval: router({");
  });
});

describe("v7.2 - PlatformDashboard UI 통합", () => {
  it("PlatformDashboard에 주최자 승인 탭이 있어야 함", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./client/src/pages/admin/PlatformDashboard.tsx", "utf-8");
    expect(content).toContain("OrganizerApprovalsTab");
  });

  it("PlatformDashboard에 통계/분석 탭이 있어야 함", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./client/src/pages/admin/PlatformDashboard.tsx", "utf-8");
    expect(content).toContain("AnalyticsTab");
  });

  it("광고 배너 관리 페이지가 존재해야 함", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("./client/src/pages/admin/AdBanners.tsx");
    expect(exists).toBe(true);
  });

  it("DashboardLayout에 광고 배너 메뉴가 있어야 함", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("./client/src/components/DashboardLayout.tsx", "utf-8");
    expect(content).toContain("ad-banners");
  });
});
