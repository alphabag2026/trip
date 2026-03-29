import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  generateDemoRideOptions,
  generateDemoRestaurants,
  calculateDeliveryPricing,
  SUPPORTED_CITIES,
  FOOD_CATEGORIES,
} from "./demoRideDeliveryData";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-ride",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
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

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
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

// ── Demo Data Generator Tests ──
describe("demoRideDeliveryData", () => {
  describe("SUPPORTED_CITIES", () => {
    it("should contain at least 5 cities", () => {
      // SUPPORTED_CITIES is an array of city name strings
      expect(SUPPORTED_CITIES.length).toBeGreaterThanOrEqual(5);
    });

    it("should include Bangkok and Tokyo", () => {
      expect(SUPPORTED_CITIES).toContain("Bangkok");
      expect(SUPPORTED_CITIES).toContain("Tokyo");
    });
  });

  describe("FOOD_CATEGORIES", () => {
    it("should contain all and specific categories", () => {
      expect(FOOD_CATEGORIES).toContain("all");
      expect(FOOD_CATEGORIES).toContain("thai");
      expect(FOOD_CATEGORIES).toContain("japanese");
      expect(FOOD_CATEGORIES.length).toBeGreaterThan(5);
    });
  });

  describe("generateDemoRideOptions", () => {
    // Function signature: (city, distanceKm, exchangeRate, vatRate)
    it("should generate ride options for Bangkok", () => {
      const options = generateDemoRideOptions("Bangkok", 5, 35, 0.07);
      expect(options.length).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(10);
    });

    it("should have correct pricing structure", () => {
      const options = generateDemoRideOptions("Bangkok", 8, 35, 0.07);
      for (const opt of options) {
        expect(opt.priceLocal).toBeGreaterThan(0);
        expect(opt.priceUsd).toBeGreaterThan(0);
        expect(opt.priceUsdt).toBeGreaterThan(0);
        // USDT price should be less than or equal to USD (VAT savings)
        expect(opt.priceUsdt).toBeLessThanOrEqual(opt.priceUsd);
        expect(opt.vatSaved).toBeGreaterThanOrEqual(0);
        expect(opt.savingsPercent).toBeGreaterThan(0);
        expect(opt.vehicleType).toBeTruthy();
        expect(opt.provider).toBeTruthy();
        expect(opt.capacity).toBeGreaterThanOrEqual(1);
        expect(opt.estimatedMinutes).toBeGreaterThan(0);
      }
    });

    it("should sort by USDT price ascending", () => {
      const options = generateDemoRideOptions("Singapore", 10, 1.35, 0.09);
      for (let i = 1; i < options.length; i++) {
        expect(options[i].priceUsdt).toBeGreaterThanOrEqual(options[i - 1].priceUsdt);
      }
    });
  });

  describe("generateDemoRestaurants", () => {
    // Function signature: (city, exchangeRate, vatRate)
    it("should generate restaurants for Bangkok", () => {
      const restaurants = generateDemoRestaurants("Bangkok", 35, 0.07);
      expect(restaurants.length).toBeGreaterThan(0);
    });

    it("should have menu items for each restaurant", () => {
      const restaurants = generateDemoRestaurants("Bangkok", 35, 0.07);
      for (const restaurant of restaurants) {
        expect(restaurant.name).toBeTruthy();
        expect(restaurant.id).toBeTruthy();
        expect(restaurant.menu.length).toBeGreaterThan(0);
        expect(restaurant.rating).toBeGreaterThanOrEqual(3);
        expect(restaurant.rating).toBeLessThanOrEqual(5);
        for (const item of restaurant.menu) {
          expect(item.name).toBeTruthy();
          expect(item.price).toBeGreaterThan(0);
        }
      }
    });

    it("should return default restaurants for unknown city", () => {
      const restaurants = generateDemoRestaurants("UnknownCity", 1, 0.1);
      expect(restaurants.length).toBeGreaterThan(0);
    });
  });

  describe("calculateDeliveryPricing", () => {
    // Function signature: (subtotal, deliveryFee, localCurrency, exchangeRate, vatRate)
    it("should calculate correct pricing for Thailand", () => {
      const pricing = calculateDeliveryPricing(500, 40, "THB", 35, 0.07);
      expect(pricing.subtotal).toBe(500);
      expect(pricing.deliveryFee).toBe(40);
      expect(pricing.totalLocal).toBeGreaterThan(0);
      expect(pricing.totalUsd).toBeGreaterThan(0);
      expect(pricing.totalUsdt).toBeGreaterThan(0);
      expect(pricing.totalUsdt).toBeLessThanOrEqual(pricing.totalUsd);
      expect(pricing.vatSaved).toBeGreaterThanOrEqual(0);
      expect(pricing.localCurrency).toBe("THB");
    });

    it("should calculate correct pricing for Japan", () => {
      const pricing = calculateDeliveryPricing(2000, 300, "JPY", 150, 0.10);
      expect(pricing.localCurrency).toBe("JPY");
      expect(pricing.vatRate).toBe(10);
    });

    it("should have positive savings percentage", () => {
      const pricing = calculateDeliveryPricing(1000, 50, "THB", 35, 0.07);
      expect(pricing.savingsPercent).toBeGreaterThan(0);
      expect(pricing.savingsPercent).toBeLessThan(30);
    });

    it("should include 5% service fee", () => {
      const pricing = calculateDeliveryPricing(1000, 0, "THB", 35, 0.07);
      expect(pricing.serviceFee).toBe(50); // 5% of 1000
    });
  });
});

// ── Router Tests ──
describe("ride router", () => {
  it("should return supported cities (public)", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const cities = await caller.ride.cities();
    // cities is an array of strings (city names)
    expect(cities.length).toBeGreaterThanOrEqual(5);
    expect(typeof cities[0]).toBe("string");
    expect(cities).toContain("Bangkok");
  });

  it("should search ride options (authenticated)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ride.search({
      pickupLat: 13.756,
      pickupLng: 100.502,
      pickupAddress: "Siam Paragon",
      dropoffLat: 13.745,
      dropoffLng: 100.534,
      dropoffAddress: "Asiatique",
      city: "Bangkok",
      countryCode: "TH",
      passengers: 2,
    });
    expect(result.options.length).toBeGreaterThan(0);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.vatRate).toBeGreaterThan(0);
    for (const opt of result.options) {
      expect(opt.priceUsdt).toBeGreaterThan(0);
      expect(opt.vehicleType).toBeTruthy();
    }
  });
});

describe("delivery router", () => {
  it("should return restaurants (authenticated)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.delivery.restaurants({
      city: "Bangkok",
      countryCode: "TH",
      category: "all",
    });
    expect(result.restaurants.length).toBeGreaterThan(0);
    expect(result.currency).toBeTruthy();
  });

  it("should calculate delivery pricing (authenticated)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.delivery.calculatePrice({
      subtotal: 500,
      deliveryFee: 40,
      countryCode: "TH",
    });
    expect(result.totalUsdt).toBeGreaterThan(0);
    expect(result.vatSaved).toBeGreaterThanOrEqual(0);
    expect(result.savingsPercent).toBeGreaterThan(0);
  });

  it("should return food categories (public)", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.delivery.categories();
    // categories is a readonly array of strings
    expect(categories.length).toBeGreaterThan(0);
    expect(categories).toContain("all");
    expect(categories).toContain("thai");
  });
});
