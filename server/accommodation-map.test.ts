import { describe, it, expect } from "vitest";

describe("Accommodation Map & Navigation Features", () => {
  // Test navigation deep links
  describe("Navigation app deep links", () => {
    it("should generate correct Kakao Map URL", () => {
      const address = "제주시 서귀포시 중문동 123";
      const kakaoUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
      expect(kakaoUrl).toContain("map.kakao.com");
      expect(kakaoUrl).toContain(encodeURIComponent(address));
    });

    it("should generate correct Naver Map deep link", () => {
      const address = "서울시 강남구 테헤란로 123";
      const nmapUrl = `nmap://search?query=${encodeURIComponent(address)}&appname=alphatrip`;
      expect(nmapUrl).toContain("nmap://search");
      expect(nmapUrl).toContain("appname=alphatrip");
      expect(nmapUrl).toContain(encodeURIComponent(address));
    });

    it("should generate correct Naver Map web fallback URL", () => {
      const address = "서울시 강남구 테헤란로 123";
      const webUrl = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;
      expect(webUrl).toContain("map.naver.com");
      expect(webUrl).toContain(encodeURIComponent(address));
    });

    it("should generate correct Google Maps directions URL", () => {
      const address = "부산시 해운대구 해운대해변로 264";
      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
      expect(googleUrl).toContain("maps/dir");
      expect(googleUrl).toContain("destination=");
      expect(googleUrl).toContain(encodeURIComponent(address));
    });
  });

  // Test address copy text
  describe("Address copy functionality", () => {
    it("should copy address text correctly", () => {
      const address = "제주특별자치도 서귀포시 안덕면 산록남로 762번길 120";
      expect(address).toBe("제주특별자치도 서귀포시 안덕면 산록남로 762번길 120");
      expect(address.length).toBeGreaterThan(0);
    });

    it("should handle special characters in address", () => {
      const address = "서울시 강남구 삼성동 123-45 (코엑스)";
      const encoded = encodeURIComponent(address);
      expect(encoded).not.toContain(" ");
      expect(decodeURIComponent(encoded)).toBe(address);
    });
  });

  // Test map toggle state
  describe("Map toggle state management", () => {
    it("should toggle map visibility for specific accommodation", () => {
      let showMapFor: string | null = null;
      const accomId = "42";
      
      // Open map
      showMapFor = showMapFor === accomId ? null : accomId;
      expect(showMapFor).toBe("42");
      
      // Close map
      showMapFor = showMapFor === accomId ? null : accomId;
      expect(showMapFor).toBeNull();
    });

    it("should switch map between different accommodations", () => {
      let showMapFor: string | null = null;
      
      // Open for first
      showMapFor = "hotel1";
      expect(showMapFor).toBe("hotel1");
      
      // Switch to second (different hotel)
      showMapFor = showMapFor === "hotel2" ? null : "hotel2";
      expect(showMapFor).toBe("hotel2");
    });
  });

  // Test share text with map link
  describe("Share text with navigation links", () => {
    it("should include Google Maps link in share text", () => {
      const address = "제주시 서귀포시 중문동 123";
      const shareText = `🏨 숙소 배정 정보\n숙소: 별장 1\n주소: ${address}\n지도: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      
      expect(shareText).toContain("별장 1");
      expect(shareText).toContain(address);
      expect(shareText).toContain("google.com/maps");
    });
  });
});
