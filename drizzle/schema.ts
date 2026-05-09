import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal } from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "superadmin", "organizer", "agency", "partner", "driver", "interpreter"]).default("user").notNull(),
  organizationId: int("organizationId"),
  totpSecret: varchar("totpSecret", { length: 255 }),
  totpEnabled: boolean("totpEnabled").default(false).notNull(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
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
  status: mysqlEnum("status", ["draft", "open", "closed", "completed", "cancelled"]).default("open").notNull(),
  baggageNotice: text("baggageNotice").default("초과화물은 직접부담할 수 있습니다."),
  projectCode: varchar("projectCode", { length: 50 }),
  shareToken: varchar("shareToken", { length: 100 }),
  invitedCountries: json("invitedCountries"),
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
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 1000 }),
  nationality: varchar("nationality", { length: 100 }),
  region: varchar("region", { length: 100 }),
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
  email: varchar("email", { length: 320 }),
  userId: int("userId"),
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
  allowedTelegramIds: text("allowedTelegramIds"), // JSON array of allowed admin telegram IDs
  webhookUrl: varchar("webhookUrl", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ── Telegram Notifications (텔레그램 실시간 알림) ────────────
export const telegramNotifications = mysqlTable("telegram_notifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info/success/warning/error
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  sourceUploadId: int("sourceUploadId"),
  isRead: boolean("isRead").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TelegramNotification = typeof telegramNotifications.$inferSelect;
export type InsertTelegramNotification = typeof telegramNotifications.$inferInsert;

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
  vehiclePhotoUrl: varchar("vehiclePhotoUrl", { length: 1000 }),
  vehiclePlateNumber: varchar("vehiclePlateNumber", { length: 100 }),
  vehicleColor: varchar("vehicleColor", { length: 50 }),
  vehicleType: varchar("vehicleType", { length: 100 }),
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
  accommodationType: mysqlEnum("accommodationType", ["hotel", "villa", "apartment", "resort", "pension", "other"]).default("hotel").notNull(),
  hotelName: varchar("hotelName", { length: 255 }).notNull(),
  roomNumber: varchar("roomNumber", { length: 50 }),
  roomType: mysqlEnum("roomType", ["single", "double", "twin", "suite", "family", "dormitory"]).default("twin").notNull(),
  assignedRegistrationIds: json("assignedRegistrationIds"), // [1,2]
  checkIn: timestamp("checkIn"),
  checkOut: timestamp("checkOut"),
  accommodationPhotoUrl: varchar("accommodationPhotoUrl", { length: 1000 }),
  floorNumber: varchar("floorNumber", { length: 20 }),
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

// ── API Keys (외부 REST API 인증) ──────────────────────────
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // 키 이름 (예: "Trip.com Integration")
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(), // SHA-256 해시된 API 키
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(), // 키 앞 8자리 (식별용)
  organizationId: int("organizationId"), // 연결된 조직 (null이면 전체 접근)
  userId: int("userId").notNull(), // 키 생성자
  permissions: text("permissions"), // JSON: ["registrations:read", "meetups:read", "bookings:read"]
  rateLimit: int("rateLimit").default(1000), // 시간당 요청 제한
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ── API Request Logs (API 요청 로그) ──────────────────────
export const apiRequestLogs = mysqlTable("api_request_logs", {
  id: int("id").autoincrement().primaryKey(),
  apiKeyId: int("apiKeyId").notNull(),
  method: varchar("method", { length: 10 }).notNull(),
  endpoint: varchar("endpoint", { length: 500 }).notNull(),
  statusCode: int("statusCode"),
  responseTimeMs: int("responseTimeMs"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ApiRequestLog = typeof apiRequestLogs.$inferSelect;
export type InsertApiRequestLog = typeof apiRequestLogs.$inferInsert;

// ══════════════════════════════════════════════════════════
// v5.2 - 텔레그램 자동 업로드 + 커뮤니티 채팅방
// ══════════════════════════════════════════════════════════

// ── Telegram Uploads (텔레그램 여행정보 자동 업로드) ──────────────
export const telegramUploads = mysqlTable("telegram_uploads", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  uploadedBy: varchar("uploadedBy", { length: 255 }), // 텔레그램 사용자명
  telegramMessageId: varchar("telegramMessageId", { length: 100 }),
  telegramChatId: varchar("telegramChatId", { length: 100 }),
  // 원본 데이터
  rawText: text("rawText"), // 텔레그램에서 받은 원본 텍스트
  rawFileUrl: varchar("rawFileUrl", { length: 1000 }), // 첨부 파일 URL
  rawFileType: mysqlEnum("rawFileType", ["text", "image", "document", "photo"]).default("text"),
  // LLM 파싱 결과
  parsedType: mysqlEnum("parsedType", ["flight", "hotel", "schedule", "transfer", "general", "unknown"]).default("unknown"),
  parsedData: json("parsedData"), // LLM이 추출한 구조화된 데이터
  parsedConfidence: int("parsedConfidence").default(0), // 파싱 신뢰도 (0-100)
  parsedSummary: text("parsedSummary"), // 파싱 결과 요약
  // 처리 상태
  status: mysqlEnum("status", ["pending", "parsed", "approved", "rejected", "applied"]).default("pending").notNull(),
  appliedToTable: varchar("appliedToTable", { length: 100 }), // 적용된 테이블명
  appliedToId: int("appliedToId"), // 적용된 레코드 ID
  reviewedBy: int("reviewedBy"), // 검토한 관리자 ID
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TelegramUpload = typeof telegramUploads.$inferSelect;
export type InsertTelegramUpload = typeof telegramUploads.$inferInsert;

// ── Community Chat Rooms (커뮤니티 채팅방) ──────────────────────
export const chatRooms = mysqlTable("chat_rooms", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  roomType: mysqlEnum("roomType", ["general", "announcement", "support", "social", "direct", "group"]).default("general").notNull(),
  createdBy: int("createdBy"), // 생성자 ID
  isActive: boolean("isActive").default(true),
  maxMembers: int("maxMembers").default(100),
  avatarUrl: varchar("avatarUrl", { length: 1000 }),
  pinnedMessageId: int("pinnedMessageId"),
  autoTranslate: boolean("autoTranslate").default(true), // 자동 번역 활성화
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = typeof chatRooms.$inferInsert;

// ── Chat Room Members (채팅방 멤버) ──────────────────────────
export const chatRoomMembers = mysqlTable("chat_room_members", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  nickname: varchar("nickname", { length: 255 }),
  memberRole: mysqlEnum("memberRole", ["admin", "moderator", "member"]).default("member").notNull(),
  preferredLang: varchar("preferredLang", { length: 10 }).default("ko"), // 선호 번역 언어
  lastReadAt: timestamp("lastReadAt"),
  isMuted: boolean("isMuted").default(false),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
export type InsertChatRoomMember = typeof chatRoomMembers.$inferInsert;

// ── Chat Messages (채팅 메시지) ──────────────────────────────
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  userId: int("userId").notNull(),
  senderName: varchar("senderName", { length: 255 }).notNull(),
  senderRole: varchar("senderRole", { length: 50 }), // admin, organizer, attendee 등
  content: text("content"),
  messageType: mysqlEnum("messageType", ["text", "image", "file", "system", "announcement", "video", "location", "voice"]).default("text").notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }),
  fileName: varchar("fileName", { length: 255 }),
  replyToId: int("replyToId"), // 답글 대상 메시지 ID
  // 위치 공유 필드
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  locationName: varchar("locationName", { length: 500 }),
  // 번역 필드
  originalLang: varchar("originalLang", { length: 10 }),
  isPinned: boolean("isPinned").default(false),
  pinnedAt: timestamp("pinnedAt"),
  pinnedBy: int("pinnedBy"),
  isEdited: boolean("isEdited").default(false),
  isDeleted: boolean("isDeleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;


// ══════════════════════════════════════════════════════════
// v5.7 - Immigration Checklist
// ══════════════════════════════════════════════════════════

export const immigrationChecklistTemplates = mysqlTable("immigration_checklist_templates", {
  id: int("id").primaryKey().autoincrement(),
  countryCode: varchar("countryCode", { length: 10 }).notNull(), // e.g. TH, VN, PH
  countryName: varchar("countryName", { length: 100 }).notNull(), // e.g. 태국
  category: mysqlEnum("category", ["required_docs", "recommended_items", "tips"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0),
  isDefault: boolean("isDefault").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ImmigrationChecklistTemplate = typeof immigrationChecklistTemplates.$inferSelect;
export type InsertImmigrationChecklistTemplate = typeof immigrationChecklistTemplates.$inferInsert;

export const userChecklistItems = mysqlTable("user_checklist_items", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  templateId: int("templateId"), // null if custom item
  countryCode: varchar("countryCode", { length: 10 }).notNull(),
  category: mysqlEnum("category", ["required_docs", "recommended_items", "tips", "custom"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  isChecked: boolean("isChecked").default(false),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserChecklistItem = typeof userChecklistItems.$inferSelect;
export type InsertUserChecklistItem = typeof userChecklistItems.$inferInsert;


// ── Meetup Expenses (밋업별 비용 사용 내역) ──────────────────────
export const meetupExpenses = mysqlTable("meetup_expenses", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  category: mysqlEnum("category", [
    "flight", "hotel", "transport", "meal", "venue", "gift", "visa", "insurance", "misc"
  ]).default("misc").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amount: int("amount").notNull(), // 금액 (원 단위)
  currency: varchar("currency", { length: 10 }).default("KRW").notNull(),
  paidBy: varchar("paidBy", { length: 255 }), // 지출자 이름
  paidFor: varchar("paidFor", { length: 500 }), // 대상 (팀명 또는 개인명, 쉼표 구분)
  receiptUrl: varchar("receiptUrl", { length: 1000 }), // 영수증 이미지 URL
  receiptKey: varchar("receiptKey", { length: 500 }),
  expenseDate: varchar("expenseDate", { length: 20 }), // YYYY-MM-DD
  registeredVia: mysqlEnum("registeredVia", ["web", "telegram", "qr_scan"]).default("web").notNull(),
  createdBy: int("createdBy"), // 등록한 관리자 userId
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MeetupExpense = typeof meetupExpenses.$inferSelect;
export type InsertMeetupExpense = typeof meetupExpenses.$inferInsert;


// ══════════════════════════════════════════════════════════
// v6.1 - 슈퍼 관리자 감사 로그
// ══════════════════════════════════════════════════════════

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // 작업 수행자
  userName: varchar("userName", { length: 255 }), // 수행자 이름 (비정규화)
  action: mysqlEnum("action", [
    "role_change", "org_create", "org_update", "org_delete", "org_toggle_active",
    "member_add", "member_remove", "member_role_change", "ownership_transfer",
    "user_ban", "user_unban", "settings_change", "data_export", "data_delete",
    "account_create", "password_reset", "banner_create", "banner_update", "banner_delete"
  ]).notNull(),
  targetType: mysqlEnum("targetType", ["user", "organization", "member", "partner", "meetup", "system", "ad_banner"]).notNull(),
  targetId: int("targetId"), // 대상 ID
  targetName: varchar("targetName", { length: 255 }), // 대상 이름 (비정규화)
  details: json("details"), // 변경 전/후 데이터 JSON
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;


// ── Email Verification Tokens (이메일 인증 토큰) ──────────────
export const emailVerificationTokens = mysqlTable("email_verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// ── Password Reset Tokens (비밀번호 재설정 토큰) ──────────────
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ── Onboarding Progress (온보딩 진행률) ──────────────────────
export const onboardingProgress = mysqlTable("onboarding_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  profileCompleted: boolean("profileCompleted").default(false).notNull(),
  firstMeetupJoined: boolean("firstMeetupJoined").default(false).notNull(),
  passportRegistered: boolean("passportRegistered").default(false).notNull(),
  firstBooking: boolean("firstBooking").default(false).notNull(),
  // 주최자/파트너 전용
  orgSetupCompleted: boolean("orgSetupCompleted").default(false).notNull(),
  firstMeetupCreated: boolean("firstMeetupCreated").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;


// ══════════════════════════════════════════════════════════
// v6.7 - 주최자/파트너 온보딩, 밋업 초청, 교통편 연동
// ══════════════════════════════════════════════════════════

// ── Company Info (회사 정보) ──────────────────────────────
export const companyInfo = mysqlTable("company_info", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull().unique(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyLogoUrl: varchar("companyLogoUrl", { length: 1000 }),
  businessRegistration: varchar("businessRegistration", { length: 50 }),
  businessType: varchar("businessType", { length: 100 }),
  address: varchar("address", { length: 500 }),
  contactPerson: varchar("contactPerson", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  website: varchar("website", { length: 500 }),
  description: text("description"),
  industryCategory: varchar("industryCategory", { length: 100 }),
  employeeCount: int("employeeCount"),
  foundedYear: int("foundedYear"),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  emailVerificationToken: varchar("emailVerificationToken", { length: 255 }),
  emailVerificationExpiresAt: timestamp("emailVerificationExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyInfo = typeof companyInfo.$inferSelect;
export type InsertCompanyInfo = typeof companyInfo.$inferInsert;

// ── Organizer Roles (주최자 역할 관리) ──────────────────────
export const organizerRoles = mysqlTable("organizer_roles", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "manager", "staff"]).default("staff").notNull(),
  permissions: json("permissions"), // 권한 배열 JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OrganizerRole = typeof organizerRoles.$inferSelect;
export type InsertOrganizerRole = typeof organizerRoles.$inferInsert;

// ── Meetup Invitations (밋업 초청) ──────────────────────────
export const meetupInvitations = mysqlTable("meetup_invitations", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  invitationType: mysqlEnum("invitationType", ["email", "sms", "link", "csv"]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 50 }),
  recipientName: varchar("recipientName", { length: 255 }),
  invitationToken: varchar("invitationToken", { length: 255 }).unique(),
  status: mysqlEnum("status", ["sent", "opened", "accepted", "rejected", "expired"]).default("sent").notNull(),
  templateId: int("templateId"),
  region: varchar("region", { length: 100 }), // 지역: domestic, overseas, china_mainland 등
  customMessage: text("customMessage"),
  sentAt: timestamp("sentAt"),
  respondedAt: timestamp("respondedAt"),
  expiresAt: timestamp("expiresAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type MeetupInvitation = typeof meetupInvitations.$inferSelect;
export type InsertMeetupInvitation = typeof meetupInvitations.$inferInsert;

// ── Invitation Templates (초청 템플릿) ──────────────────────
export const invitationTemplates = mysqlTable("invitation_templates", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  templateName: varchar("templateName", { length: 255 }).notNull(),
  templateType: mysqlEnum("templateType", ["email", "sms"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  variables: json("variables"), // 템플릿 변수 배열 (예: [name, meetupTitle, date])
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InvitationTemplate = typeof invitationTemplates.$inferSelect;
export type InsertInvitationTemplate = typeof invitationTemplates.$inferInsert;

// ── Transportation Options (교통편 옵션) ──────────────────────
export const transportationOptions = mysqlTable("transportation_options", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  transportationType: mysqlEnum("transportationType", ["flight", "train", "bus", "car", "ship"]).notNull(),
  departureCity: varchar("departureCity", { length: 100 }).notNull(),
  departureCountry: varchar("departureCountry", { length: 100 }).notNull(),
  arrivalCity: varchar("arrivalCity", { length: 100 }).notNull(),
  arrivalCountry: varchar("arrivalCountry", { length: 100 }).notNull(),
  departureDate: timestamp("departureDate"),
  arrivalDate: timestamp("arrivalDate"),
  carrier: varchar("carrier", { length: 255 }),
  flightNumber: varchar("flightNumber", { length: 50 }),
  trainNumber: varchar("trainNumber", { length: 50 }),
  busNumber: varchar("busNumber", { length: 50 }),
  departureTime: varchar("departureTime", { length: 50 }),
  arrivalTime: varchar("arrivalTime", { length: 50 }),
  duration: varchar("duration", { length: 50 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  bookingUrl: varchar("bookingUrl", { length: 1000 }),
  apiProvider: varchar("apiProvider", { length: 100 }), // skyscanner, amadeus, 12306, etc
  externalId: varchar("externalId", { length: 255 }),
  seats: int("seats"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TransportationOption = typeof transportationOptions.$inferSelect;
export type InsertTransportationOption = typeof transportationOptions.$inferInsert;

// ── Participant Transportation (참가자 교통편 예약) ──────────
export const participantTransportation = mysqlTable("participant_transportation", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  transportationOptionId: int("transportationOptionId").notNull(),
  bookingStatus: mysqlEnum("bookingStatus", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  bookingReference: varchar("bookingReference", { length: 255 }),
  seatNumber: varchar("seatNumber", { length: 50 }),
  specialRequests: text("specialRequests"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  paidAt: timestamp("paidAt"),
  confirmationUrl: varchar("confirmationUrl", { length: 1000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ParticipantTransportation = typeof participantTransportation.$inferSelect;
export type InsertParticipantTransportation = typeof participantTransportation.$inferInsert;

// ── Transportation APIs (교통편 API 설정) ──────────────────
export const transportationApis = mysqlTable("transportation_apis", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  apiProvider: varchar("apiProvider", { length: 100 }).notNull(), // skyscanner, amadeus, 12306, etc
  apiKey: varchar("apiKey", { length: 500 }).notNull(),
  apiSecret: varchar("apiSecret", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  rateLimitPerMinute: int("rateLimitPerMinute").default(100),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TransportationApi = typeof transportationApis.$inferSelect;
export type InsertTransportationApi = typeof transportationApis.$inferInsert;

// ── Invitation Statistics (초청 통계) ──────────────────────
export const invitationStatistics = mysqlTable("invitation_statistics", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  totalSent: int("totalSent").default(0),
  totalOpened: int("totalOpened").default(0),
  totalAccepted: int("totalAccepted").default(0),
  totalRejected: int("totalRejected").default(0),
  acceptanceRate: decimal("acceptanceRate", { precision: 5, scale: 2 }).default("0"),
  openRate: decimal("openRate", { precision: 5, scale: 2 }).default("0"),
  lastUpdatedAt: timestamp("lastUpdatedAt").defaultNow().onUpdateNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InvitationStatistics = typeof invitationStatistics.$inferSelect;
export type InsertInvitationStatistics = typeof invitationStatistics.$inferInsert;

// ── Role Delegations (권한 위임 이력) ──────────────────────
export const roleDelegations = mysqlTable("role_delegations", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("fromUserId").notNull(),
  toUserId: int("toUserId").notNull(),
  organizationId: int("organizationId"),
  delegationType: mysqlEnum("delegationType", ["ownership_transfer", "admin_grant", "admin_revoke", "role_change"]).notNull(),
  fromRole: varchar("fromRole", { length: 50 }),
  toRole: varchar("toRole", { length: 50 }),
  notes: text("notes"),
  delegatedBy: int("delegatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RoleDelegation = typeof roleDelegations.$inferSelect;
export type InsertRoleDelegation = typeof roleDelegations.$inferInsert;

// ── Ad Banners (광고 배너 관리) ──────────────────────
export const adBanners = mysqlTable("ad_banners", {
  id: int("id").autoincrement().primaryKey(),
  position: mysqlEnum("position", ["hero_top", "middle_left", "middle_right", "bottom", "sidebar"]).notNull(),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  imageUrl: text("imageUrl").notNull(),
  linkUrl: text("linkUrl"),
  linkText: varchar("linkText", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  clickCount: int("clickCount").default(0).notNull(),
  impressionCount: int("impressionCount").default(0).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdBanner = typeof adBanners.$inferSelect;
export type InsertAdBanner = typeof adBanners.$inferInsert;

// ── Organizer Approvals (주최자 승인 워크플로우) ──────────────────────
export const organizerApprovals = mysqlTable("organizer_approvals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  userEmail: varchar("userEmail", { length: 255 }),
  userRole: mysqlEnum("userRole", ["organizer", "agency", "partner"]).notNull(),
  organizationId: int("organizationId"),
  organizationName: varchar("organizationName", { length: 255 }),
  businessNumber: varchar("businessNumber", { length: 50 }),
  businessType: varchar("businessType", { length: 100 }),
  experience: varchar("experience", { length: 50 }),
  teamSize: varchar("teamSize", { length: 50 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewNote: text("reviewNote"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OrganizerApproval = typeof organizerApprovals.$inferSelect;
export type InsertOrganizerApproval = typeof organizerApprovals.$inferInsert;

// ── VAT Rates (국가별 부가세율) ──────────────────────
export const vatRates = mysqlTable("vat_rates", {
  id: int("id").autoincrement().primaryKey(),
  countryCode: varchar("countryCode", { length: 3 }).notNull().unique(),
  countryName: varchar("countryName", { length: 100 }).notNull(),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).notNull(), // e.g., 10.00 for 10%
  currency: varchar("currency", { length: 10 }).notNull(), // local currency code
  usdExchangeRate: decimal("usdExchangeRate", { precision: 15, scale: 6 }), // 1 USD = X local currency
  lastRateUpdate: timestamp("lastRateUpdate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VatRate = typeof vatRates.$inferSelect;
export type InsertVatRate = typeof vatRates.$inferInsert;

// ── Travel Searches (여행 검색 이력) ──────────────────────
export const travelSearches = mysqlTable("travel_searches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  searchType: mysqlEnum("searchType", ["hotel", "flight"]).notNull(),
  destination: varchar("destination", { length: 255 }),
  origin: varchar("origin", { length: 255 }),
  checkIn: timestamp("checkIn"),
  checkOut: timestamp("checkOut"),
  guests: int("guests").default(1),
  rooms: int("rooms").default(1),
  countryCode: varchar("countryCode", { length: 3 }),
  resultCount: int("resultCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TravelSearch = typeof travelSearches.$inferSelect;
export type InsertTravelSearch = typeof travelSearches.$inferInsert;

// ── Travel Bookings (여행 예약 내역) ──────────────────────
export const travelBookings = mysqlTable("travel_bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bookingType: mysqlEnum("bookingType", ["hotel", "flight"]).notNull(),
  status: mysqlEnum("status", ["pending", "pending_payment", "confirmed", "cancelled", "completed", "refunded", "booking_failed", "ticketed"]).default("pending").notNull(),
  // Property/Flight info
  propertyName: varchar("propertyName", { length: 500 }),
  propertyAddress: varchar("propertyAddress", { length: 500 }),
  flightNumber: varchar("flightNumber", { length: 50 }),
  airline: varchar("airline", { length: 200 }),
  origin: varchar("origin", { length: 255 }),
  destination: varchar("destination", { length: 255 }),
  checkIn: timestamp("checkIn"),
  checkOut: timestamp("checkOut"),
  guests: int("guests").default(1),
  rooms: int("rooms").default(1),
  // Pricing
  localPrice: decimal("localPrice", { precision: 12, scale: 2 }).notNull(),
  localCurrency: varchar("localCurrency", { length: 10 }).notNull(),
  usdPrice: decimal("usdPrice", { precision: 12, scale: 2 }).notNull(),
  usdtPrice: decimal("usdtPrice", { precision: 12, scale: 2 }).notNull(),
  vatAmount: decimal("vatAmount", { precision: 12, scale: 2 }).default("0"),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("0"),
  savingsAmount: decimal("savingsAmount", { precision: 12, scale: 2 }).default("0"), // how much user saves
  exchangeFee: decimal("exchangeFee", { precision: 12, scale: 2 }).default("0"),
  platformMargin: decimal("platformMargin", { precision: 12, scale: 2 }).default("0"),
  // Payment
  paymentMethod: mysqlEnum("paymentMethod", ["usdt_trc20", "usdt_erc20", "usdt_bep20", "usd_card", "local_card"]).default("usdt_trc20"),
  paymentTxHash: varchar("paymentTxHash", { length: 255 }),
  paymentWallet: varchar("paymentWallet", { length: 255 }),
  paymentStatus: mysqlEnum("paymentStatus", ["awaiting", "received", "confirmed", "failed"]).default("awaiting"),
  // External booking reference
  externalProvider: varchar("externalProvider", { length: 100 }), // mystifly, qunar, amadeus, trip.com
  externalBookingId: varchar("externalBookingId", { length: 255 }),
  externalPnr: varchar("externalPnr", { length: 50 }), // Airline PNR
  externalBookingUrl: text("externalBookingUrl"),
  // Meta
  countryCode: varchar("countryCode", { length: 3 }),
  imageUrl: text("imageUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TravelBooking = typeof travelBookings.$inferSelect;
export type InsertTravelBooking = typeof travelBookings.$inferInsert;

// ══════════════════════════════════════════════════════════
// v9.0 - Payment Gateway & Platform Wallet Tables
// ══════════════════════════════════════════════════════════

// ── Payment Transactions (결제 트랜잭션 - NOWPayments/직접전송/자체화폐) ──
export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("bookingId"), // travel_bookings.id
  userId: int("userId").notNull(),
  // Payment method
  method: mysqlEnum("method", [
    "nowpayments",      // NOWPayments 게이트웨이
    "direct_usdt",      // 직접 USDT 전송
    "platform_token",   // 자체 화폐/포인트
    "visa_card",        // VISA 카드 (Crypto.com 등)
    "mixed"             // 복합 결제
  ]).notNull(),
  // Amount info
  amountUsdt: decimal("amountUsdt", { precision: 12, scale: 2 }).notNull(),
  amountLocal: decimal("amountLocal", { precision: 12, scale: 2 }),
  localCurrency: varchar("localCurrency", { length: 10 }),
  amountPlatformToken: decimal("amountPlatformToken", { precision: 12, scale: 2 }).default("0"),
  // Gateway-specific fields (NOWPayments)
  gatewayPaymentId: varchar("gatewayPaymentId", { length: 255 }), // NOWPayments payment_id
  gatewayInvoiceId: varchar("gatewayInvoiceId", { length: 255 }), // NOWPayments invoice_id
  gatewayStatus: varchar("gatewayStatus", { length: 50 }),         // waiting, confirming, confirmed, sending, finished, failed, expired
  gatewayPayUrl: text("gatewayPayUrl"),                            // NOWPayments hosted checkout URL
  gatewayPayAddress: varchar("gatewayPayAddress", { length: 255 }),// deposit address
  gatewayPayCurrency: varchar("gatewayPayCurrency", { length: 20 }),// e.g., usdttrc20
  gatewayActuallyPaid: decimal("gatewayActuallyPaid", { precision: 12, scale: 6 }),
  // Direct USDT transfer fields
  txHash: varchar("txHash", { length: 255 }),
  txNetwork: mysqlEnum("txNetwork", ["trc20", "erc20", "bep20", "polygon", "solana"]),
  senderWallet: varchar("senderWallet", { length: 255 }),
  receiverWallet: varchar("receiverWallet", { length: 255 }),
  // Status
  status: mysqlEnum("status", [
    "created",      // 결제 생성됨
    "pending",      // 결제 대기중
    "confirming",   // 블록체인 확인중
    "confirmed",    // 결제 확인됨
    "completed",    // 완료
    "failed",       // 실패
    "expired",      // 만료
    "refunded"      // 환불됨
  ]).default("created").notNull(),
  // Fee breakdown
  gatewayFee: decimal("gatewayFee", { precision: 12, scale: 4 }).default("0"),     // NOWPayments 수수료
  networkFee: decimal("networkFee", { precision: 12, scale: 4 }).default("0"),     // 블록체인 네트워크 수수료
  platformFee: decimal("platformFee", { precision: 12, scale: 4 }).default("0"),   // 플랫폼 수수료
  // Webhook data
  webhookData: json("webhookData"),
  // Meta
  description: text("description"),
  expiresAt: timestamp("expiresAt"),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

// ── Platform Wallets (자체 화폐/포인트 지갑) ──────────────────────
export const platformWallets = mysqlTable("platform_wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0").notNull(),
  frozenBalance: decimal("frozenBalance", { precision: 15, scale: 2 }).default("0").notNull(), // 결제 진행중 동결
  totalDeposited: decimal("totalDeposited", { precision: 15, scale: 2 }).default("0").notNull(),
  totalSpent: decimal("totalSpent", { precision: 15, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 20 }).default("USDT").notNull(), // USDT or platform token
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformWallet = typeof platformWallets.$inferSelect;
export type InsertPlatformWallet = typeof platformWallets.$inferInsert;

// ── Wallet Transactions (지갑 입출금 내역) ──────────────────────
export const walletTransactions = mysqlTable("wallet_transactions", {
  id: int("id").autoincrement().primaryKey(),
  walletId: int("walletId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["deposit", "withdraw", "payment", "refund", "bonus", "transfer"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 15, scale: 2 }).notNull(),
  // Reference
  referenceType: varchar("referenceType", { length: 50 }), // booking, deposit, withdrawal
  referenceId: int("referenceId"),
  // Crypto details (for deposits)
  txHash: varchar("txHash", { length: 255 }),
  network: varchar("network", { length: 20 }),
  fromAddress: varchar("fromAddress", { length: 255 }),
  // Status
  status: mysqlEnum("status", ["pending", "completed", "failed", "cancelled"]).default("pending").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;

// ── Payment Gateway Config (결제 게이트웨이 설정) ──────────────────────
export const paymentGatewayConfig = mysqlTable("payment_gateway_config", {
  id: int("id").autoincrement().primaryKey(),
  gateway: mysqlEnum("gateway", ["nowpayments", "direct_usdt", "platform_token", "visa_card"]).notNull(),
  isEnabled: boolean("isEnabled").default(true).notNull(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  feePercent: decimal("feePercent", { precision: 5, scale: 2 }).default("0"),
  minAmount: decimal("minAmount", { precision: 12, scale: 2 }).default("1"),
  maxAmount: decimal("maxAmount", { precision: 12, scale: 2 }).default("100000"),
  // Wallet addresses for direct USDT
  walletAddressTrc20: varchar("walletAddressTrc20", { length: 255 }),
  walletAddressErc20: varchar("walletAddressErc20", { length: 255 }),
  walletAddressBep20: varchar("walletAddressBep20", { length: 255 }),
  // Config JSON (API keys etc stored in env, extra config here)
  configJson: json("configJson"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PaymentGatewayConfig = typeof paymentGatewayConfig.$inferSelect;
export type InsertPaymentGatewayConfig = typeof paymentGatewayConfig.$inferInsert;


// ══════════════════════════════════════════════════════════
// v10.0 - 차량 호출(Ride-Hailing) & 배달(Delivery) 서비스
// ══════════════════════════════════════════════════════════

// ── Ride Providers (차량 호출 제공업체 설정) ──────────────────────
export const rideProviders = mysqlTable("ride_providers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Karhoo, Uber, Grab, Bolt
  apiType: varchar("apiType", { length: 50 }).notNull(), // karhoo, uber, grab, bolt, demo
  apiKey: varchar("apiKey", { length: 500 }),
  apiSecret: varchar("apiSecret", { length: 500 }),
  baseUrl: varchar("baseUrl", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  supportedCountries: json("supportedCountries"), // ["TH","VN","SG",...]
  supportedCities: json("supportedCities"), // ["Bangkok","Singapore",...]
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("15"), // 마크업 %
  minFare: decimal("minFare", { precision: 10, scale: 2 }).default("2"),
  logoUrl: varchar("logoUrl", { length: 1000 }),
  configJson: json("configJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RideProvider = typeof rideProviders.$inferSelect;
export type InsertRideProvider = typeof rideProviders.$inferInsert;

// ── Ride Searches (차량 호출 검색 기록) ──────────────────────
export const rideSearches = mysqlTable("ride_searches", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  meetupId: int("meetupId"),
  // 출발지
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  pickupAddress: text("pickupAddress"),
  pickupPlaceName: varchar("pickupPlaceName", { length: 500 }),
  // 도착지
  dropoffLat: decimal("dropoffLat", { precision: 10, scale: 7 }),
  dropoffLng: decimal("dropoffLng", { precision: 10, scale: 7 }),
  dropoffAddress: text("dropoffAddress"),
  dropoffPlaceName: varchar("dropoffPlaceName", { length: 500 }),
  // 검색 조건
  countryCode: varchar("countryCode", { length: 3 }),
  city: varchar("city", { length: 100 }),
  vehicleType: mysqlEnum("vehicleType", ["economy", "comfort", "premium", "van", "suv"]).default("economy"),
  passengers: int("passengers").default(1),
  scheduledAt: timestamp("scheduledAt"), // 예약 시간 (null이면 즉시)
  // 검색 결과
  resultCount: int("resultCount").default(0),
  searchResults: json("searchResults"), // 제공업체별 결과 캐시
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RideSearch = typeof rideSearches.$inferSelect;
export type InsertRideSearch = typeof rideSearches.$inferInsert;

// ── Ride Bookings (차량 호출 예약) ──────────────────────
export const rideBookings = mysqlTable("ride_bookings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  meetupId: int("meetupId"),
  searchId: int("searchId"),
  providerId: int("providerId"),
  providerName: varchar("providerName", { length: 100 }),
  // 출발/도착
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  pickupAddress: text("pickupAddress"),
  pickupPlaceName: varchar("pickupPlaceName", { length: 500 }),
  dropoffLat: decimal("dropoffLat", { precision: 10, scale: 7 }),
  dropoffLng: decimal("dropoffLng", { precision: 10, scale: 7 }),
  dropoffAddress: text("dropoffAddress"),
  dropoffPlaceName: varchar("dropoffPlaceName", { length: 500 }),
  // 차량 정보
  vehicleType: mysqlEnum("vehicleType", ["economy", "comfort", "premium", "van", "suv"]).default("economy"),
  vehicleName: varchar("vehicleName", { length: 200 }),
  driverName: varchar("driverName", { length: 200 }),
  driverPhone: varchar("driverPhone", { length: 50 }),
  licensePlate: varchar("licensePlate", { length: 50 }),
  passengers: int("passengers").default(1),
  // 가격 정보
  priceLocal: decimal("priceLocal", { precision: 12, scale: 2 }),
  localCurrency: varchar("localCurrency", { length: 10 }),
  priceUsd: decimal("priceUsd", { precision: 12, scale: 2 }),
  priceUsdt: decimal("priceUsdt", { precision: 12, scale: 2 }),
  vatAmount: decimal("vatAmount", { precision: 12, scale: 2 }).default("0"),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("0"),
  vatSaved: decimal("vatSaved", { precision: 12, scale: 2 }).default("0"),
  platformMarkup: decimal("platformMarkup", { precision: 12, scale: 2 }).default("0"),
  platformRevenue: decimal("platformRevenue", { precision: 12, scale: 2 }).default("0"),
  // 거리/시간
  distanceKm: decimal("distanceKm", { precision: 8, scale: 2 }),
  estimatedMinutes: int("estimatedMinutes"),
  // 일정
  scheduledAt: timestamp("scheduledAt"),
  pickedUpAt: timestamp("pickedUpAt"),
  droppedOffAt: timestamp("droppedOffAt"),
  // 결제
  paymentMethod: mysqlEnum("paymentMethod", ["direct_usdt", "nowpayments", "platform_token", "visa_card"]).default("direct_usdt"),
  paymentTransactionId: int("paymentTransactionId"),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded", "failed"]).default("pending"),
  // 상태
  status: mysqlEnum("status", ["searching", "confirmed", "driver_assigned", "en_route", "arrived", "in_progress", "completed", "cancelled"]).default("searching"),
  cancellationReason: text("cancellationReason"),
  // 외부 참조
  externalBookingId: varchar("externalBookingId", { length: 255 }),
  countryCode: varchar("countryCode", { length: 3 }),
  rating: int("rating"), // 1-5
  ratingComment: text("ratingComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RideBooking = typeof rideBookings.$inferSelect;
export type InsertRideBooking = typeof rideBookings.$inferInsert;

// ── Delivery Providers (배달 제공업체 설정) ──────────────────────
export const deliveryProviders = mysqlTable("delivery_providers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Lalamove, GrabExpress, Deliverect
  apiType: varchar("apiType", { length: 50 }).notNull(), // lalamove, grab_express, deliverect, demo
  serviceType: mysqlEnum("serviceType", ["food", "package", "document", "grocery", "all"]).default("all"),
  apiKey: varchar("apiKey", { length: 500 }),
  apiSecret: varchar("apiSecret", { length: 500 }),
  baseUrl: varchar("baseUrl", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  supportedCountries: json("supportedCountries"),
  supportedCities: json("supportedCities"),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("12"),
  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }).default("5"),
  logoUrl: varchar("logoUrl", { length: 1000 }),
  configJson: json("configJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeliveryProvider = typeof deliveryProviders.$inferSelect;
export type InsertDeliveryProvider = typeof deliveryProviders.$inferInsert;

// ── Delivery Orders (배달 주문) ──────────────────────
export const deliveryOrders = mysqlTable("delivery_orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  meetupId: int("meetupId"),
  providerId: int("providerId"),
  providerName: varchar("providerName", { length: 100 }),
  // 주문 유형
  orderType: mysqlEnum("orderType", ["food", "package", "document", "grocery"]).default("food"),
  // 픽업 위치 (레스토랑/발송지)
  pickupLat: decimal("pickupLat", { precision: 10, scale: 7 }),
  pickupLng: decimal("pickupLng", { precision: 10, scale: 7 }),
  pickupAddress: text("pickupAddress"),
  pickupPlaceName: varchar("pickupPlaceName", { length: 500 }),
  pickupPhone: varchar("pickupPhone", { length: 50 }),
  // 배달 위치
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 7 }),
  deliveryLng: decimal("deliveryLng", { precision: 10, scale: 7 }),
  deliveryAddress: text("deliveryAddress"),
  deliveryPlaceName: varchar("deliveryPlaceName", { length: 500 }),
  deliveryPhone: varchar("deliveryPhone", { length: 50 }),
  deliveryInstructions: text("deliveryInstructions"),
  // 주문 상세 (음식 배달)
  restaurantName: varchar("restaurantName", { length: 500 }),
  restaurantCategory: varchar("restaurantCategory", { length: 100 }), // korean, thai, japanese, western, etc
  orderItems: json("orderItems"), // [{name, qty, price, notes}]
  // 물품 배달
  packageDescription: text("packageDescription"),
  packageWeight: decimal("packageWeight", { precision: 8, scale: 2 }),
  packageSize: mysqlEnum("packageSize", ["small", "medium", "large", "extra_large"]),
  // 가격 정보
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }),
  deliveryFee: decimal("deliveryFee", { precision: 12, scale: 2 }),
  serviceFee: decimal("serviceFee", { precision: 12, scale: 2 }),
  priceLocal: decimal("priceLocal", { precision: 12, scale: 2 }),
  localCurrency: varchar("localCurrency", { length: 10 }),
  priceUsd: decimal("priceUsd", { precision: 12, scale: 2 }),
  priceUsdt: decimal("priceUsdt", { precision: 12, scale: 2 }),
  vatAmount: decimal("vatAmount", { precision: 12, scale: 2 }).default("0"),
  vatRate: decimal("vatRate", { precision: 5, scale: 2 }).default("0"),
  vatSaved: decimal("vatSaved", { precision: 12, scale: 2 }).default("0"),
  platformMarkup: decimal("platformMarkup", { precision: 12, scale: 2 }).default("0"),
  platformRevenue: decimal("platformRevenue", { precision: 12, scale: 2 }).default("0"),
  // 배달 정보
  estimatedMinutes: int("estimatedMinutes"),
  distanceKm: decimal("distanceKm", { precision: 8, scale: 2 }),
  driverName: varchar("driverName", { length: 200 }),
  driverPhone: varchar("driverPhone", { length: 50 }),
  // 일정
  orderedAt: timestamp("orderedAt").defaultNow(),
  pickedUpAt: timestamp("pickedUpAt"),
  deliveredAt: timestamp("deliveredAt"),
  // 결제
  paymentMethod: mysqlEnum("paymentMethod", ["direct_usdt", "nowpayments", "platform_token", "visa_card"]).default("direct_usdt"),
  paymentTransactionId: int("paymentTransactionId"),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded", "failed"]).default("pending"),
  // 상태
  status: mysqlEnum("status", ["pending", "confirmed", "preparing", "picked_up", "in_transit", "delivered", "cancelled", "refunded"]).default("pending"),
  cancellationReason: text("cancellationReason"),
  // 외부 참조
  externalOrderId: varchar("externalOrderId", { length: 255 }),
  countryCode: varchar("countryCode", { length: 3 }),
  rating: int("rating"), // 1-5
  ratingComment: text("ratingComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = typeof deliveryOrders.$inferInsert;

// ── Notes (메모) ──────────────────────────────────────
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  meetupId: int("meetupId"), // optional: link to a meetup
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  color: varchar("color", { length: 20 }).default("yellow"), // yellow, blue, green, pink, purple
  isPinned: boolean("isPinned").default(false).notNull(),
  isShared: boolean("isShared").default(false).notNull(), // shared with team
  sharedWithMeetup: int("sharedWithMeetup"), // meetup id for team sharing
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ── Team Schedules (팀 스케줄 자동 등록) ──────────────────
export const teamSchedules = mysqlTable("team_schedules", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 500 }),
  eventTime: timestamp("eventTime").notNull(),
  endTime: timestamp("endTime"),
  createdByUserId: int("createdByUserId"),
  memberIds: json("memberIds").$type<number[]>(), // registration IDs
  notified: boolean("notified").default(false).notNull(),
  status: mysqlEnum("status", ["active", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TeamSchedule = typeof teamSchedules.$inferSelect;
export type InsertTeamSchedule = typeof teamSchedules.$inferInsert;

// ── Translation Requests (통역 요청) ──────────────────
export const translationRequests = mysqlTable("translation_requests", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  requesterId: int("requesterId").notNull(),
  interpreterId: int("interpreterId"),
  sourceLang: varchar("sourceLang", { length: 10 }).notNull(),
  targetLang: varchar("targetLang", { length: 10 }).notNull(),
  context: text("context"),
  location: varchar("location", { length: 500 }),
  scheduledTime: timestamp("scheduledTime"),
  status: mysqlEnum("status", ["pending", "assigned", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TranslationRequest = typeof translationRequests.$inferSelect;
export type InsertTranslationRequest = typeof translationRequests.$inferInsert;

// ══════════════════════════════════════════════════════════
// v12.15 - 교통/식사 일정 관리
// ══════════════════════════════════════════════════════════

// ── Meetup Schedules (밋업 교통/식사/관광 일정) ──────────────
export const meetupSchedules = mysqlTable("meetup_schedules", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  scheduleType: mysqlEnum("scheduleType", ["transport", "meal", "tour", "meeting", "free", "other"]).default("other").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 500 }),
  locationUrl: varchar("locationUrl", { length: 1000 }), // 구글맵 링크
  eventDate: timestamp("eventDate").notNull(),
  endTime: timestamp("endTime"),
  // 교통 관련
  vehicleInfo: varchar("vehicleInfo", { length: 255 }), // 차량번호/차종
  driverName: varchar("driverName", { length: 255 }),
  driverPhone: varchar("driverPhone", { length: 50 }),
  pickupLocation: varchar("pickupLocation", { length: 500 }),
  dropoffLocation: varchar("dropoffLocation", { length: 500 }),
  // 식사 관련
  restaurantName: varchar("restaurantName", { length: 255 }),
  cuisineType: varchar("cuisineType", { length: 100 }), // 한식/양식/일식 등
  reservationName: varchar("reservationName", { length: 255 }),
  reservationPhone: varchar("reservationPhone", { length: 50 }),
  menuInfo: text("menuInfo"),
  costPerPerson: varchar("costPerPerson", { length: 100 }),
  // 공통
  maxParticipants: int("maxParticipants"),
  assignedRegistrationIds: json("assignedRegistrationIds").$type<number[]>(), // 특정 참가자만 해당
  isAllParticipants: boolean("isAllParticipants").default(true), // true면 전체 참가자 대상
  notified: boolean("notified").default(false),
  notifiedAt: timestamp("notifiedAt"),
  sortOrder: int("sortOrder").default(0),
  status: mysqlEnum("status", ["scheduled", "confirmed", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetupSchedule = typeof meetupSchedules.$inferSelect;
export type InsertMeetupSchedule = typeof meetupSchedules.$inferInsert;

// ── Schedule Reminders (일정 알림 자동화) ──────────────────
export const scheduleReminders = mysqlTable("schedule_reminders", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(),
  meetupId: int("meetupId").notNull(),
  reminderMinutes: int("reminderMinutes").notNull(), // 일정 시작 전 몇 분 (60, 30, 15 등)
  reminderType: mysqlEnum("reminderType", ["telegram", "chat", "both"]).default("both").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).default("pending").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(), // 실제 알림 발송 예정 시각
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduleReminder = typeof scheduleReminders.$inferSelect;
export type InsertScheduleReminder = typeof scheduleReminders.$inferInsert;

// ── Schedule RSVPs (참가자 일정 참석 여부 응답) ──────────────
export const scheduleRsvps = mysqlTable("schedule_rsvps", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(),
  meetupId: int("meetupId").notNull(),
  registrationId: int("registrationId").notNull(),
  userId: int("userId"),
  response: mysqlEnum("response", ["attending", "not_attending", "maybe"]).default("maybe").notNull(),
  respondedAt: timestamp("respondedAt").defaultNow().notNull(),
  note: text("note"), // 참가자 메모 (불참 사유 등)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleRsvp = typeof scheduleRsvps.$inferSelect;
export type InsertScheduleRsvp = typeof scheduleRsvps.$inferInsert;

// ── User Locations (실시간 위치 공유) ──────────────────────
export const userLocations = mysqlTable("user_locations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  meetupId: int("meetupId"),
  roomId: int("roomId"), // 채팅방 위치 공유 시
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // 미터 단위
  altitude: decimal("altitude", { precision: 10, scale: 2 }),
  heading: decimal("heading", { precision: 6, scale: 2 }), // 방향 (도)
  speed: decimal("speed", { precision: 8, scale: 2 }), // m/s
  isSharing: boolean("isSharing").default(true).notNull(),
  shareType: mysqlEnum("shareType", ["room", "meetup", "both"]).default("both").notNull(),
  batteryLevel: int("batteryLevel"), // 배터리 잔량 (%)
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = typeof userLocations.$inferInsert;

// ── Geofences (지오펜스 영역) ──────────────────────────
export const geofences = mysqlTable("geofences", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  radius: int("radius").notNull(), // 반경 (미터)
  type: mysqlEnum("type", ["poi", "hotel", "airport", "restaurant", "venue", "custom"]).default("custom").notNull(),
  notifyOnEnter: boolean("notifyOnEnter").default(true).notNull(),
  notifyOnExit: boolean("notifyOnExit").default(true).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Geofence = typeof geofences.$inferSelect;
export type InsertGeofence = typeof geofences.$inferInsert;

// ── Geofence Events (지오펜스 진입/이탈 이벤트) ──────────
export const geofenceEvents = mysqlTable("geofence_events", {
  id: int("id").autoincrement().primaryKey(),
  geofenceId: int("geofenceId").notNull(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", ["enter", "exit"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  notified: boolean("notified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type InsertGeofenceEvent = typeof geofenceEvents.$inferInsert;

// ── Location History (위치 이력) ──────────────────────────
export const locationHistory = mysqlTable("location_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  meetupId: int("meetupId"),
  roomId: int("roomId"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }),
  altitude: decimal("altitude", { precision: 10, scale: 2 }),
  heading: decimal("heading", { precision: 6, scale: 2 }),
  speed: decimal("speed", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LocationHistory = typeof locationHistory.$inferSelect;
export type InsertLocationHistory = typeof locationHistory.$inferInsert;

// ── 웹 푸시 구독 ─────────────────────────────────────────────
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscriptionRow = typeof pushSubscriptions.$inferInsert;

// ── 주변 장소 즐겨찾기 ─────────────────────────────────────
export const placeFavorites = mysqlTable("place_favorites", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  placeId: varchar("placeId", { length: 255 }).notNull(), // Google Places ID
  name: varchar("name", { length: 500 }).notNull(),
  address: text("address"),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  category: varchar("category", { length: 100 }),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  photoUrl: text("photoUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PlaceFavorite = typeof placeFavorites.$inferSelect;
export type InsertPlaceFavorite = typeof placeFavorites.$inferInsert;

// ══════════════════════════════════════════════════════════
// v6.12 - 경쟁사 Gap 분석 기반 기능 보강
// ══════════════════════════════════════════════════════════

// ── Travel Policies (이벤트별 여행 정책) ──────────────────
export const travelPolicies = mysqlTable("travel_policies", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  // 항공 정책
  allowedFlightClass: mysqlEnum("allowedFlightClass", ["economy", "premium_economy", "business", "first", "any"]).default("economy").notNull(),
  maxFlightBudget: decimal("maxFlightBudget", { precision: 12, scale: 2 }), // 1인당 항공 예산 상한
  flightBudgetCurrency: varchar("flightBudgetCurrency", { length: 10 }).default("USD"),
  // 숙소 정책
  allowedHotelStars: int("allowedHotelStars").default(3), // 최소 호텔 등급
  maxHotelBudgetPerNight: decimal("maxHotelBudgetPerNight", { precision: 12, scale: 2 }),
  hotelBudgetCurrency: varchar("hotelBudgetCurrency", { length: 10 }).default("USD"),
  // 기간 정책
  maxTravelDays: int("maxTravelDays"), // 최대 여행 일수
  minAdvanceBookingDays: int("minAdvanceBookingDays").default(7), // 최소 사전 예약 기간
  // 전체 예산
  totalBudget: decimal("totalBudget", { precision: 15, scale: 2 }), // 밋업 전체 예산
  totalBudgetCurrency: varchar("totalBudgetCurrency", { length: 10 }).default("USD"),
  spentAmount: decimal("spentAmount", { precision: 15, scale: 2 }).default("0"), // 현재 지출
  // 기타 정책
  requireApproval: boolean("requireApproval").default(false).notNull(), // 예산 초과 시 승인 필요
  autoRejectOverBudget: boolean("autoRejectOverBudget").default(false).notNull(),
  policyNotes: text("policyNotes"), // 추가 정책 안내
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TravelPolicy = typeof travelPolicies.$inferSelect;
export type InsertTravelPolicy = typeof travelPolicies.$inferInsert;

// ── Attendee Tiers (참가자 등급 및 차등 정책) ──────────────
export const attendeeTiers = mysqlTable("attendee_tiers", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  tierName: varchar("tierName", { length: 100 }).notNull(), // VIP, Speaker, General, Staff
  tierLevel: int("tierLevel").default(0).notNull(), // 등급 우선순위 (높을수록 상위)
  color: varchar("color", { length: 20 }).default("#6366f1"), // 배지 색상
  // 차등 혜택
  flightClass: mysqlEnum("flightClass", ["economy", "premium_economy", "business", "first", "any"]).default("economy"),
  maxFlightBudget: decimal("maxFlightBudget", { precision: 12, scale: 2 }),
  hotelStars: int("hotelStars").default(3),
  maxHotelBudgetPerNight: decimal("maxHotelBudgetPerNight", { precision: 12, scale: 2 }),
  mealAllowance: decimal("mealAllowance", { precision: 12, scale: 2 }), // 식비 한도
  transportAllowance: decimal("transportAllowance", { precision: 12, scale: 2 }), // 교통비 한도
  // 추가 혜택
  airportPickup: boolean("airportPickup").default(false).notNull(), // 공항 픽업 제공
  loungeAccess: boolean("loungeAccess").default(false).notNull(), // 라운지 이용
  prioritySeating: boolean("prioritySeating").default(false).notNull(), // 우선 좌석
  giftBag: boolean("giftBag").default(false).notNull(), // 선물 가방
  vipDinner: boolean("vipDinner").default(false).notNull(), // VIP 디너
  dedicatedInterpreter: boolean("dedicatedInterpreter").default(false).notNull(), // 전담 통역
  customBenefits: json("customBenefits").$type<string[]>(), // 추가 커스텀 혜택
  description: text("description"),
  isDefault: boolean("isDefault").default(false).notNull(), // 기본 등급 여부
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AttendeeTier = typeof attendeeTiers.$inferSelect;
export type InsertAttendeeTier = typeof attendeeTiers.$inferInsert;

// ── Emergency Contacts (참가자 긴급 연락처) ──────────────
export const emergencyContacts = mysqlTable("emergency_contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  registrationId: int("registrationId"),
  meetupId: int("meetupId"),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(), // 가족, 친구, 동료 등
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }),
  countryCode: varchar("countryCode", { length: 5 }),
  notes: text("notes"),
  isPrimary: boolean("isPrimary").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;

// ── Safety Alerts (안전 알림/여행 경보) ──────────────────
export const safetyAlerts = mysqlTable("safety_alerts", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  alertType: mysqlEnum("alertType", ["sos", "weather", "security", "health", "travel_advisory", "general"]).default("general").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  affectedArea: varchar("affectedArea", { length: 500 }), // 영향 지역
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  radius: int("radius"), // 영향 반경 (미터)
  // SOS 관련
  reportedByUserId: int("reportedByUserId"),
  reportedByName: varchar("reportedByName", { length: 255 }),
  // 상태
  status: mysqlEnum("status", ["active", "monitoring", "resolved", "dismissed"]).default("active").notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedByUserId: int("resolvedByUserId"),
  resolvedNote: text("resolvedNote"),
  // 알림
  notifiedAdmins: boolean("notifiedAdmins").default(false).notNull(),
  notifiedParticipants: boolean("notifiedParticipants").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SafetyAlert = typeof safetyAlerts.$inferSelect;
export type InsertSafetyAlert = typeof safetyAlerts.$inferInsert;


// ══════════════════════════════════════════════════════════
// v6.14 - RSVP 자동 리마인더 + 셀프 예약 포털
// ══════════════════════════════════════════════════════════

// ── RSVP Reminder Logs (RSVP 리마인더 발송 기록) ──────────────
export const rsvpReminderLogs = mysqlTable("rsvp_reminder_logs", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  invitationId: int("invitationId").notNull(), // meetup_invitations.id
  reminderType: mysqlEnum("reminderType", ["d7", "d3", "d1", "custom"]).notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "telegram", "push"]).default("email").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 50 }),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  status: mysqlEnum("status", ["sent", "failed", "skipped"]).default("sent").notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RsvpReminderLog = typeof rsvpReminderLogs.$inferSelect;
export type InsertRsvpReminderLog = typeof rsvpReminderLogs.$inferInsert;

// ── RSVP Reminder Settings (밋업별 리마인더 설정) ──────────────
export const rsvpReminderSettings = mysqlTable("rsvp_reminder_settings", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  reminderDays: json("reminderDays"), // [7, 3, 1] - D-7, D-3, D-1
  channels: json("channels"), // ["email", "telegram"]
  emailSubjectTemplate: varchar("emailSubjectTemplate", { length: 500 }),
  emailBodyTemplate: text("emailBodyTemplate"),
  smsTemplate: text("smsTemplate"),
  lastRunAt: timestamp("lastRunAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RsvpReminderSetting = typeof rsvpReminderSettings.$inferSelect;
export type InsertRsvpReminderSetting = typeof rsvpReminderSettings.$inferInsert;

// ── Self Booking Requests (참석자 셀프 예약 요청) ──────────────
export const selfBookingRequests = mysqlTable("self_booking_requests", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId").notNull(),
  registrationId: int("registrationId").notNull(),
  userId: int("userId").notNull(),
  // 예약 유형
  bookingType: mysqlEnum("bookingType", ["flight", "hotel", "both"]).notNull(),
  // 항공편 요청
  flightDepartureCity: varchar("flightDepartureCity", { length: 100 }),
  flightArrivalCity: varchar("flightArrivalCity", { length: 100 }),
  flightDepartureDate: varchar("flightDepartureDate", { length: 20 }),
  flightReturnDate: varchar("flightReturnDate", { length: 20 }),
  flightClass: mysqlEnum("flightClass", ["economy", "premium_economy", "business", "first"]).default("economy"),
  flightPreferences: text("flightPreferences"), // 선호 항공사, 시간대 등
  // 호텔 요청
  hotelCity: varchar("hotelCity", { length: 100 }),
  hotelCheckIn: varchar("hotelCheckIn", { length: 20 }),
  hotelCheckOut: varchar("hotelCheckOut", { length: 20 }),
  hotelStarRating: int("hotelStarRating"), // 최소 별점
  hotelRoomType: varchar("hotelRoomType", { length: 100 }),
  hotelPreferences: text("hotelPreferences"), // 특별 요청
  // 예산
  estimatedBudget: decimal("estimatedBudget", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  // 정책 준수
  policyCompliant: boolean("policyCompliant").default(true),
  policyViolations: json("policyViolations"), // 위반 항목 배열
  // 승인 프로세스
  status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "booked", "cancelled"]).default("draft").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  // 최종 예약 연결
  linkedBookingId: int("linkedBookingId"), // travel_bookings.id
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SelfBookingRequest = typeof selfBookingRequests.$inferSelect;
export type InsertSelfBookingRequest = typeof selfBookingRequests.$inferInsert;

// ── SNS Accounts (연결된 SNS 계정) ──────────────────────────
export const snsAccounts = mysqlTable("sns_accounts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram"]).notNull(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountId: varchar("accountId", { length: 255 }), // 플랫폼 고유 ID
  accessToken: text("accessToken"), // 암호화된 토큰
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  profileImageUrl: varchar("profileImageUrl", { length: 1000 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SnsAccount = typeof snsAccounts.$inferSelect;
export type InsertSnsAccount = typeof snsAccounts.$inferInsert;

// ── SNS Posts (SNS 게시물) ──────────────────────────────────
export const snsPosts = mysqlTable("sns_posts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  meetupId: int("meetupId"),
  createdBy: int("createdBy").notNull(),
  platform: mysqlEnum("platform", ["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram", "all"]).default("all").notNull(),
  contentType: mysqlEnum("contentType", ["text", "image", "video", "carousel"]).default("text").notNull(),
  title: varchar("title", { length: 500 }),
  content: text("content").notNull(),
  imageUrls: json("imageUrls"), // JSON array of image URLs
  videoUrl: varchar("videoUrl", { length: 1000 }),
  hashtags: json("hashtags"), // JSON array of hashtags
  scheduledAt: timestamp("scheduledAt"), // 예약 게시 시간
  publishedAt: timestamp("publishedAt"), // 실제 게시 시간
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed", "cancelled"]).default("draft").notNull(),
  aiGenerated: boolean("aiGenerated").default(false),
  aiPrompt: text("aiPrompt"), // AI 생성 시 사용된 프롬프트
  engagement: json("engagement"), // { likes, shares, comments, views }
  externalPostId: varchar("externalPostId", { length: 255 }), // 외부 플랫폼 게시물 ID
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SnsPost = typeof snsPosts.$inferSelect;
export type InsertSnsPost = typeof snsPosts.$inferInsert;

// ── SNS Templates (SNS 콘텐츠 템플릿) ────────────────────────
export const snsTemplates = mysqlTable("sns_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram", "all"]).default("all").notNull(),
  contentType: mysqlEnum("contentType", ["text", "image", "video", "carousel"]).default("text").notNull(),
  templateContent: text("templateContent").notNull(), // 변수 포함 템플릿 ({{meetupTitle}}, {{date}} 등)
  imagePrompt: text("imagePrompt"), // AI 이미지 생성 프롬프트 템플릿
  hashtags: json("hashtags"),
  isActive: boolean("isActive").default(true),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SnsTemplate = typeof snsTemplates.$inferSelect;
export type InsertSnsTemplate = typeof snsTemplates.$inferInsert;

// ── Event Checkins (현장 QR 체크인) ────────────────────────
export const eventCheckins = mysqlTable("event_checkins", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: int("registrationId").notNull(),
  meetupId: int("meetupId").notNull(),
  qrToken: varchar("qrToken", { length: 64 }).notNull().unique(),
  checkedIn: boolean("checkedIn").default(false).notNull(),
  checkedInAt: timestamp("checkedInAt"),
  checkedInBy: int("checkedInBy"), // 스캔한 관리자 userId
  checkInMethod: mysqlEnum("checkInMethod", ["qr_scan", "manual", "self_scan"]).default("qr_scan").notNull(),
  locationNote: varchar("locationNote", { length: 255 }), // 체크인 장소 메모
  deviceInfo: varchar("deviceInfo", { length: 255 }), // 스캔 기기 정보
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EventCheckin = typeof eventCheckins.$inferSelect;
export type InsertEventCheckin = typeof eventCheckins.$inferInsert;

// ── User Accommodations (사용자 직접 입력 숙박 정보) ────────────────────────
export const userAccommodations = mysqlTable("user_accommodations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  hotelName: varchar("hotelName", { length: 255 }).notNull(),
  hotelAddress: text("hotelAddress"),
  checkInDate: varchar("checkInDate", { length: 20 }),
  checkInTime: varchar("checkInTime", { length: 10 }),
  checkOutDate: varchar("checkOutDate", { length: 20 }),
  checkOutTime: varchar("checkOutTime", { length: 10 }),
  bookingId: varchar("bookingId", { length: 100 }),
  roomType: varchar("roomType", { length: 100 }),
  phone: varchar("phone", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserAccommodation = typeof userAccommodations.$inferSelect;
export type InsertUserAccommodation = typeof userAccommodations.$inferInsert;

// ── 번역 캐시 테이블 ──────────────────────────────────────────────────────────
export const translationCache = mysqlTable("translation_cache", {
  id: int("id").autoincrement().primaryKey(),
  sourceHash: varchar("source_hash", { length: 64 }).notNull(),
  targetLang: varchar("target_lang", { length: 10 }).notNull(),
  sourceText: text("source_text").notNull(),
  translatedText: text("translated_text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TranslationCache = typeof translationCache.$inferSelect;

// ── 숙소 공유 테이블 ──────────────────────────────────────────────────────────
export const sharedAccommodations = mysqlTable("shared_accommodations", {
  id: int("id").autoincrement().primaryKey(),
  accommodationId: int("accommodationId").notNull(),
  meetupId: int("meetupId").notNull(),
  sharedByUserId: varchar("sharedByUserId", { length: 255 }).notNull(),
  sharedByName: varchar("sharedByName", { length: 255 }),
  hotelName: varchar("hotelName", { length: 255 }).notNull(),
  hotelAddress: text("hotelAddress"),
  checkInDate: varchar("checkInDate", { length: 50 }),
  checkInTime: varchar("checkInTime", { length: 20 }),
  checkOutDate: varchar("checkOutDate", { length: 50 }),
  checkOutTime: varchar("checkOutTime", { length: 20 }),
  roomType: varchar("roomType", { length: 100 }),
  phone: varchar("phone", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SharedAccommodation = typeof sharedAccommodations.$inferSelect;
export type InsertSharedAccommodation = typeof sharedAccommodations.$inferInsert;

// ── 나라별 입국카드 설정 테이블 ──────────────────────────────────────────────────
export const immigrationCards = mysqlTable("immigration_cards", {
  id: int("id").autoincrement().primaryKey(),
  countryCode: varchar("countryCode", { length: 10 }).notNull(),
  countryName: varchar("countryName", { length: 100 }).notNull(),
  countryNameLocal: varchar("countryNameLocal", { length: 100 }),
  cardUrl: text("cardUrl").notNull(),
  cardName: varchar("cardName", { length: 255 }).notNull(),
  description: text("description"),
  requiredFields: text("requiredFields"), // JSON string: ["passport_number","flight_number","hotel_address",...]
  fieldLabels: text("fieldLabels"), // JSON string: {"passport_number":"여권번호","flight_number":"항공편명",...}
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ImmigrationCard = typeof immigrationCards.$inferSelect;
export type InsertImmigrationCard = typeof immigrationCards.$inferInsert;

// ── 단체예약 비용 관리 테이블 ──────────────────────────────────────────────────
export const bookingCosts = mysqlTable("booking_costs", {
  id: int("id").autoincrement().primaryKey(),
  meetupId: int("meetupId"),
  category: varchar("category", { length: 50 }).notNull(), // flight, hotel, transport, meal, activity, other
  itemName: varchar("itemName", { length: 255 }).notNull(),
  description: text("description"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("KRW"),
  usdtAmount: decimal("usdtAmount", { precision: 12, scale: 2 }),
  headCount: int("headCount").default(1),
  perPersonAmount: decimal("perPersonAmount", { precision: 12, scale: 2 }),
  perPersonUsdt: decimal("perPersonUsdt", { precision: 12, scale: 2 }),
  vendor: varchar("vendor", { length: 255 }),
  invoiceUrl: text("invoiceUrl"),
  notes: text("notes"),
  sourceType: varchar("sourceType", { length: 20 }).default("manual"), // manual, telegram_ocr
  telegramMessageId: varchar("telegramMessageId", { length: 50 }),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type BookingCost = typeof bookingCosts.$inferSelect;
export type InsertBookingCost = typeof bookingCosts.$inferInsert;

// ── 스케줄표 템플릿 테이블 ──────────────────────────────────────────────────
export const scheduleTemplates = mysqlTable("schedule_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  templateData: text("templateData").notNull(), // JSON: full schedule structure
  category: varchar("category", { length: 50 }).default("general"), // general, meetup, conference, trip
  createdBy: int("createdBy"),
  isPublic: boolean("isPublic").default(false),
  usageCount: int("usageCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ScheduleTemplate = typeof scheduleTemplates.$inferSelect;
export type InsertScheduleTemplate = typeof scheduleTemplates.$inferInsert;

// ── 스케줄표 공유 링크 테이블 ──────────────────────────────────────────────────
export const scheduleShares = mysqlTable("schedule_shares", {
  id: int("id").autoincrement().primaryKey(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  scheduleData: text("scheduleData").notNull(), // JSON: full schedule data
  meetupId: int("meetupId"),
  expiresAt: timestamp("expiresAt"),
  viewCount: int("viewCount").default(0),
  isActive: boolean("isActive").default(true),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ScheduleShare = typeof scheduleShares.$inferSelect;
export type InsertScheduleShare = typeof scheduleShares.$inferInsert;
