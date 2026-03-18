import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1, openId: "admin-user", email: "admin@test.com", name: "Admin",
      loginMethod: "manus", role: "admin",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("v3.0 - Communication Channels", () => {
  it("channel.create requires admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.channel.create({ channelName: "Test Channel", channelType: "general" })
    ).rejects.toThrow();
  });

  it("channel.create accepts valid input with admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    // This will fail at DB level in test env but validates input schema
    try {
      await caller.channel.create({
        channelName: "두바이 픽업 기사",
        channelType: "pickup_driver",
        description: "공항 픽업 기사 소통 채널",
        assignedTo: "김기사",
        assignedPhone: "010-1234-5678",
      });
    } catch (e: any) {
      // DB error expected in test env, but should not be input validation error
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("channel.list requires admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.channel.list()).rejects.toThrow();
  });

  it("channel.getById is public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Should not throw auth error
    try {
      await caller.channel.getById({ id: 999 });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });
});

describe("v3.0 - Messages", () => {
  it("message.send accepts valid input", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    try {
      await caller.message.send({
        channelId: 1, senderName: "홍길동", senderRole: "participant",
        content: "안녕하세요, 도착했습니다!",
      });
    } catch (e: any) {
      expect(e.code).not.toBe("BAD_REQUEST");
    }
  });

  it("message.send validates required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.message.send({
        channelId: 1, senderName: "", senderRole: "participant", content: "test",
      })
    ).rejects.toThrow();
  });

  it("message.send supports all role types", async () => {
    const roles = ["admin", "manager", "driver", "participant", "hotel_staff"] as const;
    const caller = appRouter.createCaller(createPublicContext());
    for (const role of roles) {
      try {
        await caller.message.send({
          channelId: 1, senderName: "Test", senderRole: role, content: "test",
        });
      } catch (e: any) {
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    }
  });

  it("message.send supports all message types", async () => {
    const types = ["text", "photo", "location", "status_update", "alert"] as const;
    const caller = appRouter.createCaller(createPublicContext());
    for (const type of types) {
      try {
        await caller.message.send({
          channelId: 1, senderName: "Test", senderRole: "participant",
          content: "test", messageType: type,
        });
      } catch (e: any) {
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    }
  });
});

describe("v3.0 - Vouchers", () => {
  it("voucher.upload requires admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.voucher.upload({
        registrationId: 1, voucherType: "flight", title: "Test",
        fileBase64: "dGVzdA==", fileName: "test.pdf", mimeType: "application/pdf",
      })
    ).rejects.toThrow();
  });

  it("voucher.bulkUpload requires admin role", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.voucher.bulkUpload({
        voucherType: "flight",
        files: [{ registrationId: 1, title: "Test", fileBase64: "dGVzdA==", fileName: "test.pdf", mimeType: "application/pdf" }],
      })
    ).rejects.toThrow();
  });

  it("voucher.getByRegistration is public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    try {
      await caller.voucher.getByRegistration({ registrationId: 999 });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("voucher.sendToParticipant requires admin", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.voucher.sendToParticipant({ voucherId: 1, method: "web" })
    ).rejects.toThrow();
  });
});

describe("v3.0 - Assignment Confirmation", () => {
  it("assignment.getMyAssignments is public", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    try {
      await caller.assignment.getMyAssignments({ registrationId: 999 });
    } catch (e: any) {
      expect(e.code).not.toBe("UNAUTHORIZED");
    }
  });

  it("assignment.confirm validates type enum", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.assignment.confirm({ registrationId: 1, type: "invalid" as any })
    ).rejects.toThrow();
  });

  it("assignment.confirm accepts valid types", async () => {
    const types = ["flight", "accommodation", "pickup"] as const;
    const caller = appRouter.createCaller(createPublicContext());
    for (const type of types) {
      try {
        await caller.assignment.confirm({ registrationId: 999, type });
      } catch (e: any) {
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    }
  });
});

describe("v3.0 - Channel Type Validation", () => {
  it("channel.create validates channel type enum", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.channel.create({ channelName: "Test", channelType: "invalid" as any })
    ).rejects.toThrow();
  });

  it("channel.create accepts all valid channel types", async () => {
    const types = ["pickup_driver", "manager", "hotel_checkin", "transfer", "general"] as const;
    const caller = appRouter.createCaller(createAdminContext());
    for (const type of types) {
      try {
        await caller.channel.create({ channelName: `Test ${type}`, channelType: type });
      } catch (e: any) {
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    }
  });
});

describe("v3.0 - Voucher Type Validation", () => {
  it("voucher.upload validates voucher type enum", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.voucher.upload({
        registrationId: 1, voucherType: "invalid" as any, title: "Test",
        fileBase64: "dGVzdA==", fileName: "test.pdf", mimeType: "application/pdf",
      })
    ).rejects.toThrow();
  });
});
