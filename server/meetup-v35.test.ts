import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createPublicContext());

describe("v3.5 - 출발 희망시간대", () => {
  it("신청 시 출발 희망시간대를 포함하여 등록 가능해야 함", async () => {
    const result = await publicCaller.registration.create({
      name: "희망시간테스트", phone: "010-3333-3333", messengerId: "test_time",
      locationType: "overseas",
      preferredDepartureTime: "오전 (08:00~12:00)",
    });
    expect(result.id).toBeDefined();
  });

  it("신청 시 출발 희망시간대 없이도 등록 가능해야 함", async () => {
    const result = await publicCaller.registration.create({
      name: "시간없음테스트", phone: "010-4444-4444", messengerId: "test_notime",
      locationType: "domestic",
    });
    expect(result.id).toBeDefined();
  });

  it("다양한 시간대 옵션이 모두 저장 가능해야 함", async () => {
    const timeSlots = [
      "새벽 (05:00~08:00)",
      "오전 (08:00~12:00)",
      "오후 (12:00~17:00)",
      "저녁 (17:00~21:00)",
      "심야 (21:00~05:00)",
      "상관없음",
    ];
    for (const slot of timeSlots) {
      const result = await publicCaller.registration.create({
        name: `시간대_${slot.slice(0, 2)}`, phone: "010-5555-5555",
        messengerId: `test_${slot.slice(0, 2)}`,
        locationType: "overseas",
        preferredDepartureTime: slot,
      });
      expect(result.id).toBeDefined();
    }
  });
});
