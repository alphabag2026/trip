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

describe("Flight & Pickup Info - Bug Fixes (v6.11)", () => {
  it("flight.getMyFlights should return array for non-existent registration", async () => {
    const result = await publicCaller.flight.getMyFlights({ registrationId: 99999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("flight.getMyFlights should return flights with expected shape when data exists", async () => {
    const result = await publicCaller.flight.getMyFlights({ registrationId: 1 });
    expect(Array.isArray(result)).toBe(true);
    for (const flight of result) {
      expect(flight).toHaveProperty("flightNo");
      expect(flight).toHaveProperty("direction");
      expect(flight).toHaveProperty("flightStatus");
      expect(flight).toHaveProperty("departureAirport");
      expect(flight).toHaveProperty("arrivalAirport");
    }
  });

  it("pickup.getMyPickup should return array", async () => {
    const result = await publicCaller.pickup.getMyPickup({ registrationId: 99999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("pickup.list should return array for valid meetup (admin)", async () => {
    const result = await adminCaller.pickup.list({ meetupId: 99999 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("registration.lookup should not throw for non-existent user", async () => {
    const result = await publicCaller.registration.lookup({ name: "NonExistent", phone: "000-0000-0000" });
    expect(result !== undefined).toBe(true);
  });
});
