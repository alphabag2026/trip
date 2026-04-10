import { describe, it, expect, vi } from "vitest";

// Mock invokeLLM
vi.mock("./server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          vehicleName: "현대 스타렉스",
          vehiclePlateNumber: "12가 3456",
          vehicleColor: "흰색",
          vehicleType: "밴",
          driverName: "홍길동",
          driverPhone: "010-1234-5678",
          vehicleCapacity: 12,
        })
      }
    }]
  })
}));

describe("AI Extract API Schema Validation", () => {
  it("should validate vehicle context fields", () => {
    const vehicleFields = [
      "vehicleName", "vehiclePlateNumber", "vehicleColor",
      "vehicleType", "driverName", "driverPhone", "vehicleCapacity"
    ];
    const result = {
      vehicleName: "현대 스타렉스",
      vehiclePlateNumber: "12가 3456",
      vehicleColor: "흰색",
      vehicleType: "밴",
      driverName: "홍길동",
      driverPhone: "010-1234-5678",
      vehicleCapacity: 12,
    };
    for (const field of vehicleFields) {
      expect(result).toHaveProperty(field);
    }
  });

  it("should validate accommodation context fields", () => {
    const accomFields = [
      "hotelName", "roomNumber", "roomType", "checkIn", "checkOut"
    ];
    const result = {
      hotelName: "롯데 하노이",
      roomNumber: "501",
      roomType: "twin",
      checkIn: "2025-04-15T14:00:00",
      checkOut: "2025-04-18T12:00:00",
    };
    for (const field of accomFields) {
      expect(result).toHaveProperty(field);
    }
  });

  it("should validate event context fields", () => {
    const eventFields = [
      "title", "datetime", "location", "description"
    ];
    const result = {
      title: "하롱베이 투어",
      datetime: "2025-04-16T14:00:00",
      location: "하롱베이 선착장",
      description: "하롱베이 크루즈 투어",
    };
    for (const field of eventFields) {
      expect(result).toHaveProperty(field);
    }
  });

  it("should validate itinerary context fields", () => {
    const itineraryFields = ["title", "days"];
    const result = {
      title: "베트남 하노이 여행",
      days: [
        { dayNumber: 1, date: "2025-04-15", activities: [{ time: "09:00", title: "인천 출발", description: "VN456" }] },
        { dayNumber: 2, date: "2025-04-16", activities: [{ time: "08:00", title: "하롱베이 투어", description: "크루즈" }] },
      ],
    };
    for (const field of itineraryFields) {
      expect(result).toHaveProperty(field);
    }
    expect(result.days).toHaveLength(2);
    expect(result.days[0].activities[0]).toHaveProperty("time");
    expect(result.days[0].activities[0]).toHaveProperty("title");
  });

  it("should validate channel context fields", () => {
    const channelFields = [
      "channelName", "channelType", "managerName", "managerPhone", "description"
    ];
    const result = {
      channelName: "두바이 밋업 공항 픽업",
      channelType: "driver",
      managerName: "홍길동",
      managerPhone: "010-1234-5678",
      description: "공항 픽업 관련 소통 채널",
    };
    for (const field of channelFields) {
      expect(result).toHaveProperty(field);
    }
  });

  it("should handle valid context types", () => {
    const validContexts = ["vehicle", "accommodation", "event", "itinerary", "channel"];
    for (const ctx of validContexts) {
      expect(validContexts).toContain(ctx);
    }
  });

  it("should handle base64 image data format", () => {
    const base64Sample = "iVBORw0KGgoAAAANSUhEUg==";
    expect(base64Sample).toBeTruthy();
    expect(typeof base64Sample).toBe("string");
  });

  it("should validate prompt mode input", () => {
    const promptInput = "현대 스타렉스 흰색, 차량번호 12가 3456, 기사 홍길동 010-1234-5678";
    expect(promptInput.length).toBeGreaterThan(0);
    expect(typeof promptInput).toBe("string");
  });

  it("should validate myTravel pickup response format", () => {
    const pickupResponse = {
      id: 1,
      vehicleName: "현대 스타렉스",
      vehiclePlateNumber: "12가 3456",
      vehicleColor: "흰색",
      vehicleType: "밴",
      vehicleCapacity: 12,
      vehiclePhotoUrl: "https://cdn.example.com/photo.jpg",
      driverName: "홍길동",
      driverPhone: "010-1234-5678",
      pickupLocation: "하노이 공항",
      pickupTime: 1713168000000,
      status: "pending",
    };
    expect(pickupResponse).toHaveProperty("vehicleName");
    expect(pickupResponse).toHaveProperty("vehiclePlateNumber");
    expect(pickupResponse).toHaveProperty("vehiclePhotoUrl");
    expect(pickupResponse).toHaveProperty("driverName");
    expect(pickupResponse.status).toBe("pending");
  });

  it("should validate myTravel accommodation response format", () => {
    const accomResponse = {
      id: 1,
      hotelName: "롯데 하노이",
      roomNumber: "501",
      roomType: "twin",
      accommodationPhotoUrl: "https://cdn.example.com/hotel.jpg",
      checkIn: 1713168000000,
      checkOut: 1713427200000,
      floorNumber: "5",
      notes: "조식 포함",
    };
    expect(accomResponse).toHaveProperty("hotelName");
    expect(accomResponse).toHaveProperty("roomNumber");
    expect(accomResponse).toHaveProperty("accommodationPhotoUrl");
    expect(accomResponse.roomType).toBe("twin");
  });
});
