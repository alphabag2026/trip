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

describe("v3.7 - Registration Form Improvements", () => {
  it("should create registration with meal, allergies, drink, smoking fields", async () => {
    const result = await publicCaller.registration.create({
      name: "식사테스트",
      phone: "010-7700-0001",
      messengerId: "test_meal",
      locationType: "overseas",
      scheduleStart: "2026-04-01",
      scheduleEnd: "2026-04-05",
      preferredDepartureTime: "06:00~09:00",
      mealPreference: "vegetarian",
      allergies: "땅콩, 갑각류",
      drinkAlcohol: "sometimes",
      smoking: "no",
    });
    expect(result.id).toBeDefined();
  });

  it("should create registration with checked baggage and 15kg weight", async () => {
    const result = await publicCaller.registration.create({
      name: "수화물테스트",
      phone: "010-7700-0002",
      messengerId: "test_bag",
      locationType: "overseas",
      scheduleStart: "2026-04-01",
      scheduleEnd: "2026-04-05",
      preferredDepartureTime: "09:00~12:00",
      checkedBagRequest: true,
      checkedBagCount: 2,
      checkedBagWeight: "15kg",
      checkedBagNotes: "골프백 1개 포함",
    });
    expect(result.id).toBeDefined();
  });

  it("should create registration with all new fields combined", async () => {
    const result = await publicCaller.registration.create({
      name: "종합테스트",
      phone: "010-7700-0003",
      messengerId: "test_all",
      locationType: "overseas",
      scheduleStart: "2026-04-01",
      scheduleEnd: "2026-04-05",
      preferredDepartureTime: "21:00~00:00",
      mealPreference: "halal",
      allergies: "유제품",
      drinkAlcohol: "no",
      smoking: "yes",
      checkedBagRequest: true,
      checkedBagCount: 1,
      checkedBagWeight: "23kg",
      checkedBagNotes: "",
    });
    expect(result.id).toBeDefined();
  });

  it("should create registration with 3-hour time slot format", async () => {
    const timeSlots = [
      "00:00~03:00", "03:00~06:00", "06:00~09:00", "09:00~12:00",
      "12:00~15:00", "15:00~18:00", "18:00~21:00", "21:00~00:00"
    ];

    for (const slot of timeSlots) {
      const result = await publicCaller.registration.create({
        name: `시간대_${slot}`,
        phone: `010-7700-${timeSlots.indexOf(slot) + 10}`,
        messengerId: `test_time_${slot}`,
        locationType: "domestic",
        scheduleStart: "2026-04-01",
        preferredDepartureTime: slot,
      });
      expect(result.id).toBeDefined();
    }
  });

  it("should lookup registration with new fields", async () => {
    const results = await publicCaller.registration.lookup({
      name: "식사테스트",
      phone: "010-7700-0001",
    });
    expect(results.length).toBeGreaterThan(0);
    const reg = results[0];
    expect(reg.mealPreference).toBe("vegetarian");
    expect(reg.allergies).toBe("땅콩, 갑각류");
    expect(reg.drinkAlcohol).toBe("sometimes");
    expect(reg.smoking).toBe("no");
  });
});

describe("v3.7 - i18n Translation Files", () => {
  it("should have Korean translation file with all required keys", async () => {
    const ko = await import("../client/src/locales/ko.json");
    expect(ko.nav).toBeDefined();
    expect(ko.nav.register).toBe("밋업 신청");
    expect(ko.home).toBeDefined();
    expect(ko.register).toBeDefined();
    expect(ko.lookup).toBeDefined();
    expect(ko.chatbot).toBeDefined();
    expect(ko.tracker).toBeDefined();
    expect(ko.survey).toBeDefined();
    expect(ko.common).toBeDefined();
  });

  it("should have English translation file with all required keys", async () => {
    const en = await import("../client/src/locales/en.json");
    expect(en.nav).toBeDefined();
    expect(en.nav.register).toBe("Apply");
    expect(en.home).toBeDefined();
    expect(en.register).toBeDefined();
    expect(en.lookup).toBeDefined();
    expect(en.chatbot).toBeDefined();
    expect(en.tracker).toBeDefined();
    expect(en.survey).toBeDefined();
    expect(en.common).toBeDefined();
  });

  it("should have Chinese translation file with all required keys", async () => {
    const zh = await import("../client/src/locales/zh.json");
    expect(zh.nav).toBeDefined();
    expect(zh.nav.register).toBe("报名");
    expect(zh.register.title).toBe("聚会报名");
    expect(zh.tracker).toBeDefined();
  });

  it("should have Japanese translation file with all required keys", async () => {
    const ja = await import("../client/src/locales/ja.json");
    expect(ja.nav).toBeDefined();
    expect(ja.nav.register).toBe("申込");
    expect(ja.register.title).toBe("ミートアップ申込");
    expect(ja.tracker).toBeDefined();
  });

  it("should have all 23 locale files", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const localesDir = path.join(process.cwd(), "client/src/locales");
    const files = fs.readdirSync(localesDir).filter((f: string) => f.endsWith(".json"));
    expect(files.length).toBe(23);
  });
});
