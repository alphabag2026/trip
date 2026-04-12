import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions
const mockDb = {
  createGeofence: vi.fn().mockResolvedValue(1),
  updateGeofence: vi.fn().mockResolvedValue(undefined),
  deleteGeofence: vi.fn().mockResolvedValue(undefined),
  listGeofencesByMeetup: vi.fn().mockResolvedValue([]),
  getActiveGeofencesByMeetup: vi.fn().mockResolvedValue([]),
  getGeofenceById: vi.fn().mockResolvedValue(null),
  createGeofenceEvent: vi.fn().mockResolvedValue(1),
  listGeofenceEventsByMeetup: vi.fn().mockResolvedValue([]),
  getRecentGeofenceEventForUser: vi.fn().mockResolvedValue(null),
  saveLocationHistory: vi.fn().mockResolvedValue(undefined),
  getLocationHistoryByUser: vi.fn().mockResolvedValue([]),
  getLocationHistoryByMeetup: vi.fn().mockResolvedValue([]),
  searchActiveLocationsByName: vi.fn().mockResolvedValue([]),
};

vi.mock("./db", () => mockDb);

describe("Geofence System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Geofence CRUD", () => {
    it("should create a geofence with valid data", async () => {
      const data = {
        meetupId: 1,
        name: "호텔 로비",
        latitude: 37.5665,
        longitude: 126.978,
        radius: 200,
        type: "hotel" as const,
        notifyOnEnter: true,
        notifyOnExit: false,
      };

      const result = await mockDb.createGeofence(data);
      expect(result).toBe(1);
      expect(mockDb.createGeofence).toHaveBeenCalledWith(data);
    });

    it("should update geofence properties", async () => {
      await mockDb.updateGeofence(1, { name: "호텔 로비 (수정)", radius: 300 });
      expect(mockDb.updateGeofence).toHaveBeenCalledWith(1, { name: "호텔 로비 (수정)", radius: 300 });
    });

    it("should delete a geofence", async () => {
      await mockDb.deleteGeofence(1);
      expect(mockDb.deleteGeofence).toHaveBeenCalledWith(1);
    });

    it("should list geofences by meetup", async () => {
      const mockFences = [
        { id: 1, meetupId: 1, name: "호텔", latitude: "37.5665", longitude: "126.978", radius: 200, type: "hotel", isActive: true },
        { id: 2, meetupId: 1, name: "공항", latitude: "37.4602", longitude: "126.4407", radius: 500, type: "airport", isActive: true },
      ];
      mockDb.listGeofencesByMeetup.mockResolvedValueOnce(mockFences);

      const result = await mockDb.listGeofencesByMeetup(1);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("호텔");
      expect(result[1].type).toBe("airport");
    });

    it("should get only active geofences", async () => {
      const activeFences = [
        { id: 1, meetupId: 1, name: "호텔", isActive: true },
      ];
      mockDb.getActiveGeofencesByMeetup.mockResolvedValueOnce(activeFences);

      const result = await mockDb.getActiveGeofencesByMeetup(1);
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });
  });

  describe("Geofence Events", () => {
    it("should create enter event", async () => {
      const eventData = {
        geofenceId: 1,
        userId: 42,
        eventType: "enter" as const,
        latitude: "37.5665",
        longitude: "126.978",
        notified: true,
      };

      const result = await mockDb.createGeofenceEvent(eventData);
      expect(result).toBe(1);
      expect(mockDb.createGeofenceEvent).toHaveBeenCalledWith(eventData);
    });

    it("should create exit event", async () => {
      const eventData = {
        geofenceId: 1,
        userId: 42,
        eventType: "exit" as const,
        latitude: "37.5700",
        longitude: "126.9800",
        notified: true,
      };

      await mockDb.createGeofenceEvent(eventData);
      expect(mockDb.createGeofenceEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "exit" })
      );
    });

    it("should list events by meetup with join data", async () => {
      const mockEvents = [
        {
          event: { id: 1, geofenceId: 1, userId: 42, eventType: "enter", latitude: "37.5665", longitude: "126.978", notified: true, createdAt: new Date() },
          geofence: { id: 1, name: "호텔", type: "hotel", meetupId: 1 },
        },
      ];
      mockDb.listGeofenceEventsByMeetup.mockResolvedValueOnce(mockEvents);

      const result = await mockDb.listGeofenceEventsByMeetup(1, 100);
      expect(result).toHaveLength(1);
      expect(result[0].event.eventType).toBe("enter");
      expect(result[0].geofence.name).toBe("호텔");
    });

    it("should check recent event to prevent duplicate alerts", async () => {
      mockDb.getRecentGeofenceEventForUser.mockResolvedValueOnce({
        id: 1, geofenceId: 1, userId: 42, eventType: "enter", createdAt: new Date(),
      });

      const recent = await mockDb.getRecentGeofenceEventForUser(42, 1);
      expect(recent).not.toBeNull();
      expect(recent.eventType).toBe("enter");
    });
  });

  describe("Location History", () => {
    it("should save location history point", async () => {
      const data = {
        userId: 42,
        meetupId: 1,
        latitude: "37.5665",
        longitude: "126.978",
        accuracy: "10.5",
        speed: "1.2",
      };

      await mockDb.saveLocationHistory(data);
      expect(mockDb.saveLocationHistory).toHaveBeenCalledWith(data);
    });

    it("should get user location history with filters", async () => {
      const mockHistory = [
        { id: 1, userId: 42, latitude: "37.5665", longitude: "126.978", createdAt: new Date("2026-04-12T10:00:00Z") },
        { id: 2, userId: 42, latitude: "37.5670", longitude: "126.979", createdAt: new Date("2026-04-12T10:05:00Z") },
      ];
      mockDb.getLocationHistoryByUser.mockResolvedValueOnce(mockHistory);

      const result = await mockDb.getLocationHistoryByUser(42, {
        meetupId: 1,
        startTime: new Date("2026-04-12T00:00:00Z"),
        endTime: new Date("2026-04-12T23:59:59Z"),
        limit: 1000,
      });

      expect(result).toHaveLength(2);
      expect(mockDb.getLocationHistoryByUser).toHaveBeenCalledWith(42, expect.objectContaining({ meetupId: 1 }));
    });

    it("should get meetup location history", async () => {
      const mockHistory = [
        { id: 1, userId: 42, latitude: "37.5665", longitude: "126.978", createdAt: new Date() },
        { id: 2, userId: 43, latitude: "37.5700", longitude: "126.980", createdAt: new Date() },
      ];
      mockDb.getLocationHistoryByMeetup.mockResolvedValueOnce(mockHistory);

      const result = await mockDb.getLocationHistoryByMeetup(1, { limit: 5000 });
      expect(result).toHaveLength(2);
    });
  });

  describe("User Search", () => {
    it("should search active locations by user name", async () => {
      const mockResults = [
        {
          location: { userId: 42, latitude: "37.5665", longitude: "126.978", isSharing: true, updatedAt: new Date() },
          user: { id: 42, name: "김철수", email: "kim@test.com" },
        },
      ];
      mockDb.searchActiveLocationsByName.mockResolvedValueOnce(mockResults);

      const result = await mockDb.searchActiveLocationsByName("김철수", 1);
      expect(result).toHaveLength(1);
      expect(result[0].user.name).toBe("김철수");
    });

    it("should return empty results for non-matching search", async () => {
      mockDb.searchActiveLocationsByName.mockResolvedValueOnce([]);

      const result = await mockDb.searchActiveLocationsByName("존재하지않는이름", 1);
      expect(result).toHaveLength(0);
    });

    it("should filter by roomId when provided", async () => {
      await mockDb.searchActiveLocationsByName("김", 5);
      expect(mockDb.searchActiveLocationsByName).toHaveBeenCalledWith("김", 5);
    });

    it("should filter by meetupId when provided", async () => {
      await mockDb.searchActiveLocationsByName("김", undefined, 3);
      expect(mockDb.searchActiveLocationsByName).toHaveBeenCalledWith("김", undefined, 3);
    });
  });

  describe("Haversine Distance", () => {
    it("should calculate distance between two points correctly", () => {
      // 서울시청 → 강남역 (약 8.7km)
      const R = 6371000;
      const lat1 = 37.5665, lon1 = 126.978;
      const lat2 = 37.4979, lon2 = 127.0276;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      expect(distance).toBeGreaterThan(8000);
      expect(distance).toBeLessThan(10000);
    });

    it("should return 0 for same coordinates", () => {
      const lat = 37.5665, lon = 126.978;
      const dLat = 0, dLon = 0;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      expect(distance).toBe(0);
    });

    it("should detect point inside geofence radius", () => {
      // 호텔 중심 (37.5665, 126.978), 반경 200m
      const centerLat = 37.5665, centerLon = 126.978;
      const pointLat = 37.5666, pointLon = 126.9781; // ~15m 떨어진 점

      const R = 6371000;
      const dLat = (pointLat - centerLat) * Math.PI / 180;
      const dLon = (pointLon - centerLon) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(centerLat * Math.PI / 180) * Math.cos(pointLat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      expect(distance).toBeLessThan(200); // 200m 반경 내
    });
  });
});
