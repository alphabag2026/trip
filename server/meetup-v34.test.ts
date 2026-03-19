import { describe, it, expect } from "vitest";
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

const adminCaller = appRouter.createCaller(createAdminContext());
const publicCaller = appRouter.createCaller(createPublicContext());

describe("v3.4 - 수화물 공지 및 위탁수화물 신청", () => {
  describe("밋업 수화물 공지", () => {
    it("밋업 생성 시 baggageNotice 기본값이 설정되어야 함", async () => {
      const result = await adminCaller.meetup.create({
        title: "수화물 테스트 밋업",
        type: "meetup",
        locationType: "overseas",
      });
      expect(result.id).toBeDefined();
      const meetup = await publicCaller.meetup.getById({ id: result.id });
      expect(meetup).toBeDefined();
      expect(meetup!.baggageNotice).toBe("초과화물은 직접부담할 수 있습니다.");
    });

    it("밋업 생성 시 커스텀 수화물 공지를 설정할 수 있어야 함", async () => {
      const customNotice = "위탁수화물 1개(23kg)까지 무료, 초과분은 본인 부담입니다.";
      const result = await adminCaller.meetup.create({
        title: "커스텀 수화물 밋업",
        type: "meetup",
        locationType: "overseas",
        baggageNotice: customNotice,
      });
      const meetup = await publicCaller.meetup.getById({ id: result.id });
      expect(meetup!.baggageNotice).toBe(customNotice);
    });

    it("밋업 수화물 공지를 수정할 수 있어야 함", async () => {
      const result = await adminCaller.meetup.create({
        title: "수정 테스트 밋업",
        type: "meetup",
        locationType: "overseas",
      });
      const newNotice = "수화물 2개까지 무료입니다.";
      await adminCaller.meetup.update({ id: result.id, baggageNotice: newNotice });
      const meetup = await publicCaller.meetup.getById({ id: result.id });
      expect(meetup!.baggageNotice).toBe(newNotice);
    });
  });

  describe("위탁수화물 신청서", () => {
    it("신청 시 위탁수화물 정보 없이 등록 가능해야 함", async () => {
      const result = await publicCaller.registration.create({
        name: "수화물없음", phone: "010-0000-0000", messengerId: "test_nobag",
        locationType: "overseas",
      });
      expect(result.id).toBeDefined();
    });

    it("신청 시 위탁수화물 정보를 포함하여 등록 가능해야 함", async () => {
      const result = await publicCaller.registration.create({
        name: "수화물있음", phone: "010-1111-1111", messengerId: "test_bag",
        locationType: "overseas",
        checkedBagRequest: true,
        checkedBagCount: 2,
        checkedBagWeight: "23kg",
        checkedBagNotes: "골프백 1개 포함",
      });
      expect(result.id).toBeDefined();
    });

    it("위탁수화물 미신청 시 기본값이 false여야 함", async () => {
      const result = await publicCaller.registration.create({
        name: "기본값테스트", phone: "010-2222-2222", messengerId: "test_default",
        locationType: "domestic",
      });
      expect(result.id).toBeDefined();
    });
  });
});
