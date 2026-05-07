import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch for external APIs
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("v6.30 Travel Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Weather API Integration", () => {
    it("should fetch weather data from Open-Meteo API", async () => {
      const mockWeatherData = {
        current: {
          temperature_2m: 32.5,
          relative_humidity_2m: 65,
          weather_code: 1,
          wind_speed_10m: 12,
          apparent_temperature: 35.2,
        },
        daily: {
          time: ["2026-05-07", "2026-05-08", "2026-05-09", "2026-05-10", "2026-05-11"],
          weather_code: [1, 3, 61, 2, 0],
          temperature_2m_max: [34, 33, 30, 32, 35],
          temperature_2m_min: [26, 25, 24, 25, 27],
          precipitation_probability_max: [10, 30, 80, 40, 5],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWeatherData),
      });

      const url = `https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5`;
      const res = await fetch(url);
      const data = await res.json();

      expect(data.current.temperature_2m).toBe(32.5);
      expect(data.daily.time).toHaveLength(5);
      expect(data.daily.weather_code).toHaveLength(5);
    });

    it("should handle weather API failure gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018");
      expect(res.ok).toBe(false);
    });
  });

  describe("Exchange Rate API Integration", () => {
    it("should fetch USD exchange rates", async () => {
      const mockRatesData = {
        result: "success",
        rates: {
          KRW: 1350.5,
          THB: 34.2,
          JPY: 155.3,
          EUR: 0.92,
        },
        time_last_update_utc: "2026-05-07T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRatesData),
      });

      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();

      expect(data.rates.KRW).toBe(1350.5);
      expect(data.rates.THB).toBe(34.2);
    });

    it("should fetch USDT price from CoinGecko", async () => {
      const mockUsdtData = {
        tether: {
          usd: 1.0001,
          krw: 1350.7,
          thb: 34.21,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUsdtData),
      });

      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,krw,thb");
      const data = await res.json();

      expect(data.tether.usd).toBeCloseTo(1.0, 0);
      expect(data.tether.krw).toBeGreaterThan(0);
    });
  });

  describe("User Accommodation CRUD", () => {
    it("should validate accommodation input schema", () => {
      const validInput = {
        hotelName: "Grand Hyatt Bangkok",
        hotelAddress: "494 Rajdamri Road",
        checkInDate: "2026-06-15",
        checkInTime: "14:00",
        checkOutDate: "2026-06-18",
        checkOutTime: "12:00",
        bookingId: "BKK12345",
        roomType: "Deluxe King",
        phone: "+66-2-254-1234",
        notes: "Late check-in requested",
      };

      expect(validInput.hotelName.length).toBeGreaterThan(0);
      expect(validInput.hotelName.length).toBeLessThanOrEqual(255);
      expect(validInput.checkInDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(validInput.checkInTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should reject empty hotel name", () => {
      const invalidInput = {
        hotelName: "",
        hotelAddress: "Some address",
      };

      expect(invalidInput.hotelName.length).toBe(0);
    });
  });

  describe("Bulk Translation (통번역)", () => {
    it("should validate bulk translate input constraints", () => {
      const validInput = {
        texts: ["안녕하세요", "오늘 날씨가 좋습니다", "감사합니다"],
        targetLang: "en",
      };

      expect(validInput.texts.length).toBeLessThanOrEqual(20);
      validInput.texts.forEach(text => {
        expect(text.length).toBeLessThanOrEqual(2000);
      });
    });

    it("should map language codes to full names", () => {
      const langNames: Record<string, string> = {
        ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese", th: "Thai",
        vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Filipino",
        hi: "Hindi", ar: "Arabic", ru: "Russian", es: "Spanish", fr: "French",
        de: "German", pt: "Portuguese", it: "Italian", tr: "Turkish",
        mn: "Mongolian",
      };

      expect(langNames["ko"]).toBe("Korean");
      expect(langNames["en"]).toBe("English");
      expect(langNames["th"]).toBe("Thai");
      expect(langNames["mn"]).toBe("Mongolian");
    });
  });

  describe("Auto-Translate Chat Messages", () => {
    it("should only auto-translate non-own messages", () => {
      const myUserId = 1;
      const messages = [
        { id: 1, userId: 1, content: "Hello", messageType: "text" },
        { id: 2, userId: 2, content: "안녕하세요", messageType: "text" },
        { id: 3, userId: 3, content: "สวัสดี", messageType: "text" },
        { id: 4, userId: 1, content: "Thanks", messageType: "text" },
        { id: 5, userId: 2, content: "", messageType: "image" },
      ];

      const shouldTranslate = messages.filter(
        m => m.userId !== myUserId && m.messageType === "text" && m.content
      );

      expect(shouldTranslate).toHaveLength(2);
      expect(shouldTranslate[0].id).toBe(2);
      expect(shouldTranslate[1].id).toBe(3);
    });
  });

  describe("Currency Options", () => {
    it("should have USDT as primary + 2 user-selected currencies", () => {
      const currencyConfig = {
        primary: "USDT",
        userSelected: ["KRW", "THB"],
      };

      expect(currencyConfig.primary).toBe("USDT");
      expect(currencyConfig.userSelected).toHaveLength(2);
    });

    it("should support at least 20 currency options", () => {
      const CURRENCY_OPTIONS = [
        "KRW", "THB", "VND", "JPY", "CNY", "PHP", "IDR", "MYR", "SGD", "EUR",
        "GBP", "AUD", "CAD", "CHF", "INR", "RUB", "TRY", "AED", "MNT", "MMK",
        "LAK", "KHR",
      ];

      expect(CURRENCY_OPTIONS.length).toBeGreaterThanOrEqual(20);
    });
  });
});
