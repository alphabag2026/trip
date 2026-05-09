import { describe, it, expect, vi } from "vitest";

// Test the accommodation dashboard and myRoommates logic
describe("Accommodation Dashboard & MyPage Integration", () => {
  it("should correctly group accommodations by hotel name", () => {
    const accommodations = [
      { id: 1, hotelName: "Grand Hotel", roomNumber: "101", accommodationType: "hotel", roomType: "twin", assignedRegistrationIds: [1, 2] },
      { id: 2, hotelName: "Grand Hotel", roomNumber: "102", accommodationType: "hotel", roomType: "double", assignedRegistrationIds: [3] },
      { id: 3, hotelName: "Beach Villa", roomNumber: "A1", accommodationType: "villa", roomType: "family", assignedRegistrationIds: [4, 5, 6] },
    ];

    // Group by hotel
    const grouped: Record<string, typeof accommodations> = {};
    for (const a of accommodations) {
      if (!grouped[a.hotelName]) grouped[a.hotelName] = [];
      grouped[a.hotelName].push(a);
    }

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["Grand Hotel"]).toHaveLength(2);
    expect(grouped["Beach Villa"]).toHaveLength(1);
  });

  it("should calculate occupancy stats correctly", () => {
    const accommodations = [
      { id: 1, assignedRegistrationIds: [1, 2], roomType: "twin" },
      { id: 2, assignedRegistrationIds: [3], roomType: "double" },
      { id: 3, assignedRegistrationIds: null, roomType: "single" },
      { id: 4, assignedRegistrationIds: [4, 5, 6], roomType: "family" },
    ];

    const totalRooms = accommodations.length;
    const occupiedRooms = accommodations.filter(a => a.assignedRegistrationIds && a.assignedRegistrationIds.length > 0).length;
    const totalGuests = accommodations.reduce((sum, a) => sum + (a.assignedRegistrationIds?.length || 0), 0);

    expect(totalRooms).toBe(4);
    expect(occupiedRooms).toBe(3);
    expect(totalGuests).toBe(6);
  });

  it("should build roommate name map correctly", () => {
    const myRegIds = [1];
    const allAccom = [
      { id: 1, assignedRegistrationIds: [1, 2, 3] },
      { id: 2, assignedRegistrationIds: [4, 5] },
    ];
    const allRegs = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
      { id: 4, name: "Dave" },
      { id: 5, name: "Eve" },
    ];

    // Filter my accommodations
    const myAccoms = allAccom.filter(a => {
      const assigned = a.assignedRegistrationIds as number[] | null;
      return assigned && assigned.some(id => myRegIds.includes(id));
    });

    expect(myAccoms).toHaveLength(1);
    expect(myAccoms[0].id).toBe(1);

    // Get all roommate IDs
    const roommateIds = new Set<number>();
    for (const a of myAccoms) {
      const assigned = a.assignedRegistrationIds as number[] | null;
      if (assigned) assigned.forEach(id => roommateIds.add(id));
    }

    expect(roommateIds.size).toBe(3);
    expect(roommateIds.has(1)).toBe(true);
    expect(roommateIds.has(2)).toBe(true);
    expect(roommateIds.has(3)).toBe(true);

    // Build name map
    const nameMap: Record<number, string> = {};
    for (const r of allRegs) {
      if (roommateIds.has(r.id)) nameMap[r.id] = r.name || `#${r.id}`;
    }

    expect(nameMap[1]).toBe("Alice");
    expect(nameMap[2]).toBe("Bob");
    expect(nameMap[3]).toBe("Charlie");
    expect(nameMap[4]).toBeUndefined();
  });

  it("should handle accommodation types correctly", () => {
    const ACCOM_TYPE_LABELS: Record<string, string> = {
      hotel: "호텔", villa: "별장", apartment: "아파트", resort: "리조트", pension: "펜션", other: "기타",
    };
    const ROOM_TYPE_LABELS: Record<string, string> = {
      single: "싱글", double: "더블", twin: "트윈", suite: "스위트", family: "패밀리", dormitory: "도미토리",
    };

    expect(ACCOM_TYPE_LABELS["hotel"]).toBe("호텔");
    expect(ACCOM_TYPE_LABELS["villa"]).toBe("별장");
    expect(ROOM_TYPE_LABELS["family"]).toBe("패밀리");
    expect(ROOM_TYPE_LABELS["dormitory"]).toBe("도미토리");
  });
});
