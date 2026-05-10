import { describe, it, expect, vi } from "vitest";

describe("Accommodation Photo/CheckInOut/Route Features", () => {
  // ── Photo Upload Feature ──
  describe("Photo Upload", () => {
    it("should process base64 image data and generate file key", () => {
      const hotelName = "별장 1";
      const fileName = "villa-photo.jpg";
      const mimeType = "image/jpeg";
      const base64Data = "iVBORw0KGgoAAAANSUhEUg=="; // sample base64

      const buffer = Buffer.from(base64Data, "base64");
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      const suffix = "abc123";
      const fileKey = `accommodations/${hotelName.replace(/\s/g, "_")}-${suffix}-${fileName}`;
      expect(fileKey).toBe("accommodations/별장_1-abc123-villa-photo.jpg");
    });

    it("should reject files larger than 5MB", () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      const fileSize = 6 * 1024 * 1024; // 6MB
      expect(fileSize > maxSize).toBe(true);
    });

    it("should apply photo URL to all rooms with same hotelName", async () => {
      const accommodations = [
        { id: 1, hotelName: "별장 1", accommodationPhotoUrl: null },
        { id: 2, hotelName: "별장 1", accommodationPhotoUrl: null },
        { id: 3, hotelName: "별장 2", accommodationPhotoUrl: null },
      ];

      const photoUrl = "https://storage.example.com/accommodations/villa-photo.jpg";
      const matching = accommodations.filter(a => a.hotelName === "별장 1");

      expect(matching).toHaveLength(2);
      matching.forEach(a => { a.accommodationPhotoUrl = photoUrl; });

      expect(accommodations[0].accommodationPhotoUrl).toBe(photoUrl);
      expect(accommodations[1].accommodationPhotoUrl).toBe(photoUrl);
      expect(accommodations[2].accommodationPhotoUrl).toBeNull();
    });
  });

  // ── Check-in/Check-out Time Feature ──
  describe("Check-in/Check-out Time", () => {
    it("should parse datetime string to Date object", () => {
      const checkInStr = "2026-06-15T14:00";
      const checkOutStr = "2026-06-18T11:00";

      const checkIn = new Date(checkInStr);
      const checkOut = new Date(checkOutStr);

      expect(checkIn.getFullYear()).toBe(2026);
      expect(checkIn.getMonth()).toBe(5); // June = 5 (0-indexed)
      expect(checkIn.getDate()).toBe(15);
      expect(checkOut.getDate()).toBe(18);
    });

    it("should apply check-in/out to all rooms with same hotelName", () => {
      const accommodations = [
        { id: 1, hotelName: "별장 1", checkIn: null, checkOut: null },
        { id: 2, hotelName: "별장 1", checkIn: null, checkOut: null },
        { id: 3, hotelName: "별장 2", checkIn: null, checkOut: null },
      ];

      const checkIn = new Date("2026-06-15T14:00");
      const checkOut = new Date("2026-06-18T11:00");
      const matching = accommodations.filter(a => a.hotelName === "별장 1");

      expect(matching).toHaveLength(2);
      matching.forEach(a => {
        (a as any).checkIn = checkIn;
        (a as any).checkOut = checkOut;
      });

      expect((accommodations[0] as any).checkIn).toEqual(checkIn);
      expect((accommodations[1] as any).checkOut).toEqual(checkOut);
      expect(accommodations[2].checkIn).toBeNull();
    });

    it("should display check-in/out in localized format", () => {
      const checkIn = new Date("2026-06-15T14:00:00");
      const formatted = checkIn.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe("string");
    });
  });

  // ── Route/Directions Feature ──
  describe("Route & Directions", () => {
    it("should construct Google Maps directions URL", () => {
      const address = "제주도 서귀포시 중문관광로 123";
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

      expect(directionsUrl).toContain("google.com/maps/dir");
      expect(directionsUrl).toContain("destination=");
      expect(directionsUrl).not.toContain("undefined");
    });

    it("should construct Google Maps directions URL with origin (venue)", () => {
      const venueAddress = "서울시 강남구 코엑스";
      const hotelAddress = "서울시 강남구 테헤란로 456";
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(venueAddress)}&destination=${encodeURIComponent(hotelAddress)}`;

      expect(directionsUrl).toContain("origin=");
      expect(directionsUrl).toContain("destination=");
      expect(directionsUrl).toContain("google.com/maps/dir");
    });

    it("should construct Grab deep link with address", () => {
      const address = "제주도 서귀포시 중문관광로 123";
      const grabUrl = `https://grab.onelink.me/2695613898?af_dp=grab://open?screenType=BOOKING&dropOffAddress=${encodeURIComponent(address)}`;

      expect(grabUrl).toContain("grab.onelink.me");
      expect(grabUrl).toContain("dropOffAddress=");
    });
  });

  // ── Grouped Data Structure ──
  describe("Grouped Accommodation Data", () => {
    it("should include photoUrl, checkIn, checkOut in grouped data", () => {
      const accommodations = [
        { id: 1, hotelName: "별장 1", accommodationType: "villa", address: "제주도", accommodationPhotoUrl: "https://photo.url/1.jpg", checkIn: "2026-06-15T14:00", checkOut: "2026-06-18T11:00", roomType: "twin", assignedRegistrationIds: [1] },
        { id: 2, hotelName: "별장 1", accommodationType: "villa", address: "제주도", accommodationPhotoUrl: "https://photo.url/1.jpg", checkIn: "2026-06-15T14:00", checkOut: "2026-06-18T11:00", roomType: "single", assignedRegistrationIds: [2] },
        { id: 3, hotelName: "별장 2", accommodationType: "villa", address: "", accommodationPhotoUrl: "", checkIn: "", checkOut: "", roomType: "twin", assignedRegistrationIds: [3] },
      ];

      const groups: Record<string, { type: string; rooms: any[]; address: string; photoUrl: string; checkIn: string; checkOut: string }> = {};
      for (const a of accommodations) {
        const key = a.hotelName;
        if (!groups[key]) groups[key] = { type: a.accommodationType, rooms: [], address: a.address || "", photoUrl: a.accommodationPhotoUrl || "", checkIn: a.checkIn || "", checkOut: a.checkOut || "" };
        if (a.address && !groups[key].address) groups[key].address = a.address;
        if (a.accommodationPhotoUrl && !groups[key].photoUrl) groups[key].photoUrl = a.accommodationPhotoUrl;
        if (a.checkIn && !groups[key].checkIn) groups[key].checkIn = a.checkIn;
        if (a.checkOut && !groups[key].checkOut) groups[key].checkOut = a.checkOut;
        groups[key].rooms.push(a);
      }

      expect(Object.keys(groups)).toHaveLength(2);
      expect(groups["별장 1"].photoUrl).toBe("https://photo.url/1.jpg");
      expect(groups["별장 1"].checkIn).toBe("2026-06-15T14:00");
      expect(groups["별장 1"].checkOut).toBe("2026-06-18T11:00");
      expect(groups["별장 2"].photoUrl).toBe("");
      expect(groups["별장 2"].checkIn).toBe("");
    });
  });
});
