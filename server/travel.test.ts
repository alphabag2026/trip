import { describe, it, expect, vi } from "vitest";
import { generateDemoHotels, generateDemoFlights } from "./demoTravelData";

describe("Travel Demo Data Generator", () => {
  describe("generateDemoHotels", () => {
    it("should generate hotels for Bangkok, Thailand", () => {
      const hotels = generateDemoHotels("Bangkok", "TH", "THB", 35.5, 0.07, "2026-04-05", "2026-04-08");
      expect(hotels.length).toBeGreaterThan(0);
      expect(hotels.length).toBeLessThanOrEqual(10);
    });

    it("should have correct price structure with VAT savings", () => {
      const hotels = generateDemoHotels("Bangkok", "TH", "THB", 35.5, 0.07, "2026-04-05", "2026-04-08");
      const hotel = hotels[0];
      
      expect(hotel).toHaveProperty("id");
      expect(hotel).toHaveProperty("name");
      expect(hotel).toHaveProperty("nameLocal");
      expect(hotel).toHaveProperty("localPrice");
      expect(hotel).toHaveProperty("localCurrency", "THB");
      expect(hotel).toHaveProperty("usdPrice");
      expect(hotel).toHaveProperty("usdtPrice");
      expect(hotel).toHaveProperty("vatAmount");
      expect(hotel).toHaveProperty("savings");
      expect(hotel).toHaveProperty("savingsPercent");
      expect(hotel).toHaveProperty("stars");
      expect(hotel).toHaveProperty("rating");
      expect(hotel).toHaveProperty("amenities");
      expect(hotel).toHaveProperty("roomType");
      expect(hotel).toHaveProperty("imageUrl");
    });

    it("should calculate USDT price lower than USD price", () => {
      const hotels = generateDemoHotels("Bangkok", "TH", "THB", 35.5, 0.07, "2026-04-05", "2026-04-08");
      for (const hotel of hotels) {
        expect(hotel.usdtPrice).toBeLessThanOrEqual(hotel.usdPrice);
        expect(hotel.savings).toBeGreaterThanOrEqual(0);
        expect(hotel.savingsPercent).toBeGreaterThanOrEqual(0);
      }
    });

    it("should calculate correct number of nights", () => {
      const hotels = generateDemoHotels("Bangkok", "TH", "THB", 35.5, 0.07, "2026-04-05", "2026-04-08");
      for (const hotel of hotels) {
        expect(hotel.nights).toBe(3);
        expect(hotel.checkIn).toBe("2026-04-05");
        expect(hotel.checkOut).toBe("2026-04-08");
      }
    });

    it("should generate hotels for different countries", () => {
      const jpHotels = generateDemoHotels("Tokyo", "JP", "JPY", 150, 0.10, "2026-04-05", "2026-04-08");
      expect(jpHotels.length).toBeGreaterThan(0);
      expect(jpHotels[0].localCurrency).toBe("JPY");

      const krHotels = generateDemoHotels("Seoul", "KR", "KRW", 1350, 0.10, "2026-04-05", "2026-04-08");
      expect(krHotels.length).toBeGreaterThan(0);
      expect(krHotels[0].localCurrency).toBe("KRW");
    });

    it("should have higher savings for countries with higher VAT", () => {
      // Thailand 7% VAT
      const thHotels = generateDemoHotels("Bangkok", "TH", "THB", 35.5, 0.07, "2026-04-05", "2026-04-08");
      // Germany 19% VAT
      const deHotels = generateDemoHotels("Berlin", "DE", "EUR", 0.92, 0.19, "2026-04-05", "2026-04-08");
      
      // Average savings percent should be higher for Germany
      const thAvgSavings = thHotels.reduce((sum, h) => sum + h.savingsPercent, 0) / thHotels.length;
      const deAvgSavings = deHotels.reduce((sum, h) => sum + h.savingsPercent, 0) / deHotels.length;
      
      expect(deAvgSavings).toBeGreaterThan(thAvgSavings);
    });
  });

  describe("generateDemoFlights", () => {
    it("should generate flights for ICN to BKK", () => {
      const flights = generateDemoFlights("ICN", "BKK", "THB", 35.5, 0.07, "2026-04-05", "economy");
      expect(flights.length).toBeGreaterThan(0);
      expect(flights.length).toBeLessThanOrEqual(10);
    });

    it("should have correct flight structure", () => {
      const flights = generateDemoFlights("ICN", "BKK", "THB", 35.5, 0.07, "2026-04-05", "economy");
      const flight = flights[0];
      
      expect(flight).toHaveProperty("id");
      expect(flight).toHaveProperty("airline");
      expect(flight).toHaveProperty("airlineCode");
      expect(flight).toHaveProperty("flightNumber");
      expect(flight).toHaveProperty("originCode");
      expect(flight).toHaveProperty("destinationCode");
      expect(flight).toHaveProperty("departureTime");
      expect(flight).toHaveProperty("arrivalTime");
      expect(flight).toHaveProperty("duration");
      expect(flight).toHaveProperty("stops");
      expect(flight).toHaveProperty("stopCities");
      expect(flight).toHaveProperty("cabinClass");
      expect(flight).toHaveProperty("localPrice");
      expect(flight).toHaveProperty("localCurrency", "THB");
      expect(flight).toHaveProperty("usdPrice");
      expect(flight).toHaveProperty("usdtPrice");
      expect(flight).toHaveProperty("savings");
      expect(flight).toHaveProperty("baggageIncluded");
      expect(flight).toHaveProperty("aircraft");
    });

    it("should calculate USDT price lower than USD price for flights", () => {
      const flights = generateDemoFlights("ICN", "BKK", "THB", 35.5, 0.07, "2026-04-05", "economy");
      for (const flight of flights) {
        expect(flight.usdtPrice).toBeLessThanOrEqual(flight.usdPrice);
        expect(flight.savings).toBeGreaterThanOrEqual(0);
      }
    });

    it("should generate different prices for different cabin classes", () => {
      const economy = generateDemoFlights("ICN", "BKK", "THB", 35.5, 0.07, "2026-04-05", "economy");
      const business = generateDemoFlights("ICN", "BKK", "THB", 35.5, 0.07, "2026-04-05", "business");
      
      // Business class should generally be more expensive
      const avgEconomy = economy.reduce((sum, f) => sum + f.usdPrice, 0) / economy.length;
      const avgBusiness = business.reduce((sum, f) => sum + f.usdPrice, 0) / business.length;
      
      expect(avgBusiness).toBeGreaterThan(avgEconomy);
    });

    it("should have valid departure and arrival times", () => {
      const flights = generateDemoFlights("ICN", "BKK", "THB", 35.5, 0.07, "2026-04-05", "economy");
      for (const flight of flights) {
        const dep = new Date(flight.departureTime);
        const arr = new Date(flight.arrivalTime);
        expect(dep.getTime()).toBeLessThan(arr.getTime());
      }
    });
  });

  describe("VAT Rate Precision", () => {
    it("should not have floating point precision issues in VAT display", () => {
      // Test that vatRate * 100 doesn't produce long decimals like 7.000000000000001
      const vatRate = 0.07;
      const displayRate = Math.round(vatRate * 10000) / 100;
      expect(displayRate).toBe(7);
      expect(String(displayRate)).toBe("7");
    });

    it("should handle various VAT rates without precision issues", () => {
      const rates = [0.07, 0.10, 0.12, 0.15, 0.19, 0.20, 0.25];
      for (const rate of rates) {
        const display = Math.round(rate * 10000) / 100;
        expect(display).toBe(Math.round(rate * 100));
        expect(String(display).length).toBeLessThanOrEqual(4); // e.g., "25" not "25.000000001"
      }
    });
  });

  describe("Price Calculation Logic", () => {
    it("should correctly remove VAT from local price", () => {
      // If local price is 1070 THB with 7% VAT
      // Price ex-VAT = 1070 / 1.07 = 1000 THB
      // USD price = 1000 / 35.5 = ~28.17 USD
      const localPrice = 1070;
      const vatRate = 0.07;
      const exchangeRate = 35.5;
      
      const priceExVat = localPrice / (1 + vatRate);
      const usdPriceExVat = priceExVat / exchangeRate;
      
      expect(priceExVat).toBeCloseTo(1000, 0);
      expect(usdPriceExVat).toBeCloseTo(28.17, 1);
    });

    it("should calculate savings correctly", () => {
      const localPrice = 10700; // THB
      const vatRate = 0.07;
      const exchangeRate = 35.5;
      const exchangeFee = 0.0185; // 1.85%
      
      const localPriceInUsd = localPrice / exchangeRate;
      const priceExVat = localPrice / (1 + vatRate);
      const usdPriceExVat = priceExVat / exchangeRate;
      const usdtPrice = usdPriceExVat * (1 + exchangeFee);
      const savings = localPriceInUsd - usdtPrice;
      
      expect(savings).toBeGreaterThan(0);
      expect(usdtPrice).toBeLessThan(localPriceInUsd);
    });
  });
});
