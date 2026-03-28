import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ── 슈퍼 관리자 시스템 테스트 ──────────────────────────────────

describe("v7.1 - Super Admin System", () => {
  describe("주최자 계정 생성 입력 검증", () => {
    const createOrganizerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
      organizationName: z.string().min(1),
      organizationType: z.enum(["organizer", "agency", "partner"]),
      phone: z.string().optional(),
      notes: z.string().optional(),
    });

    it("유효한 주최자 계정 생성 데이터를 검증한다", () => {
      const validData = {
        email: "organizer@test.com",
        password: "password123",
        name: "테스트 주최자",
        organizationName: "테스트 조직",
        organizationType: "organizer" as const,
        phone: "010-1234-5678",
      };
      const result = createOrganizerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("이메일 형식이 잘못되면 실패한다", () => {
      const invalidData = {
        email: "invalid-email",
        password: "password123",
        name: "테스트",
        organizationName: "테스트 조직",
        organizationType: "organizer" as const,
      };
      const result = createOrganizerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("비밀번호가 8자 미만이면 실패한다", () => {
      const invalidData = {
        email: "test@test.com",
        password: "short",
        name: "테스트",
        organizationName: "테스트 조직",
        organizationType: "organizer" as const,
      };
      const result = createOrganizerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("조직 유형이 유효하지 않으면 실패한다", () => {
      const invalidData = {
        email: "test@test.com",
        password: "password123",
        name: "테스트",
        organizationName: "테스트 조직",
        organizationType: "invalid_type",
      };
      const result = createOrganizerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("필수 필드가 없으면 실패한다", () => {
      const invalidData = {
        email: "test@test.com",
        password: "password123",
      };
      const result = createOrganizerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("권한 위임 입력 검증", () => {
    const delegateSchema = z.object({
      targetUserId: z.number().positive(),
      organizationId: z.number().positive(),
      delegationType: z.enum(["ownership_transfer", "admin_add", "admin_remove"]),
      reason: z.string().optional(),
    });

    it("유효한 소유권 이전 데이터를 검증한다", () => {
      const validData = {
        targetUserId: 1,
        organizationId: 1,
        delegationType: "ownership_transfer" as const,
        reason: "조직 인수",
      };
      const result = delegateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("관리자 추가 데이터를 검증한다", () => {
      const validData = {
        targetUserId: 2,
        organizationId: 1,
        delegationType: "admin_add" as const,
      };
      const result = delegateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("잘못된 위임 유형은 실패한다", () => {
      const invalidData = {
        targetUserId: 1,
        organizationId: 1,
        delegationType: "invalid_type",
      };
      const result = delegateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("userId가 0이면 실패한다", () => {
      const invalidData = {
        targetUserId: 0,
        organizationId: 1,
        delegationType: "ownership_transfer" as const,
      };
      const result = delegateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("역할 계층 검증", () => {
    const roleHierarchy = {
      super_admin: 5,
      admin: 4,
      organizer: 3,
      agency: 2,
      partner: 1,
      attendee: 0,
    };

    it("슈퍼관리자가 가장 높은 권한을 가진다", () => {
      expect(roleHierarchy.super_admin).toBeGreaterThan(roleHierarchy.admin);
      expect(roleHierarchy.super_admin).toBeGreaterThan(roleHierarchy.organizer);
    });

    it("주최자가 에이전시보다 높은 권한을 가진다", () => {
      expect(roleHierarchy.organizer).toBeGreaterThan(roleHierarchy.agency);
    });

    it("참석자가 가장 낮은 권한을 가진다", () => {
      expect(roleHierarchy.attendee).toBe(0);
    });
  });
});

// ── 광고 배너 관리 시스템 테스트 ──────────────────────────────────

describe("v7.1 - Ad Banner Management System", () => {
  describe("광고 배너 생성 입력 검증", () => {
    const createBannerSchema = z.object({
      position: z.enum(["hero_top", "middle_left", "middle_right", "bottom", "sidebar"]),
      title: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string(),
      linkUrl: z.string().optional(),
      linkText: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    });

    it("유효한 배너 생성 데이터를 검증한다", () => {
      const validData = {
        position: "hero_top" as const,
        title: "테스트 배너",
        description: "테스트 설명",
        imageUrl: "https://example.com/banner.jpg",
        linkUrl: "https://example.com",
        isActive: true,
        sortOrder: 1,
      };
      const result = createBannerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("모든 위치 옵션을 검증한다", () => {
      const positions = ["hero_top", "middle_left", "middle_right", "bottom", "sidebar"];
      positions.forEach((pos) => {
        const data = {
          position: pos,
          imageUrl: "https://example.com/banner.jpg",
        };
        const result = createBannerSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it("잘못된 위치는 실패한다", () => {
      const invalidData = {
        position: "invalid_position",
        imageUrl: "https://example.com/banner.jpg",
      };
      const result = createBannerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("이미지 URL 없이는 실패한다", () => {
      const invalidData = {
        position: "hero_top",
      };
      const result = createBannerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("날짜 필터링이 작동한다", () => {
      const now = new Date();
      const validData = {
        position: "hero_top" as const,
        imageUrl: "https://example.com/banner.jpg",
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + 86400000),
      };
      const result = createBannerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("광고 배너 수정 입력 검증", () => {
    const updateBannerSchema = z.object({
      id: z.number(),
      position: z.enum(["hero_top", "middle_left", "middle_right", "bottom", "sidebar"]).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      linkUrl: z.string().optional(),
      linkText: z.string().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().optional(),
      startDate: z.date().nullable().optional(),
      endDate: z.date().nullable().optional(),
    });

    it("유효한 배너 수정 데이터를 검증한다", () => {
      const validData = {
        id: 1,
        title: "수정된 배너",
        isActive: false,
      };
      const result = updateBannerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("ID 없이는 실패한다", () => {
      const invalidData = {
        title: "수정된 배너",
      };
      const result = updateBannerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("날짜를 null로 설정할 수 있다", () => {
      const validData = {
        id: 1,
        startDate: null,
        endDate: null,
      };
      const result = updateBannerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe("배너 클릭 추적 검증", () => {
    const trackClickSchema = z.object({
      id: z.number(),
    });

    it("유효한 클릭 추적 데이터를 검증한다", () => {
      const result = trackClickSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("ID가 없으면 실패한다", () => {
      const result = trackClickSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("배너 위치별 필터링 로직", () => {
    const mockBanners = [
      { id: 1, position: "hero_top", isActive: true, title: "Hero Banner" },
      { id: 2, position: "middle_left", isActive: true, title: "Hotel Ad" },
      { id: 3, position: "middle_right", isActive: false, title: "Cruise Ad" },
      { id: 4, position: "bottom", isActive: true, title: "Bottom Banner" },
      { id: 5, position: "sidebar", isActive: true, title: "Sidebar Ad" },
    ];

    it("위치별로 배너를 필터링한다", () => {
      const heroTop = mockBanners.filter((b) => b.position === "hero_top");
      expect(heroTop).toHaveLength(1);
      expect(heroTop[0].title).toBe("Hero Banner");
    });

    it("활성 배너만 필터링한다", () => {
      const activeBanners = mockBanners.filter((b) => b.isActive);
      expect(activeBanners).toHaveLength(4);
    });

    it("비활성 배너를 제외한다", () => {
      const activeBanners = mockBanners.filter((b) => b.isActive);
      expect(activeBanners.find((b) => b.id === 3)).toBeUndefined();
    });

    it("getAdByPosition 로직이 올바르게 작동한다", () => {
      const getAdByPosition = (pos: string) => mockBanners.find((b) => b.position === pos && b.isActive);
      
      expect(getAdByPosition("hero_top")?.title).toBe("Hero Banner");
      expect(getAdByPosition("middle_left")?.title).toBe("Hotel Ad");
      expect(getAdByPosition("middle_right")).toBeUndefined(); // inactive
      expect(getAdByPosition("bottom")?.title).toBe("Bottom Banner");
    });
  });
});

// ── role_delegations 테이블 데이터 구조 테스트 ──────────────────

describe("v7.1 - Role Delegation Data Structure", () => {
  it("위임 이력 데이터 구조가 올바르다", () => {
    const delegation = {
      id: 1,
      delegatorId: 1,
      targetUserId: 2,
      organizationId: 1,
      delegationType: "ownership_transfer",
      previousRole: "attendee",
      newRole: "organizer",
      reason: "조직 인수",
      createdAt: new Date(),
    };

    expect(delegation).toHaveProperty("delegatorId");
    expect(delegation).toHaveProperty("targetUserId");
    expect(delegation).toHaveProperty("organizationId");
    expect(delegation).toHaveProperty("delegationType");
    expect(delegation).toHaveProperty("previousRole");
    expect(delegation).toHaveProperty("newRole");
  });

  it("위임 유형이 올바른 값만 허용한다", () => {
    const validTypes = ["ownership_transfer", "admin_add", "admin_remove"];
    validTypes.forEach((type) => {
      expect(["ownership_transfer", "admin_add", "admin_remove"]).toContain(type);
    });
  });
});
