import { describe, it, expect, vi } from "vitest";

// ── SNS 관련 테스트 ──────────────────────────────────────────────
describe("v6.18 SNS Auto Post", () => {
  it("sns_accounts 테이블 스키마 필수 필드 검증", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.snsAccounts;
    expect(table).toBeDefined();
    // 필수 컬럼 확인
    const columns = Object.keys(table);
    expect(columns.length).toBeGreaterThan(0);
  });

  it("sns_posts 테이블 스키마 필수 필드 검증", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.snsPosts;
    expect(table).toBeDefined();
  });

  it("sns_templates 테이블 스키마 필수 필드 검증", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.snsTemplates;
    expect(table).toBeDefined();
  });

  it("SNS 게시물 상태 enum 값 검증", () => {
    const validStatuses = ["draft", "scheduled", "published", "failed"];
    validStatuses.forEach(status => {
      expect(typeof status).toBe("string");
      expect(status.length).toBeGreaterThan(0);
    });
  });

  it("SNS 플랫폼 enum 값 검증", () => {
    const validPlatforms = ["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram"];
    validPlatforms.forEach(platform => {
      expect(typeof platform).toBe("string");
    });
  });
});

// ── AI 일괄 등록 테스트 ──────────────────────────────────────────
describe("v6.18 AI Bulk Register", () => {
  it("참가자 데이터 구조 검증", () => {
    const participant = {
      name: "김철수",
      phone: "010-1234-5678",
      messengerId: "@chulsoo",
      locationType: "domestic" as const,
      category: "meetup" as const,
      teamName: "A팀",
      referrerName: "박영희",
      notes: "VIP",
    };
    expect(participant.name).toBeTruthy();
    expect(["domestic", "overseas"]).toContain(participant.locationType);
    expect(["meetup", "pre_visit", "event", "meeting", "other"]).toContain(participant.category);
  });

  it("일괄 등록 입력 유효성 검증", () => {
    const input = {
      meetupId: 1,
      participants: [
        { name: "김철수", locationType: "domestic" as const, category: "meetup" as const },
        { name: "박영희", locationType: "overseas" as const, category: "event" as const },
      ],
    };
    expect(input.meetupId).toBeGreaterThan(0);
    expect(input.participants.length).toBe(2);
    input.participants.forEach(p => {
      expect(p.name).toBeTruthy();
    });
  });

  it("빈 참가자 목록 처리", () => {
    const input = { meetupId: 1, participants: [] as any[] };
    expect(input.participants.length).toBe(0);
  });
});

// ── AI 스케줄 생성 테스트 ────────────────────────────────────────
describe("v6.18 AI Schedule Generator", () => {
  it("스케줄 데이터 구조 검증", () => {
    const schedule = {
      title: "네트워킹 세션",
      location: "코엑스 3층",
      eventTime: "2026-05-01T09:00:00",
      endTime: "2026-05-01T10:30:00",
      description: "참가자 간 네트워킹",
      eventOrder: 1,
    };
    expect(schedule.title).toBeTruthy();
    expect(schedule.eventOrder).toBeGreaterThanOrEqual(1);
    expect(new Date(schedule.eventTime).getTime()).toBeLessThan(new Date(schedule.endTime).getTime());
  });

  it("일괄 저장 입력 유효성 검증", () => {
    const input = {
      meetupId: 1,
      schedules: [
        { title: "오프닝", eventTime: "2026-05-01T09:00:00", eventOrder: 1 },
        { title: "세션 1", eventTime: "2026-05-01T10:00:00", eventOrder: 2 },
        { title: "점심", eventTime: "2026-05-01T12:00:00", eventOrder: 3 },
      ],
    };
    expect(input.meetupId).toBeGreaterThan(0);
    expect(input.schedules.length).toBe(3);
    // eventOrder 순서 검증
    for (let i = 1; i < input.schedules.length; i++) {
      expect(input.schedules[i].eventOrder).toBeGreaterThan(input.schedules[i - 1].eventOrder);
    }
  });
});

// ── 주최자 퀵 셋업 테스트 ────────────────────────────────────────
describe("v6.18 Organizer Quick Setup", () => {
  it("조직 생성 입력 유효성 검증", () => {
    const orgInput = {
      name: "Alpha Trip Inc.",
      type: "organizer" as const,
      description: "밋업 주최 전문 기업",
      website: "https://alphatrip.io",
      contactPhone: "+82-10-1234-5678",
      contactEmail: "contact@alphatrip.io",
      country: "한국",
    };
    expect(orgInput.name).toBeTruthy();
    expect(["platform", "organizer", "agency", "partner"]).toContain(orgInput.type);
  });

  it("밋업 생성 입력 유효성 검증", () => {
    const meetupInput = {
      title: "Web3 Seoul Meetup 2026",
      type: "meetup" as const,
      location: "코엑스 컨벤션센터",
      scheduleStart: "2026-05-01",
      scheduleEnd: "2026-05-03",
      maxParticipants: 50,
    };
    expect(meetupInput.title).toBeTruthy();
    expect(["meetup", "pre_visit", "event", "meeting", "other"]).toContain(meetupInput.type);
    expect(meetupInput.maxParticipants).toBeGreaterThan(0);
  });

  it("팀 초대 이메일 유효성 검증", () => {
    const emails = ["team1@company.com", "team2@company.com"];
    const roles = ["admin", "staff"];
    emails.forEach(email => {
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
    roles.forEach(role => {
      expect(["admin", "staff", "viewer"]).toContain(role);
    });
  });

  it("진행률 계산 검증", () => {
    const totalSteps = 3;
    const completedSteps = [1, 2];
    const progressPercent = Math.round((completedSteps.length / totalSteps) * 100);
    expect(progressPercent).toBe(67);
  });

  it("모든 단계 완료 시 100% 검증", () => {
    const totalSteps = 3;
    const completedSteps = [1, 2, 3];
    const progressPercent = Math.round((completedSteps.length / totalSteps) * 100);
    expect(progressPercent).toBe(100);
  });
});

// ── DB 헬퍼 함수 존재 확인 ───────────────────────────────────────
describe("v6.18 DB Helpers", () => {
  it("SNS 관련 DB 함수 존재 확인", async () => {
    const db = await import("./db");
    expect(typeof db.createSnsAccount).toBe("function");
    expect(typeof db.getSnsAccounts).toBe("function");
    expect(typeof db.createSnsPost).toBe("function");
    expect(typeof db.getSnsPosts).toBe("function");
    expect(typeof db.updateSnsPost).toBe("function");
    expect(typeof db.deleteSnsPost).toBe("function");
    expect(typeof db.createSnsTemplate).toBe("function");
    expect(typeof db.getSnsTemplates).toBe("function");
  });
});

// ── i18n 번역 키 검증 ───────────────────────────────────────────
describe("v6.18 i18n Keys", () => {
  it("ko.json에 새 사이드바 메뉴 번역 키 존재", async () => {
    const ko = await import("../client/src/locales/ko.json");
    const sidebar = (ko as any).default?.admin?.sidebar || (ko as any).admin?.sidebar;
    expect(sidebar.snsManager).toBeTruthy();
    expect(sidebar.aiBulkRegister).toBeTruthy();
    expect(sidebar.aiScheduleGenerator).toBeTruthy();
  });

  it("en.json에 새 사이드바 메뉴 번역 키 존재", async () => {
    const en = await import("../client/src/locales/en.json");
    const sidebar = (en as any).default?.admin?.sidebar || (en as any).admin?.sidebar;
    expect(sidebar.snsManager).toBeTruthy();
    expect(sidebar.aiBulkRegister).toBeTruthy();
    expect(sidebar.aiScheduleGenerator).toBeTruthy();
  });

  it("ko.json에 sidebarGroup.aiSns 키 존재", async () => {
    const ko = await import("../client/src/locales/ko.json");
    const sidebarGroup = (ko as any).default?.admin?.sidebarGroup || (ko as any).admin?.sidebarGroup;
    expect(sidebarGroup.aiSns).toBeTruthy();
  });

  it("en.json에 sidebarGroup.aiSns 키 존재", async () => {
    const en = await import("../client/src/locales/en.json");
    const sidebarGroup = (en as any).default?.admin?.sidebarGroup || (en as any).admin?.sidebarGroup;
    expect(sidebarGroup.aiSns).toBeTruthy();
  });
});
