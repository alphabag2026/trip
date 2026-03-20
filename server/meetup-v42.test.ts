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
function createUserContext(id = 100): TrpcContext {
  return {
    user: { id, openId: `user_${id}`, name: `User${id}`, role: "user", avatarUrl: null, createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const publicCaller = appRouter.createCaller(createPublicContext());
const userCaller = appRouter.createCaller(createUserContext(100));
const user2Caller = appRouter.createCaller(createUserContext(200));

// ═══════════════════════════════════════════════════════════════
// v4.2 - 사용자 프로필 (userProfile)
// ═══════════════════════════════════════════════════════════════
describe("v4.2 - 사용자 프로필", () => {
  it("userProfile.get은 인증된 사용자만 호출 가능", async () => {
    await expect(publicCaller.userProfile.get()).rejects.toThrow();
  });

  it("userProfile.get은 인증된 사용자가 호출 가능", async () => {
    const result = await userCaller.userProfile.get();
    // 처음에는 null일 수 있음
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("userProfile.upsert로 프로필 생성", async () => {
    const result = await userCaller.userProfile.upsert({
      phone: "+82-10-1234-5678",
      nationality: "한국",
      birthDate: "1990-01-15",
      gender: "male",
      organization: "테스트 회사",
      position: "매니저",
      department: "기획팀",
      bio: "테스트 자기소개",
      emergencyContact: "홍길동",
      emergencyPhone: "+82-10-9999-8888",
      dietaryRestrictions: "없음",
      allergies: "땅콩",
      medicalNotes: "없음",
      preferredLanguage: "ko",
      telegramId: "@testuser",
    });
    expect(result).toBeTruthy();
  });

  it("userProfile.get으로 저장된 프로필 조회", async () => {
    const result = await userCaller.userProfile.get();
    expect(result).toBeTruthy();
    if (result) {
      expect(result.phone).toBe("+82-10-1234-5678");
      expect(result.nationality).toBe("한국");
      expect(result.organization).toBe("테스트 회사");
      expect(result.telegramId).toBe("@testuser");
    }
  });

  it("userProfile.upsert로 프로필 수정", async () => {
    const result = await userCaller.userProfile.upsert({
      phone: "+82-10-5555-6666",
      position: "팀장",
    });
    expect(result).toBeTruthy();

    const updated = await userCaller.userProfile.get();
    if (updated) {
      expect(updated.phone).toBe("+82-10-5555-6666");
      expect(updated.position).toBe("팀장");
    }
  });

  it("다른 사용자의 프로필은 별도로 관리됨", async () => {
    await user2Caller.userProfile.upsert({
      phone: "+82-10-7777-8888",
      nationality: "미국",
    });
    const user1Profile = await userCaller.userProfile.get();
    const user2Profile = await user2Caller.userProfile.get();
    expect(user1Profile?.phone).not.toBe(user2Profile?.phone);
  });

  it("userProfile.onboardingStatus 조회", async () => {
    const result = await userCaller.userProfile.onboardingStatus();
    expect(result).toBeTruthy();
    expect(typeof result.onboardingCompleted).toBe("boolean");
  });

  it("userProfile.completeOnboarding으로 온보딩 완료 처리", async () => {
    const result = await userCaller.userProfile.completeOnboarding();
    expect(result.success).toBe(true);

    const status = await userCaller.userProfile.onboardingStatus();
    expect(status.onboardingCompleted).toBe(true);
  });

  it("userProfile.completeOnboarding은 인증 필요", async () => {
    await expect(publicCaller.userProfile.completeOnboarding()).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.2 - 여권 정보 (passport)
// ═══════════════════════════════════════════════════════════════
describe("v4.2 - 여권 정보", () => {
  it("passport.get은 인증 필요", async () => {
    await expect(publicCaller.passport.get()).rejects.toThrow();
  });

  it("passport.get은 인증된 사용자가 호출 가능", async () => {
    const result = await userCaller.passport.get();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("passport.save로 여권 정보 저장", async () => {
    const result = await userCaller.passport.save({
      passportNumber: "M12345678",
      issuingCountry: "한국",
      nationality: "한국",
      fullName: "HONG GILDONG",
      birthDate: "1990-01-15",
      gender: "M",
      issueDate: "2020-05-01",
      expiryDate: "2030-05-01",
    });
    expect(result).toBeTruthy();
  });

  it("passport.get으로 저장된 여권 조회", async () => {
    const result = await userCaller.passport.get();
    expect(result).toBeTruthy();
    if (result) {
      expect(result.passportNumber).toBe("M12345678");
      expect(result.fullName).toBe("HONG GILDONG");
      expect(result.issuingCountry).toBe("한국");
      expect(result.gender).toBe("M");
    }
  });

  it("passport.save로 여권 정보 수정", async () => {
    const result = await userCaller.passport.save({
      passportNumber: "M99999999",
      fullName: "KIM CHULSOO",
    });
    expect(result).toBeTruthy();

    const updated = await userCaller.passport.get();
    if (updated) {
      expect(updated.passportNumber).toBe("M99999999");
      expect(updated.fullName).toBe("KIM CHULSOO");
    }
  });

  it("passport.save는 인증 필요", async () => {
    await expect(publicCaller.passport.save({
      passportNumber: "X00000000",
    })).rejects.toThrow();
  });

  it("다른 사용자의 여권은 별도로 관리됨", async () => {
    await user2Caller.passport.save({
      passportNumber: "J55555555",
      fullName: "SMITH JOHN",
    });
    const user1Passport = await userCaller.passport.get();
    const user2Passport = await user2Caller.passport.get();
    expect(user1Passport?.passportNumber).not.toBe(user2Passport?.passportNumber);
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.2 - 출장 이력 (tripHistory)
// ═══════════════════════════════════════════════════════════════
describe("v4.2 - 출장 이력", () => {
  it("tripHistory.list는 인증 필요", async () => {
    await expect(publicCaller.tripHistory.list()).rejects.toThrow();
  });

  it("tripHistory.list는 인증된 사용자가 호출 가능", async () => {
    const result = await userCaller.tripHistory.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("tripHistory.list는 빈 배열 또는 이력 배열 반환", async () => {
    const result = await userCaller.tripHistory.list();
    expect(Array.isArray(result)).toBe(true);
    // 아직 밋업 참여 이력이 없으면 빈 배열
    if (result.length > 0) {
      const trip = result[0];
      expect(trip).toHaveProperty("id");
      expect(trip).toHaveProperty("meetupTitle");
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// v4.2 - 입력 유효성 검사
// ═══════════════════════════════════════════════════════════════
describe("v4.2 - 입력 유효성 검사", () => {
  it("userProfile.upsert에 잘못된 gender 값은 거부", async () => {
    await expect(userCaller.userProfile.upsert({
      gender: "invalid" as any,
    })).rejects.toThrow();
  });

  it("passport.save에 잘못된 gender 값은 거부", async () => {
    await expect(userCaller.passport.save({
      gender: "X" as any,
    })).rejects.toThrow();
  });
});
