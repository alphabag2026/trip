import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Meetups (밋업/이벤트 정보) ──────────────────────────
export const meetups = mysqlTable("meetups", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup").notNull(),
  locationType: mysqlEnum("locationType", ["domestic", "overseas"]).default("domestic").notNull(),
  destinationCountry: varchar("destinationCountry", { length: 100 }),
  location: varchar("location", { length: 500 }),
  scheduleStart: timestamp("scheduleStart"),
  scheduleEnd: timestamp("scheduleEnd"),
  description: text("description"),
  maxParticipants: int("maxParticipants"),
  status: mysqlEnum("status", ["draft", "open", "closed", "completed"]).default("open").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Meetup = typeof meetups.$inferSelect;
export type InsertMeetup = typeof meetups.$inferInsert;

// ── Registrations (참가 신청) ───────────────────────────
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  // 필수 입력
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  messengerId: varchar("messengerId", { length: 255 }).notNull(),
  locationType: mysqlEnum("locationType", ["domestic", "overseas"]).default("domestic").notNull(),
  scheduleStart: timestamp("scheduleStart"),
  scheduleEnd: timestamp("scheduleEnd"),
  // 선택 입력
  walletAddress: varchar("walletAddress", { length: 500 }),
  referrerName: varchar("referrerName", { length: 255 }),
  teamName: varchar("teamName", { length: 255 }),
  teamIntro: text("teamIntro"),
  notes: text("notes"),
  roommatePreference: varchar("roommatePreference", { length: 255 }),
  // 여권
  passportImageUrl: varchar("passportImageUrl", { length: 1000 }),
  passportOcrData: json("passportOcrData"),
  // 분류
  category: mysqlEnum("category", ["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup").notNull(),
  customCategory: varchar("customCategory", { length: 255 }),
  // 상태
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
  // 출입국 대행
  immigrationAssist: mysqlEnum("immigrationAssist", ["self", "agency", "pending"]).default("pending").notNull(),
  // 텔레그램 알림 전송 여부
  telegramNotified: boolean("telegramNotified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

// ── Travel Info (국가별 여행 정보) ──────────────────────
export const travelInfo = mysqlTable("travel_info", {
  id: int("id").autoincrement().primaryKey(),
  countryCode: varchar("countryCode", { length: 10 }).notNull().unique(),
  countryName: varchar("countryName", { length: 100 }).notNull(),
  countryNameKo: varchar("countryNameKo", { length: 100 }),
  requiredItems: json("requiredItems"), // ["여권","비자","어댑터"...]
  immigrationUrl: varchar("immigrationUrl", { length: 1000 }),
  immigrationNotes: text("immigrationNotes"),
  visaRequired: boolean("visaRequired").default(false),
  visaNotes: text("visaNotes"),
  emergencyContact: text("emergencyContact"),
  timezone: varchar("timezone", { length: 100 }),
  currency: varchar("currency", { length: 50 }),
  language: varchar("language", { length: 100 }),
  plugType: varchar("plugType", { length: 100 }),
  additionalNotes: text("additionalNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TravelInfo = typeof travelInfo.$inferSelect;
export type InsertTravelInfo = typeof travelInfo.$inferInsert;

// ── Itineraries (여정표/항공권 정보) ────────────────────
export const itineraries = mysqlTable("itineraries", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  // 항공편 정보
  departureFlightNo: varchar("departureFlightNo", { length: 50 }),
  departureAirport: varchar("departureAirport", { length: 255 }),
  departureTime: timestamp("departureTime"),
  arrivalFlightNo: varchar("arrivalFlightNo", { length: 50 }),
  arrivalAirport: varchar("arrivalAirport", { length: 255 }),
  arrivalTime: timestamp("arrivalTime"),
  // 귀국편 정보
  returnFlightNo: varchar("returnFlightNo", { length: 50 }),
  returnDepartureAirport: varchar("returnDepartureAirport", { length: 255 }),
  returnDepartureTime: timestamp("returnDepartureTime"),
  returnArrivalAirport: varchar("returnArrivalAirport", { length: 255 }),
  returnArrivalTime: timestamp("returnArrivalTime"),
  // 숙소 정보
  hotelName: varchar("hotelName", { length: 255 }),
  hotelAddress: text("hotelAddress"),
  hotelCheckIn: timestamp("hotelCheckIn"),
  hotelCheckOut: timestamp("hotelCheckOut"),
  // 일정 상세
  scheduleDetails: json("scheduleDetails"), // [{day:1, items:[{time:"09:00", activity:"미팅"}]}]
  // 발송 상태
  sentViaWeb: boolean("sentViaWeb").default(false),
  sentViaMessenger: boolean("sentViaMessenger").default(false),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Itinerary = typeof itineraries.$inferSelect;
export type InsertItinerary = typeof itineraries.$inferInsert;

// ── Telegram Config (텔레그램 설정) ─────────────────────
export const telegramConfig = mysqlTable("telegram_config", {
  id: int("id").autoincrement().primaryKey(),
  botToken: varchar("botToken", { length: 500 }),
  chatId: varchar("chatId", { length: 100 }),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramConfig = typeof telegramConfig.$inferSelect;
export type InsertTelegramConfig = typeof telegramConfig.$inferInsert;
