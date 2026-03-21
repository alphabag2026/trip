import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "superadmin", "organizer", "agency", "partner"]).default("user").notNull(),
  organizationId: int("organizationId"),
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
  baggageNotice: text("baggageNotice").default("초과화물은 직접부담할 수 있습니다."),
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
  checkedBagRequest: boolean("checkedBagRequest").default(false),
  checkedBagCount: int("checkedBagCount").default(0),
  checkedBagWeight: varchar("checkedBagWeight", { length: 50 }),
  checkedBagNotes: text("checkedBagNotes"),
  preferredDepartureTime: varchar("preferredDepartureTime", { length: 50 }),
  mealPreference: varchar("mealPreference", { length: 100 }),
  allergies: text("allergies"),
  drinkAlcohol: mysqlEnum("drinkAlcohol", ["yes", "no", "sometimes"]),
  smoking: mysqlEnum("smoking", ["yes", "no"]),
  transportType: mysqlEnum("transportType", ["flight", "ktx", "none", "other"]),
  transportNotes: text("transportNotes"),
  hotelRoomNumber: varchar("hotelRoomNumber", { length: 50 }),
  hotelFloor: varchar("hotelFloor", { length: 20 }),
  hotelNotes: text("hotelNotes"),
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

// ══════════════════════════════════════════════════════════
// v3.3 NEW TABLES
// ══════════════════════════════════════════════════════════

// ── Surveys (설문조사) ──────────────────────────────────────
export const surveys = mysqlTable("surveys", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  questions: json("questions").notNull(), // [{id, text, type: 'rating'|'text'|'choice', options?: string[]}]
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  sentViaTelegram: boolean("sentViaTelegram").default(false),
  sentAt: timestamp("sentAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = typeof surveys.$inferInsert;

// ── Survey Responses (설문 응답) ────────────────────────────
export const surveyResponses = mysqlTable("survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("surveyId").notNull(),
  registrationId: int("registrationId"),
  respondentName: varchar("respondentName", { length: 255 }),
  respondentPhone: varchar("respondentPhone", { length: 50 }),
  answers: json("answers").notNull(), // [{questionId, value}]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;

// ── Broadcast Messages (단체 메시지) ────────────────────────
export const broadcastMessages = mysqlTable("broadcast_messages", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"), // null = 전체
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  targetType: mysqlEnum("targetType", ["all", "meetup", "approved_only"]).default("all").notNull(),
  sentViaTelegram: boolean("sentViaTelegram").default(false),
  sentViaWeb: boolean("sentViaWeb").default(false),
  recipientCount: int("recipientCount").default(0),
  sentBy: int("sentBy"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BroadcastMessage = typeof broadcastMessages.$inferSelect;
export type InsertBroadcastMessage = typeof broadcastMessages.$inferInsert;

// ══════════════════════════════════════════════════════════
// v3.6 NEW TABLES
// ══════════════════════════════════════════════════════════

// ── Baggage Tracking (수화물 추적) ──────────────────────────
export const baggageTracking = mysqlTable("baggage_tracking", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  meetupId: int("meetupId"),
  flightScheduleId: int("flightScheduleId"),
  tagNumber: varchar("tagNumber", { length: 100 }),
  tagPhotoUrl: varchar("tagPhotoUrl", { length: 1000 }),
  ocrResult: json("ocrResult"), // OCR 인식 결과
  baggageStatus: mysqlEnum("baggageStatus", ["checked_in", "loaded", "in_transit", "arrived", "claimed", "delayed", "lost"]).default("checked_in").notNull(),
  baggageType: varchar("baggageType", { length: 100 }), // 일반/골프백/특수
  weight: varchar("weight", { length: 50 }),
  description: text("description"),
  statusUpdatedAt: timestamp("statusUpdatedAt"),
  claimedAt: timestamp("claimedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BaggageTracking = typeof baggageTracking.$inferSelect;
export type InsertBaggageTracking = typeof baggageTracking.$inferInsert;

// ── Checkin Info (체크인 정보) ──────────────────────────────
export const checkinInfo = mysqlTable("checkin_info", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  meetupId: int("meetupId"),
  flightScheduleId: int("flightScheduleId"),
  airline: varchar("airline", { length: 255 }),
  flightNo: varchar("flightNo", { length: 50 }),
  checkinCounter: varchar("checkinCounter", { length: 100 }),
  gateNumber: varchar("gateNumber", { length: 50 }),
  seatNumber: varchar("seatNumber", { length: 20 }),
  boardingTime: timestamp("boardingTime"),
  checkinStatus: mysqlEnum("checkinStatus", ["not_checked_in", "online_checkin", "counter_checkin", "boarding_pass_issued", "boarded"]).default("not_checked_in").notNull(),
  boardingPassUrl: varchar("boardingPassUrl", { length: 1000 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CheckinInfo = typeof checkinInfo.$inferSelect;
export type InsertCheckinInfo = typeof checkinInfo.$inferInsert;

// ── AI Chatbot Logs (AI 챗봇 대화 로그) ─────────────────────
export const chatbotLogs = mysqlTable("chatbot_logs", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId"),
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  userMessage: text("userMessage").notNull(),
  botResponse: text("botResponse").notNull(),
  context: varchar("context", { length: 255 }), // meetup context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatbotLog = typeof chatbotLogs.$inferSelect;
export type InsertChatbotLog = typeof chatbotLogs.$inferInsert;

// ══════════════════════════════════════════════════════════
// v4.0 NEW TABLES - 멀티테넌트 클라우드 플랫폼
// ══════════════════════════════════════════════════════════

// ── Organizations (조직/업체) ──────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["platform", "organizer", "agency", "partner"]).default("organizer").notNull(),
  region: varchar("region", { length: 255 }), // 지역 (예: 서울, 방콕, 싱가포르)
  country: varchar("country", { length: 100 }),
  contactName: varchar("contactName", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  address: text("address"),
  description: text("description"),
  logoUrl: varchar("logoUrl", { length: 1000 }),
  website: varchar("website", { length: 500 }),
  telegramChatId: varchar("telegramChatId", { length: 100 }),
  isActive: boolean("isActive").default(true),
  parentOrgId: int("parentOrgId"), // 상위 조직 (에이전시 → 플랫폼)
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ── Partner Categories (파트너 카테고리) ──────────────────────
export const partnerCategories = mysqlTable("partner_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 식당, 클럽, 마사지, 여행, 크루즈, 차량, 통역 등
  nameKo: varchar("nameKo", { length: 100 }),
  icon: varchar("icon", { length: 50 }), // 아이콘 이름
  description: text("description"),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerCategory = typeof partnerCategories.$inferSelect;
export type InsertPartnerCategory = typeof partnerCategories.$inferInsert;

// ── Partners (파트너 업체) ──────────────────────────────────
export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"), // 소속 에이전시/조직
  categoryId: int("categoryId"), // 파트너 카테고리
  name: varchar("name", { length: 255 }).notNull(),
  region: varchar("region", { length: 255 }),
  country: varchar("country", { length: 100 }),
  address: text("address"),
  contactName: varchar("contactName", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  logoUrl: varchar("logoUrl", { length: 1000 }),
  capacity: int("capacity"), // 수용 인원 (식당/클럽 등)
  priceRange: varchar("priceRange", { length: 100 }), // 가격대
  operatingHours: varchar("operatingHours", { length: 255 }),
  languages: varchar("languages", { length: 500 }), // 지원 언어 (통역 등)
  rating: int("rating").default(0), // 평점 (1~5)
  isActive: boolean("isActive").default(true),
  managedBy: int("managedBy"), // 관리 담당자 (에이전시 매니저)
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

// ── Organization Members (조직-사용자 매핑) ──────────────────
export const organizationMembers = mysqlTable("organization_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  memberRole: mysqlEnum("memberRole", ["owner", "manager", "staff", "viewer"]).default("staff").notNull(),
  isActive: boolean("isActive").default(true),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

// ── Meetup Partners (밋업-파트너 연결) ──────────────────────
export const meetupPartners = mysqlTable("meetup_partners", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  partnerId: int("partnerId").notNull(),
  serviceType: varchar("serviceType", { length: 255 }), // 제공 서비스 유형
  serviceDate: timestamp("serviceDate"),
  serviceNotes: text("serviceNotes"),
  cost: varchar("cost", { length: 100 }),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetupPartner = typeof meetupPartners.$inferSelect;
export type InsertMeetupPartner = typeof meetupPartners.$inferInsert;

// ══════════════════════════════════════════════════════════
// v4.2 NEW TABLES - 회원 프로필 & 여권 & 출장이력
// ══════════════════════════════════════════════════════════

// ── User Profiles (상세 프로필 정보) ──────────────────────────
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  nationality: varchar("nationality", { length: 100 }),
  birthDate: varchar("birthDate", { length: 20 }), // YYYY-MM-DD
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  organization: varchar("organization", { length: 255 }), // 소속 회사/팀
  position: varchar("position", { length: 255 }), // 직책
  department: varchar("department", { length: 255 }), // 부서
  bio: text("bio"), // 자기소개
  emergencyContact: varchar("emergencyContact", { length: 255 }), // 비상연락처
  emergencyPhone: varchar("emergencyPhone", { length: 50 }),
  dietaryRestrictions: varchar("dietaryRestrictions", { length: 500 }), // 식이제한
  allergies: text("allergies"), // 알레르기
  medicalNotes: text("medicalNotes"), // 건강 특이사항
  preferredLanguage: varchar("preferredLanguage", { length: 50 }).default("ko"),
  telegramId: varchar("telegramId", { length: 255 }),
  onboardingCompleted: boolean("onboardingCompleted").default(false),
  profileImageUrl: varchar("profileImageUrl", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ── Passport Info (여권 정보 - 1회 등록) ──────────────────────
export const passportInfo = mysqlTable("passport_info", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  passportNumber: varchar("passportNumber", { length: 50 }),
  issuingCountry: varchar("issuingCountry", { length: 100 }),
  nationality: varchar("nationality", { length: 100 }),
  fullName: varchar("fullName", { length: 255 }), // 여권상 영문 이름
  birthDate: varchar("birthDate", { length: 20 }),
  gender: mysqlEnum("gender", ["M", "F"]),
  issueDate: varchar("issueDate", { length: 20 }),
  expiryDate: varchar("expiryDate", { length: 20 }),
  passportImageUrl: varchar("passportImageUrl", { length: 1000 }),
  passportImageKey: varchar("passportImageKey", { length: 500 }),
  ocrData: json("ocrData"), // OCR 인식 결과 전체
  isVerified: boolean("isVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PassportInfo = typeof passportInfo.$inferSelect;
export type InsertPassportInfo = typeof passportInfo.$inferInsert;

// ── Invitations (조직 멤버 초대) ──────────────────────────
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  invitedBy: int("invitedBy").notNull(), // 초대한 사용자 ID
  email: varchar("email", { length: 320 }), // 이메일 초대
  inviteToken: varchar("inviteToken", { length: 100 }).notNull().unique(), // 초대 링크 토큰
  memberRole: mysqlEnum("memberRole", ["owner", "manager", "staff", "viewer"]).default("staff").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"]).default("pending").notNull(),
  message: text("message"), // 초대 메시지
  acceptedBy: int("acceptedBy"), // 수락한 사용자 ID
  acceptedAt: timestamp("acceptedAt"),
  expiresAt: timestamp("expiresAt").notNull(), // 만료 시간
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// ══════════════════════════════════════════════════════════
// v4.5 - 호텔 바우처 & 항공권 티켓
// ══════════════════════════════════════════════════════════

// ── Hotel Vouchers (호텔 예약확인서/바우처) ──────────────────
export const hotelVouchers = mysqlTable("hotel_vouchers", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  registrationId: int("registrationId"),
  userId: int("userId"), // 배정된 사용자 ID
  // 호텔 기본 정보
  hotelName: varchar("hotelName", { length: 255 }).notNull(),
  hotelNameLocal: varchar("hotelNameLocal", { length: 255 }), // 현지어 호텔명
  hotelAddress: text("hotelAddress").notNull(),
  hotelAddressLocal: text("hotelAddressLocal"), // 현지어 주소
  hotelPhone: varchar("hotelPhone", { length: 100 }),
  hotelLatitude: varchar("hotelLatitude", { length: 50 }),
  hotelLongitude: varchar("hotelLongitude", { length: 50 }),
  // 예약 정보
  bookingId: varchar("bookingId", { length: 100 }),
  guestName: varchar("guestName", { length: 255 }),
  roomType: varchar("roomType", { length: 100 }),
  roomCount: int("roomCount").default(1),
  guestsPerRoom: int("guestsPerRoom").default(1),
  checkInDate: varchar("checkInDate", { length: 20 }),
  checkInTime: varchar("checkInTime", { length: 10 }),
  checkOutDate: varchar("checkOutDate", { length: 20 }),
  checkOutTime: varchar("checkOutTime", { length: 10 }),
  includeMeals: boolean("includeMeals").default(false),
  specialRequests: text("specialRequests"),
  includes: text("includes"), // 포함 사항 (WiFi 등)
  cancellationPolicy: text("cancellationPolicy"),
  checkInInstructions: text("checkInInstructions"),
  // 파일 (이미지/PDF)
  voucherFileUrl: varchar("voucherFileUrl", { length: 1000 }),
  voucherFileKey: varchar("voucherFileKey", { length: 500 }),
  voucherFileType: mysqlEnum("voucherFileType", ["image", "pdf"]).default("image"),
  // 현지어 정보
  localLanguage: varchar("localLanguage", { length: 50 }), // 예: vi, th, ja
  localCurrency: varchar("localCurrency", { length: 20 }),
  status: mysqlEnum("status", ["active", "cancelled", "expired"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HotelVoucher = typeof hotelVouchers.$inferSelect;
export type InsertHotelVoucher = typeof hotelVouchers.$inferInsert;

// ── Flight Tickets (왕복 항공권 티켓) ────────────────────────
export const flightTickets = mysqlTable("flight_tickets", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  registrationId: int("registrationId"),
  userId: int("userId"), // 배정된 사용자 ID
  // 승객 정보
  passengerName: varchar("passengerName", { length: 255 }).notNull(),
  passportNumber: varchar("passportNumber", { length: 50 }),
  nationality: varchar("nationality", { length: 100 }),
  // 출발편
  outboundAirline: varchar("outboundAirline", { length: 255 }),
  outboundFlightNo: varchar("outboundFlightNo", { length: 50 }),
  outboundDepartureAirport: varchar("outboundDepartureAirport", { length: 255 }),
  outboundDepartureCode: varchar("outboundDepartureCode", { length: 10 }),
  outboundArrivalAirport: varchar("outboundArrivalAirport", { length: 255 }),
  outboundArrivalCode: varchar("outboundArrivalCode", { length: 10 }),
  outboundDepartureDate: varchar("outboundDepartureDate", { length: 20 }),
  outboundDepartureTime: varchar("outboundDepartureTime", { length: 10 }),
  outboundArrivalDate: varchar("outboundArrivalDate", { length: 20 }),
  outboundArrivalTime: varchar("outboundArrivalTime", { length: 10 }),
  outboundSeatClass: varchar("outboundSeatClass", { length: 50 }),
  outboundSeatNumber: varchar("outboundSeatNumber", { length: 20 }),
  // 귀국편
  returnAirline: varchar("returnAirline", { length: 255 }),
  returnFlightNo: varchar("returnFlightNo", { length: 50 }),
  returnDepartureAirport: varchar("returnDepartureAirport", { length: 255 }),
  returnDepartureCode: varchar("returnDepartureCode", { length: 10 }),
  returnArrivalAirport: varchar("returnArrivalAirport", { length: 255 }),
  returnArrivalCode: varchar("returnArrivalCode", { length: 10 }),
  returnDepartureDate: varchar("returnDepartureDate", { length: 20 }),
  returnDepartureTime: varchar("returnDepartureTime", { length: 10 }),
  returnArrivalDate: varchar("returnArrivalDate", { length: 20 }),
  returnArrivalTime: varchar("returnArrivalTime", { length: 10 }),
  returnSeatClass: varchar("returnSeatClass", { length: 50 }),
  returnSeatNumber: varchar("returnSeatNumber", { length: 20 }),
  // 예약 정보
  bookingReference: varchar("bookingReference", { length: 50 }),
  ticketNumber: varchar("ticketNumber", { length: 50 }),
  // 파일 (업로드된 실제 티켓 or 생성된 티켓)
  ticketFileUrl: varchar("ticketFileUrl", { length: 1000 }),
  ticketFileKey: varchar("ticketFileKey", { length: 500 }),
  ticketFileType: mysqlEnum("ticketFileType", ["image", "pdf", "generated"]).default("generated"),
  isGenerated: boolean("isGenerated").default(false), // 백오피스에서 생성된 임의 티켓 여부
  status: mysqlEnum("status", ["active", "cancelled", "used"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlightTicket = typeof flightTickets.$inferSelect;
export type InsertFlightTicket = typeof flightTickets.$inferInsert;

// ══════════════════════════════════════════════════════════
// v5.0 - 항공권/호텔 어필리에이트 통합 예약 시스템
// ══════════════════════════════════════════════════════════

// ── Booking Searches (검색 기록) ──────────────────────────────
export const bookingSearches = mysqlTable("booking_searches", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  userId: int("userId"), // 검색한 사용자
  searchType: mysqlEnum("searchType", ["flight", "hotel", "tour", "transfer"]).default("flight").notNull(),
  // 항공편 검색 파라미터
  originCode: varchar("originCode", { length: 10 }), // 출발 공항 코드
  originCity: varchar("originCity", { length: 255 }),
  destinationCode: varchar("destinationCode", { length: 10 }), // 도착 공항 코드
  destinationCity: varchar("destinationCity", { length: 255 }),
  departureDate: varchar("departureDate", { length: 20 }),
  returnDate: varchar("returnDate", { length: 20 }),
  passengers: int("passengers").default(1),
  cabinClass: mysqlEnum("cabinClass", ["economy", "premium_economy", "business", "first"]).default("economy"),
  // 호텔 검색 파라미터
  hotelCity: varchar("hotelCity", { length: 255 }),
  hotelCheckIn: varchar("hotelCheckIn", { length: 20 }),
  hotelCheckOut: varchar("hotelCheckOut", { length: 20 }),
  rooms: int("rooms").default(1),
  guests: int("guests").default(2),
  // 검색 결과 요약
  resultCount: int("resultCount").default(0),
  lowestPrice: varchar("lowestPrice", { length: 50 }),
  lowestPricePlatform: varchar("lowestPricePlatform", { length: 50 }),
  searchResults: json("searchResults"), // 플랫폼별 검색 결과 캐시
  // 메타
  source: mysqlEnum("source", ["backoffice", "mypage", "telegram"]).default("backoffice"),
  sentToAttendees: boolean("sentToAttendees").default(false),
  sentAt: timestamp("sentAt"),
  sentCount: int("sentCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BookingSearch = typeof bookingSearches.$inferSelect;
export type InsertBookingSearch = typeof bookingSearches.$inferInsert;

// ── Booking Links (어필리에이트 예약 링크) ──────────────────────
export const bookingLinks = mysqlTable("booking_links", {
  id: int("id").autoincrement().primaryKey(),
  searchId: int("searchId"), // 관련 검색 ID
  meetupId: int("meetupId"),
  userId: int("userId"), // 클릭한 사용자
  platform: mysqlEnum("platform", ["trip_com", "booking_com", "agoda", "skyscanner", "klook", "travelpayouts"]).notNull(),
  linkType: mysqlEnum("linkType", ["flight", "hotel", "tour", "transfer"]).default("flight").notNull(),
  // 링크 정보
  affiliateUrl: text("affiliateUrl").notNull(), // 어필리에이트 링크 URL
  originalUrl: text("originalUrl"), // 원본 URL
  affiliateId: varchar("affiliateId", { length: 255 }), // 어필리에이트 ID
  // 상품 정보
  productName: varchar("productName", { length: 500 }),
  price: varchar("price", { length: 50 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  // 추적
  clickCount: int("clickCount").default(0),
  lastClickedAt: timestamp("lastClickedAt"),
  converted: boolean("converted").default(false), // 실제 예약 전환 여부
  conversionAmount: varchar("conversionAmount", { length: 50 }),
  commissionAmount: varchar("commissionAmount", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookingLink = typeof bookingLinks.$inferSelect;
export type InsertBookingLink = typeof bookingLinks.$inferInsert;

// ── Affiliate Revenue (어필리에이트 수익 트래킹) ──────────────────
export const affiliateRevenue = mysqlTable("affiliate_revenue", {
  id: int("id").autoincrement().primaryKey(),
  bookingLinkId: int("bookingLinkId"),
  meetupId: int("meetupId"),
  platform: mysqlEnum("platform", ["trip_com", "booking_com", "agoda", "skyscanner", "klook", "travelpayouts"]).notNull(),
  revenueType: mysqlEnum("revenueType", ["flight", "hotel", "tour", "transfer"]).default("flight").notNull(),
  // 수익 정보
  bookingAmount: varchar("bookingAmount", { length: 50 }), // 예약 금액
  commissionRate: varchar("commissionRate", { length: 20 }), // 커미션 비율
  commissionAmount: varchar("commissionAmount", { length: 50 }).notNull(), // 커미션 금액
  currency: varchar("currency", { length: 10 }).default("USD"),
  // 상태
  status: mysqlEnum("status", ["pending", "confirmed", "paid", "cancelled"]).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  // 참조
  externalBookingId: varchar("externalBookingId", { length: 255 }), // 외부 예약 ID
  notes: text("notes"),
  revenueMonth: varchar("revenueMonth", { length: 7 }), // YYYY-MM
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateRevenue = typeof affiliateRevenue.$inferSelect;
export type InsertAffiliateRevenue = typeof affiliateRevenue.$inferInsert;

// ── Affiliate Settings (어필리에이트 설정) ──────────────────────
export const affiliateSettings = mysqlTable("affiliate_settings", {
  id: int("id").autoincrement().primaryKey(),
  platform: mysqlEnum("platform", ["trip_com", "booking_com", "agoda", "skyscanner", "klook", "travelpayouts"]).notNull().unique(),
  affiliateId: varchar("affiliateId", { length: 255 }), // 어필리에이트 ID
  apiKey: varchar("apiKey", { length: 500 }), // API 키
  apiSecret: varchar("apiSecret", { length: 500 }),
  marker: varchar("marker", { length: 255 }), // Travelpayouts marker
  isActive: boolean("isActive").default(false),
  commissionRateFlight: varchar("commissionRateFlight", { length: 20 }),
  commissionRateHotel: varchar("commissionRateHotel", { length: 20 }),
  commissionRateTour: varchar("commissionRateTour", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AffiliateSetting = typeof affiliateSettings.$inferSelect;
export type InsertAffiliateSetting = typeof affiliateSettings.$inferInsert;
