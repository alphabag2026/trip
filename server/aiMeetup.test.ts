import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock invokeLLM to avoid real API calls
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            title: "태국 방콕 프로젝트 밋업",
            type: "meetup",
            locationType: "overseas",
            destinationCountry: "TH",
            location: "Bangkok, Thailand",
            scheduleStart: "2026-04-01",
            scheduleEnd: "2026-04-25",
            description: "태국 방콕에서 진행되는 프로젝트 밋업입니다. 한국과 중국에서 참석자를 초청합니다.",
            maxParticipants: 0,
            invitedCountries: ["KR", "CN"],
            suggestedBaggageNotice: "태국 입국 시 수화물 규정을 확인하세요. 초과화물은 직접부담할 수 있습니다.",
          }),
        },
      },
    ],
  }),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("aiMeetup.parsePrompt", () => {
  it("parses a natural language meetup prompt and returns structured data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiMeetup.parsePrompt({
      prompt: "프로젝트 밋업 태국 방콕, 4월1일~4월25일, 초청국가 한국 중국",
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("태국 방콕 프로젝트 밋업");
    expect(result.data!.type).toBe("meetup");
    expect(result.data!.locationType).toBe("overseas");
    expect(result.data!.destinationCountry).toBe("TH");
    expect(result.data!.location).toBe("Bangkok, Thailand");
    expect(result.data!.scheduleStart).toBe("2026-04-01");
    expect(result.data!.scheduleEnd).toBe("2026-04-25");
    expect(result.data!.invitedCountries).toEqual(["KR", "CN"]);
  });

  it("returns all expected fields in the data object", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiMeetup.parsePrompt({
      prompt: "사전방문 일본 도쿄 5월10일~15일",
    });

    expect(result.success).toBe(true);
    const data = result.data!;
    // Check all expected fields exist
    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("type");
    expect(data).toHaveProperty("locationType");
    expect(data).toHaveProperty("destinationCountry");
    expect(data).toHaveProperty("location");
    expect(data).toHaveProperty("scheduleStart");
    expect(data).toHaveProperty("scheduleEnd");
    expect(data).toHaveProperty("description");
    expect(data).toHaveProperty("maxParticipants");
    expect(data).toHaveProperty("invitedCountries");
    expect(data).toHaveProperty("suggestedBaggageNotice");
  });

  it("rejects prompts shorter than 3 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.aiMeetup.parsePrompt({ prompt: "ab" })
    ).rejects.toThrow();
  });
});

describe("aiMeetup.parsePrompt - error handling", () => {
  it("handles LLM returning empty content gracefully", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiMeetup.parsePrompt({
      prompt: "테스트 밋업 정보",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI 응답 없음");
  });

  it("handles content with no JSON object - returns success with empty defaults", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: "no json here at all" } }],
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiMeetup.parsePrompt({
      prompt: "테스트 밋업 정보",
    });

    // When regex finds no JSON object, it falls back to empty {} which gives defaults
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("");
    expect(result.data!.type).toBe("meetup");
    expect(result.data!.locationType).toBe("domestic");
  });

  it("handles truly malformed JSON that throws parse error", async () => {
    const { invokeLLM } = await import("./_core/llm");
    // This contains { and } so regex matches, but content is not valid JSON
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{ message: { content: '{"title": broken json}' } }],
    });

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.aiMeetup.parsePrompt({
      prompt: "테스트 밋업 정보",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("AI 응답 파싱 실패");
  });
});
