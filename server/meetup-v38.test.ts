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
function createAdminContext(): TrpcContext {
  return {
    user: { id: 1, openId: "admin_test", name: "Admin", role: "admin", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const adminCaller = appRouter.createCaller(createAdminContext());
const publicCaller = appRouter.createCaller(createPublicContext());

describe("v3.8 - 식사/알레르기 대시보드", () => {
  it("mealStats.get은 admin만 호출 가능", async () => {
    const result = await adminCaller.mealStats.get({ meetupId: undefined });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("mealPreferences");
    expect(result).toHaveProperty("allergies");
    expect(result).toHaveProperty("drinkAlcohol");
    expect(result).toHaveProperty("smoking");
    expect(result).toHaveProperty("total");
  });

  it("mealStats.get은 public에서 호출 불가", async () => {
    await expect(publicCaller.mealStats.get({ meetupId: undefined })).rejects.toThrow();
  });

  it("mealStats.get에 meetupId 필터 적용 가능", async () => {
    const result = await adminCaller.mealStats.get({ meetupId: 1 });
    expect(result).toBeDefined();
    expect(result.mealPreferences).toBeDefined();
  });
});

describe("v3.8 - 프로필 조회/수정", () => {
  it("profile.get은 이름+전화번호로 조회", async () => {
    // 존재하지 않는 사용자 조회 시 null 반환
    const result = await publicCaller.profile.get({ name: "없는사람", phone: "000-0000-0000" });
    expect(result).toBeNull();
  });

  it("profile.update는 존재하지 않는 registrationId로 호출 시 에러", async () => {
    await expect(publicCaller.profile.update({
      registrationId: 99999,
      name: "test",
      phone: "000-0000-0000",
      mealPreference: "regular",
    })).rejects.toThrow();
  });
});

describe("v3.8 - 호텔 방 배정", () => {
  it("hotelRoom.list는 admin만 호출 가능", async () => {
    const result = await adminCaller.hotelRoom.list({ meetupId: undefined });
    expect(Array.isArray(result)).toBe(true);
  });

  it("hotelRoom.list는 public에서 호출 불가", async () => {
    await expect(publicCaller.hotelRoom.list({ meetupId: undefined })).rejects.toThrow();
  });

  it("hotelRoom.assign은 admin만 호출 가능", async () => {
    // admin으로 호출 시 성공 (upsert 방식)
    const result = await adminCaller.hotelRoom.assign({
      registrationId: 99999,
      roomNumber: "301",
      floor: "3",
    });
    expect(result).toBeDefined();
  });

  it("hotelRoom.assign은 public에서 호출 불가", async () => {
    await expect(publicCaller.hotelRoom.assign({
      registrationId: 1,
      roomNumber: "301",
    })).rejects.toThrow();
  });

  it("hotelRoom.remove는 admin만 호출 가능", async () => {
    const result = await adminCaller.hotelRoom.remove({ registrationId: 99999 });
    expect(result).toBeDefined();
  });

  it("hotelRoom.remove는 public에서 호출 불가", async () => {
    await expect(publicCaller.hotelRoom.remove({ registrationId: 1 })).rejects.toThrow();
  });
});
