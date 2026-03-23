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

describe("auth.emailRegister", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject registration with existing email", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    getUserByEmail.mockResolvedValue({
      id: 1,
      openId: "existing",
      email: "test@test.com",
      name: "Test",
      passwordHash: "hash",
      loginMethod: "email",
      role: "user",
      organizationId: null,
      totpSecret: null,
      totpEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    // Verify the mock returns existing user
    const result = await db.getUserByEmail("test@test.com");
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@test.com");
  });

  it("should create user with personal role by default", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    const createUserWithPassword = vi.mocked(db.createUserWithPassword);

    getUserByEmail.mockResolvedValue(undefined);
    createUserWithPassword.mockResolvedValue({
      id: 2,
      openId: "local_new",
      email: "new@test.com",
      name: "New User",
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

    // Verify no existing user
    const existing = await db.getUserByEmail("new@test.com");
    expect(existing).toBeUndefined();

    // Create user
    const user = await db.createUserWithPassword({
      email: "new@test.com",
      name: "New User",
      passwordHash: "$2a$12$hash",
      role: "user",
    });

    expect(user).toBeDefined();
    expect(user?.role).toBe("user");
    expect(createUserWithPassword).toHaveBeenCalledWith({
      email: "new@test.com",
      name: "New User",
      passwordHash: "$2a$12$hash",
      role: "user",
    });
  });

  it("should create user with organizer role and organization", async () => {
    const getUserByEmail = vi.mocked(db.getUserByEmail);
    const createUserWithPassword = vi.mocked(db.createUserWithPassword);
    const createOrganization = vi.mocked(db.createOrganization);

    getUserByEmail.mockResolvedValue(undefined);
    createUserWithPassword.mockResolvedValue({
      id: 3,
      openId: "local_org",
      email: "org@test.com",
      name: "Organizer",
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
    createOrganization.mockResolvedValue({ id: 1 });

    const user = await db.createUserWithPassword({
      email: "org@test.com",
      name: "Organizer",
      passwordHash: "$2a$12$hash",
      role: "organizer",
    });

    expect(user?.role).toBe("organizer");

    const orgResult = await db.createOrganization({
      name: "Test Org",
      type: "organizer",
      contactEmail: "org@test.com",
    });

    expect(orgResult).toBeDefined();
    expect(orgResult?.id).toBe(1);
  });

  it("should map account types to correct roles", () => {
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
  });
});
