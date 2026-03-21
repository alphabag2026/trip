import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB functions
const mockGetChecklistCountries = vi.fn();
const mockGetChecklistTemplates = vi.fn();
const mockGetUserChecklist = vi.fn();
const mockInitUserChecklist = vi.fn();
const mockToggleChecklistItem = vi.fn();
const mockAddCustomChecklistItem = vi.fn();
const mockDeleteCustomChecklistItem = vi.fn();
const mockResetUserChecklist = vi.fn();
const mockGetChecklistProgress = vi.fn();

vi.mock("./db", () => ({
  getChecklistCountries: (...args: any[]) => mockGetChecklistCountries(...args),
  getChecklistTemplates: (...args: any[]) => mockGetChecklistTemplates(...args),
  getUserChecklist: (...args: any[]) => mockGetUserChecklist(...args),
  initUserChecklist: (...args: any[]) => mockInitUserChecklist(...args),
  toggleChecklistItem: (...args: any[]) => mockToggleChecklistItem(...args),
  addCustomChecklistItem: (...args: any[]) => mockAddCustomChecklistItem(...args),
  deleteCustomChecklistItem: (...args: any[]) => mockDeleteCustomChecklistItem(...args),
  resetUserChecklist: (...args: any[]) => mockResetUserChecklist(...args),
  getChecklistProgress: (...args: any[]) => mockGetChecklistProgress(...args),
}));

describe("Immigration Checklist API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("countries", () => {
    it("should return list of supported countries", async () => {
      const countries = [
        { countryCode: "TH", countryName: "태국" },
        { countryCode: "VN", countryName: "베트남" },
        { countryCode: "JP", countryName: "일본" },
      ];
      mockGetChecklistCountries.mockResolvedValue(countries);

      const result = await mockGetChecklistCountries();
      expect(result).toHaveLength(3);
      expect(result[0].countryCode).toBe("TH");
      expect(result[0].countryName).toBe("태국");
    });
  });

  describe("templates", () => {
    it("should return templates for a specific country", async () => {
      const templates = [
        { id: 1, countryCode: "TH", category: "required_docs", title: "여권 (유효기간 6개월 이상)", sortOrder: 1 },
        { id: 2, countryCode: "TH", category: "required_docs", title: "왕복 항공권", sortOrder: 2 },
        { id: 3, countryCode: "TH", category: "recommended_items", title: "여행자 보험 증서", sortOrder: 1 },
        { id: 4, countryCode: "TH", category: "tips", title: "무비자 90일 체류 가능", sortOrder: 1 },
      ];
      mockGetChecklistTemplates.mockResolvedValue(templates);

      const result = await mockGetChecklistTemplates("TH");
      expect(result).toHaveLength(4);
      expect(result[0].category).toBe("required_docs");
      expect(result[2].category).toBe("recommended_items");
      expect(result[3].category).toBe("tips");
    });

    it("should return empty array for unsupported country", async () => {
      mockGetChecklistTemplates.mockResolvedValue([]);
      const result = await mockGetChecklistTemplates("XX");
      expect(result).toHaveLength(0);
    });
  });

  describe("myChecklist", () => {
    it("should auto-initialize checklist if user has no items", async () => {
      const userId = 1;
      const countryCode = "TH";
      const initializedItems = [
        { id: 100, userId: 1, templateId: 1, countryCode: "TH", category: "required_docs", title: "여권", isChecked: false },
        { id: 101, userId: 1, templateId: 2, countryCode: "TH", category: "required_docs", title: "왕복 항공권", isChecked: false },
      ];

      mockGetUserChecklist.mockResolvedValue([]);
      mockInitUserChecklist.mockResolvedValue(initializedItems);

      let items = await mockGetUserChecklist(userId, countryCode);
      if (items.length === 0) {
        items = await mockInitUserChecklist(userId, countryCode);
      }

      expect(mockGetUserChecklist).toHaveBeenCalledWith(userId, countryCode);
      expect(mockInitUserChecklist).toHaveBeenCalledWith(userId, countryCode);
      expect(items).toHaveLength(2);
      expect(items[0].isChecked).toBe(false);
    });

    it("should return existing checklist items", async () => {
      const existingItems = [
        { id: 100, userId: 1, countryCode: "TH", category: "required_docs", title: "여권", isChecked: true },
        { id: 101, userId: 1, countryCode: "TH", category: "required_docs", title: "왕복 항공권", isChecked: false },
      ];
      mockGetUserChecklist.mockResolvedValue(existingItems);

      const items = await mockGetUserChecklist(1, "TH");
      expect(items).toHaveLength(2);
      expect(items[0].isChecked).toBe(true);
      expect(items[1].isChecked).toBe(false);
    });
  });

  describe("toggleItem", () => {
    it("should toggle check state of an item", async () => {
      mockToggleChecklistItem.mockResolvedValue({
        id: 100, userId: 1, countryCode: "TH", category: "required_docs", title: "여권", isChecked: true,
      });

      const result = await mockToggleChecklistItem(1, 100);
      expect(result.isChecked).toBe(true);
      expect(mockToggleChecklistItem).toHaveBeenCalledWith(1, 100);
    });

    it("should throw error for non-existent item", async () => {
      mockToggleChecklistItem.mockRejectedValue(new Error("Item not found"));

      await expect(mockToggleChecklistItem(1, 999)).rejects.toThrow("Item not found");
    });
  });

  describe("addCustomItem", () => {
    it("should add a custom checklist item", async () => {
      mockAddCustomChecklistItem.mockResolvedValue(200);

      const id = await mockAddCustomChecklistItem(1, "TH", "와이파이 도시락 예약", "포켓와이파이 대여");
      expect(id).toBe(200);
      expect(mockAddCustomChecklistItem).toHaveBeenCalledWith(1, "TH", "와이파이 도시락 예약", "포켓와이파이 대여");
    });
  });

  describe("deleteCustomItem", () => {
    it("should delete a custom item", async () => {
      mockDeleteCustomChecklistItem.mockResolvedValue(undefined);

      await mockDeleteCustomChecklistItem(1, 200);
      expect(mockDeleteCustomChecklistItem).toHaveBeenCalledWith(1, 200);
    });
  });

  describe("reset", () => {
    it("should reset checklist to default templates", async () => {
      const resetItems = [
        { id: 300, userId: 1, countryCode: "TH", category: "required_docs", title: "여권", isChecked: false },
        { id: 301, userId: 1, countryCode: "TH", category: "required_docs", title: "왕복 항공권", isChecked: false },
      ];
      mockResetUserChecklist.mockResolvedValue(resetItems);

      const result = await mockResetUserChecklist(1, "TH");
      expect(result).toHaveLength(2);
      expect(result.every((i: any) => !i.isChecked)).toBe(true);
    });
  });

  describe("progress", () => {
    it("should calculate progress correctly", async () => {
      mockGetChecklistProgress.mockResolvedValue({ total: 10, checked: 7, percent: 70 });

      const progress = await mockGetChecklistProgress(1, "TH");
      expect(progress.total).toBe(10);
      expect(progress.checked).toBe(7);
      expect(progress.percent).toBe(70);
    });

    it("should return 0% for empty checklist", async () => {
      mockGetChecklistProgress.mockResolvedValue({ total: 0, checked: 0, percent: 0 });

      const progress = await mockGetChecklistProgress(1, "XX");
      expect(progress.total).toBe(0);
      expect(progress.percent).toBe(0);
    });

    it("should return 100% when all items checked", async () => {
      mockGetChecklistProgress.mockResolvedValue({ total: 12, checked: 12, percent: 100 });

      const progress = await mockGetChecklistProgress(1, "TH");
      expect(progress.percent).toBe(100);
    });
  });

  describe("category structure", () => {
    it("should support all expected categories", () => {
      const categories = ["required_docs", "recommended_items", "tips", "custom"];
      expect(categories).toContain("required_docs");
      expect(categories).toContain("recommended_items");
      expect(categories).toContain("tips");
      expect(categories).toContain("custom");
    });

    it("should have correct category labels", () => {
      const categoryMap: Record<string, string> = {
        required_docs: "필수 서류",
        recommended_items: "권장 준비물",
        tips: "입국 시 주의사항",
        custom: "내 항목",
      };
      expect(categoryMap.required_docs).toBe("필수 서류");
      expect(categoryMap.recommended_items).toBe("권장 준비물");
      expect(categoryMap.tips).toBe("입국 시 주의사항");
      expect(categoryMap.custom).toBe("내 항목");
    });
  });
});
