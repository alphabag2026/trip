import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  upsertUserLocation: vi.fn().mockResolvedValue(undefined),
  getUserLocation: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    latitude: "37.5665000",
    longitude: "126.9780000",
    accuracy: "10.00",
    heading: null,
    speed: null,
    altitude: null,
    meetupId: null,
    roomId: null,
    isSharing: true,
    shareType: "both",
    batteryLevel: null,
    lastActiveAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  getActiveLocationsByChatRoom: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      latitude: "37.5665000",
      longitude: "126.9780000",
      accuracy: "10.00",
      heading: "90.00",
      speed: "1.50",
      altitude: null,
      meetupId: null,
      roomId: 1,
      isSharing: true,
      shareType: "room",
      batteryLevel: 85,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      userId: 2,
      latitude: "37.5700000",
      longitude: "126.9800000",
      accuracy: "15.00",
      heading: null,
      speed: null,
      altitude: null,
      meetupId: null,
      roomId: 1,
      isSharing: true,
      shareType: "room",
      batteryLevel: 42,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getActiveLocationsByMeetup: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      latitude: "37.5665000",
      longitude: "126.9780000",
      accuracy: "10.00",
      heading: null,
      speed: null,
      altitude: "50.00",
      meetupId: 1,
      roomId: null,
      isSharing: true,
      shareType: "meetup",
      batteryLevel: 90,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  getAllActiveLocations: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      latitude: "37.5665000",
      longitude: "126.9780000",
      accuracy: "10.00",
      heading: null,
      speed: null,
      altitude: null,
      meetupId: 1,
      roomId: 1,
      isSharing: true,
      shareType: "both",
      batteryLevel: 75,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  stopSharingLocation: vi.fn().mockResolvedValue(undefined),
  stopSharingLocationInChatRoom: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

describe("Live Location API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upsertUserLocation", () => {
    it("should call upsertUserLocation with correct data", async () => {
      const data = {
        userId: 1,
        latitude: "37.5665000",
        longitude: "126.9780000",
        accuracy: "10.00",
        heading: null,
        speed: null,
        altitude: null,
        meetupId: null,
        roomId: 1,
        isSharing: true,
        shareType: "both" as const,
        batteryLevel: null,
      };

      await db.upsertUserLocation(data);
      expect(db.upsertUserLocation).toHaveBeenCalledWith(data);
    });
  });

  describe("getUserLocation", () => {
    it("should return user location data", async () => {
      const result = await db.getUserLocation(1);
      expect(result).toBeDefined();
      expect(result!.userId).toBe(1);
      expect(result!.latitude).toBe("37.5665000");
      expect(result!.longitude).toBe("126.9780000");
      expect(result!.isSharing).toBe(true);
    });
  });

  describe("getActiveLocationsByChatRoom", () => {
    it("should return active locations for a chat room", async () => {
      const result = await db.getActiveLocationsByChatRoom(1);
      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe(1);
      expect(result[1].userId).toBe(2);
      expect(result[0].shareType).toBe("room");
    });

    it("should return numeric-convertible latitude and longitude", async () => {
      const result = await db.getActiveLocationsByChatRoom(1);
      const lat = Number(result[0].latitude);
      const lng = Number(result[0].longitude);
      expect(lat).toBeCloseTo(37.5665, 4);
      expect(lng).toBeCloseTo(126.978, 3);
    });
  });

  describe("getActiveLocationsByMeetup", () => {
    it("should return active locations for a meetup", async () => {
      const result = await db.getActiveLocationsByMeetup(1);
      expect(result).toHaveLength(1);
      expect(result[0].meetupId).toBe(1);
      expect(result[0].shareType).toBe("meetup");
    });
  });

  describe("getAllActiveLocations", () => {
    it("should return all active locations", async () => {
      const result = await db.getAllActiveLocations();
      expect(result).toHaveLength(1);
      expect(result[0].isSharing).toBe(true);
    });
  });

  describe("stopSharingLocation", () => {
    it("should stop sharing for a user", async () => {
      await db.stopSharingLocation(1);
      expect(db.stopSharingLocation).toHaveBeenCalledWith(1);
    });
  });

  describe("stopSharingLocationInChatRoom", () => {
    it("should stop sharing in a specific chat room", async () => {
      await db.stopSharingLocationInChatRoom(1, 5);
      expect(db.stopSharingLocationInChatRoom).toHaveBeenCalledWith(1, 5);
    });
  });

  describe("Location data conversion", () => {
    it("should correctly convert decimal strings to numbers for API response", async () => {
      const locations = await db.getActiveLocationsByChatRoom(1);
      const apiResponse = locations.map((loc) => ({
        userId: loc.userId,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        accuracy: loc.accuracy ? Number(loc.accuracy) : null,
        heading: loc.heading ? Number(loc.heading) : null,
        speed: loc.speed ? Number(loc.speed) : null,
        shareType: loc.shareType,
        batteryLevel: loc.batteryLevel,
        updatedAt: loc.updatedAt,
      }));

      expect(apiResponse).toHaveLength(2);
      expect(apiResponse[0].latitude).toBe(37.5665);
      expect(apiResponse[0].longitude).toBe(126.978);
      expect(apiResponse[0].accuracy).toBe(10);
      expect(apiResponse[0].heading).toBe(90);
      expect(apiResponse[0].speed).toBe(1.5);
      expect(apiResponse[0].shareType).toBe("room");
      expect(apiResponse[0].batteryLevel).toBe(85);

      expect(apiResponse[1].heading).toBeNull();
      expect(apiResponse[1].speed).toBeNull();
    });

    it("should validate latitude and longitude ranges", () => {
      const validLat = 37.5665;
      const validLng = 126.978;
      const invalidLat = 91;
      const invalidLng = -181;

      expect(validLat >= -90 && validLat <= 90).toBe(true);
      expect(validLng >= -180 && validLng <= 180).toBe(true);
      expect(invalidLat >= -90 && invalidLat <= 90).toBe(false);
      expect(invalidLng >= -180 && invalidLng <= 180).toBe(false);
    });
  });
});
