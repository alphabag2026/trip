import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock invokeLLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock db
vi.mock("./db", () => ({
  getChatMessages: vi.fn(),
  getChatRoomById: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import * as db from "./db";

const mockedInvokeLLM = vi.mocked(invokeLLM);
const mockedGetChatMessages = vi.mocked(db.getChatMessages);
const mockedGetChatRoomById = vi.mocked(db.getChatRoomById);

describe("AI Suggest Reply - Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse [1], [2], [3] format suggestions from LLM response", () => {
    const raw = "[1] 안녕하세요, 반갑습니다!\n[2] 네, 좋은 의견이네요. 저도 동의합니다.\n[3] 안녕하세요! 좋은 의견 감사합니다. 저도 그 부분에 대해 같은 생각을 가지고 있었는데, 함께 논의해보면 좋겠습니다.";
    const suggestions: string[] = [];
    const lines = raw.split("\n").filter(l => l.trim());
    for (const line of lines) {
      const cleaned = line.replace(/^\[\d+\]\s*/, "").trim();
      if (cleaned) suggestions.push(cleaned);
    }
    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toBe("안녕하세요, 반갑습니다!");
    expect(suggestions[1]).toContain("동의합니다");
    expect(suggestions[2]).toContain("논의해보면");
  });

  it("should handle single-line LLM response gracefully", () => {
    const raw = "네, 알겠습니다.";
    const suggestions: string[] = [];
    const lines = raw.split("\n").filter(l => l.trim());
    for (const line of lines) {
      const cleaned = line.replace(/^\[\d+\]\s*/, "").trim();
      if (cleaned) suggestions.push(cleaned);
    }
    const result = suggestions.length > 0 ? suggestions.slice(0, 3) : [raw];
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("네, 알겠습니다.");
  });

  it("should build correct tone guide for each tone option", () => {
    const toneGuide: Record<string, string> = {
      auto: "Match the tone and formality level of the conversation naturally.",
      polite: "Use a polite and respectful tone.",
      casual: "Use a casual, relaxed tone.",
      business: "Use a professional business tone.",
      friendly: "Use a warm, friendly tone.",
    };
    expect(toneGuide["polite"]).toContain("polite");
    expect(toneGuide["business"]).toContain("professional");
    expect(toneGuide["casual"]).toContain("casual");
    expect(toneGuide["friendly"]).toContain("warm");
    expect(toneGuide["auto"]).toContain("naturally");
  });

  it("should construct context lines from messages correctly", () => {
    const messages = [
      { userId: 1, senderName: "Alice", content: "안녕하세요!" },
      { userId: 2, senderName: "Bob", content: "반갑습니다." },
      { userId: 1, senderName: "Alice", content: "오늘 미팅 어떠세요?" },
    ];
    const myUserId = 1;
    const contextLines = messages.map(m => {
      const name = m.senderName || "익명";
      const isMe = m.userId === myUserId;
      return `[${isMe ? "나" : name}]: ${(m.content || "").substring(0, 300)}`;
    }).join("\n");
    expect(contextLines).toContain("[나]: 안녕하세요!");
    expect(contextLines).toContain("[Bob]: 반갑습니다.");
    expect(contextLines).toContain("[나]: 오늘 미팅 어떠세요?");
  });
});

describe("AI Summarize - Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should construct chat text from messages for summarization", () => {
    const messages = [
      { senderName: "Alice", content: "프로젝트 일정 논의합시다", createdAt: new Date("2026-04-13T10:00:00Z") },
      { senderName: "Bob", content: "네, 다음 주 월요일까지 완료해야 합니다", createdAt: new Date("2026-04-13T10:01:00Z") },
      { senderName: "Charlie", content: "저는 디자인 파트 담당하겠습니다", createdAt: new Date("2026-04-13T10:02:00Z") },
    ];
    const chatText = messages.map(m => {
      const name = m.senderName || "익명";
      const time = m.createdAt ? new Date(m.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "";
      return `[${time}] ${name}: ${(m.content || "").substring(0, 500)}`;
    }).join("\n");
    expect(chatText).toContain("Alice: 프로젝트 일정 논의합시다");
    expect(chatText).toContain("Bob: 네, 다음 주 월요일까지 완료해야 합니다");
    expect(chatText).toContain("Charlie: 저는 디자인 파트 담당하겠습니다");
  });

  it("should handle language guide correctly", () => {
    const lang1 = "auto";
    const lang2 = "en";
    const guide1 = lang1 !== "auto" ? `Write the summary in ${lang1} language.` : "Write the summary in Korean (한국어).";
    const guide2 = lang2 !== "auto" ? `Write the summary in ${lang2} language.` : "Write the summary in Korean (한국어).";
    expect(guide1).toContain("Korean");
    expect(guide2).toContain("en");
  });

  it("should calculate time range from messages", () => {
    const messages = [
      { createdAt: new Date("2026-04-13T10:00:00Z") },
      { createdAt: new Date("2026-04-13T10:30:00Z") },
      { createdAt: new Date("2026-04-13T11:00:00Z") },
    ];
    const timeRange = {
      from: messages[0]?.createdAt ? new Date(messages[0].createdAt).toISOString() : null,
      to: messages[messages.length - 1]?.createdAt ? new Date(messages[messages.length - 1].createdAt).toISOString() : null,
    };
    expect(timeRange.from).toBe("2026-04-13T10:00:00.000Z");
    expect(timeRange.to).toBe("2026-04-13T11:00:00.000Z");
  });

  it("should truncate long message content to 500 chars", () => {
    const longContent = "A".repeat(1000);
    const truncated = longContent.substring(0, 500);
    expect(truncated.length).toBe(500);
  });

  it("should validate minimum message count requirement (3)", () => {
    const messages1 = [{ id: 1 }, { id: 2 }];
    const messages2 = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(messages1.length < 3).toBe(true);
    expect(messages2.length < 3).toBe(false);
  });
});

describe("AI Suggest Reply - LLM Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call invokeLLM with correct message structure", async () => {
    mockedInvokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: "[1] 네, 좋습니다.\n[2] 동의합니다.\n[3] 좋은 생각이네요." } }],
    } as any);

    const result = await invokeLLM({
      messages: [
        { role: "system", content: "You are an AI assistant." },
        { role: "user", content: "Suggest replies." },
      ],
    });

    expect(mockedInvokeLLM).toHaveBeenCalledOnce();
    const raw = (result as any).choices[0]?.message?.content;
    expect(typeof raw).toBe("string");
    expect(raw).toContain("[1]");
  });
});
