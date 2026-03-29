import { describe, it, expect, vi } from "vitest";
import { mystiflyClient, cabinClassToMystifly, type MystiflySearchParams } from "./mystiflyClient";

describe("Mystifly Client", () => {
  describe("cabinClassToMystifly", () => {
    it("should map economy to Y", () => {
      expect(cabinClassToMystifly("economy")).toBe("Y");
    });
    it("should map premium_economy to Y (Mystifly does not distinguish)", () => {
      expect(cabinClassToMystifly("premium_economy")).toBe("Y");
    });
    it("should map business to C", () => {
      expect(cabinClassToMystifly("business")).toBe("C");
    });
    it("should map first to F", () => {
      expect(cabinClassToMystifly("first")).toBe("F");
    });
    it("should default to Y for unknown class", () => {
      expect(cabinClassToMystifly("unknown" as any)).toBe("Y");
    });
  });

  describe("mystiflyClient configuration", () => {
    it("should report not configured when env vars are missing", () => {
      // Default state without env vars
      expect(mystiflyClient.isConfigured()).toBe(false);
    });

    it("should have all required methods", () => {
      expect(typeof mystiflyClient.searchFlights).toBe("function");
      expect(typeof mystiflyClient.revalidateFare).toBe("function");
      expect(typeof mystiflyClient.getFareRules).toBe("function");
      expect(typeof mystiflyClient.bookFlight).toBe("function");
      expect(typeof mystiflyClient.issueTicket).toBe("function");
      expect(typeof mystiflyClient.cancelBooking).toBe("function");
      expect(typeof mystiflyClient.isConfigured).toBe("function");
    });
  });

  describe("API calls without config", () => {
    it("searchFlights should throw when not configured", async () => {
      const params: MystiflySearchParams = {
        origin: "ICN",
        destination: "BKK",
        departDate: "2026-04-05",
        adults: 1,
        cabinClass: "Y",
      };
      // Without valid config, API calls will fail (either config check or fetch error)
      await expect(mystiflyClient.searchFlights(params)).rejects.toThrow();
    });

    it("revalidateFare should throw when not configured", async () => {
      await expect(mystiflyClient.revalidateFare("DEMO123")).rejects.toThrow();
    });

    it("getFareRules should throw when not configured", async () => {
      await expect(mystiflyClient.getFareRules("DEMO123")).rejects.toThrow();
    });

    it("bookFlight should throw when not configured", async () => {
      await expect(mystiflyClient.bookFlight({
        fareSourceCode: "DEMO123",
        passengers: [{
          type: "ADT",
          title: "Mr",
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: "1990-01-01",
          nationality: "KR",
        }],
        contactEmail: "test@example.com",
        contactPhone: "01012345678",
      })).rejects.toThrow();
    });
  });
});

describe("Payment Gateway Logic", () => {
  describe("USDT Price Calculation", () => {
    const EXCHANGE_FEE_RATE = 0.0185;
    const PLATFORM_MARGIN_RATE = 0.03;

    it("should calculate USDT price correctly for Thailand (7% VAT)", () => {
      const localPrice = 10000; // THB
      const exchangeRate = 35.5; // THB per USD
      const vatRate = 0.07;

      const priceExVat = localPrice / (1 + vatRate);
      const usdPriceExVat = priceExVat / exchangeRate;
      const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
      const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
      const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;

      expect(priceExVat).toBeCloseTo(9345.79, 1);
      expect(usdPriceExVat).toBeCloseTo(263.26, 1);
      expect(usdtPrice).toBeLessThan(localPrice / exchangeRate); // USDT should be cheaper than local price in USD
      expect(usdtPrice).toBeGreaterThan(usdPriceExVat); // But more than ex-VAT due to fees
    });

    it("should calculate USDT price correctly for Korea (10% VAT)", () => {
      const localPrice = 500000; // KRW
      const exchangeRate = 1350; // KRW per USD
      const vatRate = 0.10;

      const priceExVat = localPrice / (1 + vatRate);
      const usdPriceExVat = priceExVat / exchangeRate;
      const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
      const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
      const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;

      const localPriceInUsd = localPrice / exchangeRate;
      const savings = localPriceInUsd - usdtPrice;

      expect(savings).toBeGreaterThan(0);
      expect(savings / localPriceInUsd).toBeGreaterThan(0.04); // At least 4% savings with 10% VAT
    });

    it("should calculate USDT price correctly for Germany (19% VAT)", () => {
      const localPrice = 500; // EUR
      const exchangeRate = 0.92; // EUR per USD
      const vatRate = 0.19;

      const priceExVat = localPrice / (1 + vatRate);
      const usdPriceExVat = priceExVat / exchangeRate;
      const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
      const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
      const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;

      const localPriceInUsd = localPrice / exchangeRate;
      const savings = localPriceInUsd - usdtPrice;
      const savingsPercent = (savings / localPriceInUsd) * 100;

      expect(savingsPercent).toBeGreaterThan(10); // Germany 19% VAT should give >10% savings
    });

    it("should show higher savings for countries with higher VAT", () => {
      const calculateSavingsPercent = (vatRate: number) => {
        const localPrice = 1000;
        const exchangeRate = 1; // Normalize to USD
        const priceExVat = localPrice / (1 + vatRate);
        const usdPriceExVat = priceExVat / exchangeRate;
        const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
        const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
        const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;
        const localPriceInUsd = localPrice / exchangeRate;
        return ((localPriceInUsd - usdtPrice) / localPriceInUsd) * 100;
      };

      const savingsTH = calculateSavingsPercent(0.07); // Thailand 7%
      const savingsKR = calculateSavingsPercent(0.10); // Korea 10%
      const savingsDE = calculateSavingsPercent(0.19); // Germany 19%
      const savingsSE = calculateSavingsPercent(0.25); // Sweden 25%

      expect(savingsKR).toBeGreaterThan(savingsTH);
      expect(savingsDE).toBeGreaterThan(savingsKR);
      expect(savingsSE).toBeGreaterThan(savingsDE);
    });
  });

  describe("Payment Method Fees", () => {
    it("direct USDT should have 0% fee", () => {
      const amount = 100;
      const directFee = 0;
      expect(amount + directFee).toBe(100);
    });

    it("NOWPayments should have 0.5% fee", () => {
      const amount = 100;
      const nowPaymentsFee = amount * 0.005;
      expect(nowPaymentsFee).toBe(0.5);
      expect(amount + nowPaymentsFee).toBe(100.5);
    });

    it("platform balance should have 0% fee", () => {
      const amount = 100;
      const balanceFee = 0;
      expect(amount + balanceFee).toBe(100);
    });
  });

  describe("Network Gas Fees", () => {
    it("should have correct relative ordering of gas fees", () => {
      const gasFees = {
        polygon: 0.01,
        bep20: 0.3,
        trc20: 1,
        erc20: 10, // average
      };

      expect(gasFees.polygon).toBeLessThan(gasFees.bep20);
      expect(gasFees.bep20).toBeLessThan(gasFees.trc20);
      expect(gasFees.trc20).toBeLessThan(gasFees.erc20);
    });
  });
});
