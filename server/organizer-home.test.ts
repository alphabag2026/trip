import { describe, it, expect, vi } from "vitest";

// Test the organizer dashboard data structure
describe("Organizer Home - Dashboard Data", () => {
  it("should return correct data shape from getOrganizerDashboardData", async () => {
    // Mock the db module
    const { getOrganizerDashboardData } = await import("./db");
    
    // Call with a non-existent user to test empty state
    const result = await getOrganizerDashboardData(999999);
    
    // Should return the expected shape even for non-existent user
    expect(result).toHaveProperty("meetups");
    expect(result).toHaveProperty("totalAttendees");
    expect(result).toHaveProperty("pendingRegistrations");
    expect(Array.isArray(result.meetups)).toBe(true);
    expect(typeof result.totalAttendees).toBe("number");
    expect(typeof result.pendingRegistrations).toBe("number");
  });

  it("should include flight/hotel/pickup/schedule counts in response", async () => {
    const { getOrganizerDashboardData } = await import("./db");
    
    const result = await getOrganizerDashboardData(999999);
    
    // New fields should exist
    expect(result).toHaveProperty("flightAssigned");
    expect(result).toHaveProperty("hotelAssigned");
    expect(result).toHaveProperty("pickupAssigned");
    expect(result).toHaveProperty("scheduleCount");
    expect(typeof result.flightAssigned).toBe("number");
    expect(typeof result.hotelAssigned).toBe("number");
    expect(typeof result.pickupAssigned).toBe("number");
    expect(typeof result.scheduleCount).toBe("number");
  });

  it("should return empty arrays and zero counts for non-existent user", async () => {
    const { getOrganizerDashboardData } = await import("./db");
    
    const result = await getOrganizerDashboardData(-1);
    
    expect(result.meetups).toEqual([]);
    expect(result.totalAttendees).toBe(0);
    expect(result.pendingRegistrations).toBe(0);
  });
});

// Test locale files have org_home keys
describe("Organizer Home - Locale Keys", () => {
  it("should have org_home keys in ko.json", async () => {
    const fs = await import("fs");
    const koData = JSON.parse(fs.readFileSync("client/src/locales/ko.json", "utf-8"));
    
    const requiredKeys = [
      "org_home.welcome",
      "org_home.workflow_title",
      "org_home.step1_title",
      "org_home.step2_title",
      "org_home.step3_title",
      "org_home.step4_title",
      "org_home.step5_title",
      "org_home.step6_title",
      "org_home.quick_actions",
      "org_home.qa_meetups",
      "org_home.qa_attendees",
      "org_home.qa_flights",
      "org_home.qa_hotels",
      "org_home.qa_pickups",
      "org_home.goto_backoffice",
      "org_home.nav_home",
      "org_home.nav_attendees",
      "org_home.nav_manage",
      "org_home.nav_chat",
    ];
    
    for (const key of requiredKeys) {
      expect(koData).toHaveProperty(key);
      expect(koData[key]).toBeTruthy();
    }
  });

  it("should have org_home keys in en.json", async () => {
    const fs = await import("fs");
    const enData = JSON.parse(fs.readFileSync("client/src/locales/en.json", "utf-8"));
    
    const requiredKeys = [
      "org_home.welcome",
      "org_home.workflow_title",
      "org_home.step1_title",
      "org_home.step2_title",
      "org_home.step3_title",
      "org_home.step4_title",
      "org_home.step5_title",
      "org_home.step6_title",
      "org_home.quick_actions",
      "org_home.goto_backoffice",
    ];
    
    for (const key of requiredKeys) {
      expect(enData).toHaveProperty(key);
      expect(enData[key]).toBeTruthy();
    }
  });
});

// Test workflow step logic
describe("Organizer Home - Workflow Steps", () => {
  it("should correctly identify completed steps based on data", () => {
    // Simulate workflow check functions
    const checkFunctions = {
      create_meetup: (d: any) => (d?.meetups?.length || 0) > 0,
      invite_attendees: (d: any) => (d?.totalAttendees || 0) > 0,
      assign_flights: (d: any) => (d?.flightAssigned || 0) > 0,
      assign_hotels: (d: any) => (d?.hotelAssigned || 0) > 0,
      setup_transport: (d: any) => (d?.pickupAssigned || 0) > 0,
      manage_onsite: (d: any) => (d?.scheduleCount || 0) > 0,
    };

    // Empty data - nothing completed
    const emptyData = { meetups: [], totalAttendees: 0, flightAssigned: 0, hotelAssigned: 0, pickupAssigned: 0, scheduleCount: 0 };
    expect(checkFunctions.create_meetup(emptyData)).toBe(false);
    expect(checkFunctions.invite_attendees(emptyData)).toBe(false);
    expect(checkFunctions.assign_flights(emptyData)).toBe(false);

    // With meetup created
    const withMeetup = { ...emptyData, meetups: [{ id: 1, title: "Test" }] };
    expect(checkFunctions.create_meetup(withMeetup)).toBe(true);
    expect(checkFunctions.invite_attendees(withMeetup)).toBe(false);

    // With attendees
    const withAttendees = { ...withMeetup, totalAttendees: 5 };
    expect(checkFunctions.invite_attendees(withAttendees)).toBe(true);

    // Full progress
    const fullData = { meetups: [{ id: 1 }], totalAttendees: 10, flightAssigned: 5, hotelAssigned: 5, pickupAssigned: 3, scheduleCount: 2 };
    Object.values(checkFunctions).forEach(fn => {
      expect(fn(fullData)).toBe(true);
    });
  });

  it("should calculate correct progress percentage", () => {
    const steps = 6;
    const checkFunctions = [
      (d: any) => (d?.meetups?.length || 0) > 0,
      (d: any) => (d?.totalAttendees || 0) > 0,
      (d: any) => (d?.flightAssigned || 0) > 0,
      (d: any) => (d?.hotelAssigned || 0) > 0,
      (d: any) => (d?.pickupAssigned || 0) > 0,
      (d: any) => (d?.scheduleCount || 0) > 0,
    ];

    // 0% progress
    const emptyData = { meetups: [], totalAttendees: 0, flightAssigned: 0, hotelAssigned: 0, pickupAssigned: 0, scheduleCount: 0 };
    const emptyCompleted = checkFunctions.filter(fn => fn(emptyData)).length;
    expect(Math.round((emptyCompleted / steps) * 100)).toBe(0);

    // 50% progress (3 of 6)
    const halfData = { meetups: [{ id: 1 }], totalAttendees: 5, flightAssigned: 3, hotelAssigned: 0, pickupAssigned: 0, scheduleCount: 0 };
    const halfCompleted = checkFunctions.filter(fn => fn(halfData)).length;
    expect(Math.round((halfCompleted / steps) * 100)).toBe(50);

    // 100% progress
    const fullData = { meetups: [{ id: 1 }], totalAttendees: 10, flightAssigned: 5, hotelAssigned: 5, pickupAssigned: 3, scheduleCount: 2 };
    const fullCompleted = checkFunctions.filter(fn => fn(fullData)).length;
    expect(Math.round((fullCompleted / steps) * 100)).toBe(100);
  });
});
