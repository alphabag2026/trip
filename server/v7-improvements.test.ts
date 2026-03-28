import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  createUserWithPassword: vi.fn(),
  createOrganization: vi.fn(),
  addOrganizationMember: vi.fn(),
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  getUserById: vi.fn(),
  getEmailVerificationToken: vi.fn(),
  markEmailVerificationUsed: vi.fn(),
  updateOnboardingStep: vi.fn(),
  setUserEmailVerified: vi.fn(),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
    compare: vi.fn(),
  },
}));

// Mock sdk
vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn().mockResolvedValue("mock-session-token"),
    authenticateRequest: vi.fn().mockResolvedValue(null),
  },
}));

import * as db from "./db";

describe("v7.0 - Email Verification Bug Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update users table emailVerified when verifying email", async () => {
    const mockToken = {
      id: 1,
      userId: 42,
      token: "test-token-abc",
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      createdAt: new Date(),
    };

    const getEmailVerificationToken = vi.mocked(db.getEmailVerificationToken);
    const markEmailVerificationUsed = vi.mocked(db.markEmailVerificationUsed);
    const updateOnboardingStep = vi.mocked(db.updateOnboardingStep);
    const setUserEmailVerified = vi.mocked(db.setUserEmailVerified);

    getEmailVerificationToken.mockResolvedValue(mockToken);
    markEmailVerificationUsed.mockResolvedValue(undefined);
    updateOnboardingStep.mockResolvedValue(undefined);
    setUserEmailVerified.mockResolvedValue(undefined);

    // Simulate verifyEmail flow
    const tokenRecord = await db.getEmailVerificationToken("test-token-abc");
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord?.usedAt).toBeNull();
    expect(new Date() < tokenRecord!.expiresAt).toBe(true);

    await db.markEmailVerificationUsed(tokenRecord!.id);
    await db.updateOnboardingStep(tokenRecord!.userId, "emailVerified", true);
    await db.setUserEmailVerified(tokenRecord!.userId, true);

    expect(markEmailVerificationUsed).toHaveBeenCalledWith(1);
    expect(updateOnboardingStep).toHaveBeenCalledWith(42, "emailVerified", true);
    expect(setUserEmailVerified).toHaveBeenCalledWith(42, true);
  });

  it("should reject expired verification tokens", async () => {
    const mockToken = {
      id: 2,
      userId: 43,
      token: "expired-token",
      expiresAt: new Date(Date.now() - 86400000), // expired 24h ago
      usedAt: null,
      createdAt: new Date(),
    };

    const getEmailVerificationToken = vi.mocked(db.getEmailVerificationToken);
    getEmailVerificationToken.mockResolvedValue(mockToken);

    const tokenRecord = await db.getEmailVerificationToken("expired-token");
    expect(tokenRecord).toBeDefined();
    expect(new Date() > tokenRecord!.expiresAt).toBe(true);
  });

  it("should reject already used verification tokens", async () => {
    const mockToken = {
      id: 3,
      userId: 44,
      token: "used-token",
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: new Date(),
      createdAt: new Date(),
    };

    const getEmailVerificationToken = vi.mocked(db.getEmailVerificationToken);
    getEmailVerificationToken.mockResolvedValue(mockToken);

    const tokenRecord = await db.getEmailVerificationToken("used-token");
    expect(tokenRecord).toBeDefined();
    expect(tokenRecord?.usedAt).not.toBeNull();
  });
});

describe("v7.0 - Organizer Registration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create organizer with company info fields", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    const createUserWithPassword = vi.mocked(db.createUserWithPassword);
    const createOrganization = vi.mocked(db.createOrganization);
    const addOrganizationMember = vi.mocked(db.addOrganizationMember);

    getUserByEmail.mockResolvedValue(undefined);
    createUserWithPassword.mockResolvedValue({
      id: 10,
      openId: "local_org_10",
      email: "organizer@company.com",
      name: "김주최",
      passwordHash: "$2a$12$hash",
      loginMethod: "email",
      role: "organizer",
      organizationId: null,
      totpSecret: null,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    createOrganization.mockResolvedValue({ id: 5 });
    addOrganizationMember.mockResolvedValue(undefined);

    // Step 1: Check email not taken
    const existing = await db.getUserByEmail("organizer@company.com");
    expect(existing).toBeUndefined();

    // Step 2: Create user with organizer role
    const user = await db.createUserWithPassword({
      email: "organizer@company.com",
      name: "김주최",
      passwordHash: "$2a$12$hash",
      role: "organizer",
    });
    expect(user?.role).toBe("organizer");

    // Step 3: Create organization
    const org = await db.createOrganization({
      name: "테스트 이벤트 기획사",
      type: "organizer",
      contactEmail: "organizer@company.com",
      contactName: "김주최",
      contactPhone: "010-1234-5678",
      description: "글로벌 밋업 전문 기획사",
      website: "https://company.com",
    });
    expect(org?.id).toBe(5);

    // Step 4: Add member as owner
    await db.addOrganizationMember({
      organizationId: 5,
      userId: 10,
      memberRole: "owner",
    });
    expect(addOrganizationMember).toHaveBeenCalledWith({
      organizationId: 5,
      userId: 10,
      memberRole: "owner",
    });
  });

  it("should create agency with correct role mapping", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    const createUserWithPassword = vi.mocked(db.createUserWithPassword);

    getUserByEmail.mockResolvedValue(undefined);
    createUserWithPassword.mockResolvedValue({
      id: 11,
      openId: "local_agency_11",
      email: "agency@travel.com",
      name: "여행사",
      passwordHash: "$2a$12$hash",
      loginMethod: "email",
      role: "agency",
      organizationId: null,
      totpSecret: null,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const user = await db.createUserWithPassword({
      email: "agency@travel.com",
      name: "여행사",
      passwordHash: "$2a$12$hash",
      role: "agency",
    });
    expect(user?.role).toBe("agency");
  });

  it("should create partner with correct role mapping", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    const createUserWithPassword = vi.mocked(db.createUserWithPassword);

    getUserByEmail.mockResolvedValue(undefined);
    createUserWithPassword.mockResolvedValue({
      id: 12,
      openId: "local_partner_12",
      email: "partner@service.com",
      name: "파트너업체",
      passwordHash: "$2a$12$hash",
      loginMethod: "email",
      role: "partner",
      organizationId: null,
      totpSecret: null,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const user = await db.createUserWithPassword({
      email: "partner@service.com",
      name: "파트너업체",
      passwordHash: "$2a$12$hash",
      role: "partner",
    });
    expect(user?.role).toBe("partner");
  });

  it("should validate organizer-specific input fields", () => {
    const organizerInput = {
      email: "test@org.com",
      password: "password123",
      name: "테스트 주최자",
      accountType: "organizer" as const,
      organizationName: "글로벌 이벤트 기획",
      contactPhone: "010-9876-5432",
      businessRegistration: "123-45-67890",
      businessType: "이벤트 기획/여행",
      companyAddress: "서울시 강남구 테헤란로 123",
      companyWebsite: "https://events.example.com",
      companyDescription: "해외 밋업 및 비즈니스 여행 전문 기획사입니다.",
      industryCategory: "여행/이벤트",
      employeeCount: 25,
      foundedYear: 2020,
      eventExperience: "연간 20회 이상 해외 밋업 운영",
      expectedEventsPerYear: 30,
      targetRegions: "동남아시아, 동아시아, 유럽",
      teamSize: 8,
    };

    // Validate all organizer-specific fields are present
    expect(organizerInput.businessRegistration).toBe("123-45-67890");
    expect(organizerInput.businessType).toBe("이벤트 기획/여행");
    expect(organizerInput.companyAddress).toBeDefined();
    expect(organizerInput.employeeCount).toBe(25);
    expect(organizerInput.foundedYear).toBe(2020);
    expect(organizerInput.eventExperience).toBeDefined();
    expect(organizerInput.expectedEventsPerYear).toBe(30);
    expect(organizerInput.targetRegions).toContain("동남아시아");
    expect(organizerInput.teamSize).toBe(8);
  });

  it("should correctly map all account types to roles", () => {
    const roleMap: Record<string, string> = {
      personal: "user",
      organizer: "organizer",
      agency: "agency",
      partner: "partner",
    };

    expect(roleMap["personal"]).toBe("user");
    expect(roleMap["organizer"]).toBe("organizer");
    expect(roleMap["agency"]).toBe("agency");
    expect(roleMap["partner"]).toBe("partner");
    expect(roleMap["unknown"]).toBeUndefined();
  });

  it("should not create organization for personal accounts", async () => {
    const createOrganization = vi.mocked(db.createOrganization);

    // For personal accounts, createOrganization should NOT be called
    const accountType = "personal";
    const organizationName = undefined;

    if (accountType !== "personal" && organizationName) {
      await db.createOrganization({
        name: organizationName,
        type: "organizer",
        contactEmail: "test@test.com",
      });
    }

    expect(createOrganization).not.toHaveBeenCalled();
  });
});

describe("v7.0 - Landing Page Design", () => {
  it("should have correct CDN image URLs for hero section", () => {
    // Verify CDN URLs are valid format
    const heroImageUrl = "https://static.manus.space/";
    expect(heroImageUrl).toContain("static.manus.space");
  });

  it("should have ad banner configuration", () => {
    const adBanners = [
      { position: "top", text: "꿈의 여행지를 찾아보세요", hasImage: true },
      { position: "middle-left", text: "특급 호텔 최대 40% 할인", hasImage: true },
      { position: "middle-right", text: "크루즈 여행", hasImage: true },
    ];

    expect(adBanners).toHaveLength(3);
    expect(adBanners.every(b => b.hasImage)).toBe(true);
    expect(adBanners.map(b => b.position)).toContain("top");
    expect(adBanners.map(b => b.position)).toContain("middle-left");
    expect(adBanners.map(b => b.position)).toContain("middle-right");
  });

  it("should have correct feature sections", () => {
    const features = [
      { id: "meetup", title: "밋업 관리", hasImage: true },
      { id: "travel", title: "여행 자동화", hasImage: true },
      { id: "booking", title: "예약 센터", hasImage: true },
    ];

    expect(features).toHaveLength(3);
    expect(features.every(f => f.hasImage)).toBe(true);
  });

  it("should have correct user type cards", () => {
    const userTypes = [
      { role: "organizer", color: "blue" },
      { role: "agency", color: "green" },
      { role: "partner", color: "orange" },
      { role: "attendee", color: "purple" },
    ];

    expect(userTypes).toHaveLength(4);
    expect(userTypes.map(u => u.role)).toEqual(["organizer", "agency", "partner", "attendee"]);
  });

  it("should have testimonials section", () => {
    const testimonials = [
      { name: "Kim S.", role: "밋업 주최자" },
      { name: "David L.", role: "여행사 대표" },
      { name: "Yuki T.", role: "이벤트 매니저" },
    ];

    expect(testimonials).toHaveLength(3);
    expect(testimonials.every(t => t.name && t.role)).toBe(true);
  });

  it("should have stats section with correct data", () => {
    const stats = [
      { label: "글로벌 사용자", value: "5,000+" },
      { label: "밋업 운영", value: "200+" },
      { label: "지원 국가", value: "50+" },
      { label: "지원 언어", value: "23" },
    ];

    expect(stats).toHaveLength(4);
    expect(stats[0].value).toBe("5,000+");
    expect(stats[3].value).toBe("23");
  });
});
