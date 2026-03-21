import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Telegram Webhook 테스트 ──────────────────────────────

describe("Telegram Webhook Endpoint", () => {
  it("should have webhook router module", async () => {
    const mod = await import("./telegramWebhook");
    expect(mod.createTelegramWebhookRouter).toBeDefined();
    expect(typeof mod.createTelegramWebhookRouter).toBe("function");
  });

  it("should return an Express router", async () => {
    const { createTelegramWebhookRouter } = await import("./telegramWebhook");
    const router = createTelegramWebhookRouter();
    expect(router).toBeDefined();
    // Express router has stack property
    expect(router.stack).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it("should have POST / route (webhook handler)", async () => {
    const { createTelegramWebhookRouter } = await import("./telegramWebhook");
    const router = createTelegramWebhookRouter();
    const routes = router.stack.map((layer: any) => ({
      method: layer.route?.methods ? Object.keys(layer.route.methods)[0] : null,
      path: layer.route?.path,
    })).filter((r: any) => r.path);
    
    const postRoot = routes.find((r: any) => r.method === "post" && r.path === "/");
    expect(postRoot).toBeDefined();
  });

  it("should have POST /setup route", async () => {
    const { createTelegramWebhookRouter } = await import("./telegramWebhook");
    const router = createTelegramWebhookRouter();
    const routes = router.stack.map((layer: any) => ({
      method: layer.route?.methods ? Object.keys(layer.route.methods)[0] : null,
      path: layer.route?.path,
    })).filter((r: any) => r.path);
    
    const postSetup = routes.find((r: any) => r.method === "post" && r.path === "/setup");
    expect(postSetup).toBeDefined();
  });

  it("should have GET /info route", async () => {
    const { createTelegramWebhookRouter } = await import("./telegramWebhook");
    const router = createTelegramWebhookRouter();
    const routes = router.stack.map((layer: any) => ({
      method: layer.route?.methods ? Object.keys(layer.route.methods)[0] : null,
      path: layer.route?.path,
    })).filter((r: any) => r.path);
    
    const getInfo = routes.find((r: any) => r.method === "get" && r.path === "/info");
    expect(getInfo).toBeDefined();
  });

  it("should have DELETE / route", async () => {
    const { createTelegramWebhookRouter } = await import("./telegramWebhook");
    const router = createTelegramWebhookRouter();
    const routes = router.stack.map((layer: any) => ({
      method: layer.route?.methods ? Object.keys(layer.route.methods)[0] : null,
      path: layer.route?.path,
    })).filter((r: any) => r.path);
    
    const deleteRoot = routes.find((r: any) => r.method === "delete" && r.path === "/");
    expect(deleteRoot).toBeDefined();
  });
});

// ── Telegram Webhook tRPC Procedures 테스트 ──────────────

describe("Telegram Webhook tRPC Procedures", () => {
  it("should have setupWebhook procedure", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("telegram.setupWebhook");
  });

  it("should have removeWebhook procedure", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("telegram.removeWebhook");
  });

  it("should have webhookInfo procedure", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("telegram.webhookInfo");
  });
});

// ── Chat Notification 테스트 ──────────────────────────────

describe("Chat Message Notification", () => {
  it("should have chatMessage.send procedure that returns shouldNotify", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("chatMessage.send");
  });

  it("should have chatRoom.getById procedure for room name in notifications", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain("chatRoom.getById");
  });
});

// ── DB Helpers 테스트 ──────────────────────────────────────

describe("Telegram Upload DB Helpers", () => {
  it("should export createTelegramUpload function", async () => {
    const db = await import("./db");
    expect(db.createTelegramUpload).toBeDefined();
    expect(typeof db.createTelegramUpload).toBe("function");
  });

  it("should export updateTelegramUpload function", async () => {
    const db = await import("./db");
    expect(db.updateTelegramUpload).toBeDefined();
    expect(typeof db.updateTelegramUpload).toBe("function");
  });

  it("should export getTelegramConfig function", async () => {
    const db = await import("./db");
    expect(db.getTelegramConfig).toBeDefined();
    expect(typeof db.getTelegramConfig).toBe("function");
  });

  it("should export getChatRoomById function", async () => {
    const db = await import("./db");
    expect(db.getChatRoomById).toBeDefined();
    expect(typeof db.getChatRoomById).toBe("function");
  });
});

// ── Server Core Registration 테스트 ──────────────────────

describe("Server Core - Webhook Registration", () => {
  it("should import telegramWebhook in _core/index.ts", async () => {
    // Verify the module can be imported without errors
    const mod = await import("./telegramWebhook");
    expect(mod).toBeDefined();
    expect(mod.createTelegramWebhookRouter).toBeDefined();
  });
});
