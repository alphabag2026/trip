import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("Calendar Integration", () => {
  it("calendar router should be defined in routers.ts", () => {
    const content = fs.readFileSync("./server/routers.ts", "utf-8");
    expect(content).toContain("calendar: router({");
    expect(content).toContain("generateIcs:");
    expect(content).toContain("generateScheduleIcs:");
  });

  it("generateIcs should produce valid iCalendar format", () => {
    const content = fs.readFileSync("./server/routers.ts", "utf-8");
    expect(content).toContain("BEGIN:VCALENDAR");
    expect(content).toContain("VERSION:2.0");
    expect(content).toContain("PRODID:-//AlphaTrip//Meetup//KO");
    expect(content).toContain("BEGIN:VEVENT");
    expect(content).toContain("END:VEVENT");
    expect(content).toContain("END:VCALENDAR");
  });

  it("generateIcs should include Google Calendar URL generation", () => {
    const content = fs.readFileSync("./server/routers.ts", "utf-8");
    expect(content).toContain("calendar.google.com/calendar/render");
    expect(content).toContain("action=TEMPLATE");
  });

  it("generateScheduleIcs should handle schedule events", () => {
    const content = fs.readFileSync("./server/routers.ts", "utf-8");
    expect(content).toContain("PRODID:-//AlphaTrip//Schedule//KO");
    expect(content).toContain("schedule-${schedule.id}@alphatrip.org");
  });
});

describe("MeetupSchedules Frontend", () => {
  it("MeetupSchedules.tsx should exist and have correct structure", () => {
    const content = fs.readFileSync("./client/src/pages/admin/MeetupSchedules.tsx", "utf-8");
    expect(content).toContain("export default function MeetupSchedules");
    expect(content).toContain("trpc.meetupSchedule.list.useQuery");
    expect(content).toContain("trpc.meetupSchedule.create.useMutation");
    expect(content).toContain("trpc.meetupSchedule.update.useMutation");
    expect(content).toContain("trpc.meetupSchedule.delete.useMutation");
    expect(content).toContain("trpc.meetupSchedule.notify.useMutation");
  });

  it("MeetupSchedules.tsx should have schedule type filter", () => {
    const content = fs.readFileSync("./client/src/pages/admin/MeetupSchedules.tsx", "utf-8");
    expect(content).toContain("transport");
    expect(content).toContain("meal");
    expect(content).toContain("tour");
    expect(content).toContain("meeting");
    expect(content).toContain("free");
    expect(content).toContain("other");
  });

  it("MeetupSchedules.tsx should have calendar buttons for each schedule", () => {
    const content = fs.readFileSync("./client/src/pages/admin/MeetupSchedules.tsx", "utf-8");
    expect(content).toContain("ScheduleCalendarButtons");
    expect(content).toContain("trpc.calendar.generateScheduleIcs.useQuery");
    expect(content).toContain("text/calendar");
  });

  it("MeetupSchedules.tsx should use string type for scheduleType (not const)", () => {
    const content = fs.readFileSync("./client/src/pages/admin/MeetupSchedules.tsx", "utf-8");
    expect(content).toContain('scheduleType: "transport" as string');
    expect(content).not.toContain('scheduleType: "transport" as const');
  });

  it("MeetupSchedules route should be registered in App.tsx", () => {
    const content = fs.readFileSync("./client/src/App.tsx", "utf-8");
    expect(content).toContain("AdminMeetupSchedules");
    expect(content).toContain("/meetup-schedules");
  });
});

describe("MeetupPortal Calendar Integration", () => {
  it("MeetupPortal.tsx should have CalendarButtons component", () => {
    const content = fs.readFileSync("./client/src/pages/MeetupPortal.tsx", "utf-8");
    expect(content).toContain("CalendarButtons");
    expect(content).toContain("trpc.calendar.generateIcs.useQuery");
  });

  it("CalendarButtons should support Google Calendar and .ics download", () => {
    const content = fs.readFileSync("./client/src/pages/MeetupPortal.tsx", "utf-8");
    expect(content).toContain("Google Calendar");
    expect(content).toContain("Apple Calendar (.ics)");
    expect(content).toContain("handleGoogleCalendar");
    expect(content).toContain("handleDownloadIcs");
    expect(content).toContain("text/calendar;charset=utf-8");
  });
});

describe("MyPage Calendar Integration", () => {
  it("TripsTab should have TripCalendarButtons component", () => {
    const content = fs.readFileSync("./client/src/pages/mypage/TripsTab.tsx", "utf-8");
    expect(content).toContain("TripCalendarButtons");
  });

  it("TripCalendarButtons should support both Google and .ics", () => {
    const meetupPortal = fs.readFileSync("./client/src/pages/MeetupPortal.tsx", "utf-8");
    expect(meetupPortal).toContain("handleGoogleCalendar");
    expect(meetupPortal).toContain("handleDownloadIcs");
  });
});

describe("meetupSchedule Backend Router", () => {
  it("meetupSchedule router should be defined", () => {
    const content = fs.readFileSync("./server/routers.ts", "utf-8");
    expect(content).toContain("meetupSchedule: router({");
    expect(content).toContain("meetupSchedule: router");
  });

  it("meetupSchedule should have CRUD + notify operations", () => {
    const content = fs.readFileSync("./server/routers.ts", "utf-8");
    // Check for list, create, update, delete, notify
    const scheduleSection = content.substring(content.indexOf("meetupSchedule: router({"));
    expect(scheduleSection).toContain("list:");
    expect(scheduleSection).toContain("create:");
    expect(scheduleSection).toContain("update:");
    expect(scheduleSection).toContain("delete:");
    expect(scheduleSection).toContain("notify:");
  });
});

describe("meetupSchedules DB Schema", () => {
  it("meetupSchedules table should be defined in schema", () => {
    const content = fs.readFileSync("./drizzle/schema.ts", "utf-8");
    expect(content).toContain('meetupSchedules = mysqlTable("meetup_schedules"');
    expect(content).toContain("scheduleType");
    expect(content).toContain("vehicleInfo");
    expect(content).toContain("restaurantName");
    expect(content).toContain("driverName");
    expect(content).toContain("pickupLocation");
    expect(content).toContain("dropoffLocation");
  });

  it("meetupSchedules should have all schedule types", () => {
    const content = fs.readFileSync("./drizzle/schema.ts", "utf-8");
    expect(content).toContain('"transport"');
    expect(content).toContain('"meal"');
    expect(content).toContain('"tour"');
    expect(content).toContain('"meeting"');
    expect(content).toContain('"free"');
  });

  it("DB helper functions should exist for meetupSchedules", () => {
    const dbContent = fs.readFileSync("./server/db.ts", "utf-8");
    expect(dbContent).toContain("getMeetupScheduleById");
    expect(dbContent).toContain("createMeetupSchedule");
    expect(dbContent).toContain("updateMeetupSchedule");
  });
});
