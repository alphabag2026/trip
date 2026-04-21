import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

// ── Helpers ──────────────────────────────────────────────
function createAdminContext() {
  return {
    user: { id: 1, openId: "admin-test", name: "Admin", role: "admin" as const },
  };
}

function createAdminCaller() {
  return appRouter.createCaller(createAdminContext());
}

// ── Travel Policy ────────────────────────────────────────
describe("travelPolicy router", () => {
  it("should return null when no policy exists for a meetup", async () => {
    const caller = createAdminCaller();
    const result = await caller.travelPolicy.get({ meetupId: 999999 });
    expect(result).toBeNull();
  });

  it("should create and retrieve a travel policy", async () => {
    const caller = createAdminCaller();
    const created = await caller.travelPolicy.upsert({
      meetupId: 360005,
      allowedFlightClass: "economy",
      allowedHotelStars: 4,
      maxTravelDays: 7,
      totalBudget: 50000,
      requireApproval: true,
      policyNotes: "Test policy for v6.12",
    });
    expect(created).toBeTruthy();

    const fetched = await caller.travelPolicy.get({ meetupId: 360005 });
    expect(fetched).not.toBeNull();
    expect(fetched!.allowedFlightClass).toBe("economy");
    expect(fetched!.allowedHotelStars).toBe(4);
    expect(Number(fetched!.totalBudget)).toBe(50000);
    expect(fetched!.requireApproval).toBe(true);
  });
});

// ── Attendee Tiers ───────────────────────────────────────
describe("attendeeTier router", () => {
  let createdTierId: number;

  it("should create an attendee tier", async () => {
    const caller = createAdminCaller();
    const result = await caller.attendeeTier.create({
      meetupId: 360005,
      tierName: "VIP Speaker",
      tierLevel: 100,
      color: "#f59e0b",
      flightClass: "business",
      hotelStars: 5,
      airportPickup: true,
      loungeAccess: true,
      vipDinner: true,
      dedicatedInterpreter: true,
      isDefault: false,
    });
    expect(result).toBeTruthy();
    createdTierId = (result as any).insertId || (result as any).id || 1;
  });

  it("should list attendee tiers for a meetup", async () => {
    const caller = createAdminCaller();
    const tiers = await caller.attendeeTier.list({ meetupId: 360005 });
    expect(Array.isArray(tiers)).toBe(true);
    expect(tiers.length).toBeGreaterThanOrEqual(1);
    const vipTier = tiers.find((t) => t.tierName === "VIP Speaker");
    expect(vipTier).toBeTruthy();
    expect(vipTier!.flightClass).toBe("business");
    expect(vipTier!.airportPickup).toBe(true);
  });
});

// ── Safety Alerts ────────────────────────────────────────
describe("safetyAlert router", () => {
  let alertId: number;

  it("should create a safety alert", async () => {
    const caller = createAdminCaller();
    const result = await caller.safetyAlert.create({
      meetupId: 360005,
      alertType: "weather",
      severity: "high",
      title: "Typhoon Warning - Stay Indoors",
      description: "Category 3 typhoon approaching Ho Chi Minh City",
      affectedArea: "District 1, HCMC",
    });
    expect(result).toBeTruthy();
    alertId = (result as any).insertId || (result as any).id || 1;
  });

  it("should list active safety alerts", async () => {
    const caller = createAdminCaller();
    const alerts = await caller.safetyAlert.list({ meetupId: 360005, activeOnly: true });
    expect(Array.isArray(alerts)).toBe(true);
    const typhoonAlert = alerts.find((a) => a.title === "Typhoon Warning - Stay Indoors");
    expect(typhoonAlert).toBeTruthy();
    expect(typhoonAlert!.severity).toBe("high");
    expect(typhoonAlert!.alertType).toBe("weather");
  });
});

// ── Budget Dashboard ─────────────────────────────────────
describe("budgetDashboard router", () => {
  it("should return budget summary for a meetup", async () => {
    const caller = createAdminCaller();
    const summary = await caller.budgetDashboard.summary({ meetupId: 360005 });
    expect(summary).toBeTruthy();
    expect(typeof summary.totalBudget).toBe("number");
    expect(typeof summary.spentAmount).toBe("number");
    expect(typeof summary.remainingBudget).toBe("number");
    expect(typeof summary.budgetUtilization).toBe("number");
    // We set totalBudget to 50000 in the travel policy test
    expect(summary.totalBudget).toBe(50000);
  });
});
