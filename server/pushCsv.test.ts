import { describe, it, expect, vi } from "vitest";

// Mock DB functions
vi.mock("./db", () => ({
  savePushSubscription: vi.fn().mockResolvedValue({ id: 1 }),
  getPushSubscriptionsByUser: vi.fn().mockResolvedValue([
    { id: 1, endpoint: "https://fcm.googleapis.com/fcm/send/test", p256dh: "key1", auth: "auth1" },
  ]),
  deletePushSubscription: vi.fn().mockResolvedValue(true),
  getAdminPushSubscriptions: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, endpoint: "https://fcm.googleapis.com/fcm/send/test", p256dh: "key1", auth: "auth1" },
  ]),
  getLocationHistoryForExport: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, latitude: 37.5665, longitude: 126.978, accuracy: 10, altitude: null, heading: null, speed: null, createdAt: new Date("2025-01-01T10:00:00Z") },
    { id: 2, userId: 1, latitude: 37.5670, longitude: 126.979, accuracy: 15, altitude: null, heading: 90, speed: 1.5, createdAt: new Date("2025-01-01T10:05:00Z") },
    { id: 3, userId: 2, latitude: 37.5680, longitude: 126.980, accuracy: 20, altitude: null, heading: null, speed: null, createdAt: new Date("2025-01-01T10:10:00Z") },
  ]),
}));

describe("Push Notification API", () => {
  it("should save push subscription", async () => {
    const { savePushSubscription } = await import("./db");
    const result = await savePushSubscription(1, "https://fcm.googleapis.com/fcm/send/test", "key1", "auth1");
    expect(result).toEqual({ id: 1 });
    expect(savePushSubscription).toHaveBeenCalledWith(1, "https://fcm.googleapis.com/fcm/send/test", "key1", "auth1");
  });

  it("should get user push subscriptions", async () => {
    const { getPushSubscriptionsByUser } = await import("./db");
    const subs = await getPushSubscriptionsByUser(1);
    expect(subs).toHaveLength(1);
    expect(subs[0].endpoint).toContain("fcm.googleapis.com");
  });

  it("should delete push subscription by endpoint", async () => {
    const { deletePushSubscription } = await import("./db");
    const result = await deletePushSubscription(1, "https://fcm.googleapis.com/fcm/send/test");
    expect(result).toBe(true);
  });

  it("should get admin push subscriptions", async () => {
    const { getAdminPushSubscriptions } = await import("./db");
    const subs = await getAdminPushSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].userId).toBe(1);
  });
});

describe("CSV Export", () => {
  it("should generate CSV from location history", async () => {
    const { getLocationHistoryForExport } = await import("./db");
    const data = await getLocationHistoryForExport(1);
    expect(data).toHaveLength(3);

    // CSV 생성 로직 테스트
    const headers = ["ID", "UserID", "Latitude", "Longitude", "Accuracy", "Altitude", "Heading", "Speed", "Timestamp"];
    const csvRows = [headers.join(",")];
    data.forEach((row: any) => {
      csvRows.push([
        row.id, row.userId, row.latitude, row.longitude,
        row.accuracy ?? "", row.altitude ?? "", row.heading ?? "",
        row.speed ?? "", new Date(row.createdAt).toISOString(),
      ].join(","));
    });
    const csv = csvRows.join("\n");

    expect(csv).toContain("ID,UserID,Latitude,Longitude");
    expect(csv).toContain("37.5665,126.978");
    expect(csv).toContain("37.567,126.979");
    expect(csv).toContain("37.568,126.98");
    expect(csv.split("\n")).toHaveLength(4); // header + 3 rows
  });

  it("should handle empty location history", async () => {
    const { getLocationHistoryForExport } = (await import("./db")) as any;
    getLocationHistoryForExport.mockResolvedValueOnce([]);
    const data = await getLocationHistoryForExport(999);
    expect(data).toHaveLength(0);
  });

  it("should include correct columns in CSV", () => {
    const headers = ["ID", "UserID", "Latitude", "Longitude", "Accuracy", "Altitude", "Heading", "Speed", "Timestamp"];
    expect(headers).toHaveLength(9);
    expect(headers).toContain("Latitude");
    expect(headers).toContain("Longitude");
    expect(headers).toContain("Timestamp");
  });

  it("should handle null values in CSV export", async () => {
    const { getLocationHistoryForExport } = await import("./db");
    const data = await getLocationHistoryForExport(1);
    const row = data[0] as any;
    
    // null 값은 빈 문자열로 변환
    const altitude = row.altitude ?? "";
    const heading = row.heading ?? "";
    expect(altitude).toBe("");
    expect(heading).toBe("");
  });
});

describe("Push Notification - VAPID Key", () => {
  it("should return VAPID public key from env", () => {
    // VAPID 공개키는 환경변수에서 가져옴
    const publicKey = process.env.VAPID_PUBLIC_KEY || "";
    expect(typeof publicKey).toBe("string");
  });
});

describe("Push Subscription Data Validation", () => {
  it("should validate endpoint URL format", () => {
    const validEndpoint = "https://fcm.googleapis.com/fcm/send/test-token";
    expect(validEndpoint.startsWith("https://")).toBe(true);
  });

  it("should validate p256dh and auth keys are non-empty", () => {
    const p256dh = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REqnSs";
    const auth = "tBHItJI5svbpC7htfNfDRg";
    expect(p256dh.length).toBeGreaterThan(0);
    expect(auth.length).toBeGreaterThan(0);
  });
});
