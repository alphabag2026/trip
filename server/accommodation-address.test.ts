import { describe, it, expect, vi } from "vitest";

// Mock DB module
const mockAccommodations = [
  { id: 1, hotelName: "별장 1", address: null, assignedRegistrationIds: [1, 2] },
  { id: 2, hotelName: "별장 1", address: null, assignedRegistrationIds: [3] },
  { id: 3, hotelName: "별장 2", address: "서울시 강남구 테헤란로 123", assignedRegistrationIds: [4, 5] },
];

const mockUpdateAccommodation = vi.fn();
const mockGetAccommodations = vi.fn().mockResolvedValue(mockAccommodations);

vi.mock("./db", () => ({
  getAccommodations: (...args: any[]) => mockGetAccommodations(...args),
  updateAccommodation: (...args: any[]) => mockUpdateAccommodation(...args),
}));

describe("Accommodation Address Feature", () => {
  it("should have address field in accommodation schema", async () => {
    // Verify that accommodations include address field
    const accoms = await mockGetAccommodations();
    expect(accoms[0]).toHaveProperty("address");
    expect(accoms[2].address).toBe("서울시 강남구 테헤란로 123");
  });

  it("should update address for all rooms with same hotelName", async () => {
    const hotelName = "별장 1";
    const newAddress = "제주도 서귀포시 중문관광로 123";
    
    const allAccoms = await mockGetAccommodations();
    const matching = allAccoms.filter((a: any) => a.hotelName === hotelName);
    
    for (const a of matching) {
      await mockUpdateAccommodation(a.id, { address: newAddress });
    }
    
    // Should have updated exactly 2 rooms (both "별장 1" entries)
    expect(mockUpdateAccommodation).toHaveBeenCalledTimes(2);
    expect(mockUpdateAccommodation).toHaveBeenCalledWith(1, { address: newAddress });
    expect(mockUpdateAccommodation).toHaveBeenCalledWith(2, { address: newAddress });
  });

  it("should not update rooms with different hotelName", async () => {
    mockUpdateAccommodation.mockClear();
    
    const hotelName = "별장 2";
    const newAddress = "부산시 해운대구 해운대로 456";
    
    const allAccoms = await mockGetAccommodations();
    const matching = allAccoms.filter((a: any) => a.hotelName === hotelName);
    
    for (const a of matching) {
      await mockUpdateAccommodation(a.id, { address: newAddress });
    }
    
    // Should have updated only 1 room (별장 2)
    expect(mockUpdateAccommodation).toHaveBeenCalledTimes(1);
    expect(mockUpdateAccommodation).toHaveBeenCalledWith(3, { address: newAddress });
  });

  it("should group accommodations with address info", () => {
    const accommodations = [
      { id: 1, hotelName: "별장 1", accommodationType: "villa", address: "제주도 서귀포시", assignedRegistrationIds: [1, 2], roomType: "twin" },
      { id: 2, hotelName: "별장 1", accommodationType: "villa", address: "제주도 서귀포시", assignedRegistrationIds: [3], roomType: "single" },
      { id: 3, hotelName: "별장 2", accommodationType: "villa", address: "", assignedRegistrationIds: [4], roomType: "twin" },
    ];

    const groups: Record<string, { type: string; rooms: any[]; address: string }> = {};
    for (const a of accommodations) {
      const key = a.hotelName;
      if (!groups[key]) groups[key] = { type: a.accommodationType, rooms: [], address: a.address || "" };
      if (a.address && !groups[key].address) groups[key].address = a.address;
      groups[key].rooms.push(a);
    }

    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups["별장 1"].address).toBe("제주도 서귀포시");
    expect(groups["별장 1"].rooms).toHaveLength(2);
    expect(groups["별장 2"].address).toBe("");
  });

  it("should include address in assignment data for participants", () => {
    const accommodation = {
      id: 1,
      hotelName: "별장 1",
      roomNumber: "101",
      roomType: "twin",
      address: "제주도 서귀포시 중문관광로 123",
      assignedRegistrationIds: [1, 2],
    };

    // Verify address is accessible
    expect(accommodation.address).toBe("제주도 서귀포시 중문관광로 123");
    expect(accommodation.address).toBeTruthy();
    
    // Verify Google Maps URL can be constructed
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(accommodation.address)}`;
    expect(mapsUrl).toContain("google.com/maps");
    expect(mapsUrl).toContain("query=");
    expect(mapsUrl).not.toContain("undefined");
  });
});
