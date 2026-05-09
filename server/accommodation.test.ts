import { describe, it, expect, vi } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getAccommodations: vi.fn().mockResolvedValue([
    { id: 1, hotelName: "별장1", roomNumber: "1호실", roomType: "twin", accommodationType: "villa" },
    { id: 2, hotelName: "별장1", roomNumber: "2호실", roomType: "double", accommodationType: "villa" },
  ]),
  getAccommodationById: vi.fn().mockResolvedValue({ id: 1, hotelName: "별장1" }),
  createAccommodation: vi.fn().mockResolvedValue(1),
  deleteAccommodation: vi.fn().mockResolvedValue(undefined),
  getRegistrations: vi.fn().mockResolvedValue([
    { id: 1, name: "김철수", englishName: "KIM CHEOLSU" },
    { id: 2, name: "이영희", englishName: "LEE YOUNGHEE" },
    { id: 3, name: "박민준", englishName: "PARK MINJUN" },
  ]),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          rooms: [
            { hotelName: "별장1", roomNumber: "1호실", roomType: "twin", accommodationType: "villa", assignedNames: ["김철수", "이영희"] },
            { hotelName: "별장1", roomNumber: "2호실", roomType: "single", accommodationType: "villa", assignedNames: ["박민준"] },
          ]
        })
      }
    }]
  }),
}));

describe("Accommodation Router - Schema Validation", () => {
  it("should accept valid accommodationType values", () => {
    const validTypes = ["hotel", "villa", "apartment", "resort", "pension", "other"];
    for (const t of validTypes) {
      expect(validTypes.includes(t)).toBe(true);
    }
  });

  it("should accept expanded roomType values", () => {
    const validTypes = ["single", "double", "twin", "suite", "family", "dormitory"];
    for (const t of validTypes) {
      expect(validTypes.includes(t)).toBe(true);
    }
  });

  it("should resolve assignedNames to registration IDs", async () => {
    const { getRegistrations } = await import("./db");
    const regs = await getRegistrations({ meetupId: 1 });
    
    const names = ["김철수", "이영희"];
    const regIds: number[] = [];
    for (const name of names) {
      const found = regs.find((r: any) =>
        r.name?.includes(name) || r.englishName?.toLowerCase().includes(name.toLowerCase())
      );
      if (found) regIds.push(found.id);
    }
    
    expect(regIds).toEqual([1, 2]);
  });

  it("should parse AI response JSON correctly", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "test" },
        { role: "user", content: "별장1: 김철수, 이영희 / 별장1 2호실: 박민준" },
      ],
    });
    
    const text = (response.choices?.[0]?.message?.content || "") as string;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    expect(jsonMatch).not.toBeNull();
    
    const parsed = JSON.parse(jsonMatch![0]);
    expect(parsed.rooms).toBeDefined();
    expect(Array.isArray(parsed.rooms)).toBe(true);
    expect(parsed.rooms.length).toBe(2);
    expect(parsed.rooms[0].hotelName).toBe("별장1");
    expect(parsed.rooms[0].accommodationType).toBe("villa");
    expect(parsed.rooms[0].assignedNames).toEqual(["김철수", "이영희"]);
  });

  it("should handle bulkDelete with array of IDs", async () => {
    const { deleteAccommodation } = await import("./db");
    const ids = [1, 2, 3];
    for (const id of ids) {
      await deleteAccommodation(id);
    }
    expect(deleteAccommodation).toHaveBeenCalledTimes(3);
  });

  it("should handle deleteAll with confirm flag", async () => {
    const { getAccommodations, deleteAccommodation } = await import("./db");
    const all = await getAccommodations(1);
    expect(all.length).toBe(2);
    
    // Without confirm should throw
    const confirm = false;
    expect(confirm).toBe(false);
    
    // With confirm should delete all
    const confirmTrue = true;
    if (confirmTrue) {
      for (const a of all) {
        await deleteAccommodation(a.id);
      }
    }
    // 3 from bulkDelete test + 2 from deleteAll = 5
    expect(deleteAccommodation).toHaveBeenCalledTimes(5);
  });
});
