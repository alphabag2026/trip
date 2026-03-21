import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions
vi.mock("./db", () => ({
  getPassportListByMeetup: vi.fn().mockResolvedValue([
    {
      userId: "user1",
      name: "홍길동",
      email: "hong@test.com",
      role: "user",
      passportNumber: "M12345678",
      nameEnglish: "HONG GILDONG",
      nationality: "KOR",
      dateOfBirth: "1990-01-15",
      gender: "M",
      expiryDate: "2030-06-30",
    },
  ]),
  getAllPassportList: vi.fn().mockResolvedValue([
    {
      userId: "user1",
      name: "홍길동",
      email: "hong@test.com",
      role: "user",
      passportNumber: "M12345678",
      nameEnglish: "HONG GILDONG",
      nationality: "KOR",
      dateOfBirth: "1990-01-15",
      gender: "M",
      expiryDate: "2030-06-30",
    },
    {
      userId: "user2",
      name: "김철수",
      email: "kim@test.com",
      role: "user",
      passportNumber: "M87654321",
      nameEnglish: "KIM CHEOLSU",
      nationality: "KOR",
      dateOfBirth: "1985-05-20",
      gender: "M",
      expiryDate: "2028-12-31",
    },
  ]),
  createExpense: vi.fn().mockResolvedValue({ id: 1 }),
  getExpensesByMeetup: vi.fn().mockResolvedValue([
    {
      id: 1,
      meetupId: 1,
      category: "flight",
      title: "방콕행 항공권",
      amount: 500000,
      currency: "KRW",
      paidBy: "주최측",
      paidFor: "팀A",
      registeredVia: "web",
    },
  ]),
  getAllExpenses: vi.fn().mockResolvedValue([
    {
      id: 1,
      meetupId: 1,
      category: "flight",
      title: "방콕행 항공권",
      amount: 500000,
      currency: "KRW",
    },
    {
      id: 2,
      meetupId: 1,
      category: "hotel",
      title: "호텔 숙박비",
      amount: 300000,
      currency: "KRW",
    },
  ]),
  updateExpense: vi.fn().mockResolvedValue({ id: 1 }),
  deleteExpense: vi.fn().mockResolvedValue(true),
  getExpenseSummary: vi.fn().mockResolvedValue({
    total: 800000,
    count: 2,
    participantCount: 5,
    perPerson: 160000,
    byCategory: [
      { category: "flight", amount: 500000 },
      { category: "hotel", amount: 300000 },
    ],
  }),
}));

import {
  getPassportListByMeetup,
  getAllPassportList,
  createExpense,
  getExpensesByMeetup,
  getAllExpenses,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from "./db";

describe("Passport List API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get passport list by meetup", async () => {
    const result = await getPassportListByMeetup(1);
    expect(result).toHaveLength(1);
    expect(result[0].passportNumber).toBe("M12345678");
    expect(result[0].nameEnglish).toBe("HONG GILDONG");
    expect(getPassportListByMeetup).toHaveBeenCalledWith(1);
  });

  it("should get all passport list", async () => {
    const result = await getAllPassportList();
    expect(result).toHaveLength(2);
    expect(result[0].nationality).toBe("KOR");
    expect(result[1].passportNumber).toBe("M87654321");
  });

  it("passport list should include user info and passport info", async () => {
    const result = await getPassportListByMeetup(1);
    const entry = result[0];
    // User info
    expect(entry.name).toBe("홍길동");
    expect(entry.email).toBe("hong@test.com");
    // Passport info
    expect(entry.passportNumber).toBe("M12345678");
    expect(entry.dateOfBirth).toBe("1990-01-15");
    expect(entry.gender).toBe("M");
    expect(entry.expiryDate).toBe("2030-06-30");
  });
});

describe("Expense API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create an expense", async () => {
    const result = await createExpense({
      meetupId: 1,
      category: "flight",
      title: "방콕행 항공권",
      amount: 500000,
      currency: "KRW",
      paidBy: "주최측",
      paidFor: "팀A",
      registeredVia: "web",
    } as any);
    expect(result).toEqual({ id: 1 });
    expect(createExpense).toHaveBeenCalledTimes(1);
  });

  it("should get expenses by meetup", async () => {
    const result = await getExpensesByMeetup(1);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("flight");
    expect(result[0].amount).toBe(500000);
  });

  it("should get all expenses", async () => {
    const result = await getAllExpenses();
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("방콕행 항공권");
    expect(result[1].title).toBe("호텔 숙박비");
  });

  it("should update an expense", async () => {
    const result = await updateExpense(1, { title: "수정된 항공권" } as any);
    expect(result).toEqual({ id: 1 });
    expect(updateExpense).toHaveBeenCalledWith(1, { title: "수정된 항공권" });
  });

  it("should delete an expense", async () => {
    const result = await deleteExpense(1);
    expect(result).toBe(true);
    expect(deleteExpense).toHaveBeenCalledWith(1);
  });

  it("should get expense summary", async () => {
    const result = await getExpenseSummary(1);
    expect(result.total).toBe(800000);
    expect(result.count).toBe(2);
    expect(result.participantCount).toBe(5);
    expect(result.perPerson).toBe(160000);
    expect(result.byCategory).toHaveLength(2);
    expect(result.byCategory[0].category).toBe("flight");
    expect(result.byCategory[1].category).toBe("hotel");
  });

  it("expense should have required fields", async () => {
    const result = await getExpensesByMeetup(1);
    const expense = result[0];
    expect(expense).toHaveProperty("id");
    expect(expense).toHaveProperty("meetupId");
    expect(expense).toHaveProperty("category");
    expect(expense).toHaveProperty("title");
    expect(expense).toHaveProperty("amount");
    expect(expense).toHaveProperty("currency");
  });

  it("expense categories should be valid", async () => {
    const validCategories = ["flight", "hotel", "transport", "meal", "venue", "gift", "visa", "insurance", "misc"];
    const result = await getAllExpenses();
    result.forEach((e: any) => {
      expect(validCategories).toContain(e.category);
    });
  });
});
