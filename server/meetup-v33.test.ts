import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@test.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ══════════════════════════════════════════════════════
// AI Chatbot Tests
// ══════════════════════════════════════════════════════

describe("v3.3 - AI Chatbot", () => {
  it("chatbot.ask should return a response for a simple question", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.ask({
      sessionId: "test-session-001",
      message: "안녕하세요",
    });
    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
    expect(result.response.length).toBeGreaterThan(0);
  }, 30000);

  it("chatbot.ask should accept meetupId for context", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.ask({
      sessionId: "test-session-002",
      message: "여행 준비물이 뭐가 필요한가요?",
      meetupId: 999, // non-existent meetup, should still work
    });
    expect(result).toHaveProperty("response");
    expect(typeof result.response).toBe("string");
  }, 30000);

  it("chatbot.history should return empty for new session", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chatbot.history({
      sessionId: "non-existent-session-xyz",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("chatbot.history should return logs after asking", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Ask a question first
    await caller.chatbot.ask({
      sessionId: "test-session-history",
      message: "테스트 질문입니다",
    });

    // Check history
    const history = await caller.chatbot.history({
      sessionId: "test-session-history",
    });
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0]).toHaveProperty("userMessage");
    expect(history[0]).toHaveProperty("botResponse");
    expect(history[0].userMessage).toBe("테스트 질문입니다");
  }, 30000);
});

// ══════════════════════════════════════════════════════
// Survey Tests
// ══════════════════════════════════════════════════════

describe("v3.3 - Survey Management", () => {
  let createdSurveyId: number;

  it("survey.create should create a new survey", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.create({
      title: "테스트 만족도 설문",
      description: "밋업 참석 만족도를 조사합니다",
      questions: [
        { id: "q1", text: "전반적인 만족도는?", type: "rating" },
        { id: "q2", text: "가장 좋았던 점은?", type: "text" },
        { id: "q3", text: "다음 밋업 참석 의향은?", type: "choice", options: ["예", "아니오", "미정"] },
      ],
    });
    expect(result).toHaveProperty("id");
    createdSurveyId = result!.id;
  });

  it("survey.list should return surveys", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("survey.getById should return the created survey", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.getById({ id: createdSurveyId });
    expect(result).not.toBeNull();
    expect(result!.title).toBe("테스트 만족도 설문");
    expect(result!.status).toBe("draft");
    const questions = result!.questions as any[];
    expect(questions.length).toBe(3);
  });

  it("survey.update should change survey status", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.update({
      id: createdSurveyId,
      status: "active",
    });
    expect(result).toEqual({ success: true });

    // Verify
    const publicCtx = createPublicContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    const survey = await publicCaller.survey.getById({ id: createdSurveyId });
    expect(survey!.status).toBe("active");
  });

  it("survey.respond should accept a response", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.respond({
      surveyId: createdSurveyId,
      respondentName: "테스트 참석자",
      respondentPhone: "010-1234-5678",
      answers: [
        { questionId: "q1", value: 5 },
        { questionId: "q2", value: "일정이 좋았습니다" },
        { questionId: "q3", value: "예" },
      ],
    });
    expect(result).toHaveProperty("id");
  });

  it("survey.responses should return submitted responses", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.responses({ surveyId: createdSurveyId });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty("answers");
    expect(result[0].respondentName).toBe("테스트 참석자");
  });

  it("survey.sendViaTelegram should attempt to send (may fail without config)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.sendViaTelegram({
      surveyId: createdSurveyId,
    });
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("recipientCount");
  });

  it("survey.delete should remove the survey", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.survey.delete({ id: createdSurveyId });
    expect(result).toEqual({ success: true });

    // Verify deletion
    const publicCtx = createPublicContext();
    const publicCaller = appRouter.createCaller(publicCtx);
    const survey = await publicCaller.survey.getById({ id: createdSurveyId });
    expect(survey).toBeNull();
  });

  it("survey.create should reject non-admin users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.survey.create({
        title: "Unauthorized Survey",
        questions: [{ id: "q1", text: "test", type: "rating" }],
      })
    ).rejects.toThrow();
  });
});

// ══════════════════════════════════════════════════════
// Broadcast Message Tests
// ══════════════════════════════════════════════════════

describe("v3.3 - Broadcast Messages", () => {
  it("broadcast.send should send a broadcast message", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.broadcast.send({
      title: "테스트 단체 공지",
      content: "이것은 테스트 단체 메시지입니다.",
      targetType: "all",
      sendViaTelegram: true,
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("recipientCount");
    expect(typeof result.recipientCount).toBe("number");
    expect(result).toHaveProperty("telegramSent");
  });

  it("broadcast.send should work with meetup filter", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.broadcast.send({
      title: "밋업별 공지",
      content: "특정 밋업 참석자에게 보내는 메시지입니다.",
      meetupId: 999,
      targetType: "meetup",
      sendViaTelegram: false,
    });
    expect(result).toHaveProperty("success", true);
    expect(result.telegramSent).toBe(false);
  });

  it("broadcast.list should return sent messages", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.broadcast.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toHaveProperty("title");
    expect(result[0]).toHaveProperty("content");
    expect(result[0]).toHaveProperty("recipientCount");
  });

  it("broadcast.send should reject non-admin users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.broadcast.send({
        title: "Unauthorized",
        content: "Should fail",
      })
    ).rejects.toThrow();
  });
});
