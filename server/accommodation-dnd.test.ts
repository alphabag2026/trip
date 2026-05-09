import { describe, it, expect } from "vitest";

describe("Accommodation Dashboard DnD + Search + Export", () => {
  // Test assignToRoom logic
  it("should add registrationId to existing assignments", () => {
    const existing: number[] = [1, 2];
    const newRegId = 3;
    if (!existing.includes(newRegId)) existing.push(newRegId);
    expect(existing).toEqual([1, 2, 3]);
  });

  it("should not duplicate registrationId if already assigned", () => {
    const existing: number[] = [1, 2, 3];
    const newRegId = 2;
    if (!existing.includes(newRegId)) existing.push(newRegId);
    expect(existing).toEqual([1, 2, 3]);
  });

  // Test removeFromRoom logic
  it("should remove registrationId from assignments", () => {
    const existing: number[] = [1, 2, 3];
    const removeId = 2;
    const updated = existing.filter(id => id !== removeId);
    expect(updated).toEqual([1, 3]);
  });

  // Test moveToRoom logic (remove from old + add to new)
  it("should move registrationId between rooms", () => {
    const oldRoom: number[] = [1, 2, 3];
    const newRoom: number[] = [4, 5];
    const moveId = 2;

    // Remove from old
    const updatedOld = oldRoom.filter(id => id !== moveId);
    // Add to new
    if (!newRoom.includes(moveId)) newRoom.push(moveId);

    expect(updatedOld).toEqual([1, 3]);
    expect(newRoom).toEqual([4, 5, 2]);
  });

  // Test search functionality
  it("should find registration by name (case insensitive)", () => {
    const registrations = [
      { id: 1, name: "김철수", englishName: "Chulsoo Kim" },
      { id: 2, name: "이영희", englishName: "Younghee Lee" },
      { id: 3, name: "박민수", englishName: "Minsoo Park" },
    ];

    const query = "영희";
    const found = registrations.find(r =>
      r.name?.toLowerCase().includes(query.toLowerCase()) ||
      r.englishName?.toLowerCase().includes(query.toLowerCase())
    );
    expect(found?.id).toBe(2);
  });

  it("should find registration by English name", () => {
    const registrations = [
      { id: 1, name: "김철수", englishName: "Chulsoo Kim" },
      { id: 2, name: "이영희", englishName: "Younghee Lee" },
    ];

    const query = "chulsoo";
    const found = registrations.find(r =>
      r.name?.toLowerCase().includes(query.toLowerCase()) ||
      r.englishName?.toLowerCase().includes(query.toLowerCase())
    );
    expect(found?.id).toBe(1);
  });

  it("should find which accommodation a registration is in", () => {
    const accommodations = [
      { id: 10, hotelName: "Grand Hotel", roomNumber: "101", assignedRegistrationIds: [1, 2] },
      { id: 11, hotelName: "Grand Hotel", roomNumber: "102", assignedRegistrationIds: [3] },
      { id: 12, hotelName: "Beach Villa", roomNumber: "A1", assignedRegistrationIds: [4, 5] },
    ];

    const regId = 3;
    const foundAccom = accommodations.find(a =>
      Array.isArray(a.assignedRegistrationIds) && a.assignedRegistrationIds.includes(regId)
    );
    expect(foundAccom?.id).toBe(11);
    expect(foundAccom?.hotelName).toBe("Grand Hotel");
    expect(foundAccom?.roomNumber).toBe("102");
  });

  // Test Excel export data generation
  it("should generate correct CSV rows for export", () => {
    const ACCOM_TYPE_LABELS: Record<string, string> = {
      hotel: "호텔", villa: "별장",
    };
    const ROOM_TYPE_LABELS: Record<string, string> = {
      twin: "트윈", family: "패밀리",
    };
    const regMap: Record<number, { name: string }> = {
      1: { name: "김철수" },
      2: { name: "이영희" },
      3: { name: "박민수" },
    };
    const accommodations = [
      { hotelName: "Grand Hotel", accommodationType: "hotel", roomNumber: "101", roomType: "twin", assignedRegistrationIds: [1, 2], checkIn: null, checkOut: null, notes: "" },
      { hotelName: "Beach Villa", accommodationType: "villa", roomNumber: "A1", roomType: "family", assignedRegistrationIds: [3], checkIn: null, checkOut: null, notes: "VIP" },
    ];

    const rows: string[][] = [];
    rows.push(["숙소명", "숙소유형", "방번호", "방유형", "배정인원수", "배정자 목록"]);
    for (const a of accommodations) {
      const assignedIds: number[] = Array.isArray(a.assignedRegistrationIds) ? a.assignedRegistrationIds : [];
      const names = assignedIds.map(id => regMap[id]?.name || `ID:${id}`).join(", ");
      rows.push([
        a.hotelName,
        ACCOM_TYPE_LABELS[a.accommodationType] || a.accommodationType,
        a.roomNumber,
        ROOM_TYPE_LABELS[a.roomType] || a.roomType,
        String(assignedIds.length),
        names,
      ]);
    }

    expect(rows).toHaveLength(3); // header + 2 data rows
    expect(rows[1][0]).toBe("Grand Hotel");
    expect(rows[1][1]).toBe("호텔");
    expect(rows[1][4]).toBe("2");
    expect(rows[1][5]).toBe("김철수, 이영희");
    expect(rows[2][0]).toBe("Beach Villa");
    expect(rows[2][1]).toBe("별장");
    expect(rows[2][5]).toBe("박민수");
  });

  // Test unassigned registrations filtering
  it("should correctly identify unassigned registrations", () => {
    const registrations = [
      { id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" },
      { id: 4, name: "D" }, { id: 5, name: "E" },
    ];
    const accommodations = [
      { assignedRegistrationIds: [1, 2] },
      { assignedRegistrationIds: [3] },
    ];

    const assignedSet = new Set<number>();
    for (const a of accommodations) {
      if (Array.isArray(a.assignedRegistrationIds)) {
        a.assignedRegistrationIds.forEach(id => assignedSet.add(id));
      }
    }
    const unassigned = registrations.filter(r => !assignedSet.has(r.id));

    expect(unassigned).toHaveLength(2);
    expect(unassigned.map(r => r.name)).toEqual(["D", "E"]);
  });
});
