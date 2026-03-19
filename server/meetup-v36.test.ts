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

const publicCaller = appRouter.createCaller(createPublicContext());
const adminCaller = appRouter.createCaller(createAdminContext());

describe("v3.6 - 수화물 추적", () => {
  let baggageId: number;

  it("수화물을 등록할 수 있어야 함", async () => {
    // 먼저 참석자 등록
    const reg = await publicCaller.registration.create({
      name: "수화물테스트", phone: "010-8888-8888", messengerId: "test_baggage",
      locationType: "overseas",
    });
    expect(reg.id).toBeDefined();

    const result = await publicCaller.baggage.create({
      registrationId: reg.id,
      baggageType: "일반",
      weight: "23kg",
      description: "검정 캐리어",
    });
    expect(result).toBeDefined();
    baggageId = result!.id;
  });

  it("참석자별 수화물 조회가 가능해야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "수화물조회", phone: "010-8888-9999", messengerId: "test_bag_lookup",
      locationType: "overseas",
    });
    await publicCaller.baggage.create({ registrationId: reg.id, baggageType: "골프백", weight: "32kg" });
    const list = await publicCaller.baggage.getByRegistration({ registrationId: reg.id });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].baggageType).toBe("골프백");
  });

  it("관리자가 수화물 상태를 업데이트할 수 있어야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "상태변경", phone: "010-7777-8888", messengerId: "test_status",
      locationType: "overseas",
    });
    const bag = await publicCaller.baggage.create({ registrationId: reg.id });
    const result = await adminCaller.baggage.updateStatus({
      id: bag!.id,
      baggageStatus: "in_transit",
      notes: "현재 운송 중",
    });
    expect(result.success).toBe(true);
  });

  it("관리자가 수화물 전체 목록을 조회할 수 있어야 함", async () => {
    const list = await adminCaller.baggage.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("관리자가 수화물을 삭제할 수 있어야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "삭제테스트", phone: "010-6666-7777", messengerId: "test_del_bag",
      locationType: "domestic",
    });
    const bag = await publicCaller.baggage.create({ registrationId: reg.id });
    const result = await adminCaller.baggage.delete({ id: bag!.id });
    expect(result.success).toBe(true);
  });
});

describe("v3.6 - 체크인 정보", () => {
  it("관리자가 체크인 정보를 등록할 수 있어야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "체크인테스트", phone: "010-5555-6666", messengerId: "test_checkin",
      locationType: "overseas",
    });
    const result = await adminCaller.checkin.create({
      registrationId: reg.id,
      airline: "대한항공",
      flightNo: "KE001",
      checkinCounter: "A1-A5",
      gateNumber: "Gate 12",
      seatNumber: "12A",
      boardingTime: new Date().toISOString(),
      notes: "창가석 배정",
    });
    expect(result).toBeDefined();
  });

  it("참석자별 체크인 정보 조회가 가능해야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "체크인조회", phone: "010-4444-5555", messengerId: "test_checkin_lookup",
      locationType: "overseas",
    });
    await adminCaller.checkin.create({
      registrationId: reg.id,
      airline: "아시아나",
      flightNo: "OZ123",
      gateNumber: "Gate 5",
      seatNumber: "3C",
    });
    const list = await publicCaller.checkin.getByRegistration({ registrationId: reg.id });
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].flightNo).toBe("OZ123");
  });

  it("관리자가 체크인 상태를 업데이트할 수 있어야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "상태업데이트", phone: "010-3333-4444", messengerId: "test_checkin_update",
      locationType: "overseas",
    });
    const checkin = await adminCaller.checkin.create({
      registrationId: reg.id,
      airline: "진에어",
      flightNo: "LJ201",
    });
    const result = await adminCaller.checkin.update({
      id: checkin!.id,
      checkinStatus: "boarding_pass_issued",
      gateNumber: "Gate 8",
      seatNumber: "15F",
    });
    expect(result.success).toBe(true);
  });

  it("관리자가 체크인 전체 목록을 조회할 수 있어야 함", async () => {
    const list = await adminCaller.checkin.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it("관리자가 체크인 정보를 삭제할 수 있어야 함", async () => {
    const reg = await publicCaller.registration.create({
      name: "체크인삭제", phone: "010-2222-3333", messengerId: "test_del_checkin",
      locationType: "domestic",
    });
    const checkin = await adminCaller.checkin.create({
      registrationId: reg.id,
      airline: "제주항공",
      flightNo: "7C101",
    });
    const result = await adminCaller.checkin.delete({ id: checkin!.id });
    expect(result.success).toBe(true);
  });
});
