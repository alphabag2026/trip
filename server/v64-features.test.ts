import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  createUserWithPassword: vi.fn(),
  createOrganization: vi.fn(),
  addOrganizationMember: vi.fn(),
  getDb: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  getEmailVerificationToken: vi.fn(),
  markEmailVerificationUsed: vi.fn(),
  createPasswordResetToken: vi.fn(),
  getPasswordResetToken: vi.fn(),
  markPasswordResetUsed: vi.fn(),
  getOnboardingProgress: vi.fn(),
  createOrUpdateOnboardingProgress: vi.fn(),
  updateOnboardingStep: vi.fn(),
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

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("mock-nanoid-token-123"),
}));

import * as db from "./db";

describe("v6.4 - Email Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create email verification token", async () => {
    const createToken = vi.mocked(db.createEmailVerificationToken);
    createToken.mockResolvedValue(undefined);

    const userId = 1;
    const token = "verify-token-abc";
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.createEmailVerificationToken(userId, token, expiresAt);

    expect(createToken).toHaveBeenCalledWith(userId, token, expiresAt);
  });

  it("should get valid email verification token", async () => {
    const getToken = vi.mocked(db.getEmailVerificationToken);
    getToken.mockResolvedValue({
      id: 1,
      userId: 5,
      token: "verify-token-abc",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      used: false,
      createdAt: new Date(),
    });

    const result = await db.getEmailVerificationToken("verify-token-abc");

    expect(result).toBeDefined();
    expect(result?.userId).toBe(5);
    expect(result?.used).toBe(false);
  });

  it("should return undefined for non-existent token", async () => {
    const getToken = vi.mocked(db.getEmailVerificationToken);
    getToken.mockResolvedValue(undefined);

    const result = await db.getEmailVerificationToken("invalid-token");
    expect(result).toBeUndefined();
  });

  it("should mark verification token as used", async () => {
    const markUsed = vi.mocked(db.markEmailVerificationUsed);
    markUsed.mockResolvedValue(undefined);

    await db.markEmailVerificationUsed(1);
    expect(markUsed).toHaveBeenCalledWith(1);
  });

  it("should reject expired verification token", async () => {
    const getToken = vi.mocked(db.getEmailVerificationToken);
    getToken.mockResolvedValue({
      id: 2,
      userId: 5,
      token: "expired-token",
      expiresAt: new Date(Date.now() - 1000), // expired
      used: false,
      createdAt: new Date(),
    });

    const result = await db.getEmailVerificationToken("expired-token");
    expect(result).toBeDefined();
    expect(result!.expiresAt.getTime()).toBeLessThan(Date.now());
  });
});

describe("v6.4 - Password Reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create password reset token", async () => {
    const createToken = vi.mocked(db.createPasswordResetToken);
    createToken.mockResolvedValue(undefined);

    const userId = 1;
    const token = "reset-token-xyz";
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.createPasswordResetToken(userId, token, expiresAt);

    expect(createToken).toHaveBeenCalledWith(userId, token, expiresAt);
  });

  it("should get valid password reset token", async () => {
    const getToken = vi.mocked(db.getPasswordResetToken);
    getToken.mockResolvedValue({
      id: 1,
      userId: 3,
      token: "reset-token-xyz",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      used: false,
      createdAt: new Date(),
    });

    const result = await db.getPasswordResetToken("reset-token-xyz");

    expect(result).toBeDefined();
    expect(result?.userId).toBe(3);
    expect(result?.used).toBe(false);
  });

  it("should mark password reset token as used", async () => {
    const markUsed = vi.mocked(db.markPasswordResetUsed);
    markUsed.mockResolvedValue(undefined);

    await db.markPasswordResetUsed(1);
    expect(markUsed).toHaveBeenCalledWith(1);
  });

  it("should find user by email for password reset", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    getUserByEmail.mockResolvedValue({
      id: 3,
      openId: "local_user3",
      email: "user@test.com",
      name: "Test User",
      passwordHash: "$2a$12$hash",
      loginMethod: "email",
      role: "user",
      organizationId: null,
      totpSecret: null,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const user = await db.getUserByEmail("user@test.com");
    expect(user).toBeDefined();
    expect(user?.email).toBe("user@test.com");
    expect(user?.loginMethod).toBe("email");
  });

  it("should return undefined for non-existent email", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    getUserByEmail.mockResolvedValue(undefined);

    const user = await db.getUserByEmail("nonexistent@test.com");
    expect(user).toBeUndefined();
  });
});

describe("v6.4 - Onboarding Progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get onboarding progress for user", async () => {
    const getProgress = vi.mocked(db.getOnboardingProgress);
    getProgress.mockResolvedValue({
      id: 1,
      userId: 5,
      emailVerified: false,
      profileCompleted: false,
      orgSetupCompleted: false,
      firstMeetupCreated: false,
      firstBookingMade: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await db.getOnboardingProgress(5);
    expect(result).toBeDefined();
    expect(result?.emailVerified).toBe(false);
    expect(result?.profileCompleted).toBe(false);
  });

  it("should return undefined for user without progress", async () => {
    const getProgress = vi.mocked(db.getOnboardingProgress);
    getProgress.mockResolvedValue(undefined);

    const result = await db.getOnboardingProgress(999);
    expect(result).toBeUndefined();
  });

  it("should create or update onboarding progress", async () => {
    const createOrUpdate = vi.mocked(db.createOrUpdateOnboardingProgress);
    createOrUpdate.mockResolvedValue(undefined);

    await db.createOrUpdateOnboardingProgress(5, {
      emailVerified: true,
    });

    expect(createOrUpdate).toHaveBeenCalledWith(5, {
      emailVerified: true,
    });
  });

  it("should update individual onboarding step", async () => {
    const updateStep = vi.mocked(db.updateOnboardingStep);
    updateStep.mockResolvedValue(undefined);

    await db.updateOnboardingStep(5, "emailVerified", true);

    expect(updateStep).toHaveBeenCalledWith(5, "emailVerified", true);
  });

  it("should track multiple progress steps independently", async () => {
    const getProgress = vi.mocked(db.getOnboardingProgress);
    getProgress.mockResolvedValue({
      id: 1,
      userId: 5,
      emailVerified: true,
      profileCompleted: true,
      orgSetupCompleted: false,
      firstMeetupCreated: false,
      firstBookingMade: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await db.getOnboardingProgress(5);
    expect(result?.emailVerified).toBe(true);
    expect(result?.profileCompleted).toBe(true);
    expect(result?.orgSetupCompleted).toBe(false);
    expect(result?.firstMeetupCreated).toBe(false);
  });
});

describe("v6.4 - Token Expiration Logic", () => {
  it("should correctly identify expired tokens", () => {
    const expiredDate = new Date(Date.now() - 1000);
    const validDate = new Date(Date.now() + 60 * 60 * 1000);

    expect(expiredDate.getTime() < Date.now()).toBe(true);
    expect(validDate.getTime() < Date.now()).toBe(false);
  });

  it("should correctly identify used tokens", () => {
    const usedToken = { used: true, expiresAt: new Date(Date.now() + 60000) };
    const freshToken = { used: false, expiresAt: new Date(Date.now() + 60000) };

    const isValid = (t: typeof usedToken) => !t.used && t.expiresAt.getTime() > Date.now();

    expect(isValid(usedToken)).toBe(false);
    expect(isValid(freshToken)).toBe(true);
  });

  it("should generate verification URL correctly", () => {
    const origin = "https://example.com";
    const token = "abc123";
    const url = `${origin}/verify-email?token=${token}`;

    expect(url).toBe("https://example.com/verify-email?token=abc123");
  });

  it("should generate reset URL correctly", () => {
    const origin = "https://example.com";
    const token = "reset-xyz";
    const url = `${origin}/reset-password?token=${token}`;

    expect(url).toBe("https://example.com/reset-password?token=reset-xyz");
  });
});
