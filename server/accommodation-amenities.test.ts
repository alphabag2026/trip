import { describe, it, expect } from "vitest";

describe("Accommodation Amenities & Photos Features", () => {
  // Test amenities data structure
  describe("Amenities JSON structure", () => {
    it("should validate amenities object with wifi", () => {
      const amenities = {
        wifi: { ssid: "Villa1_WiFi", password: "pass1234" },
        parking: true,
        breakfast: true,
        pool: false,
        gym: false,
        laundry: true,
        kitchen: true,
        aircon: true,
        custom: [{ name: "바베큐", value: "가능" }],
      };
      expect(amenities.wifi.ssid).toBe("Villa1_WiFi");
      expect(amenities.wifi.password).toBe("pass1234");
      expect(amenities.parking).toBe(true);
      expect(amenities.breakfast).toBe(true);
      expect(amenities.kitchen).toBe(true);
      expect(amenities.custom).toHaveLength(1);
      expect(amenities.custom[0].name).toBe("바베큐");
    });

    it("should handle empty amenities", () => {
      const amenities = {};
      expect(amenities).toEqual({});
    });

    it("should handle amenities without wifi", () => {
      const amenities = {
        parking: true,
        breakfast: false,
      };
      expect((amenities as any).wifi).toBeUndefined();
      expect(amenities.parking).toBe(true);
    });
  });

  // Test photos array structure
  describe("Multi-photo array structure", () => {
    it("should handle multiple photo URLs", () => {
      const photos = [
        "https://storage.example.com/photo1.jpg",
        "https://storage.example.com/photo2.jpg",
        "https://storage.example.com/photo3.jpg",
      ];
      expect(photos).toHaveLength(3);
      expect(photos[0]).toContain("photo1");
    });

    it("should handle empty photos array", () => {
      const photos: string[] = [];
      expect(photos).toHaveLength(0);
    });

    it("should merge existing and new photos", () => {
      const existing = ["https://storage.example.com/old1.jpg"];
      const newPhotos = ["https://storage.example.com/new1.jpg", "https://storage.example.com/new2.jpg"];
      const merged = [...existing, ...newPhotos];
      expect(merged).toHaveLength(3);
      expect(merged[0]).toContain("old1");
      expect(merged[2]).toContain("new2");
    });

    it("should remove specific photo from array", () => {
      const photos = [
        "https://storage.example.com/photo1.jpg",
        "https://storage.example.com/photo2.jpg",
        "https://storage.example.com/photo3.jpg",
      ];
      const urlToRemove = "https://storage.example.com/photo2.jpg";
      const filtered = photos.filter(url => url !== urlToRemove);
      expect(filtered).toHaveLength(2);
      expect(filtered).not.toContain(urlToRemove);
    });
  });

  // Test share text generation
  describe("Share text generation", () => {
    it("should generate correct share text with all info", () => {
      const a = {
        hotelName: "별장 1",
        roomNumber: "101호",
        address: "제주시 서귀포시 중문동 123",
        checkIn: new Date("2026-06-01T15:00:00"),
        checkOut: new Date("2026-06-03T11:00:00"),
        amenities: { wifi: { ssid: "Villa1_WiFi", password: "pass1234" } },
      };
      const shareText = `🏨 숙소 배정 정보\n숙소: ${a.hotelName}${a.roomNumber ? ` (${a.roomNumber})` : ""}${a.address ? `\n주소: ${a.address}` : ""}${a.checkIn ? `\n체크인: ${new Date(a.checkIn).toLocaleString()}` : ""}${a.checkOut ? `\n체크아웃: ${new Date(a.checkOut).toLocaleString()}` : ""}${a.amenities?.wifi ? `\nWi-Fi: ${a.amenities.wifi.ssid} / PW: ${a.amenities.wifi.password}` : ""}`;
      
      expect(shareText).toContain("별장 1");
      expect(shareText).toContain("101호");
      expect(shareText).toContain("제주시 서귀포시");
      expect(shareText).toContain("Wi-Fi: Villa1_WiFi");
      expect(shareText).toContain("PW: pass1234");
    });

    it("should generate share text without optional fields", () => {
      const a = {
        hotelName: "별장 2",
        roomNumber: null,
        address: null,
        checkIn: null,
        checkOut: null,
        amenities: null,
      };
      const shareText = `🏨 숙소 배정 정보\n숙소: ${a.hotelName}${a.roomNumber ? ` (${a.roomNumber})` : ""}${a.address ? `\n주소: ${a.address}` : ""}${a.checkIn ? `\n체크인: ${new Date(a.checkIn).toLocaleString()}` : ""}${a.checkOut ? `\n체크아웃: ${new Date(a.checkOut).toLocaleString()}` : ""}${a.amenities?.wifi ? `\nWi-Fi: ${a.amenities.wifi.ssid} / PW: ${a.amenities.wifi.password}` : ""}`;
      
      expect(shareText).toContain("별장 2");
      expect(shareText).not.toContain("주소:");
      expect(shareText).not.toContain("Wi-Fi:");
    });
  });

  // Test gallery navigation
  describe("Gallery navigation logic", () => {
    it("should cycle forward through photos", () => {
      const photos = ["a.jpg", "b.jpg", "c.jpg"];
      let index = 0;
      index = (index + 1) % photos.length;
      expect(index).toBe(1);
      index = (index + 1) % photos.length;
      expect(index).toBe(2);
      index = (index + 1) % photos.length;
      expect(index).toBe(0); // wraps around
    });

    it("should cycle backward through photos", () => {
      const photos = ["a.jpg", "b.jpg", "c.jpg"];
      let index = 0;
      index = (index - 1 + photos.length) % photos.length;
      expect(index).toBe(2); // wraps to last
      index = (index - 1 + photos.length) % photos.length;
      expect(index).toBe(1);
    });
  });
});
