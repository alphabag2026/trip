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
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  messengerId: varchar("messengerId", { length: 255 }).notNull(),
  locationType: mysqlEnum("locationType", ["domestic", "overseas"]).default("domestic").notNull(),
  scheduleStart: timestamp("scheduleStart"),
  scheduleEnd: timestamp("scheduleEnd"),
  walletAddress: varchar("walletAddress", { length: 500 }),
  referrerName: varchar("referrerName", { length: 255 }),
  teamName: varchar("teamName", { length: 255 }),
  teamIntro: text("teamIntro"),
  notes: text("notes"),
  roommatePreference: varchar("roommatePreference", { length: 255 }),
  passportImageUrl: varchar("passportImageUrl", { length: 1000 }),
  passportOcrData: json("passportOcrData"),
  category: mysqlEnum("category", ["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup").notNull(),
  customCategory: varchar("customCategory", { length: 255 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
  immigrationAssist: mysqlEnum("immigrationAssist", ["self", "agency", "pending"]).default("pending").notNull(),
  telegramNotified: boolean("telegramNotified").default(false),
  flightConfirmed: boolean("flightConfirmed").default(false),
  accommodationConfirmed: boolean("accommodationConfirmed").default(false),
  pickupConfirmed: boolean("pickupConfirmed").default(false),
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
  requiredItems: json("requiredItems"),
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
  departureFlightNo: varchar("departureFlightNo", { length: 50 }),
  departureAirport: varchar("departureAirport", { length: 255 }),
  departureTime: timestamp("departureTime"),
  arrivalFlightNo: varchar("arrivalFlightNo", { length: 50 }),
  arrivalAirport: varchar("arrivalAirport", { length: 255 }),
  arrivalTime: timestamp("arrivalTime"),
  returnFlightNo: varchar("returnFlightNo", { length: 50 }),
  returnDepartureAirport: varchar("returnDepartureAirport", { length: 255 }),
  returnDepartureTime: timestamp("returnDepartureTime"),
  returnArrivalAirport: varchar("returnArrivalAirport", { length: 255 }),
  returnArrivalTime: timestamp("returnArrivalTime"),
  hotelName: varchar("hotelName", { length: 255 }),
  hotelAddress: text("hotelAddress"),
  hotelCheckIn: timestamp("hotelCheckIn"),
  hotelCheckOut: timestamp("hotelCheckOut"),
  scheduleDetails: json("scheduleDetails"),
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

// ══════════════════════════════════════════════════════════
// v2.0 NEW TABLES
// ══════════════════════════════════════════════════════════

// ── Flight Schedules (항공편 스케줄/지연 정보) ────────────
export const flightSchedules = mysqlTable("flight_schedules", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  registrationId: int("registrationId"),
  flightNo: varchar("flightNo", { length: 50 }).notNull(),
  airline: varchar("airline", { length: 255 }),
  departureAirport: varchar("departureAirport", { length: 100 }),
  arrivalAirport: varchar("arrivalAirport", { length: 100 }),
  scheduledDeparture: timestamp("scheduledDeparture"),
  scheduledArrival: timestamp("scheduledArrival"),
  actualDeparture: timestamp("actualDeparture"),
  actualArrival: timestamp("actualArrival"),
  delayMinutes: int("delayMinutes").default(0),
  flightStatus: mysqlEnum("flightStatus", ["scheduled", "boarding", "departed", "in_air", "landed", "delayed", "cancelled"]).default("scheduled").notNull(),
  direction: mysqlEnum("direction", ["outbound", "return"]).default("outbound").notNull(),
  notifiedDelay: boolean("notifiedDelay").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlightSchedule = typeof flightSchedules.$inferSelect;
export type InsertFlightSchedule = typeof flightSchedules.$inferInsert;

// ── Pickup Assignments (차량별 픽업 배치) ─────────────────
export const pickupAssignments = mysqlTable("pickup_assignments", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  vehicleName: varchar("vehicleName", { length: 255 }).notNull(),
  vehicleCapacity: int("vehicleCapacity").default(4),
  driverName: varchar("driverName", { length: 255 }),
  driverPhone: varchar("driverPhone", { length: 50 }),
  pickupLocation: varchar("pickupLocation", { length: 500 }),
  pickupTime: timestamp("pickupTime"),
  assignedRegistrationIds: json("assignedRegistrationIds"), // [1,2,3]
  pickupPhotoUrl: varchar("pickupPhotoUrl", { length: 1000 }),
  status: mysqlEnum("status", ["pending", "en_route", "waiting", "picked_up", "completed"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PickupAssignment = typeof pickupAssignments.$inferSelect;
export type InsertPickupAssignment = typeof pickupAssignments.$inferInsert;

// ── Accommodation Assignments (숙소 배치) ─────────────────
export const accommodationAssignments = mysqlTable("accommodation_assignments", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  hotelName: varchar("hotelName", { length: 255 }).notNull(),
  roomNumber: varchar("roomNumber", { length: 50 }),
  roomType: mysqlEnum("roomType", ["single", "double", "twin", "suite"]).default("twin").notNull(),
  assignedRegistrationIds: json("assignedRegistrationIds"), // [1,2]
  checkIn: timestamp("checkIn"),
  checkOut: timestamp("checkOut"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccommodationAssignment = typeof accommodationAssignments.$inferSelect;
export type InsertAccommodationAssignment = typeof accommodationAssignments.$inferInsert;

// ── Schedule Events (일정 이벤트 - 10분 전 알림) ──────────
export const scheduleEvents = mysqlTable("schedule_events", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  title: varchar("title", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }),
  eventTime: timestamp("eventTime").notNull(),
  endTime: timestamp("endTime"),
  description: text("description"),
  notifyBefore: int("notifyBefore").default(10), // minutes
  notified: boolean("notified").default(false),
  notifiedAt: timestamp("notifiedAt"),
  eventOrder: int("eventOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleEvent = typeof scheduleEvents.$inferSelect;
export type InsertScheduleEvent = typeof scheduleEvents.$inferInsert;

// ── Pickup Photos (픽업 장소/도착자 사진) ─────────────────
export const pickupPhotos = mysqlTable("pickup_photos", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  pickupAssignmentId: int("pickupAssignmentId"),
  registrationId: int("registrationId"),
  photoUrl: varchar("photoUrl", { length: 1000 }).notNull(),
  photoType: mysqlEnum("photoType", ["pickup_location", "arrival_person", "vehicle", "other"]).default("pickup_location").notNull(),
  uploadedBy: varchar("uploadedBy", { length: 255 }),
  caption: text("caption"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PickupPhoto = typeof pickupPhotos.$inferSelect;
export type InsertPickupPhoto = typeof pickupPhotos.$inferInsert;

// ── Modification Requests (여정표 수정 요청) ──────────────
export const modificationRequests = mysqlTable("modification_requests", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  itineraryId: int("itineraryId"),
  requestType: mysqlEnum("requestType", ["flight_change", "hotel_change", "schedule_change", "other"]).default("other").notNull(),
  description: text("description").notNull(),
  currentValue: text("currentValue"),
  requestedValue: text("requestedValue"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "completed"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  processedBy: int("processedBy"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModificationRequest = typeof modificationRequests.$inferSelect;
export type InsertModificationRequest = typeof modificationRequests.$inferInsert;

// ══════════════════════════════════════════════════════════
// v3.0 NEW TABLES
// ══════════════════════════════════════════════════════════

// ── Communication Channels (소통 채널) ───────────────────
export const communicationChannels = mysqlTable("communication_channels", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  channelType: mysqlEnum("channelType", ["pickup_driver", "manager", "hotel_checkin", "transfer", "general"]).default("general").notNull(),
  channelName: varchar("channelName", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: varchar("assignedTo", { length: 255 }), // 담당자 이름
  assignedPhone: varchar("assignedPhone", { length: 50 }),
  relatedPickupId: int("relatedPickupId"),
  relatedAccommodationId: int("relatedAccommodationId"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommunicationChannel = typeof communicationChannels.$inferSelect;
export type InsertCommunicationChannel = typeof communicationChannels.$inferInsert;

// ── Messages (채널 내 메시지) ────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  channelId: int("channelId").notNull(),
  senderName: varchar("senderName", { length: 255 }).notNull(),
  senderRole: mysqlEnum("senderRole", ["admin", "manager", "driver", "participant", "hotel_staff"]).default("participant").notNull(),
  senderRegistrationId: int("senderRegistrationId"),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["text", "photo", "location", "status_update", "alert"]).default("text").notNull(),
  photoUrl: varchar("photoUrl", { length: 1000 }),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ── Vouchers (항공권/숙소 바우처) ────────────────────────
export const vouchers = mysqlTable("vouchers", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  meetupId: int("meetupId"),
  voucherType: mysqlEnum("voucherType", ["flight", "hotel", "transport", "other"]).default("other").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  fileName: varchar("fileName", { length: 255 }),
  mimeType: varchar("mimeType", { length: 100 }),
  sentToParticipant: boolean("sentToParticipant").default(false),
  sentAt: timestamp("sentAt"),
  sentMethod: mysqlEnum("sentMethod", ["web", "telegram", "email"]).default("web"),
  notes: text("notes"),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Voucher = typeof vouchers.$inferSelect;
export type InsertVoucher = typeof vouchers.$inferInsert;
