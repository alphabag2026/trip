import { eq, like, or, and, desc, asc, sql, gte, lte, between, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  meetups, InsertMeetup,
  registrations, InsertRegistration,
  travelInfo, InsertTravelInfo,
  itineraries, InsertItinerary,
  telegramConfig, InsertTelegramConfig,
  flightSchedules, InsertFlightSchedule,
  pickupAssignments, InsertPickupAssignment,
  accommodationAssignments, InsertAccommodationAssignment,
  scheduleEvents, InsertScheduleEvent,
  pickupPhotos, InsertPickupPhoto,
  modificationRequests, InsertModificationRequest,
  communicationChannels, InsertCommunicationChannel,
  messages, InsertMessage,
  vouchers, InsertVoucher,
  surveys, InsertSurvey,
  surveyResponses, InsertSurveyResponse,
  broadcastMessages, InsertBroadcastMessage,
  chatbotLogs, InsertChatbotLog,
  baggageTracking, InsertBaggageTracking,
  checkinInfo, InsertCheckinInfo,
  organizations, InsertOrganization,
  partnerCategories, InsertPartnerCategory,
  partners, InsertPartner,
  organizationMembers, InsertOrganizationMember,
  meetupPartners, InsertMeetupPartner,
  userProfiles, InsertUserProfile,
  passportInfo, InsertPassportInfo,
  invitations, InsertInvitation,
  hotelVouchers, InsertHotelVoucher,
  flightTickets, InsertFlightTicket,
  apiKeys, InsertApiKey,
  apiRequestLogs, InsertApiRequestLog,
  meetupExpenses, InsertMeetupExpense,
  auditLogs, InsertAuditLog,
  emailVerificationTokens, EmailVerificationToken,
  passwordResetTokens, PasswordResetToken,
  onboardingProgress, OnboardingProgress,
  roleDelegations, InsertRoleDelegation,
  adBanners, InsertAdBanner,
  organizerApprovals, InsertOrganizerApproval,
  vatRates, InsertVatRate,
  travelSearches, InsertTravelSearch,
  travelBookings, InsertTravelBooking,
  paymentTransactions, InsertPaymentTransaction,
  platformWallets, InsertPlatformWallet,
  walletTransactions, InsertWalletTransaction,
  paymentGatewayConfig, InsertPaymentGatewayConfig,
  rideProviders, InsertRideProvider,
  rideSearches, InsertRideSearch,
  rideBookings, InsertRideBooking,
  deliveryProviders, InsertDeliveryProvider,
  deliveryOrders, InsertDeliveryOrder,
  notes, InsertNote,
  teamSchedules, InsertTeamSchedule,
  translationRequests, InsertTranslationRequest,
  meetupSchedules, InsertMeetupSchedule,
  scheduleReminders, InsertScheduleReminder,
  scheduleRsvps, InsertScheduleRsvp,
  userLocations, InsertUserLocation,
  geofences, InsertGeofence,
  geofenceEvents, InsertGeofenceEvent,
  locationHistory, InsertLocationHistory,
  pushSubscriptions, InsertPushSubscriptionRow,
  placeFavorites, InsertPlaceFavorite,
  travelPolicies, InsertTravelPolicy,
  attendeeTiers, InsertAttendeeTier,
  emergencyContacts, InsertEmergencyContact,
  safetyAlerts, InsertSafetyAlert,
  rsvpReminderLogs, InsertRsvpReminderLog,
  rsvpReminderSettings, InsertRsvpReminderSetting,
  selfBookingRequests, InsertSelfBookingRequest,
  meetupInvitations,
  snsAccounts, InsertSnsAccount,
  snsPosts, InsertSnsPost,
  snsTemplates, InsertSnsTemplate,
  eventCheckins, InsertEventCheckin,
  userAccommodations, InsertUserAccommodation,
  immigrationCards, InsertImmigrationCard,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ── Users ──────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field]; if (value === undefined) return;
      const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error instanceof Error ? error.message : error);
    // Don't throw - login should still work even if upsert fails
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[DB] getUserByOpenId error:', error instanceof Error ? error.message : error);
    return undefined;
  }
}

// ── Meetups ────────────────────────────────────────
export async function createMeetup(data: InsertMeetup) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(meetups).values(data);
  return result[0].insertId;
}

export async function getMeetups(filters?: { type?: string; status?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(meetups.type, filters.type as any));
  if (filters?.status) conditions.push(eq(meetups.status, filters.status as any));
  return db.select().from(meetups).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(meetups.createdAt));
}

export async function getMeetupById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(meetups).where(eq(meetups.id, id)).limit(1);
  return result[0];
}

export async function updateMeetup(id: number, data: Partial<InsertMeetup>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(meetups).set(data).where(eq(meetups.id, id));
}

export async function deleteMeetup(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(meetups).where(eq(meetups.id, id));
}

export async function getMeetupByShareToken(token: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(meetups).where(eq(meetups.shareToken, token)).limit(1);
  return result[0];
}

export async function getMeetupByProjectCode(code: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(meetups).where(eq(meetups.projectCode, code)).limit(1);
  return result[0];
}

// ── Registrations (강화된 검색 필터) ──────────────
export async function createRegistration(data: InsertRegistration) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(registrations).values(data);
  return result[0].insertId;
}

export async function getRegistrations(filters?: {
  category?: string; status?: string; locationType?: string;
  meetupId?: number; search?: string;
  dateFrom?: string; dateTo?: string; country?: string;
  userId?: number;
}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.userId) conditions.push(eq(registrations.userId, filters.userId));
  if (filters?.category) conditions.push(eq(registrations.category, filters.category as any));
  if (filters?.status) conditions.push(eq(registrations.status, filters.status as any));
  if (filters?.locationType) conditions.push(eq(registrations.locationType, filters.locationType as any));
  if (filters?.meetupId) conditions.push(eq(registrations.meetupId, filters.meetupId));
  if (filters?.dateFrom) conditions.push(gte(registrations.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo) conditions.push(lte(registrations.createdAt, new Date(filters.dateTo)));
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(or(
      like(registrations.name, s), like(registrations.phone, s),
      like(registrations.messengerId, s), like(registrations.teamName, s),
      like(registrations.referrerName, s), like(registrations.walletAddress, s),
      like(registrations.notes, s),
    ));
  }
  return db.select().from(registrations).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(registrations.createdAt)).limit(500);
}

export async function getRegistrationById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
  return result[0];
}

export async function getRegistrationByNameAndPhone(name: string, phone: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(registrations).where(and(eq(registrations.name, name), eq(registrations.phone, phone))).orderBy(desc(registrations.createdAt));
}

export async function updateRegistration(id: number, data: Partial<InsertRegistration>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(registrations).set(data).where(eq(registrations.id, id));
}

export async function deleteRegistration(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(registrations).where(eq(registrations.id, id));
}

export async function getRegistrationStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, approved: 0, rejected: 0, domestic: 0, overseas: 0 };
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(registrations);
  const [pending] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "pending"));
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "approved"));
  const [rejected] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "rejected"));
  const [domestic] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.locationType, "domestic"));
  const [overseas] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.locationType, "overseas"));
  return { total: total.count, pending: pending.count, approved: approved.count, rejected: rejected.count, domestic: domestic.count, overseas: overseas.count };
}

// ── Travel Info ────────────────────────────────────
export async function getTravelInfoList() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(travelInfo).orderBy(travelInfo.countryNameKo);
}

export async function getTravelInfoByCountry(countryCode: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(travelInfo).where(eq(travelInfo.countryCode, countryCode)).limit(1);
  return result[0];
}

export async function upsertTravelInfo(data: InsertTravelInfo) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.insert(travelInfo).values(data).onDuplicateKeyUpdate({
    set: { countryName: data.countryName, countryNameKo: data.countryNameKo, requiredItems: data.requiredItems,
      immigrationUrl: data.immigrationUrl, immigrationNotes: data.immigrationNotes, visaRequired: data.visaRequired,
      visaNotes: data.visaNotes, emergencyContact: data.emergencyContact, timezone: data.timezone,
      currency: data.currency, language: data.language, plugType: data.plugType, additionalNotes: data.additionalNotes },
  });
}

export async function deleteTravelInfo(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(travelInfo).where(eq(travelInfo.id, id));
}

// ── Itineraries ────────────────────────────────────
export async function createItinerary(data: InsertItinerary) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(itineraries).values(data);
  return result[0].insertId;
}

export async function getItinerariesByRegistration(registrationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(itineraries).where(eq(itineraries.registrationId, registrationId)).orderBy(desc(itineraries.createdAt));
}

export async function getItineraryById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(itineraries).where(eq(itineraries.id, id)).limit(1);
  return result[0];
}

export async function updateItinerary(id: number, data: Partial<InsertItinerary>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(itineraries).set(data).where(eq(itineraries.id, id));
}

export async function deleteItinerary(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(itineraries).where(eq(itineraries.id, id));
}

export async function getAllItineraries() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(itineraries).orderBy(desc(itineraries.createdAt));
}

// ── Telegram Config ────────────────────────────────
export async function getTelegramConfig() {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(telegramConfig).limit(1);
  return result[0];
}

export async function upsertTelegramConfig(data: InsertTelegramConfig) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await getTelegramConfig();
  if (existing) { await db.update(telegramConfig).set(data).where(eq(telegramConfig.id, existing.id)); }
  else { await db.insert(telegramConfig).values(data); }
}

// ══════════════════════════════════════════════════════
// v2.0 NEW FUNCTIONS
// ══════════════════════════════════════════════════════

// ── Flight Schedules ──────────────────────────────
export async function createFlightSchedule(data: InsertFlightSchedule) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(flightSchedules).values(data);
  return result[0].insertId;
}

export async function getFlightSchedules(filters?: { meetupId?: number; registrationId?: number; direction?: string }) {
  const db = await getDb(); if (!db) return [];
  // 1) flight_schedules 테이블 조회
  const conditions = [];
  if (filters?.meetupId) conditions.push(eq(flightSchedules.meetupId, filters.meetupId));
  if (filters?.registrationId) conditions.push(eq(flightSchedules.registrationId, filters.registrationId));
  if (filters?.direction) conditions.push(eq(flightSchedules.direction, filters.direction as any));
  const schedules = await db.select().from(flightSchedules).where(conditions.length ? and(...conditions) : undefined).orderBy(flightSchedules.scheduledDeparture);

  // 2) flight_tickets 테이블도 조회하여 통합 (시뮬레이션 데이터 포함)
  const ticketConditions = [];
  if (filters?.meetupId) ticketConditions.push(eq(flightTickets.meetupId, filters.meetupId));
  if (filters?.registrationId) ticketConditions.push(eq(flightTickets.registrationId, filters.registrationId));
  const tickets = await db.select().from(flightTickets).where(ticketConditions.length ? and(...ticketConditions) : undefined).orderBy(flightTickets.createdAt);

  // 3) flight_tickets → flight_schedules 형식으로 변환
  const ticketAsSchedules = tickets.flatMap((t) => {
    const results: any[] = [];
    if (t.outboundFlightNo) {
      const depDate = t.outboundDepartureDate && t.outboundDepartureTime
        ? new Date(`${t.outboundDepartureDate}T${t.outboundDepartureTime}:00`)
        : null;
      const arrDate = t.outboundArrivalDate && t.outboundArrivalTime
        ? new Date(`${t.outboundArrivalDate}T${t.outboundArrivalTime}:00`)
        : null;
      results.push({
        id: t.id * -1,
        meetupId: t.meetupId,
        registrationId: t.registrationId,
        flightNo: t.outboundFlightNo,
        airline: t.outboundAirline || null,
        departureAirport: t.outboundDepartureAirport || null,
        arrivalAirport: t.outboundArrivalAirport || null,
        scheduledDeparture: depDate,
        scheduledArrival: arrDate,
        actualDeparture: null, actualArrival: null,
        delayMinutes: 0,
        flightStatus: "scheduled" as const,
        direction: "outbound" as const,
        notifiedDelay: false,
        createdAt: t.createdAt, updatedAt: t.updatedAt,
        _source: "ticket" as const,
      });
    }
    if (t.returnFlightNo) {
      const depDate = t.returnDepartureDate && t.returnDepartureTime
        ? new Date(`${t.returnDepartureDate}T${t.returnDepartureTime}:00`)
        : null;
      const arrDate = t.returnArrivalDate && t.returnArrivalTime
        ? new Date(`${t.returnArrivalDate}T${t.returnArrivalTime}:00`)
        : null;
      results.push({
        id: t.id * -1 - 100000,
        meetupId: t.meetupId,
        registrationId: t.registrationId,
        flightNo: t.returnFlightNo,
        airline: t.returnAirline || null,
        departureAirport: t.returnDepartureAirport || null,
        arrivalAirport: t.returnArrivalAirport || null,
        scheduledDeparture: depDate,
        scheduledArrival: arrDate,
        actualDeparture: null, actualArrival: null,
        delayMinutes: 0,
        flightStatus: "scheduled" as const,
        direction: "return" as const,
        notifiedDelay: false,
        createdAt: t.createdAt, updatedAt: t.updatedAt,
        _source: "ticket" as const,
      });
    }
    return results;
  });

  // 4) 중복 제거: flight_schedules에 이미 같은 flightNo가 있으면 ticket 데이터 제외
  const existingFlightNos = new Set(schedules.map(s => s.flightNo));
  const uniqueTickets = ticketAsSchedules.filter(t => !existingFlightNos.has(t.flightNo));
  const filteredTickets = filters?.direction
    ? uniqueTickets.filter(t => t.direction === filters.direction)
    : uniqueTickets;

  return [...schedules, ...filteredTickets];
}

export async function getFlightScheduleById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(flightSchedules).where(eq(flightSchedules.id, id)).limit(1);
  return result[0];
}

export async function updateFlightSchedule(id: number, data: Partial<InsertFlightSchedule>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(flightSchedules).set(data).where(eq(flightSchedules.id, id));
}

export async function deleteFlightSchedule(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(flightSchedules).where(eq(flightSchedules.id, id));
}

export async function getDelayedFlights() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(flightSchedules).where(
    or(eq(flightSchedules.flightStatus, "delayed"), sql`${flightSchedules.delayMinutes} > 0`)
  ).orderBy(flightSchedules.scheduledDeparture);
}

// ── Pickup Assignments ────────────────────────────
export async function createPickupAssignment(data: InsertPickupAssignment) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(pickupAssignments).values(data);
  return result[0].insertId;
}

export async function getPickupAssignments(meetupId?: number) {
  const db = await getDb(); if (!db) return [];
  if (meetupId) return db.select().from(pickupAssignments).where(eq(pickupAssignments.meetupId, meetupId)).orderBy(pickupAssignments.pickupTime);
  return db.select().from(pickupAssignments).orderBy(desc(pickupAssignments.createdAt));
}

export async function getPickupAssignmentById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(pickupAssignments).where(eq(pickupAssignments.id, id)).limit(1);
  return result[0];
}

export async function updatePickupAssignment(id: number, data: Partial<InsertPickupAssignment>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(pickupAssignments).set(data).where(eq(pickupAssignments.id, id));
}

export async function deletePickupAssignment(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(pickupAssignments).where(eq(pickupAssignments.id, id));
}

// ── Accommodation Assignments ─────────────────────
export async function createAccommodation(data: InsertAccommodationAssignment) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(accommodationAssignments).values(data);
  return result[0].insertId;
}

export async function getAccommodations(meetupId?: number) {
  const db = await getDb(); if (!db) return [];
  if (meetupId) return db.select().from(accommodationAssignments).where(eq(accommodationAssignments.meetupId, meetupId)).orderBy(accommodationAssignments.roomNumber);
  return db.select().from(accommodationAssignments).orderBy(desc(accommodationAssignments.createdAt));
}

export async function getAccommodationById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(accommodationAssignments).where(eq(accommodationAssignments.id, id)).limit(1);
  return result[0];
}

export async function updateAccommodation(id: number, data: Partial<InsertAccommodationAssignment>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(accommodationAssignments).set(data).where(eq(accommodationAssignments.id, id));
}

export async function deleteAccommodation(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(accommodationAssignments).where(eq(accommodationAssignments.id, id));
}

// ── Schedule Events ───────────────────────────────
export async function createScheduleEvent(data: InsertScheduleEvent) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(scheduleEvents).values(data);
  return result[0].insertId;
}

export async function getScheduleEvents(meetupId?: number) {
  const db = await getDb(); if (!db) return [];
  if (meetupId) return db.select().from(scheduleEvents).where(eq(scheduleEvents.meetupId, meetupId)).orderBy(scheduleEvents.eventTime);
  return db.select().from(scheduleEvents).orderBy(scheduleEvents.eventTime);
}

export async function getScheduleEventById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(scheduleEvents).where(eq(scheduleEvents.id, id)).limit(1);
  return result[0];
}

export async function updateScheduleEvent(id: number, data: Partial<InsertScheduleEvent>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(scheduleEvents).set(data).where(eq(scheduleEvents.id, id));
}

export async function deleteScheduleEvent(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(scheduleEvents).where(eq(scheduleEvents.id, id));
}

export async function getUpcomingEvents(minutesBefore: number = 10) {
  const db = await getDb(); if (!db) return [];
  const now = new Date();
  const threshold = new Date(now.getTime() + minutesBefore * 60 * 1000);
  return db.select().from(scheduleEvents).where(
    and(
      eq(scheduleEvents.notified, false),
      gte(scheduleEvents.eventTime, now),
      lte(scheduleEvents.eventTime, threshold),
    )
  ).orderBy(scheduleEvents.eventTime);
}

// ── Pickup Photos ─────────────────────────────────
export async function createPickupPhoto(data: InsertPickupPhoto) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(pickupPhotos).values(data);
  return result[0].insertId;
}

export async function getPickupPhotos(filters?: { meetupId?: number; pickupAssignmentId?: number; registrationId?: number; photoType?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.meetupId) conditions.push(eq(pickupPhotos.meetupId, filters.meetupId));
  if (filters?.pickupAssignmentId) conditions.push(eq(pickupPhotos.pickupAssignmentId, filters.pickupAssignmentId));
  if (filters?.registrationId) conditions.push(eq(pickupPhotos.registrationId, filters.registrationId));
  if (filters?.photoType) conditions.push(eq(pickupPhotos.photoType, filters.photoType as any));
  return db.select().from(pickupPhotos).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(pickupPhotos.createdAt));
}

export async function deletePickupPhoto(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(pickupPhotos).where(eq(pickupPhotos.id, id));
}

// ── Modification Requests ─────────────────────────
export async function createModificationRequest(data: InsertModificationRequest) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(modificationRequests).values(data);
  return result[0].insertId;
}

export async function getModificationRequests(filters?: { registrationId?: number; status?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.registrationId) conditions.push(eq(modificationRequests.registrationId, filters.registrationId));
  if (filters?.status) conditions.push(eq(modificationRequests.status, filters.status as any));
  return db.select().from(modificationRequests).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(modificationRequests.createdAt));
}

export async function getModificationRequestById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(modificationRequests).where(eq(modificationRequests.id, id)).limit(1);
  return result[0];
}

export async function updateModificationRequest(id: number, data: Partial<InsertModificationRequest>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(modificationRequests).set(data).where(eq(modificationRequests.id, id));
}

// ══════════════════════════════════════════════════════
// v3.0 NEW FUNCTIONS
// ══════════════════════════════════════════════════════

// ── Communication Channels ───────────────────────────
export async function createChannel(data: InsertCommunicationChannel) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(communicationChannels).values(data);
  return result[0].insertId;
}

export async function getChannels(meetupId?: number) {
  const db = await getDb(); if (!db) return [];
  if (meetupId) return db.select().from(communicationChannels).where(eq(communicationChannels.meetupId, meetupId)).orderBy(desc(communicationChannels.createdAt));
  return db.select().from(communicationChannels).orderBy(desc(communicationChannels.createdAt));
}

export async function getChannelById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(communicationChannels).where(eq(communicationChannels.id, id)).limit(1);
  return result[0];
}

export async function updateChannel(id: number, data: Partial<InsertCommunicationChannel>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(communicationChannels).set(data).where(eq(communicationChannels.id, id));
}

export async function deleteChannel(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(communicationChannels).where(eq(communicationChannels.id, id));
}

// ── Messages ─────────────────────────────────────────
export async function createMessage(data: InsertMessage) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(messages).values(data);
  return result[0].insertId;
}

export async function getMessages(channelId: number, limit: number = 100) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(messages).where(eq(messages.channelId, channelId)).orderBy(messages.createdAt).limit(limit);
}

export async function markMessagesRead(channelId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(messages).set({ isRead: true }).where(eq(messages.channelId, channelId));
}

export async function getUnreadCount(channelId: number) {
  const db = await getDb(); if (!db) return 0;
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(messages).where(and(eq(messages.channelId, channelId), eq(messages.isRead, false)));
  return result.count;
}

// ── Vouchers ─────────────────────────────────────────
export async function createVoucher(data: InsertVoucher) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(vouchers).values(data);
  return result[0].insertId;
}

export async function getVouchers(filters?: { registrationId?: number; meetupId?: number; voucherType?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.registrationId) conditions.push(eq(vouchers.registrationId, filters.registrationId));
  if (filters?.meetupId) conditions.push(eq(vouchers.meetupId, filters.meetupId));
  if (filters?.voucherType) conditions.push(eq(vouchers.voucherType, filters.voucherType as any));
  return db.select().from(vouchers).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(vouchers.createdAt));
}

export async function getVoucherById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(vouchers).where(eq(vouchers.id, id)).limit(1);
  return result[0];
}

export async function updateVoucher(id: number, data: Partial<InsertVoucher>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(vouchers).set(data).where(eq(vouchers.id, id));
}

export async function deleteVoucher(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(vouchers).where(eq(vouchers.id, id));
}

export async function getVouchersByRegistrationIds(regIds: number[]) {
  const db = await getDb(); if (!db) return [];
  if (regIds.length === 0) return [];
  return db.select().from(vouchers).where(sql`${vouchers.registrationId} IN (${sql.join(regIds.map(id => sql`${id}`), sql`, `)})`).orderBy(desc(vouchers.createdAt));
}

// ── Assignment Confirmation ──────────────────────────
export async function confirmAssignment(registrationId: number, type: 'flight' | 'accommodation' | 'pickup') {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const field = type === 'flight' ? { flightConfirmed: true } : type === 'accommodation' ? { accommodationConfirmed: true } : { pickupConfirmed: true };
  await db.update(registrations).set(field).where(eq(registrations.id, registrationId));
}

export async function getAssignmentsForRegistration(registrationId: number) {
  const db = await getDb(); if (!db) return { flights: [], pickups: [], accommodations: [] };
  const flights = await db.select().from(flightSchedules).where(eq(flightSchedules.registrationId, registrationId));
  const allPickups = await db.select().from(pickupAssignments);
  const pickups = allPickups.filter(p => {
    const ids = p.assignedRegistrationIds as number[] | null;
    return ids && ids.includes(registrationId);
  });
  const allAccom = await db.select().from(accommodationAssignments);
  const accommodations = allAccom.filter(a => {
    const ids = a.assignedRegistrationIds as number[] | null;
    return ids && ids.includes(registrationId);
  });
  return { flights, pickups, accommodations };
}

// ══════════════════════════════════════════════════════════
// v3.3 - Surveys, Broadcast Messages, AI Chatbot Logs
// ══════════════════════════════════════════════════════════

// ── Surveys ─────────────────────────────────────────────
export async function createSurvey(data: InsertSurvey) {
  const d = await getDb(); if (!d) return null;
  const [result] = await d.insert(surveys).values(data).$returningId();
  return result;
}

export async function getSurveys(meetupId?: number) {
  const d = await getDb(); if (!d) return [];
  let q = d.select().from(surveys);
  if (meetupId) q = q.where(eq(surveys.meetupId, meetupId)) as any;
  return q.orderBy(desc(surveys.createdAt));
}

export async function getSurveyById(id: number) {
  const d = await getDb(); if (!d) return null;
  const rows = await d.select().from(surveys).where(eq(surveys.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateSurvey(id: number, data: Partial<InsertSurvey>) {
  const d = await getDb(); if (!d) return;
  await d.update(surveys).set(data).where(eq(surveys.id, id));
}

export async function deleteSurvey(id: number) {
  const d = await getDb(); if (!d) return;
  await d.delete(surveyResponses).where(eq(surveyResponses.surveyId, id));
  await d.delete(surveys).where(eq(surveys.id, id));
}

// ── Survey Responses ────────────────────────────────────
export async function createSurveyResponse(data: InsertSurveyResponse) {
  const d = await getDb(); if (!d) return null;
  const [result] = await d.insert(surveyResponses).values(data).$returningId();
  return result;
}

export async function getSurveyResponses(surveyId: number) {
  const d = await getDb(); if (!d) return [];
  return d.select().from(surveyResponses).where(eq(surveyResponses.surveyId, surveyId)).orderBy(desc(surveyResponses.createdAt));
}

// ── Broadcast Messages ──────────────────────────────────
export async function createBroadcastMessage(data: InsertBroadcastMessage) {
  const d = await getDb(); if (!d) return null;
  const [result] = await d.insert(broadcastMessages).values(data).$returningId();
  return result;
}

export async function getBroadcastMessages() {
  const d = await getDb(); if (!d) return [];
  return d.select().from(broadcastMessages).orderBy(desc(broadcastMessages.createdAt));
}

// ── AI Chatbot Logs ─────────────────────────────────────
export async function createChatbotLog(data: InsertChatbotLog) {
  const d = await getDb(); if (!d) return null;
  const [result] = await d.insert(chatbotLogs).values(data).$returningId();
  return result;
}

export async function getChatbotLogs(sessionId: string) {
  const d = await getDb(); if (!d) return [];
  return d.select().from(chatbotLogs).where(eq(chatbotLogs.sessionId, sessionId)).orderBy(chatbotLogs.createdAt);
}

// ── Helper: Get approved registrations for broadcast ────
export async function getApprovedRegistrations(meetupId?: number) {
  const d = await getDb(); if (!d) return [];
  if (meetupId) {
    return d.select().from(registrations).where(and(eq(registrations.status, "approved"), eq(registrations.meetupId, meetupId)));
  }
  return d.select().from(registrations).where(eq(registrations.status, "approved"));
}


// ── Baggage Tracking ─────────────────────────────────────
export async function createBaggageTracking(data: InsertBaggageTracking) {
  const d = await getDb(); if (!d) return null;
  const [result] = await d.insert(baggageTracking).values(data).$returningId();
  return result;
}

export async function getBaggageByRegistration(registrationId: number) {
  const d = await getDb(); if (!d) return [];
  return d.select().from(baggageTracking).where(eq(baggageTracking.registrationId, registrationId)).orderBy(baggageTracking.createdAt);
}

export async function getBaggageByMeetup(meetupId: number) {
  const d = await getDb(); if (!d) return [];
  return d.select().from(baggageTracking).where(eq(baggageTracking.meetupId, meetupId)).orderBy(baggageTracking.createdAt);
}

export async function getAllBaggage() {
  const d = await getDb(); if (!d) return [];
  return d.select().from(baggageTracking).orderBy(desc(baggageTracking.createdAt));
}

export async function updateBaggageTracking(id: number, data: Partial<InsertBaggageTracking>) {
  const d = await getDb(); if (!d) return;
  await d.update(baggageTracking).set({ ...data, statusUpdatedAt: new Date() }).where(eq(baggageTracking.id, id));
}

export async function deleteBaggageTracking(id: number) {
  const d = await getDb(); if (!d) return;
  await d.delete(baggageTracking).where(eq(baggageTracking.id, id));
}

// ── Checkin Info ─────────────────────────────────────────
export async function createCheckinInfo(data: InsertCheckinInfo) {
  const d = await getDb(); if (!d) return null;
  const [result] = await d.insert(checkinInfo).values(data).$returningId();
  return result;
}

export async function getCheckinByRegistration(registrationId: number) {
  const d = await getDb(); if (!d) return [];
  return d.select().from(checkinInfo).where(eq(checkinInfo.registrationId, registrationId)).orderBy(checkinInfo.createdAt);
}

export async function getCheckinByMeetup(meetupId: number) {
  const d = await getDb(); if (!d) return [];
  return d.select().from(checkinInfo).where(eq(checkinInfo.meetupId, meetupId)).orderBy(checkinInfo.createdAt);
}

export async function getAllCheckins() {
  const d = await getDb(); if (!d) return [];
  return d.select().from(checkinInfo).orderBy(desc(checkinInfo.createdAt));
}

export async function updateCheckinInfo(id: number, data: Partial<InsertCheckinInfo>) {
  const d = await getDb(); if (!d) return;
  await d.update(checkinInfo).set(data).where(eq(checkinInfo.id, id));
}

export async function deleteCheckinInfo(id: number) {
  const d = await getDb(); if (!d) return;
  await d.delete(checkinInfo).where(eq(checkinInfo.id, id));
}


// ══════════════════════════════════════════════════════════
// v3.8 - 식사 통계, 프로필 수정, 호텔 방 배정
// ══════════════════════════════════════════════════════════

export async function getMealStats(meetupId?: number) {
  const d = await getDb(); if (!d) return { mealPreferences: {}, allergies: {}, drinkAlcohol: {}, smoking: {}, total: 0 };
  const where = meetupId ? eq(registrations.meetupId, meetupId) : undefined;
  const rows = where
    ? await d.select().from(registrations).where(where)
    : await d.select().from(registrations);
  const mealPreferences: Record<string, number> = {};
  const allergiesMap: Record<string, number> = {};
  const drinkAlcoholMap: Record<string, number> = {};
  const smokingMap: Record<string, number> = {};
  for (const r of rows) {
    if (r.mealPreference) mealPreferences[r.mealPreference] = (mealPreferences[r.mealPreference] || 0) + 1;
    if (r.allergies) {
      for (const a of r.allergies.split(/[,，、]/).map(s => s.trim()).filter(Boolean)) {
        allergiesMap[a] = (allergiesMap[a] || 0) + 1;
      }
    }
    if (r.drinkAlcohol) drinkAlcoholMap[r.drinkAlcohol] = (drinkAlcoholMap[r.drinkAlcohol] || 0) + 1;
    if (r.smoking) smokingMap[r.smoking] = (smokingMap[r.smoking] || 0) + 1;
  }
  return { mealPreferences, allergies: allergiesMap, drinkAlcohol: drinkAlcoholMap, smoking: smokingMap, total: rows.length };
}

export async function updateRegistrationProfile(id: number, data: {
  mealPreference?: string; allergies?: string; drinkAlcohol?: string; smoking?: string;
  preferredDepartureTime?: string; checkedBagRequest?: boolean; checkedBagCount?: number;
  checkedBagWeight?: string; checkedBagNotes?: string; roommatePreference?: string;
}) {
  const d = await getDb(); if (!d) return;
  await d.update(registrations).set(data as any).where(eq(registrations.id, id));
}

export async function updateHotelRoom(registrationId: number, data: {
  hotelRoomNumber?: string | null; hotelFloor?: string | null; hotelNotes?: string | null;
}) {
  const d = await getDb(); if (!d) return;
  await d.update(registrations).set(data as any).where(eq(registrations.id, registrationId));
}

export async function getHotelRoomAssignments(meetupId?: number) {
  const d = await getDb(); if (!d) return [];
  const where = meetupId ? eq(registrations.meetupId, meetupId) : undefined;
  const rows = where
    ? await d.select().from(registrations).where(where).orderBy(registrations.hotelRoomNumber)
    : await d.select().from(registrations).orderBy(registrations.hotelRoomNumber);
  return rows;
}

export async function bulkUpdateHotelRooms(assignments: { registrationId: number; roomNumber: string; floor?: string; notes?: string }[]) {
  const d = await getDb(); if (!d) return;
  for (const a of assignments) {
    await d.update(registrations).set({
      hotelRoomNumber: a.roomNumber,
      hotelFloor: a.floor || null,
      hotelNotes: a.notes || null,
    } as any).where(eq(registrations.id, a.registrationId));
  }
}

// ══════════════════════════════════════════════════════════
// v4.0 - Organizations, Partners, Members
// ══════════════════════════════════════════════════════════

// ── Organizations ──────────────────────────────────────
export async function createOrganization(data: InsertOrganization) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(organizations).values(data).$returningId();
  return result;
}

export async function getOrganizations(type?: string) {
  const db = await getDb(); if (!db) return [];
  if (type) {
    return db.select().from(organizations).where(eq(organizations.type, type as any)).orderBy(desc(organizations.createdAt));
  }
  return db.select().from(organizations).orderBy(desc(organizations.createdAt));
}

export async function getOrganizationById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(organizations).where(eq(organizations.id, id));
  return rows[0] || null;
}

export async function updateOrganization(id: number, data: Partial<InsertOrganization>) {
  const db = await getDb(); if (!db) return;
  await db.update(organizations).set(data).where(eq(organizations.id, id));
}

export async function deleteOrganization(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(organizations).where(eq(organizations.id, id));
}

// ── Partner Categories ──────────────────────────────────
export async function createPartnerCategory(data: InsertPartnerCategory) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(partnerCategories).values(data).$returningId();
  return result;
}

export async function getPartnerCategories() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(partnerCategories).orderBy(partnerCategories.sortOrder);
}

export async function updatePartnerCategory(id: number, data: Partial<InsertPartnerCategory>) {
  const db = await getDb(); if (!db) return;
  await db.update(partnerCategories).set(data).where(eq(partnerCategories.id, id));
}

export async function deletePartnerCategory(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(partnerCategories).where(eq(partnerCategories.id, id));
}

// ── Partners ──────────────────────────────────────────
export async function createPartner(data: InsertPartner) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(partners).values(data).$returningId();
  return result;
}

export async function getPartners(filters?: { categoryId?: number; organizationId?: number; region?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [];
  if (filters?.categoryId) conditions.push(eq(partners.categoryId, filters.categoryId));
  if (filters?.organizationId) conditions.push(eq(partners.organizationId, filters.organizationId));
  if (filters?.region) conditions.push(eq(partners.region, filters.region));
  if (conditions.length > 0) {
    return db.select().from(partners).where(and(...conditions)).orderBy(desc(partners.createdAt));
  }
  return db.select().from(partners).orderBy(desc(partners.createdAt));
}

export async function getPartnerById(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(partners).where(eq(partners.id, id));
  return rows[0] || null;
}

export async function updatePartner(id: number, data: Partial<InsertPartner>) {
  const db = await getDb(); if (!db) return;
  await db.update(partners).set(data).where(eq(partners.id, id));
}

export async function deletePartner(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(partners).where(eq(partners.id, id));
}

// ── Organization Members ──────────────────────────────
export async function addOrganizationMember(data: InsertOrganizationMember) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(organizationMembers).values(data).$returningId();
  return result;
}

export async function getOrganizationMembers(organizationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
}

export async function removeOrganizationMember(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
}

// ── Meetup Partners ──────────────────────────────────
export async function addMeetupPartner(data: InsertMeetupPartner) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(meetupPartners).values(data).$returningId();
  return result;
}

export async function getMeetupPartners(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(meetupPartners).where(eq(meetupPartners.meetupId, meetupId));
}

export async function updateMeetupPartner(id: number, data: Partial<InsertMeetupPartner>) {
  const db = await getDb(); if (!db) return;
  await db.update(meetupPartners).set(data).where(eq(meetupPartners.id, id));
}

export async function removeMeetupPartner(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(meetupPartners).where(eq(meetupPartners.id, id));
}

// ── Platform Stats (슈퍼어드민 대시보드) ──────────────
export async function getPlatformStats() {
  const db = await getDb(); if (!db) return null;
  const [orgCount] = await db.select({ count: sql<number>`count(*)` }).from(organizations);
  const [partnerCount] = await db.select({ count: sql<number>`count(*)` }).from(partners);
  const [meetupCount] = await db.select({ count: sql<number>`count(*)` }).from(meetups);
  const [regCount] = await db.select({ count: sql<number>`count(*)` }).from(registrations);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  
  // 조직 유형별 통계
  const orgByType = await db.select({
    type: organizations.type,
    count: sql<number>`count(*)`
  }).from(organizations).groupBy(organizations.type);
  
  // 파트너 카테고리별 통계
  const partnerByCategory = await db.select({
    categoryId: partners.categoryId,
    count: sql<number>`count(*)`
  }).from(partners).groupBy(partners.categoryId);

  return {
    totalOrganizations: orgCount?.count || 0,
    totalPartners: partnerCount?.count || 0,
    totalMeetups: meetupCount?.count || 0,
    totalRegistrations: regCount?.count || 0,
    totalUsers: userCount?.count || 0,
    orgByType,
    partnerByCategory,
  };
}

// ── User Role Management ──────────────────────────────
export async function updateUserRole(userId: number, role: string, organizationId?: number) {
  const db = await getDb(); if (!db) return;
  const updateData: any = { role };
  if (organizationId !== undefined) updateData.organizationId = organizationId;
  await db.update(users).set(updateData).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ══════════════════════════════════════════════════════════
// v4.2 - 프로필 / 여권 / 출장이력
// ══════════════════════════════════════════════════════════

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  return rows[0] || null;
}

export async function upsertUserProfile(userId: number, data: Partial<InsertUserProfile>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getUserProfile(userId);
  if (existing) {
    await db.update(userProfiles).set({ ...data, userId }).where(eq(userProfiles.userId, userId));
    return { ...existing, ...data };
  } else {
    const result = await db.insert(userProfiles).values({ ...data, userId });
    return { id: Number((result as any)[0].insertId), userId, ...data };
  }
}

export async function getPassportInfo(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(passportInfo).where(eq(passportInfo.userId, userId));
  return rows[0] || null;
}

export async function upsertPassportInfo(userId: number, data: Partial<InsertPassportInfo>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getPassportInfo(userId);
  if (existing) {
    await db.update(passportInfo).set({ ...data, userId }).where(eq(passportInfo.userId, userId));
    return { ...existing, ...data };
  } else {
    const result = await db.insert(passportInfo).values({ ...data, userId });
    return { id: Number((result as any)[0].insertId), userId, ...data };
  }
}

export async function getOnboardingStatus(userId: number) {
  const profile = await getUserProfile(userId);
  const passport = await getPassportInfo(userId);
  return {
    hasProfile: !!profile,
    hasPassport: !!passport,
    profileCompleted: !!profile?.onboardingCompleted,
    passportRegistered: !!passport?.passportNumber,
    onboardingCompleted: !!profile?.onboardingCompleted,
  };
}

export async function getTripHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // 사용자의 이름/이메일로 registrations에서 참여 이력 조회
  // 먼저 user 정보 가져오기
  const userRows = await db.select().from(users).where(eq(users.id, userId));
  const user = userRows[0];
  if (!user) return [];

  // registrations에서 해당 사용자의 참여 기록 조회 (이름 또는 messengerId 기반)
  const allRegs = await db.select().from(registrations);
  const userRegs = allRegs.filter((r: any) => {
    if (user.name && r.name && r.name.toLowerCase() === user.name.toLowerCase()) return true;
    if (user.email && r.messengerId && r.messengerId.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  });

  // 밋업 정보와 조인
  const allMeetups = await db.select().from(meetups);
  const meetupMap = new Map(allMeetups.map((m: any) => [m.id, m]));

  return userRegs.map((reg: any) => {
    const meetup = meetupMap.get(reg.meetupId);
    return {
      id: reg.id,
      meetupId: reg.meetupId,
      meetupTitle: meetup?.title || "알 수 없음",
      destination: meetup?.destinationCountry || meetup?.location || "-",
      scheduleStart: meetup?.scheduleStart || reg.scheduleStart,
      scheduleEnd: meetup?.scheduleEnd || reg.scheduleEnd,
      status: reg.status,
      registeredAt: reg.createdAt,
      hotelRoom: reg.hotelRoomNumber,
      flightConfirmed: reg.flightConfirmed,
      accommodationConfirmed: reg.accommodationConfirmed,
    };
  }).sort((a: any, b: any) => {
    const dateA = a.scheduleStart ? new Date(a.scheduleStart).getTime() : 0;
    const dateB = b.scheduleStart ? new Date(b.scheduleStart).getTime() : 0;
    return dateB - dateA;
  });
}


// ── Invitations (초대) ──────────────────────────────────
export async function createInvitation(data: InsertInvitation) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(invitations).values(data);
  return { id: result[0].insertId };
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(invitations).where(eq(invitations.inviteToken, token));
  return rows[0] || null;
}

export async function getInvitationsByOrg(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invitations).where(eq(invitations.organizationId, organizationId));
}

export async function updateInvitation(id: number, data: Partial<InsertInvitation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(invitations).set(data).where(eq(invitations.id, id));
}

export async function cancelInvitation(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(invitations).set({ status: "cancelled" }).where(eq(invitations.id, id));
}

// ── Role-based Dashboard Data ──────────────────────────
export async function getOrganizerDashboardData(userId: number) {
  const db = await getDb();
  if (!db) return { meetups: [], registrations: [], totalAttendees: 0, pendingRegistrations: 0, flightAssigned: 0, hotelAssigned: 0, pickupAssigned: 0, scheduleCount: 0 };

  // organizer가 생성한 밋업 또는 소속 조직의 밋업
  const userRow = await db.select().from(users).where(eq(users.id, userId));
  const user = userRow[0];
  if (!user) return { meetups: [], registrations: [], totalAttendees: 0, pendingRegistrations: 0, flightAssigned: 0, hotelAssigned: 0, pickupAssigned: 0, scheduleCount: 0 };

  const allMeetups = await db.select().from(meetups);
  const allRegs = await db.select().from(registrations);

  // 소속 조직의 멤버인 경우 해당 조직의 밋업 표시
  const memberRows = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  const orgIds = memberRows.map((m: any) => m.organizationId);

  // 사용자가 만든 밋업 또는 조직 관련 밋업
  const myMeetups = allMeetups;
  const myRegs = allRegs.filter((r: any) => myMeetups.some((m: any) => m.id === r.meetupId));

  // 항공편/호텔/픽업/일정 배정 수 조회
  const meetupIds = myMeetups.map((m: any) => m.id);
  let flightAssigned = 0, hotelAssigned = 0, pickupAssigned = 0, scheduleCount = 0;
  if (meetupIds.length > 0) {
    const allFlights = await db.select().from(flightSchedules);
    flightAssigned = allFlights.filter((f: any) => meetupIds.includes(f.meetupId)).length;
    const allHotels = await db.select().from(hotelVouchers);
    hotelAssigned = allHotels.filter((h: any) => meetupIds.includes(h.meetupId)).length;
    const allPickups = await db.select().from(pickupAssignments);
    pickupAssigned = allPickups.filter((p: any) => meetupIds.includes(p.meetupId)).length;
    const allSchedules = await db.select().from(scheduleEvents);
    scheduleCount = allSchedules.filter((s: any) => meetupIds.includes(s.meetupId)).length;
  }

  return {
    meetups: myMeetups.slice(0, 10),
    registrations: myRegs.slice(0, 20),
    totalAttendees: myRegs.length,
    pendingRegistrations: myRegs.filter((r: any) => r.status === "pending").length,
    orgIds,
    flightAssigned,
    hotelAssigned,
    pickupAssigned,
    scheduleCount,
  };
}

export async function getAgencyDashboardData(userId: number) {
  const db = await getDb();
  if (!db) return { organization: null, partners: [], members: [], meetupPartners: [] };

  // 사용자가 소속된 조직 찾기
  const memberRows = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  if (memberRows.length === 0) return { organization: null, partners: [], members: [], meetupPartners: [] };

  const orgId = memberRows[0].organizationId;
  const orgRows = await db.select().from(organizations).where(eq(organizations.id, orgId));
  const org = orgRows[0] || null;

  // 소속 파트너 업체
  const orgPartners = await db.select().from(partners).where(eq(partners.organizationId, orgId));

  // 조직 멤버
  const orgMembers = await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, orgId));

  return {
    organization: org,
    partners: orgPartners,
    members: orgMembers,
    totalPartners: orgPartners.length,
    activePartners: orgPartners.filter((p: any) => p.isActive).length,
  };
}

export async function getPartnerDashboardData(userId: number) {
  const db = await getDb();
  if (!db) return { partner: null, partners: [], meetupPartners: [], totalServices: 0, completedServices: 0 };

  // 사용자가 소속된 조직 찾기
  const memberRows = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  if (memberRows.length === 0) return { partner: null, partners: [], meetupPartners: [], totalServices: 0, completedServices: 0 };

  const orgId = memberRows[0].organizationId;

  // 해당 조직에 연결된 파트너 정보
  const orgPartners = await db.select().from(partners).where(eq(partners.organizationId, orgId));
  const partner = orgPartners[0] || null;

  // 파트너가 참여한 밋업
  const allMeetupPartners = await db.select().from(meetupPartners);
  const myMeetupPartners = allMeetupPartners.filter((mp: any) =>
    orgPartners.some((p: any) => p.id === mp.partnerId)
  );

  // 밋업 정보 조인
  const allMeetups = await db.select().from(meetups);
  const meetupMap = new Map(allMeetups.map((m: any) => [m.id, m]));

  const enrichedMeetupPartners = myMeetupPartners.map((mp: any) => ({
    ...mp,
    meetup: meetupMap.get(mp.meetupId) || null,
  }));

  return {
    partner,
    partners: orgPartners,
    meetupPartners: enrichedMeetupPartners,
    totalServices: myMeetupPartners.length,
    completedServices: myMeetupPartners.filter((mp: any) => mp.status === "completed").length,
  };
}

// ══════════════════════════════════════════════════════════
// v4.5 - Hotel Vouchers & Flight Tickets
// ══════════════════════════════════════════════════════════

// ── Hotel Vouchers ──────────────────────────────────────
export async function createHotelVoucher(data: InsertHotelVoucher) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(hotelVouchers).values(data);
  return result[0].insertId;
}

export async function getHotelVoucher(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(hotelVouchers).where(eq(hotelVouchers.id, id));
  return rows[0] ?? null;
}

export async function getHotelVouchersByRegistration(registrationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(hotelVouchers)
    .where(eq(hotelVouchers.registrationId, registrationId))
    .orderBy(desc(hotelVouchers.createdAt));
}

export async function getHotelVouchersByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(hotelVouchers)
    .where(eq(hotelVouchers.meetupId, meetupId))
    .orderBy(desc(hotelVouchers.createdAt));
}

export async function getAllHotelVouchers() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(hotelVouchers).orderBy(desc(hotelVouchers.createdAt));
}

export async function updateHotelVoucher(id: number, data: Partial<InsertHotelVoucher>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(hotelVouchers).set(data).where(eq(hotelVouchers.id, id));
}

export async function deleteHotelVoucher(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(hotelVouchers).where(eq(hotelVouchers.id, id));
}

// ── Flight Tickets ──────────────────────────────────────
export async function createFlightTicket(data: InsertFlightTicket) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(flightTickets).values(data);
  return result[0].insertId;
}

export async function getFlightTicket(id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(flightTickets).where(eq(flightTickets.id, id));
  return rows[0] ?? null;
}

export async function getFlightTicketsByRegistration(registrationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(flightTickets)
    .where(eq(flightTickets.registrationId, registrationId))
    .orderBy(desc(flightTickets.createdAt));
}

export async function getFlightTicketsByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(flightTickets)
    .where(eq(flightTickets.meetupId, meetupId))
    .orderBy(desc(flightTickets.createdAt));
}

export async function getAllFlightTickets() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(flightTickets).orderBy(desc(flightTickets.createdAt));
}

export async function updateFlightTicket(id: number, data: Partial<InsertFlightTicket>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(flightTickets).set(data).where(eq(flightTickets.id, id));
}

export async function deleteFlightTicket(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(flightTickets).where(eq(flightTickets.id, id));
}

// ── User-specific vouchers/tickets ──────────────────────
export async function getHotelVouchersByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(hotelVouchers)
    .where(eq(hotelVouchers.userId, userId))
    .orderBy(desc(hotelVouchers.createdAt));
}

export async function getFlightTicketsByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(flightTickets)
    .where(eq(flightTickets.userId, userId))
    .orderBy(desc(flightTickets.createdAt));
}

// ── Bulk Operations ──────────────────────────────────────
export async function bulkCreateHotelVouchers(dataList: InsertHotelVoucher[]) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return [];
  const result = await db.insert(hotelVouchers).values(dataList);
  return result[0].insertId;
}

export async function bulkCreateFlightTickets(dataList: InsertFlightTicket[]) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return [];
  const result = await db.insert(flightTickets).values(dataList);
  return result[0].insertId;
}

// ── Immigration Checklist helpers ──────────────────────────
export async function getUserImmigrationStatus(userId: number) {
  const db = await getDb(); if (!db) return { passport: null, vouchers: [], tickets: [] };
  const passportRows = await db.select().from(passportInfo).where(eq(passportInfo.userId, userId));
  const voucherRows = await db.select().from(hotelVouchers).where(eq(hotelVouchers.userId, userId)).orderBy(desc(hotelVouchers.createdAt));
  const ticketRows = await db.select().from(flightTickets).where(eq(flightTickets.userId, userId)).orderBy(desc(flightTickets.createdAt));
  return {
    passport: passportRows[0] ?? null,
    vouchers: voucherRows,
    tickets: ticketRows,
  };
}

// ══════════════════════════════════════════════════════════
// v5.0 - Affiliate Booking System
// ══════════════════════════════════════════════════════════

import {
  bookingSearches, InsertBookingSearch,
  bookingLinks, InsertBookingLink,
  affiliateRevenue, InsertAffiliateRevenue,
  affiliateSettings, InsertAffiliateSetting,
} from "../drizzle/schema";

// ── Booking Searches ──────────────────────────────────────
export async function createBookingSearch(data: InsertBookingSearch) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(bookingSearches).values(data);
  return result[0].insertId;
}

export async function getBookingSearches(filters?: { meetupId?: number; searchType?: string; source?: string; limit?: number }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.meetupId) conditions.push(eq(bookingSearches.meetupId, filters.meetupId));
  if (filters?.searchType) conditions.push(eq(bookingSearches.searchType, filters.searchType as any));
  if (filters?.source) conditions.push(eq(bookingSearches.source, filters.source as any));
  const query = db.select().from(bookingSearches)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bookingSearches.createdAt));
  if (filters?.limit) return query.limit(filters.limit);
  return query;
}

export async function getBookingSearchById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(bookingSearches).where(eq(bookingSearches.id, id)).limit(1);
  return result[0];
}

export async function updateBookingSearch(id: number, data: Partial<InsertBookingSearch>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(bookingSearches).set(data).where(eq(bookingSearches.id, id));
}

// ── Booking Links ──────────────────────────────────────────
export async function createBookingLink(data: InsertBookingLink) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(bookingLinks).values(data);
  return result[0].insertId;
}

export async function getBookingLinks(filters?: { searchId?: number; meetupId?: number; platform?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.searchId) conditions.push(eq(bookingLinks.searchId, filters.searchId));
  if (filters?.meetupId) conditions.push(eq(bookingLinks.meetupId, filters.meetupId));
  if (filters?.platform) conditions.push(eq(bookingLinks.platform, filters.platform as any));
  return db.select().from(bookingLinks)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(bookingLinks.createdAt));
}

export async function incrementBookingLinkClick(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(bookingLinks).set({
    clickCount: sql`${bookingLinks.clickCount} + 1`,
    lastClickedAt: new Date(),
  }).where(eq(bookingLinks.id, id));
}

export async function updateBookingLink(id: number, data: Partial<InsertBookingLink>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(bookingLinks).set(data).where(eq(bookingLinks.id, id));
}

// ── Affiliate Revenue ──────────────────────────────────────
export async function createAffiliateRevenue(data: InsertAffiliateRevenue) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(affiliateRevenue).values(data);
  return result[0].insertId;
}

export async function getAffiliateRevenue(filters?: { meetupId?: number; platform?: string; status?: string; revenueMonth?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.meetupId) conditions.push(eq(affiliateRevenue.meetupId, filters.meetupId));
  if (filters?.platform) conditions.push(eq(affiliateRevenue.platform, filters.platform as any));
  if (filters?.status) conditions.push(eq(affiliateRevenue.status, filters.status as any));
  if (filters?.revenueMonth) conditions.push(eq(affiliateRevenue.revenueMonth, filters.revenueMonth));
  return db.select().from(affiliateRevenue)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(affiliateRevenue.createdAt));
}

export async function getRevenueStats() {
  const db = await getDb();
  if (!db) return { totalRevenue: "0", pendingRevenue: "0", confirmedRevenue: "0", paidRevenue: "0", totalBookings: 0, totalClicks: 0 };
  const [totalRev] = await db.select({ sum: sql<string>`COALESCE(SUM(CAST(commissionAmount AS DECIMAL(10,2))), 0)` }).from(affiliateRevenue);
  const [pendingRev] = await db.select({ sum: sql<string>`COALESCE(SUM(CAST(commissionAmount AS DECIMAL(10,2))), 0)` }).from(affiliateRevenue).where(eq(affiliateRevenue.status, "pending"));
  const [confirmedRev] = await db.select({ sum: sql<string>`COALESCE(SUM(CAST(commissionAmount AS DECIMAL(10,2))), 0)` }).from(affiliateRevenue).where(eq(affiliateRevenue.status, "confirmed"));
  const [paidRev] = await db.select({ sum: sql<string>`COALESCE(SUM(CAST(commissionAmount AS DECIMAL(10,2))), 0)` }).from(affiliateRevenue).where(eq(affiliateRevenue.status, "paid"));
  const [bookingCount] = await db.select({ count: sql<number>`count(*)` }).from(affiliateRevenue);
  const [clickCount] = await db.select({ sum: sql<number>`COALESCE(SUM(clickCount), 0)` }).from(bookingLinks);
  return {
    totalRevenue: totalRev.sum,
    pendingRevenue: pendingRev.sum,
    confirmedRevenue: confirmedRev.sum,
    paidRevenue: paidRev.sum,
    totalBookings: bookingCount.count,
    totalClicks: clickCount.sum,
  };
}

export async function getRevenueByCategoryAndPlatform() {
  const db = await getDb(); if (!db) return [];
  return db.select({
    platform: affiliateRevenue.platform,
    revenueType: affiliateRevenue.revenueType,
    total: sql<string>`COALESCE(SUM(CAST(commissionAmount AS DECIMAL(10,2))), 0)`,
    count: sql<number>`count(*)`,
  }).from(affiliateRevenue).groupBy(affiliateRevenue.platform, affiliateRevenue.revenueType);
}

export async function getMonthlyRevenue(months: number = 6) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    month: affiliateRevenue.revenueMonth,
    platform: affiliateRevenue.platform,
    total: sql<string>`COALESCE(SUM(CAST(commissionAmount AS DECIMAL(10,2))), 0)`,
    count: sql<number>`count(*)`,
  }).from(affiliateRevenue)
    .where(affiliateRevenue.revenueMonth ? gte(affiliateRevenue.revenueMonth, sql`DATE_FORMAT(DATE_SUB(NOW(), INTERVAL ${months} MONTH), '%Y-%m')`) : undefined)
    .groupBy(affiliateRevenue.revenueMonth, affiliateRevenue.platform)
    .orderBy(affiliateRevenue.revenueMonth);
}

export async function updateAffiliateRevenue(id: number, data: Partial<InsertAffiliateRevenue>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(affiliateRevenue).set(data).where(eq(affiliateRevenue.id, id));
}

// ── Affiliate Settings ──────────────────────────────────────
export async function getAffiliateSettings() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(affiliateSettings).orderBy(affiliateSettings.platform);
}

export async function getAffiliateSettingByPlatform(platform: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(affiliateSettings).where(eq(affiliateSettings.platform, platform as any)).limit(1);
  return result[0];
}

export async function upsertAffiliateSetting(data: InsertAffiliateSetting) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.insert(affiliateSettings).values(data).onDuplicateKeyUpdate({
    set: {
      affiliateId: data.affiliateId,
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
      marker: data.marker,
      isActive: data.isActive,
      commissionRateFlight: data.commissionRateFlight,
      commissionRateHotel: data.commissionRateHotel,
      commissionRateTour: data.commissionRateTour,
      notes: data.notes,
    },
  });
}


// ── API Keys ──────────────────────────────────────────────
export async function createApiKey(data: InsertApiKey) {
  const db = await getDb();
  const result = await db!.insert(apiKeys).values(data);
  return result[0].insertId;
}

export async function getApiKeyByHash(keyHash: string) {
  const db = await getDb();
  const rows = await db!.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);
  return rows[0] || null;
}

export async function getApiKeysByUser(userId: number) {
  const db = await getDb();
  return db!.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt));
}

export async function getApiKeysByOrg(organizationId: number) {
  const db = await getDb();
  return db!.select().from(apiKeys).where(eq(apiKeys.organizationId, organizationId)).orderBy(desc(apiKeys.createdAt));
}

export async function getAllApiKeys() {
  const db = await getDb();
  return db!.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
}

export async function updateApiKey(id: number, data: Partial<InsertApiKey>) {
  const db = await getDb();
  await db!.update(apiKeys).set(data).where(eq(apiKeys.id, id));
}

export async function deleteApiKey(id: number) {
  const db = await getDb();
  await db!.delete(apiKeys).where(eq(apiKeys.id, id));
}

export async function updateApiKeyLastUsed(id: number) {
  const db = await getDb();
  await db!.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
}

export async function createApiRequestLog(data: InsertApiRequestLog) {
  const db = await getDb();
  await db!.insert(apiRequestLogs).values(data);
}

export async function getApiRequestLogs(apiKeyId: number, limit: number = 100) {
  const db = await getDb();
  return db!.select().from(apiRequestLogs).where(eq(apiRequestLogs.apiKeyId, apiKeyId)).orderBy(desc(apiRequestLogs.createdAt)).limit(limit);
}

export async function getApiUsageStats(apiKeyId: number) {
  const db = await getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [hourly] = await db!.select({ count: sql<number>`count(*)` }).from(apiRequestLogs).where(and(eq(apiRequestLogs.apiKeyId, apiKeyId), gte(apiRequestLogs.createdAt, oneHourAgo)));
  const [daily] = await db!.select({ count: sql<number>`count(*)` }).from(apiRequestLogs).where(and(eq(apiRequestLogs.apiKeyId, apiKeyId), gte(apiRequestLogs.createdAt, oneDayAgo)));
  return { hourlyRequests: hourly?.count || 0, dailyRequests: daily?.count || 0 };
}


// ══════════════════════════════════════════════════════════
// v5.2 - Telegram Uploads & Community Chat
// ══════════════════════════════════════════════════════════

import {
  telegramUploads, InsertTelegramUpload,
  chatRooms, InsertChatRoom,
  chatRoomMembers, InsertChatRoomMember,
  chatMessages, InsertChatMessage,
} from "../drizzle/schema";

// ── Telegram Uploads ─────────────────────────────────────
export async function createTelegramUpload(data: InsertTelegramUpload) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(telegramUploads).values(data);
  return result[0].insertId;
}

export async function getTelegramUploads(filters?: { status?: string; parsedType?: string; meetupId?: number; limit?: number }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.status) conditions.push(eq(telegramUploads.status, filters.status as any));
  if (filters?.parsedType) conditions.push(eq(telegramUploads.parsedType, filters.parsedType as any));
  if (filters?.meetupId) conditions.push(eq(telegramUploads.meetupId, filters.meetupId));
  return db.select().from(telegramUploads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(telegramUploads.createdAt))
    .limit(filters?.limit || 100);
}

export async function getTelegramUploadById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(telegramUploads).where(eq(telegramUploads.id, id)).limit(1);
  return result[0];
}

export async function updateTelegramUpload(id: number, data: Partial<InsertTelegramUpload>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(telegramUploads).set(data).where(eq(telegramUploads.id, id));
}

export async function deleteTelegramUpload(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(telegramUploads).where(eq(telegramUploads.id, id));
}

export async function getTelegramUploadStats() {
  const db = await getDb(); if (!db) return { total: 0, pending: 0, parsed: 0, approved: 0, applied: 0, rejected: 0 };
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(telegramUploads);
  const [pending] = await db.select({ count: sql<number>`count(*)` }).from(telegramUploads).where(eq(telegramUploads.status, "pending"));
  const [parsed] = await db.select({ count: sql<number>`count(*)` }).from(telegramUploads).where(eq(telegramUploads.status, "parsed"));
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(telegramUploads).where(eq(telegramUploads.status, "approved"));
  const [applied] = await db.select({ count: sql<number>`count(*)` }).from(telegramUploads).where(eq(telegramUploads.status, "applied"));
  const [rejected] = await db.select({ count: sql<number>`count(*)` }).from(telegramUploads).where(eq(telegramUploads.status, "rejected"));
  return {
    total: total?.count || 0, pending: pending?.count || 0, parsed: parsed?.count || 0,
    approved: approved?.count || 0, applied: applied?.count || 0, rejected: rejected?.count || 0,
  };
}

// ── Chat Rooms ───────────────────────────────────────────
export async function createChatRoom(data: InsertChatRoom) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(chatRooms).values(data);
  return result[0].insertId;
}

export async function getChatRooms(filters?: { meetupId?: number; roomType?: string; isActive?: boolean }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (filters?.meetupId) conditions.push(eq(chatRooms.meetupId, filters.meetupId));
  if (filters?.roomType) conditions.push(eq(chatRooms.roomType, filters.roomType as any));
  if (filters?.isActive !== undefined) conditions.push(eq(chatRooms.isActive, filters.isActive));
  return db.select().from(chatRooms)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(chatRooms.updatedAt));
}

export async function getChatRoomById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
  return result[0];
}

export async function updateChatRoom(id: number, data: Partial<InsertChatRoom>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(chatRooms).set(data).where(eq(chatRooms.id, id));
}

export async function deleteChatRoom(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(chatMessages).where(eq(chatMessages.roomId, id));
  await db.delete(chatRoomMembers).where(eq(chatRoomMembers.roomId, id));
  await db.delete(chatRooms).where(eq(chatRooms.id, id));
}

// ── Chat Room Members ────────────────────────────────────
export async function addChatRoomMember(data: InsertChatRoomMember) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  // Check if already a member
  const existing = await db.select().from(chatRoomMembers)
    .where(and(eq(chatRoomMembers.roomId, data.roomId), eq(chatRoomMembers.userId, data.userId)))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(chatRoomMembers).values(data);
  return result[0].insertId;
}

export async function getChatRoomMembers(roomId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(chatRoomMembers).where(eq(chatRoomMembers.roomId, roomId)).orderBy(chatRoomMembers.joinedAt);
}

export async function getChatRoomsByUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  const memberRows = await db.select().from(chatRoomMembers).where(eq(chatRoomMembers.userId, userId));
  if (memberRows.length === 0) return [];
  const roomIds = memberRows.map(m => m.roomId);
  return db.select().from(chatRooms).where(inArray(chatRooms.id, roomIds)).orderBy(desc(chatRooms.updatedAt));
}

export async function removeChatRoomMember(roomId: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(chatRoomMembers).where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
}

export async function updateChatRoomMember(roomId: number, userId: number, data: Partial<InsertChatRoomMember>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(chatRoomMembers).set(data).where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
}

// ── Chat Messages ────────────────────────────────────────
export async function createChatMessage(data: InsertChatMessage) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(chatMessages).values(data);
  // Update room's updatedAt
  await db.update(chatRooms).set({ updatedAt: new Date() }).where(eq(chatRooms.id, data.roomId));
  return result[0].insertId;
}

export async function getChatMessages(roomId: number, limit: number = 100, before?: number) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false)];
  if (before) conditions.push(sql`${chatMessages.id} < ${before}` as any);
  return db.select().from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function getChatMessageById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(chatMessages).where(eq(chatMessages.id, id)).limit(1);
  return result[0];
}

export async function updateChatMessage(id: number, data: Partial<InsertChatMessage>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(chatMessages).set(data).where(eq(chatMessages.id, id));
}

export async function softDeleteChatMessage(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(chatMessages).set({ isDeleted: true, content: "[삭제된 메시지]" }).where(eq(chatMessages.id, id));
}

export async function getUnreadChatCount(roomId: number, lastReadAt: Date | null) {
  const db = await getDb(); if (!db) return 0;
  const conditions = [eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false)];
  if (lastReadAt) conditions.push(gte(chatMessages.createdAt, lastReadAt));
  const [result] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages).where(and(...conditions));
  return result?.count || 0;
}

// ── API Request Logs with date filter ────────────────────
export async function getApiRequestLogsFiltered(apiKeyId: number, filters?: { startDate?: Date; endDate?: Date; limit?: number }) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(apiRequestLogs.apiKeyId, apiKeyId)];
  if (filters?.startDate) conditions.push(gte(apiRequestLogs.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(sql`${apiRequestLogs.createdAt} <= ${filters.endDate}` as any);
  return db.select().from(apiRequestLogs)
    .where(and(...conditions))
    .orderBy(desc(apiRequestLogs.createdAt))
    .limit(filters?.limit || 100);
}

// ── Unread counts for all rooms of a user ────────────────
export async function getUnreadCountsForUser(userId: number) {
  const db = await getDb(); if (!db) return [];
  const memberRows = await db.select().from(chatRoomMembers).where(eq(chatRoomMembers.userId, userId));
  if (memberRows.length === 0) return [];
  const results: { roomId: number; unreadCount: number }[] = [];
  for (const m of memberRows) {
    const conditions = [eq(chatMessages.roomId, m.roomId), eq(chatMessages.isDeleted, false)];
    if (m.lastReadAt) conditions.push(gte(chatMessages.createdAt, m.lastReadAt));
    // Exclude own messages
    conditions.push(sql`${chatMessages.userId} != ${userId}` as any);
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages).where(and(...conditions));
    if ((result?.count || 0) > 0) {
      results.push({ roomId: m.roomId, unreadCount: result?.count || 0 });
    }
  }
  return results;
}

// ── 미디어 갤러리 ──────────────────────────────────────────
export async function getChatMediaMessages(roomId: number, mediaType?: string, limit: number = 50, offset: number = 0) {
  const db = await getDb(); if (!db) return [];
  const conditions = [
    eq(chatMessages.roomId, roomId),
    eq(chatMessages.isDeleted, false),
  ];
  if (mediaType === "image") {
    conditions.push(eq(chatMessages.messageType, "image"));
  } else if (mediaType === "video") {
    conditions.push(eq(chatMessages.messageType, "video"));
  } else if (mediaType === "file") {
    conditions.push(inArray(chatMessages.messageType, ["file", "voice"]));
  } else {
    // 모든 미디어 (image, video, file, voice)
    conditions.push(inArray(chatMessages.messageType, ["image", "video", "file", "voice"]));
  }
  return db.select().from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getChatMediaCount(roomId: number) {
  const db = await getDb(); if (!db) return { images: 0, videos: 0, files: 0, total: 0 };
  const [images] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages)
    .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false), eq(chatMessages.messageType, "image")));
  const [videos] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages)
    .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false), eq(chatMessages.messageType, "video")));
  const [files] = await db.select({ count: sql<number>`count(*)` }).from(chatMessages)
    .where(and(eq(chatMessages.roomId, roomId), eq(chatMessages.isDeleted, false), inArray(chatMessages.messageType, ["file", "voice"])));
  return {
    images: images?.count || 0,
    videos: videos?.count || 0,
    files: files?.count || 0,
    total: (images?.count || 0) + (videos?.count || 0) + (files?.count || 0),
  };
}

// ── 메시지 고정 (Pin) ──────────────────────────────────────
export async function pinChatMessage(messageId: number, userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(chatMessages).set({
    isPinned: true,
    pinnedAt: new Date(),
    pinnedBy: userId,
  }).where(eq(chatMessages.id, messageId));
}

export async function unpinChatMessage(messageId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(chatMessages).set({
    isPinned: false,
    pinnedAt: null,
    pinnedBy: null,
  }).where(eq(chatMessages.id, messageId));
}

export async function getPinnedMessages(roomId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(chatMessages)
    .where(and(
      eq(chatMessages.roomId, roomId),
      eq(chatMessages.isPinned, true),
      eq(chatMessages.isDeleted, false),
    ))
    .orderBy(desc(chatMessages.pinnedAt));
}

// ── 여권 중복 체크 ──────────────────────────────────────
export async function checkPassportDuplicate(
  currentUserId: number,
  passportNumber?: string,
  fullName?: string,
  birthDate?: string,
) {
  const db = await getDb();
  if (!db) return { isDuplicate: false, matches: [] };

  const allPassports = await db.select().from(passportInfo);
  const matches: { userId: number; matchType: string; passportNumber?: string; fullName?: string }[] = [];

  for (const p of allPassports) {
    if (p.userId === currentUserId) continue;

    // 여권번호 일치
    if (passportNumber && p.passportNumber && p.passportNumber.toUpperCase() === passportNumber.toUpperCase()) {
      matches.push({ userId: p.userId, matchType: "passport_number", passportNumber: p.passportNumber, fullName: p.fullName || undefined });
    }
    // 이름 + 생년월일 일치
    else if (fullName && birthDate && p.fullName && p.birthDate) {
      if (p.fullName.toUpperCase() === fullName.toUpperCase() && p.birthDate === birthDate) {
        matches.push({ userId: p.userId, matchType: "name_birthdate", passportNumber: p.passportNumber || undefined, fullName: p.fullName });
      }
    }
  }

  return { isDuplicate: matches.length > 0, matches };
}


// ══════════════════════════════════════════════════════════
// v5.7 - Immigration Checklist
// ══════════════════════════════════════════════════════════

import {
  immigrationChecklistTemplates, InsertImmigrationChecklistTemplate,
  userChecklistItems, InsertUserChecklistItem,
} from "../drizzle/schema";

// 지원 국가 목록 조회
export async function getChecklistCountries() {
  const db = await getDb(); if (!db) return [];
  const rows = await db.selectDistinct({
    countryCode: immigrationChecklistTemplates.countryCode,
    countryName: immigrationChecklistTemplates.countryName,
  }).from(immigrationChecklistTemplates).orderBy(immigrationChecklistTemplates.countryName);
  return rows;
}

// 국가별 템플릿 조회
export async function getChecklistTemplates(countryCode: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(immigrationChecklistTemplates)
    .where(eq(immigrationChecklistTemplates.countryCode, countryCode))
    .orderBy(immigrationChecklistTemplates.category, immigrationChecklistTemplates.sortOrder);
}

// 사용자 체크리스트 조회 (특정 국가)
export async function getUserChecklist(userId: number, countryCode: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userChecklistItems)
    .where(and(eq(userChecklistItems.userId, userId), eq(userChecklistItems.countryCode, countryCode)))
    .orderBy(userChecklistItems.category, userChecklistItems.sortOrder);
}

// 사용자 체크리스트 초기화 (템플릿에서 복사)
export async function initUserChecklist(userId: number, countryCode: string) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  // 기존 항목 삭제
  await db.delete(userChecklistItems).where(
    and(eq(userChecklistItems.userId, userId), eq(userChecklistItems.countryCode, countryCode))
  );
  // 템플릿에서 복사
  const templates = await getChecklistTemplates(countryCode);
  if (templates.length === 0) return [];
  const items: InsertUserChecklistItem[] = templates.map(t => ({
    userId,
    templateId: t.id,
    countryCode: t.countryCode,
    category: t.category,
    title: t.title,
    description: t.description,
    isChecked: false,
    sortOrder: t.sortOrder ?? 0,
  }));
  await db.insert(userChecklistItems).values(items);
  return getUserChecklist(userId, countryCode);
}

// 체크 항목 토글
export async function toggleChecklistItem(userId: number, itemId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const rows = await db.select().from(userChecklistItems)
    .where(and(eq(userChecklistItems.id, itemId), eq(userChecklistItems.userId, userId))).limit(1);
  if (!rows[0]) throw new Error("Item not found");
  const newChecked = !rows[0].isChecked;
  await db.update(userChecklistItems).set({ isChecked: newChecked }).where(eq(userChecklistItems.id, itemId));
  return { ...rows[0], isChecked: newChecked };
}

// 커스텀 항목 추가
export async function addCustomChecklistItem(userId: number, countryCode: string, title: string, description?: string) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(userChecklistItems).values({
    userId,
    countryCode,
    category: "custom",
    title,
    description: description || null,
    isChecked: false,
    sortOrder: 999,
  });
  return result[0].insertId;
}

// 커스텀 항목 삭제
export async function deleteCustomChecklistItem(userId: number, itemId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(userChecklistItems).where(
    and(eq(userChecklistItems.id, itemId), eq(userChecklistItems.userId, userId), eq(userChecklistItems.category, "custom"))
  );
}

// 전체 초기화 (리셋)
export async function resetUserChecklist(userId: number, countryCode: string) {
  return initUserChecklist(userId, countryCode);
}

// 사용자 진행률 조회
export async function getChecklistProgress(userId: number, countryCode: string) {
  const items = await getUserChecklist(userId, countryCode);
  const total = items.length;
  const checked = items.filter(i => i.isChecked).length;
  return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
}


// ── Meetup Passport List (밋업별 출장자 여권 명단) ──────────────────────
export async function getMeetupPassportList(meetupId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // registrations + passportInfo + userProfiles 조인
  const baseQuery = db.select({
    regId: registrations.id,
    regName: registrations.name,
    regPhone: registrations.phone,
    regMessengerId: registrations.messengerId,
    regTeamName: registrations.teamName,
    regStatus: registrations.status,
    meetupId: registrations.meetupId,
    passportNumber: sql<string>`COALESCE(${passportInfo.passportNumber}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.passportNumber')))`,
    passportFullName: sql<string>`COALESCE(${passportInfo.fullName}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.fullName')))`,
    passportNationality: sql<string>`COALESCE(${passportInfo.nationality}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.nationality')))`,
    passportBirthDate: sql<string>`COALESCE(${passportInfo.birthDate}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.birthDate')))`,
    passportGender: sql<string>`COALESCE(${passportInfo.gender}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.gender')))`,
    passportExpiryDate: sql<string>`COALESCE(${passportInfo.expiryDate}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.expiryDate')))`,
    passportIssuingCountry: sql<string>`COALESCE(${passportInfo.issuingCountry}, JSON_UNQUOTE(JSON_EXTRACT(${registrations.passportOcrData}, '$.issuingCountry')))`,
    passportImageUrl: sql<string>`COALESCE(${passportInfo.passportImageUrl}, ${registrations.passportImageUrl})`,
    passportVerified: passportInfo.isVerified,
    profileOrganization: userProfiles.organization,
    profileTelegramId: userProfiles.telegramId,
  }).from(registrations)
    .leftJoin(userProfiles, eq(registrations.phone, userProfiles.phone))
    .leftJoin(passportInfo, eq(userProfiles.userId, passportInfo.userId));

  if (meetupId) {
    return baseQuery.where(eq(registrations.meetupId, meetupId)).orderBy(desc(registrations.createdAt));
  }
  return baseQuery.orderBy(desc(registrations.createdAt));
}

// ── Meetup Expenses (밋업별 비용 내역) ──────────────────────
export async function getMeetupExpenses(meetupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetupExpenses)
    .where(eq(meetupExpenses.meetupId, meetupId))
    .orderBy(desc(meetupExpenses.createdAt));
}

export async function createMeetupExpense(data: InsertMeetupExpense) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db.insert(meetupExpenses).values(data);
  return result.insertId;
}

export async function updateMeetupExpense(id: number, data: Partial<InsertMeetupExpense>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(meetupExpenses).set(data).where(eq(meetupExpenses.id, id));
}

export async function deleteMeetupExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(meetupExpenses).where(eq(meetupExpenses.id, id));
}

export async function getMeetupExpenseSummary(meetupId: number) {
  const db = await getDb();
  if (!db) return { total: 0, byCategory: [], perPerson: 0, count: 0 };
  
  const expenses = await db.select().from(meetupExpenses)
    .where(eq(meetupExpenses.meetupId, meetupId));
  
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const categoryMap: Record<string, number> = {};
  expenses.forEach(e => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });
  const byCategory = Object.entries(categoryMap).map(([category, amount]) => ({ category, amount }));
  
  // 승인된 참가자 수로 1인당 비용 계산
  const regs = await db.select().from(registrations)
    .where(and(eq(registrations.meetupId, meetupId), eq(registrations.status, "approved")));
  const perPerson = regs.length > 0 ? Math.round(total / regs.length) : 0;
  
  return { total, byCategory, perPerson, count: expenses.length, participantCount: regs.length };
}

export async function getAllMeetupExpenses() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(meetupExpenses).orderBy(desc(meetupExpenses.createdAt));
}


// ══════════════════════════════════════════════════════════
// v6.1 - 슈퍼 관리자: 감사 로그 + 조직 관리 강화
// ══════════════════════════════════════════════════════════

// ── Audit Logs ──────────────────────────────────────────
export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data);
}

export async function getAuditLogs(opts?: {
  action?: string;
  targetType?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };
  
  const conditions = [];
  if (opts?.action) conditions.push(eq(auditLogs.action, opts.action as any));
  if (opts?.targetType) conditions.push(eq(auditLogs.targetType, opts.targetType as any));
  if (opts?.userId) conditions.push(eq(auditLogs.userId, opts.userId));
  
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  
  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(where);
  
  const logs = await db.select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(opts?.limit || 50)
    .offset(opts?.offset || 0);
  
  return { logs, total: countResult?.count || 0 };
}

// ── Organization Active Toggle ──────────────────────────
export async function toggleOrganizationActive(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizations).set({ isActive }).where(eq(organizations.id, id));
}

// ── Organization Members Enhanced ───────────────────────
export async function getOrganizationMembersWithUsers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const members = await db.select({
    id: organizationMembers.id,
    organizationId: organizationMembers.organizationId,
    userId: organizationMembers.userId,
    memberRole: organizationMembers.memberRole,
    isActive: organizationMembers.isActive,
    joinedAt: organizationMembers.joinedAt,
    userName: users.name,
    userEmail: users.email,
    userRole: users.role,
  })
  .from(organizationMembers)
  .leftJoin(users, eq(organizationMembers.userId, users.id))
  .where(eq(organizationMembers.organizationId, organizationId));
  
  return members;
}

export async function updateOrganizationMemberRole(id: number, memberRole: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizationMembers).set({ memberRole: memberRole as any }).where(eq(organizationMembers.id, id));
}

// ── Ownership Transfer ──────────────────────────────────
export async function transferOrganizationOwnership(organizationId: number, fromUserId: number, toUserId: number) {
  const db = await getDb();
  if (!db) return;
  
  // 현재 owner를 manager로 변경
  await db.update(organizationMembers)
    .set({ memberRole: "manager" })
    .where(and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, fromUserId),
      eq(organizationMembers.memberRole, "owner")
    ));
  
  // 새 owner 설정 - 이미 멤버인 경우 역할 변경, 아닌 경우 추가
  const existing = await db.select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, toUserId)
    ));
  
  if (existing.length > 0) {
    await db.update(organizationMembers)
      .set({ memberRole: "owner" })
      .where(eq(organizationMembers.id, existing[0].id));
  } else {
    await db.insert(organizationMembers).values({
      organizationId,
      userId: toUserId,
      memberRole: "owner",
    });
  }
}

// ── User with Organization Info ─────────────────────────
export async function getAllUsersWithOrgs() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    id: users.id,
    openId: users.openId,
    name: users.name,
    email: users.email,
    role: users.role,
    organizationId: users.organizationId,
    createdAt: users.createdAt,
    lastSignedIn: users.lastSignedIn,
    orgName: organizations.name,
    orgType: organizations.type,
  })
  .from(users)
  .leftJoin(organizations, eq(users.organizationId, organizations.id))
  .orderBy(desc(users.createdAt));
  
  return result;
}

// ── Assign User to Organization ─────────────────────────
export async function assignUserToOrganization(userId: number, organizationId: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ organizationId }).where(eq(users.id, userId));
}


// ── Email/Password Auth & 2FA ──────────────────────────
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[DB] getUserByEmail error:', error instanceof Error ? error.message : error);
    return undefined;
  }
}

export async function createUserWithPassword(data: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "user" | "admin" | "superadmin" | "organizer" | "agency" | "partner";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const openId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    await db.insert(users).values({
      openId,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      loginMethod: "email",
      role: data.role || "user",
      lastSignedIn: new Date(),
    });
    return getUserByEmail(data.email);
  } catch (error) {
    console.error('[DB] createUserWithPassword error:', error instanceof Error ? error.message : error);
    throw new Error("회원가입 처리 중 오류가 발생했습니다");
  }
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

export async function updateUserTotp(userId: number, totpSecret: string | null, totpEnabled: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ totpSecret, totpEnabled }).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error('[DB] getUserById error:', error instanceof Error ? error.message : error);
    return undefined;
  }
}


// ── Email Verification Tokens ──────────────────────────
export async function createEmailVerificationToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return undefined;
  // Invalidate previous tokens for this user
  await db.delete(emailVerificationTokens).where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));
  await db.insert(emailVerificationTokens).values({ userId, token, expiresAt });
  return { userId, token, expiresAt };
}

export async function getEmailVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markEmailVerificationUsed(tokenId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, tokenId));
}

// ── Password Reset Tokens ──────────────────────────
export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) return undefined;
  // Invalidate previous tokens for this user
  await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  return { userId, token, expiresAt };
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markPasswordResetUsed(tokenId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
}

// ── Onboarding Progress ──────────────────────────
export async function getOnboardingProgress(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateOnboardingProgress(userId: number, data: Partial<OnboardingProgress>) {
  const db = await getDb();
  if (!db) return;
  const existing = await getOnboardingProgress(userId);
  if (existing) {
    await db.update(onboardingProgress).set({ ...data, updatedAt: new Date() }).where(eq(onboardingProgress.userId, userId));
  } else {
    await db.insert(onboardingProgress).values({ userId, ...data } as any);
  }
}

export async function updateOnboardingStep(userId: number, step: string, value: boolean) {
  const db = await getDb();
  if (!db) return;
  const existing = await getOnboardingProgress(userId);
  if (existing) {
    await db.update(onboardingProgress).set({ [step]: value, updatedAt: new Date() }).where(eq(onboardingProgress.userId, userId));
  } else {
    await db.insert(onboardingProgress).values({ userId, [step]: value } as any);
  }
}


// ── Drizzle Query Builder Export (v6.7) ──────────────────────────
export async function getDbInstance() {
  return await getDb();
}

// ── Set User Email Verified ──────────────────────────
export async function setUserEmailVerified(userId: number, verified: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ emailVerified: verified }).where(eq(users.id, userId));
}

// ── Role Delegations (권한 위임) ──────────────────────────────
export async function createRoleDelegation(data: InsertRoleDelegation) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(roleDelegations).values(data);
  return { id: Number(result[0].insertId) };
}
export async function getRoleDelegations(opts?: { organizationId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  let results = await db.select().from(roleDelegations).orderBy(desc(roleDelegations.createdAt));
  if (opts?.organizationId) results = results.filter((r: any) => r.organizationId === opts.organizationId);
  if (opts?.offset) results = results.slice(opts.offset);
  if (opts?.limit) results = results.slice(0, opts.limit);
  return results;
}

// ── Create Organizer Account (슈퍼관리자 전용) ──────────────────
export async function createOrganizerAccount(data: {
  email: string;
  name: string;
  passwordHash: string;
  role: "organizer" | "agency" | "partner";
  organizationName: string;
  organizationType: "organizer" | "agency" | "partner";
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  website?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const userResult = await db.insert(users).values({
    openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    role: data.role,
  });
  const userId = Number(userResult[0].insertId);
  const orgResult = await db.insert(organizations).values({
    name: data.organizationName,
    type: data.organizationType,
    contactEmail: data.contactEmail || data.email,
    contactName: data.name,
    contactPhone: data.contactPhone || null,
    description: data.description || null,
    website: data.website || null,
  });
  const orgId = Number(orgResult[0].insertId);
  await db.update(users).set({ organizationId: orgId }).where(eq(users.id, userId));
  await db.insert(organizationMembers).values({
    organizationId: orgId,
    userId,
    memberRole: "owner",
  });
  return { userId, organizationId: orgId, openId };
}

// ── Ad Banners (광고 배너) ──────────────────────────────
export async function getAdBanners(opts?: { position?: string; activeOnly?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let results = await db.select().from(adBanners).orderBy(asc(adBanners.sortOrder), desc(adBanners.createdAt));
  if (opts?.position) results = results.filter((b: any) => b.position === opts.position);
  if (opts?.activeOnly) {
    const now = new Date();
    results = results.filter((b: any) => {
      if (!b.isActive) return false;
      if (b.startDate && new Date(b.startDate) > now) return false;
      if (b.endDate && new Date(b.endDate) < now) return false;
      return true;
    });
  }
  return results;
}
export async function getAdBannerById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(adBanners).where(eq(adBanners.id, id));
  return rows[0] || null;
}
export async function createAdBanner(data: InsertAdBanner) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(adBanners).values(data);
  return { id: Number(result[0].insertId) };
}
export async function updateAdBanner(id: number, data: Partial<InsertAdBanner>) {
  const db = await getDb();
  if (!db) return;
  await db.update(adBanners).set(data).where(eq(adBanners.id, id));
}
export async function deleteAdBanner(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adBanners).where(eq(adBanners.id, id));
}
export async function incrementAdBannerClick(id: number) {
  const db = await getDb();
  if (!db) return;
  const banner = await getAdBannerById(id);
  if (banner) {
    await db.update(adBanners).set({ clickCount: banner.clickCount + 1 }).where(eq(adBanners.id, id));
  }
}

// ── Organizer Approvals ──────────────────────
export async function createOrganizerApproval(data: InsertOrganizerApproval) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(organizerApprovals).values(data);
  return result[0].insertId;
}
export async function getOrganizerApprovals(status?: string) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(organizerApprovals).orderBy(desc(organizerApprovals.createdAt));
  if (status) {
    return await db.select().from(organizerApprovals).where(eq(organizerApprovals.status, status as any)).orderBy(desc(organizerApprovals.createdAt));
  }
  return await query;
}
export async function getOrganizerApprovalByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(organizerApprovals).where(eq(organizerApprovals.userId, userId));
  return rows[0] || null;
}
export async function updateOrganizerApproval(id: number, data: Partial<InsertOrganizerApproval>) {
  const db = await getDb();
  if (!db) return;
  await db.update(organizerApprovals).set(data).where(eq(organizerApprovals.id, id));
}

// ── Dashboard Statistics ──────────────────────
export async function getUserRegistrationStats() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT DATE(createdAt) as date, COUNT(*) as count 
    FROM users 
    WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY) 
    GROUP BY DATE(createdAt) 
    ORDER BY date ASC
  `);
  return (result[0] as unknown as any[]) || [];
}
export async function getUserRoleDistribution() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT role, COUNT(*) as count 
    FROM users 
    GROUP BY role 
    ORDER BY count DESC
  `);
  return (result[0] as unknown as any[]) || [];
}
export async function getAdBannerClickStats() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT id, title, position, clickCount, impressionCount,
      CASE WHEN impressionCount > 0 THEN ROUND(clickCount * 100.0 / impressionCount, 2) ELSE 0 END as ctr
    FROM ad_banners 
    WHERE isActive = 1 
    ORDER BY clickCount DESC
  `);
  return (result[0] as unknown as any[]) || [];
}
export async function getDashboardKPIs() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, activeMeetups: 0, newSignups: 0, pendingApprovals: 0 };
  const usersResult = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
  const meetupsResult = await db.execute(sql`SELECT COUNT(*) as count FROM meetups WHERE status = 'active'`);
  const newResult = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
  const pendingResult = await db.execute(sql`SELECT COUNT(*) as count FROM organizer_approvals WHERE status = 'pending'`);
  return {
    totalUsers: (usersResult[0] as unknown as any[])[0]?.count || 0,
    activeMeetups: (meetupsResult[0] as unknown as any[])[0]?.count || 0,
    newSignups: (newResult[0] as unknown as any[])[0]?.count || 0,
    pendingApprovals: (pendingResult[0] as unknown as any[])[0]?.count || 0,
  };
}

// ── VAT Rates ──────────────────────────────────────
export async function getVatRates() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(vatRates).where(eq(vatRates.isActive, true)).orderBy(vatRates.countryName);
}
export async function getVatRateByCountry(countryCode: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(vatRates).where(eq(vatRates.countryCode, countryCode)).limit(1);
  return result[0];
}
export async function updateVatRate(id: number, data: Partial<InsertVatRate>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(vatRates).set(data).where(eq(vatRates.id, id));
}

// ── Travel Searches ──────────────────────────────────
export async function createTravelSearch(data: InsertTravelSearch) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(travelSearches).values(data);
  return result[0].insertId;
}

// ── Travel Bookings ──────────────────────────────────
export async function createTravelBooking(data: InsertTravelBooking) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(travelBookings).values(data);
  return result[0].insertId;
}
export async function getTravelBookings(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(travelBookings).where(eq(travelBookings.userId, userId)).orderBy(desc(travelBookings.createdAt));
}
export async function getTravelBookingById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(travelBookings).where(eq(travelBookings.id, id)).limit(1);
  return result[0];
}
export async function updateTravelBooking(id: number, data: Partial<InsertTravelBooking>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(travelBookings).set(data).where(eq(travelBookings.id, id));
}
export async function getAllTravelBookings(filters?: { status?: string; bookingType?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(travelBookings.status, filters.status as any));
  if (filters?.bookingType) conditions.push(eq(travelBookings.bookingType, filters.bookingType as any));
  return db.select().from(travelBookings).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(travelBookings.createdAt));
}
export async function getTravelBookingStats() {
  const db = await getDb();
  if (!db) return { totalBookings: 0, totalRevenue: 0, totalMargin: 0, pendingBookings: 0 };
  const totalResult = await db.execute(sql`SELECT COUNT(*) as count FROM travel_bookings`);
  const revenueResult = await db.execute(sql`SELECT COALESCE(SUM(usdtPrice), 0) as total FROM travel_bookings WHERE paymentStatus = 'confirmed'`);
  const marginResult = await db.execute(sql`SELECT COALESCE(SUM(platformMargin), 0) as total FROM travel_bookings WHERE paymentStatus = 'confirmed'`);
  const pendingResult = await db.execute(sql`SELECT COUNT(*) as count FROM travel_bookings WHERE status = 'pending'`);
  return {
    totalBookings: (totalResult[0] as unknown as any[])[0]?.count || 0,
    totalRevenue: parseFloat((revenueResult[0] as unknown as any[])[0]?.total || '0'),
    totalMargin: parseFloat((marginResult[0] as unknown as any[])[0]?.total || '0'),
    pendingBookings: (pendingResult[0] as unknown as any[])[0]?.count || 0,
  };
}

// ══════════════════════════════════════════════════════════
// v9.0 - Payment & Wallet Helpers
// ══════════════════════════════════════════════════════════

// ── Payment Gateway Config ──
export async function getPaymentGateways() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(paymentGatewayConfig).orderBy(asc(paymentGatewayConfig.sortOrder));
}
export async function getEnabledPaymentGateways() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(paymentGatewayConfig).where(eq(paymentGatewayConfig.isEnabled, true)).orderBy(asc(paymentGatewayConfig.sortOrder));
}
export async function updatePaymentGateway(id: number, data: Partial<InsertPaymentGatewayConfig>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(paymentGatewayConfig).set(data).where(eq(paymentGatewayConfig.id, id));
}

// ── Payment Transactions ──
export async function createPaymentTransaction(data: InsertPaymentTransaction) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(paymentTransactions).values(data);
  return result[0].insertId;
}
export async function getPaymentTransaction(id: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
  return result[0] || null;
}
export async function getPaymentTransactionByGatewayId(gatewayPaymentId: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayPaymentId, gatewayPaymentId));
  return result[0] || null;
}
export async function getPaymentTransactionByInvoiceId(gatewayInvoiceId: string) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.gatewayInvoiceId, gatewayInvoiceId));
  return result[0] || null;
}
export async function updatePaymentTransaction(id: number, data: Partial<InsertPaymentTransaction>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(paymentTransactions).set(data).where(eq(paymentTransactions.id, id));
}
export async function getUserPaymentTransactions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(paymentTransactions).where(eq(paymentTransactions.userId, userId)).orderBy(desc(paymentTransactions.createdAt));
}
export async function getAllPaymentTransactions(filters?: { status?: string; method?: string }) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(paymentTransactions.status, filters.status as any));
  if (filters?.method) conditions.push(eq(paymentTransactions.method, filters.method as any));
  return db.select().from(paymentTransactions).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(paymentTransactions.createdAt));
}

// ── Platform Wallets ──
export async function getOrCreateWallet(userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(platformWallets).where(eq(platformWallets.userId, userId));
  if (existing[0]) return existing[0];
  await db.insert(platformWallets).values({ userId, balance: "0", frozenBalance: "0", totalDeposited: "0", totalSpent: "0" });
  const created = await db.select().from(platformWallets).where(eq(platformWallets.userId, userId));
  return created[0];
}
export async function updateWalletBalance(walletId: number, data: Partial<InsertPlatformWallet>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(platformWallets).set(data).where(eq(platformWallets.id, walletId));
}

// ── Wallet Transactions ──
export async function createWalletTransaction(data: InsertWalletTransaction) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(walletTransactions).values(data);
  return result[0].insertId;
}
export async function getUserWalletTransactions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt));
}

// ══════════════════════════════════════════════════════════
// v10.0 - Ride-Hailing & Delivery DB Helpers
// ══════════════════════════════════════════════════════════

// ── Ride Providers ──
export async function getRideProviders(activeOnly = false) {
  const db = await getDb(); if (!db) return [];
  if (activeOnly) return db.select().from(rideProviders).where(eq(rideProviders.isActive, true));
  return db.select().from(rideProviders);
}
export async function upsertRideProvider(data: InsertRideProvider) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(rideProviders).values(data);
  return result[0].insertId;
}
export async function updateRideProvider(id: number, data: Partial<InsertRideProvider>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(rideProviders).set(data).where(eq(rideProviders.id, id));
}

// ── Ride Searches ──
export async function createRideSearch(data: InsertRideSearch) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(rideSearches).values(data);
  return result[0].insertId;
}
export async function getUserRideSearches(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(rideSearches).where(eq(rideSearches.userId, userId)).orderBy(desc(rideSearches.createdAt)).limit(20);
}

// ── Ride Bookings ──
export async function createRideBooking(data: InsertRideBooking) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(rideBookings).values(data);
  return result[0].insertId;
}
export async function getRideBookingById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(rideBookings).where(eq(rideBookings.id, id)).limit(1);
  return result[0];
}
export async function getUserRideBookings(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(rideBookings).where(eq(rideBookings.userId, userId)).orderBy(desc(rideBookings.createdAt));
}
export async function updateRideBooking(id: number, data: Partial<InsertRideBooking>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(rideBookings).set(data).where(eq(rideBookings.id, id));
}
export async function getAllRideBookings() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(rideBookings).orderBy(desc(rideBookings.createdAt));
}

// ── Delivery Providers ──
export async function getDeliveryProviders(activeOnly = false) {
  const db = await getDb(); if (!db) return [];
  if (activeOnly) return db.select().from(deliveryProviders).where(eq(deliveryProviders.isActive, true));
  return db.select().from(deliveryProviders);
}
export async function upsertDeliveryProvider(data: InsertDeliveryProvider) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(deliveryProviders).values(data);
  return result[0].insertId;
}
export async function updateDeliveryProvider(id: number, data: Partial<InsertDeliveryProvider>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(deliveryProviders).set(data).where(eq(deliveryProviders.id, id));
}

// ── Delivery Orders ──
export async function createDeliveryOrder(data: InsertDeliveryOrder) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(deliveryOrders).values(data);
  return result[0].insertId;
}
export async function getDeliveryOrderById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, id)).limit(1);
  return result[0];
}
export async function getUserDeliveryOrders(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(deliveryOrders).where(eq(deliveryOrders.userId, userId)).orderBy(desc(deliveryOrders.createdAt));
}
export async function updateDeliveryOrder(id: number, data: Partial<InsertDeliveryOrder>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(deliveryOrders).set(data).where(eq(deliveryOrders.id, id));
}
export async function getAllDeliveryOrders() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(deliveryOrders).orderBy(desc(deliveryOrders.createdAt));
}

// ── Notes (메모) ──────────────────────────────────────
export async function createNote(data: InsertNote) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(notes).values(data);
  return result[0].insertId;
}
export async function getUserNotes(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.isPinned), desc(notes.updatedAt));
}
export async function getNoteById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return result[0];
}
export async function updateNote(id: number, data: Partial<InsertNote>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(notes).set(data).where(eq(notes.id, id));
}
export async function deleteNote(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(notes).where(eq(notes.id, id));
}
export async function getSharedNotes(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notes).where(and(eq(notes.isShared, true), eq(notes.sharedWithMeetup, meetupId))).orderBy(desc(notes.updatedAt));
}

export { eq, desc, asc, and, gt, isNull, sql } from "drizzle-orm";
// ── Team Schedules (팀 스케줄) ──────────────────────────
export async function createTeamSchedule(data: InsertTeamSchedule) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(teamSchedules).values(data);
  return result[0].insertId;
}
export async function getTeamSchedulesByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(teamSchedules).where(and(eq(teamSchedules.meetupId, meetupId), eq(teamSchedules.status, "active"))).orderBy(asc(teamSchedules.eventTime));
}
export async function getTeamScheduleById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(teamSchedules).where(eq(teamSchedules.id, id)).limit(1);
  return result[0];
}
export async function updateTeamSchedule(id: number, data: Partial<InsertTeamSchedule>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(teamSchedules).set(data).where(eq(teamSchedules.id, id));
}
export async function deleteTeamSchedule(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(teamSchedules).set({ status: "cancelled" }).where(eq(teamSchedules.id, id));
}
// ── Translation Requests (통역 요청) ──────────────────────
export async function createTranslationRequest(data: InsertTranslationRequest) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(translationRequests).values(data);
  return result[0].insertId;
}
export async function getTranslationRequestsByInterpreter(interpreterId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(translationRequests).where(eq(translationRequests.interpreterId, interpreterId)).orderBy(desc(translationRequests.createdAt));
}
export async function getPendingTranslationRequests(meetupId?: number) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(translationRequests.status, "pending")];
  if (meetupId) conditions.push(eq(translationRequests.meetupId, meetupId));
  return db.select().from(translationRequests).where(and(...conditions)).orderBy(desc(translationRequests.createdAt));
}
export async function updateTranslationRequest(id: number, data: Partial<InsertTranslationRequest>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(translationRequests).set(data).where(eq(translationRequests.id, id));
}
export async function getDriverPickupAssignments(driverPhone: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(pickupAssignments).where(eq(pickupAssignments.driverPhone, driverPhone)).orderBy(asc(pickupAssignments.pickupTime));
}
export { companyInfo, meetupInvitations, invitationStatistics, transportationOptions, participantTransportation, roleDelegations, adBanners, organizerApprovals, vatRates, travelSearches, travelBookings, paymentTransactions, platformWallets, walletTransactions, paymentGatewayConfig, rideProviders, rideSearches, rideBookings, deliveryProviders, deliveryOrders, notes, teamSchedules, translationRequests } from "../drizzle/schema";


// ── Attendee Dashboard Statistics ──────────────────────
export async function getRegistrationStatsByMeetup(meetupId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, domestic: 0, overseas: 0, byCategory: [], byNationality: [], recentTrend: [] };
  
  const conditions: any[] = [];
  if (meetupId) conditions.push(eq(registrations.meetupId, meetupId));
  const where = conditions.length ? and(...conditions) : undefined;

  // Basic counts
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where);
  const [pending] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "pending")) : eq(registrations.status, "pending"));
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "approved")) : eq(registrations.status, "approved"));
  const [rejected] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "rejected")) : eq(registrations.status, "rejected"));
  const [completed] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "completed")) : eq(registrations.status, "completed"));
  const [domestic] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.locationType, "domestic")) : eq(registrations.locationType, "domestic"));
  const [overseas] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.locationType, "overseas")) : eq(registrations.locationType, "overseas"));

  // By category
  const byCategory = await db.select({
    category: registrations.category,
    count: sql<number>`count(*)`,
  }).from(registrations).where(where).groupBy(registrations.category);

  // By nationality (from passportOcrData)
  const allRegs = await db.select({
    passportOcrData: registrations.passportOcrData,
  }).from(registrations).where(where);
  
  const nationalityMap: Record<string, number> = {};
  for (const r of allRegs) {
    const ocr = r.passportOcrData as any;
    const nat = ocr?.nationality || ocr?.issuingCountry || "Unknown";
    nationalityMap[nat] = (nationalityMap[nat] || 0) + 1;
  }
  const byNationality = Object.entries(nationalityMap)
    .map(([nationality, count]) => ({ nationality, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Recent 30-day trend
  const recentTrend = await db.select({
    date: sql<string>`DATE(createdAt)`,
    count: sql<number>`count(*)`,
  }).from(registrations).where(
    where ? and(where, gte(registrations.createdAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`))
      : gte(registrations.createdAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`)
  ).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);

  return {
    total: total.count, pending: pending.count, approved: approved.count,
    rejected: rejected.count, completed: completed.count,
    domestic: domestic.count, overseas: overseas.count,
    byCategory, byNationality, recentTrend,
  };
}

export async function bulkUpdateRegistrationStatus(ids: number[], status: "approved" | "rejected" | "completed") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(registrations).set({ status }).where(inArray(registrations.id, ids));
}

// ── Enhanced Statistics with Date Range ──────────────────────────────
export async function getRegistrationStatsByMeetupWithDateRange(
  meetupId?: number,
  dateRange?: "week" | "month" | "quarter" | "year" | "all"
) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0, domestic: 0, overseas: 0, byCategory: [], byNationality: [], recentTrend: [] };

  const conditions: any[] = [];
  if (meetupId) conditions.push(eq(registrations.meetupId, meetupId));

  const range = dateRange || "all";
  if (range !== "all") {
    const intervalMap: Record<string, string> = { week: "7 DAY", month: "30 DAY", quarter: "90 DAY", year: "365 DAY" };
    const interval = intervalMap[range];
    if (interval) conditions.push(gte(registrations.createdAt, sql.raw(`DATE_SUB(NOW(), INTERVAL ${interval})`)));
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [total] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where);
  const [pending] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "pending")) : eq(registrations.status, "pending"));
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "approved")) : eq(registrations.status, "approved"));
  const [rejected] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "rejected")) : eq(registrations.status, "rejected"));
  const [completed] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.status, "completed")) : eq(registrations.status, "completed"));
  const [domestic] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.locationType, "domestic")) : eq(registrations.locationType, "domestic"));
  const [overseas] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where ? and(where, eq(registrations.locationType, "overseas")) : eq(registrations.locationType, "overseas"));

  const byCategory = await db.select({ category: registrations.category, count: sql<number>`count(*)` }).from(registrations).where(where).groupBy(registrations.category);

  const allRegs = await db.select({ passportOcrData: registrations.passportOcrData }).from(registrations).where(where);
  const nationalityMap: Record<string, number> = {};
  for (const r of allRegs) {
    const ocr = r.passportOcrData as any;
    const nat = ocr?.nationality || ocr?.issuingCountry || "Unknown";
    nationalityMap[nat] = (nationalityMap[nat] || 0) + 1;
  }
  const byNationality = Object.entries(nationalityMap).map(([nationality, count]) => ({ nationality, count })).sort((a, b) => b.count - a.count).slice(0, 20);

  const trendDays: Record<string, string> = { week: "7 DAY", month: "30 DAY", quarter: "90 DAY", year: "365 DAY", all: "365 DAY" };
  const trendInterval = trendDays[range] || "30 DAY";
  const trendConds: any[] = [];
  if (meetupId) trendConds.push(eq(registrations.meetupId, meetupId));
  trendConds.push(gte(registrations.createdAt, sql.raw(`DATE_SUB(NOW(), INTERVAL ${trendInterval})`)));
  const recentTrend = await db.select({ date: sql<string>`DATE(createdAt)`, count: sql<number>`count(*)` }).from(registrations).where(and(...trendConds)).groupBy(sql`DATE(createdAt)`).orderBy(sql`DATE(createdAt)`);

  return { total: total.count, pending: pending.count, approved: approved.count, rejected: rejected.count, completed: completed.count, domestic: domestic.count, overseas: overseas.count, byCategory, byNationality, recentTrend };
}

// ── Meetup Comparison Statistics ──────────────────────────────
export async function getMeetupComparisonStats() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    meetupId: registrations.meetupId,
    meetupTitle: meetups.title,
    total: sql<number>`count(*)`,
    pending: sql<number>`SUM(CASE WHEN ${registrations.status} = 'pending' THEN 1 ELSE 0 END)`,
    approved: sql<number>`SUM(CASE WHEN ${registrations.status} = 'approved' THEN 1 ELSE 0 END)`,
    rejected: sql<number>`SUM(CASE WHEN ${registrations.status} = 'rejected' THEN 1 ELSE 0 END)`,
    completed: sql<number>`SUM(CASE WHEN ${registrations.status} = 'completed' THEN 1 ELSE 0 END)`,
    domestic: sql<number>`SUM(CASE WHEN ${registrations.locationType} = 'domestic' THEN 1 ELSE 0 END)`,
    overseas: sql<number>`SUM(CASE WHEN ${registrations.locationType} = 'overseas' THEN 1 ELSE 0 END)`,
  }).from(registrations).leftJoin(meetups, eq(registrations.meetupId, meetups.id)).groupBy(registrations.meetupId, meetups.title).orderBy(sql`count(*) DESC`);

  return result.map(r => ({ meetupId: r.meetupId, meetupTitle: r.meetupTitle || `밋업 #${r.meetupId}`, total: Number(r.total) || 0, pending: Number(r.pending) || 0, approved: Number(r.approved) || 0, rejected: Number(r.rejected) || 0, completed: Number(r.completed) || 0, domestic: Number(r.domestic) || 0, overseas: Number(r.overseas) || 0 }));
}

// ── Daily Registration Trend (multi-status) ──────────────────────────────
export async function getDailyRegistrationTrend(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const dateExpr = sql`DATE(${registrations.createdAt})`;
  const result = await db.select({
    date: sql<string>`DATE(${registrations.createdAt})`.as("date_col"),
    total: sql<number>`count(*)`,
    approved: sql<number>`SUM(CASE WHEN ${registrations.status} = 'approved' THEN 1 ELSE 0 END)`,
    pending: sql<number>`SUM(CASE WHEN ${registrations.status} = 'pending' THEN 1 ELSE 0 END)`,
    rejected: sql<number>`SUM(CASE WHEN ${registrations.status} = 'rejected' THEN 1 ELSE 0 END)`,
  }).from(registrations).where(gte(registrations.createdAt, sql.raw(`DATE_SUB(NOW(), INTERVAL ${Number(days)} DAY)`))).groupBy(sql.raw(`DATE(createdAt)`)).orderBy(sql.raw(`DATE(createdAt)`));

  return result.map(r => ({ date: r.date, total: Number(r.total) || 0, approved: Number(r.approved) || 0, pending: Number(r.pending) || 0, rejected: Number(r.rejected) || 0 }));
}


// ── Meetup Schedules CRUD ──────────────────────────────────
export async function getMeetupSchedules(meetupId: number, scheduleType?: string, status?: string) {
  const db = await getDb(); if (!db) return [];
  let conditions = [eq(meetupSchedules.meetupId, meetupId)];
  if (scheduleType) conditions.push(eq(meetupSchedules.scheduleType, scheduleType as any));
  if (status) conditions.push(eq(meetupSchedules.status, status as any));
  return db.select().from(meetupSchedules).where(and(...conditions)).orderBy(asc(meetupSchedules.eventDate), asc(meetupSchedules.sortOrder));
}
export async function getMeetupScheduleById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(meetupSchedules).where(eq(meetupSchedules.id, id)).limit(1);
  return result[0];
}
export async function createMeetupSchedule(data: InsertMeetupSchedule) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(meetupSchedules).values(data);
  return result[0].insertId;
}
export async function updateMeetupSchedule(id: number, data: Partial<InsertMeetupSchedule>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(meetupSchedules).set(data).where(eq(meetupSchedules.id, id));
}
export async function deleteMeetupSchedule(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(meetupSchedules).where(eq(meetupSchedules.id, id));
}


// ── Schedule Reminders ──────────────────────────────────
export async function getScheduleReminders(scheduleId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(scheduleReminders).where(eq(scheduleReminders.scheduleId, scheduleId)).orderBy(asc(scheduleReminders.scheduledAt));
}
export async function getPendingReminders() {
  const db = await getDb(); if (!db) return [];
  const now = new Date();
  return db.select().from(scheduleReminders)
    .where(and(
      eq(scheduleReminders.status, "pending"),
      lte(scheduleReminders.scheduledAt, now)
    ))
    .orderBy(asc(scheduleReminders.scheduledAt));
}
export async function createScheduleReminder(data: InsertScheduleReminder) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(scheduleReminders).values(data);
  return result[0].insertId;
}
export async function updateScheduleReminder(id: number, data: Partial<InsertScheduleReminder>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(scheduleReminders).set(data).where(eq(scheduleReminders.id, id));
}
export async function deleteScheduleReminder(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(scheduleReminders).where(eq(scheduleReminders.id, id));
}
export async function deleteScheduleRemindersByScheduleId(scheduleId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(scheduleReminders).where(eq(scheduleReminders.scheduleId, scheduleId));
}

// ── Schedule RSVPs ──────────────────────────────────────
export async function getScheduleRsvps(scheduleId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(scheduleRsvps).where(eq(scheduleRsvps.scheduleId, scheduleId)).orderBy(desc(scheduleRsvps.respondedAt));
}
export async function getScheduleRsvpStats(scheduleId: number) {
  const db = await getDb(); if (!db) return { attending: 0, not_attending: 0, maybe: 0, total: 0 };
  const rows = await db.select().from(scheduleRsvps).where(eq(scheduleRsvps.scheduleId, scheduleId));
  const attending = rows.filter(r => r.response === "attending").length;
  const not_attending = rows.filter(r => r.response === "not_attending").length;
  const maybe = rows.filter(r => r.response === "maybe").length;
  return { attending, not_attending, maybe, total: rows.length };
}
export async function getScheduleRsvpByUser(scheduleId: number, registrationId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(scheduleRsvps)
    .where(and(eq(scheduleRsvps.scheduleId, scheduleId), eq(scheduleRsvps.registrationId, registrationId)))
    .limit(1);
  return result[0];
}
export async function upsertScheduleRsvp(data: InsertScheduleRsvp) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await getScheduleRsvpByUser(data.scheduleId, data.registrationId);
  if (existing) {
    await db.update(scheduleRsvps).set({
      response: data.response,
      note: data.note,
      respondedAt: new Date(),
    }).where(eq(scheduleRsvps.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(scheduleRsvps).values(data);
    return result[0].insertId;
  }
}
export async function getMeetupRsvpSummary(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(scheduleRsvps).where(eq(scheduleRsvps.meetupId, meetupId));
}

// ── User Locations (실시간 위치 공유) ──────────────────────
export async function upsertUserLocation(data: InsertUserLocation) {
  const db = await getDb(); if (!db) return;
  await db.insert(userLocations).values(data).onDuplicateKeyUpdate({
    set: {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      heading: data.heading,
      speed: data.speed,
      altitude: data.altitude,
      isSharing: data.isSharing,
      updatedAt: new Date(),
    },
  });
}

export async function getUserLocation(userId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(userLocations).where(eq(userLocations.userId, userId)).limit(1);
  return rows[0] || null;
}

export async function getActiveLocationsByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  return db.select().from(userLocations)
    .where(and(
      eq(userLocations.meetupId, meetupId),
      eq(userLocations.isSharing, true),
      gte(userLocations.updatedAt, fiveMinAgo),
    ))
    .orderBy(desc(userLocations.updatedAt));
}

export async function getActiveLocationsByChatRoom(chatRoomId: number) {
  const db = await getDb(); if (!db) return [];
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  return db.select().from(userLocations)
    .where(and(
      eq(userLocations.roomId, chatRoomId),
      eq(userLocations.isSharing, true),
      gte(userLocations.updatedAt, fiveMinAgo),
    ))
    .orderBy(desc(userLocations.updatedAt));
}

export async function getAllActiveLocations() {
  const db = await getDb(); if (!db) return [];
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  return db.select().from(userLocations)
    .where(and(
      eq(userLocations.isSharing, true),
      gte(userLocations.updatedAt, fiveMinAgo),
    ))
    .orderBy(desc(userLocations.updatedAt));
}

export async function stopSharingLocation(userId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(userLocations)
    .set({ isSharing: false, updatedAt: new Date() })
    .where(eq(userLocations.userId, userId));
}

export async function stopSharingLocationInChatRoom(userId: number, chatRoomId: number) {
  const db = await getDb(); if (!db) return;
  await db.update(userLocations)
    .set({ isSharing: false, updatedAt: new Date() })
    .where(and(
      eq(userLocations.userId, userId),
      eq(userLocations.roomId, chatRoomId),
    ));
}

// ── Geofence DB Helpers ──────────────────────────────────

export async function createGeofence(data: InsertGeofence) {
  const db = await getDb();
  const result = await db!.insert(geofences).values(data);
  return result[0].insertId;
}

export async function updateGeofence(id: number, data: Partial<InsertGeofence>) {
  const db = await getDb();
  await db!.update(geofences).set(data).where(eq(geofences.id, id));
}

export async function deleteGeofence(id: number) {
  const db = await getDb();
  await db!.delete(geofences).where(eq(geofences.id, id));
}

export async function getGeofenceById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(geofences).where(eq(geofences.id, id)).limit(1);
  return rows[0] || null;
}

export async function listGeofencesByMeetup(meetupId: number) {
  const db = await getDb();
  return db!.select().from(geofences)
    .where(eq(geofences.meetupId, meetupId))
    .orderBy(desc(geofences.createdAt));
}

export async function getActiveGeofencesByMeetup(meetupId: number) {
  const db = await getDb();
  return db!.select().from(geofences)
    .where(and(
      eq(geofences.meetupId, meetupId),
      eq(geofences.isActive, true),
    ))
    .orderBy(desc(geofences.createdAt));
}

export async function createGeofenceEvent(data: InsertGeofenceEvent) {
  const db = await getDb();
  const result = await db!.insert(geofenceEvents).values(data);
  return result[0].insertId;
}

export async function listGeofenceEvents(geofenceId: number, limit = 50) {
  const db = await getDb();
  return db!.select().from(geofenceEvents)
    .where(eq(geofenceEvents.geofenceId, geofenceId))
    .orderBy(desc(geofenceEvents.createdAt))
    .limit(limit);
}

export async function listGeofenceEventsByMeetup(meetupId: number, limit = 100) {
  const db = await getDb();
  return db!.select({
    event: geofenceEvents,
    geofence: geofences,
  }).from(geofenceEvents)
    .innerJoin(geofences, eq(geofenceEvents.geofenceId, geofences.id))
    .where(eq(geofences.meetupId, meetupId))
    .orderBy(desc(geofenceEvents.createdAt))
    .limit(limit);
}

export async function getRecentGeofenceEventForUser(userId: number, geofenceId: number) {
  const db = await getDb();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db!.select().from(geofenceEvents)
    .where(and(
      eq(geofenceEvents.userId, userId),
      eq(geofenceEvents.geofenceId, geofenceId),
      gte(geofenceEvents.createdAt, fiveMinAgo),
    ))
    .orderBy(desc(geofenceEvents.createdAt))
    .limit(1);
  return rows[0] || null;
}

// ── Location History DB Helpers ──────────────────────────

export async function saveLocationHistory(data: InsertLocationHistory) {
  const db = await getDb();
  await db!.insert(locationHistory).values(data);
}

export async function getLocationHistoryByUser(userId: number, options?: { meetupId?: number; startTime?: Date; endTime?: Date; limit?: number }) {
  const db = await getDb();
  const conditions = [eq(locationHistory.userId, userId)];
  if (options?.meetupId) conditions.push(eq(locationHistory.meetupId, options.meetupId));
  if (options?.startTime) conditions.push(gte(locationHistory.createdAt, options.startTime));
  if (options?.endTime) conditions.push(lte(locationHistory.createdAt, options.endTime));

  return db!.select().from(locationHistory)
    .where(and(...conditions))
    .orderBy(asc(locationHistory.createdAt))
    .limit(options?.limit || 1000);
}

export async function getLocationHistoryByMeetup(meetupId: number, options?: { startTime?: Date; endTime?: Date; limit?: number }) {
  const db = await getDb();
  const conditions = [eq(locationHistory.meetupId, meetupId)];
  if (options?.startTime) conditions.push(gte(locationHistory.createdAt, options.startTime));
  if (options?.endTime) conditions.push(lte(locationHistory.createdAt, options.endTime));

  return db!.select().from(locationHistory)
    .where(and(...conditions))
    .orderBy(asc(locationHistory.createdAt))
    .limit(options?.limit || 5000);
}

// ── Location User Search ─────────────────────────────────

export async function searchActiveLocationsByName(searchTerm: string, roomId?: number, meetupId?: number) {
  const db = await getDb();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const conditions = [
    eq(userLocations.isSharing, true),
    gte(userLocations.updatedAt, fiveMinAgo),
  ];
  if (roomId) conditions.push(eq(userLocations.roomId, roomId));
  if (meetupId) conditions.push(eq(userLocations.meetupId, meetupId));

  const locations = await db!.select({
    location: userLocations,
    user: {
      id: users.id,
      name: users.name,
      email: users.email,
    },
  }).from(userLocations)
    .innerJoin(users, eq(userLocations.userId, users.id))
    .where(and(
      ...conditions,
      like(users.name, `%${searchTerm}%`),
    ))
    .orderBy(desc(userLocations.updatedAt));

  return locations;
}


// ── Push Subscriptions ─────────────────────────────────────
export async function savePushSubscription(data: { userId: number; endpoint: string; p256dh: string; auth: string }) {
  const db = await getDb();
  if (!db) return null;
  // 기존 동일 endpoint 삭제 후 새로 저장
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint));
  const [result] = await db.insert(pushSubscriptions).values(data).$returningId();
  return result;
}

export async function deletePushSubscription(endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function getPushSubscriptionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

export async function getAdminPushSubscriptions() {
  const db = await getDb();
  if (!db) return [];
  // 관리자 역할 사용자의 푸시 구독 조회
  return db.select({
    id: pushSubscriptions.id,
    userId: pushSubscriptions.userId,
    endpoint: pushSubscriptions.endpoint,
    p256dh: pushSubscriptions.p256dh,
    auth: pushSubscriptions.auth,
  }).from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(or(eq(users.role, "admin"), eq(users.role, "superadmin")));
}

export async function getLocationHistoryForExport(meetupId: number, opts?: { userId?: number; startTime?: Date; endTime?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(locationHistory.meetupId, meetupId)];
  if (opts?.userId) conditions.push(eq(locationHistory.userId, opts.userId));
  if (opts?.startTime) conditions.push(gte(locationHistory.createdAt, opts.startTime));
  if (opts?.endTime) conditions.push(lte(locationHistory.createdAt, opts.endTime));
  
  return db.select({
    id: locationHistory.id,
    userId: locationHistory.userId,
    userName: users.name,
    latitude: locationHistory.latitude,
    longitude: locationHistory.longitude,
    accuracy: locationHistory.accuracy,
    speed: locationHistory.speed,
    heading: locationHistory.heading,
    createdAt: locationHistory.createdAt,
  }).from(locationHistory)
    .leftJoin(users, eq(locationHistory.userId, users.id))
    .where(and(...conditions))
    .orderBy(asc(locationHistory.createdAt));
}

// ── 특정 사용자 목록의 푸시 구독 조회 ──
export async function getPushSubscriptionsByUserIds(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];
  return db.select({
    id: pushSubscriptions.id,
    userId: pushSubscriptions.userId,
    endpoint: pushSubscriptions.endpoint,
    p256dh: pushSubscriptions.p256dh,
    auth: pushSubscriptions.auth,
  }).from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}

// ── 밋업 참가자의 푸시 구독 조회 ──
export async function getPushSubscriptionsByMeetupId(meetupId: number) {
  const db = await getDb();
  if (!db) return [];
  const regs = await db.select({ userId: registrations.userId }).from(registrations)
    .where(and(eq(registrations.meetupId, meetupId), eq(registrations.status, "approved")));
  const userIds = regs.map(r => r.userId).filter(Boolean) as number[];
  if (userIds.length === 0) return [];
  return db.select({
    id: pushSubscriptions.id,
    userId: pushSubscriptions.userId,
    endpoint: pushSubscriptions.endpoint,
    p256dh: pushSubscriptions.p256dh,
    auth: pushSubscriptions.auth,
  }).from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}

// ── 채팅방 멤버의 푸시 구독 조회 (발신자 제외) ──
export async function getPushSubscriptionsByChatRoom(roomId: number, excludeUserId?: number) {
  const db = await getDb();
  if (!db) return [];
  const members = await db.select({ userId: chatRoomMembers.userId }).from(chatRoomMembers)
    .where(eq(chatRoomMembers.roomId, roomId));
  let userIds = members.map(m => m.userId).filter(Boolean) as number[];
  if (excludeUserId) userIds = userIds.filter(id => id !== excludeUserId);
  if (userIds.length === 0) return [];
  return db.select({
    id: pushSubscriptions.id,
    userId: pushSubscriptions.userId,
    endpoint: pushSubscriptions.endpoint,
    p256dh: pushSubscriptions.p256dh,
    auth: pushSubscriptions.auth,
  }).from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
}

// ── 히트맵용 위치 데이터 조회 (경량 - 위도/경도만) ──
export async function getLocationHistoryForHeatmap(meetupId: number, opts?: { startTime?: Date; endTime?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(locationHistory.meetupId, meetupId)];
  if (opts?.startTime) conditions.push(gte(locationHistory.createdAt, opts.startTime));
  if (opts?.endTime) conditions.push(lte(locationHistory.createdAt, opts.endTime));
  return db.select({
    lat: locationHistory.latitude,
    lng: locationHistory.longitude,
    createdAt: locationHistory.createdAt,
  }).from(locationHistory)
    .where(and(...conditions))
    .orderBy(desc(locationHistory.createdAt))
    .limit(10000);
}

// ── 주변 장소 즐겨찾기 ─────────────────────────────────────

export async function getPlaceFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(placeFavorites)
    .where(eq(placeFavorites.userId, userId))
    .orderBy(desc(placeFavorites.createdAt));
}

export async function addPlaceFavorite(data: InsertPlaceFavorite) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(placeFavorites).values(data);
  return result.insertId;
}

export async function removePlaceFavorite(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  const [result] = await db.delete(placeFavorites)
    .where(and(eq(placeFavorites.id, id), eq(placeFavorites.userId, userId)));
  return (result as any).affectedRows > 0;
}

export async function isPlaceFavorited(userId: number, placeId: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: placeFavorites.id }).from(placeFavorites)
    .where(and(eq(placeFavorites.userId, userId), eq(placeFavorites.placeId, placeId)))
    .limit(1);
  return rows.length > 0;
}

// ══════════════════════════════════════════════════════════
// v6.12 - Travel Policies, Attendee Tiers, Emergency Contacts, Safety Alerts
// ══════════════════════════════════════════════════════════

// ── Travel Policies ──────────────────────────────────
export async function getTravelPolicy(meetupId: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(travelPolicies).where(eq(travelPolicies.meetupId, meetupId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertTravelPolicy(meetupId: number, data: Partial<InsertTravelPolicy>) {
  const db = await getDb(); if (!db) return null;
  const existing = await getTravelPolicy(meetupId);
  if (existing) {
    await db.update(travelPolicies).set(data).where(eq(travelPolicies.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db.insert(travelPolicies).values({ meetupId, ...data } as InsertTravelPolicy);
    return (result as any).insertId;
  }
}

// ── Attendee Tiers ──────────────────────────────────
export async function getAttendeeTiers(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(attendeeTiers).where(eq(attendeeTiers.meetupId, meetupId)).orderBy(desc(attendeeTiers.tierLevel));
}

export async function createAttendeeTier(data: InsertAttendeeTier) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(attendeeTiers).values(data);
  return (result as any).insertId;
}

export async function updateAttendeeTier(id: number, data: Partial<InsertAttendeeTier>) {
  const db = await getDb(); if (!db) return false;
  await db.update(attendeeTiers).set(data).where(eq(attendeeTiers.id, id));
  return true;
}

export async function deleteAttendeeTier(id: number) {
  const db = await getDb(); if (!db) return false;
  await db.delete(attendeeTiers).where(eq(attendeeTiers.id, id));
  return true;
}

// ── Emergency Contacts ──────────────────────────────
export async function getEmergencyContacts(registrationId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(emergencyContacts).where(eq(emergencyContacts.registrationId, registrationId));
}

export async function getEmergencyContactsByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(emergencyContacts).where(eq(emergencyContacts.meetupId, meetupId));
}

export async function upsertEmergencyContact(data: InsertEmergencyContact) {
  const db = await getDb(); if (!db) return null;
  if (data.registrationId) {
    const existing = await db.select().from(emergencyContacts)
      .where(and(eq(emergencyContacts.registrationId, data.registrationId), eq(emergencyContacts.isPrimary, true)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(emergencyContacts).set(data).where(eq(emergencyContacts.id, existing[0].id));
      return existing[0].id;
    }
  }
  const [result] = await db.insert(emergencyContacts).values(data);
  return (result as any).insertId;
}

export async function deleteEmergencyContact(id: number) {
  const db = await getDb(); if (!db) return false;
  await db.delete(emergencyContacts).where(eq(emergencyContacts.id, id));
  return true;
}

// ── Safety Alerts ──────────────────────────────────
export async function getSafetyAlerts(meetupId: number, activeOnly = true) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(safetyAlerts.meetupId, meetupId)];
  if (activeOnly) conditions.push(inArray(safetyAlerts.status, ["active", "monitoring"]));
  return db.select().from(safetyAlerts).where(and(...conditions)).orderBy(desc(safetyAlerts.createdAt));
}

export async function createSafetyAlert(data: InsertSafetyAlert) {
  const db = await getDb(); if (!db) return null;
  const [result] = await db.insert(safetyAlerts).values(data);
  return (result as any).insertId;
}

export async function updateSafetyAlert(id: number, data: Partial<InsertSafetyAlert>) {
  const db = await getDb(); if (!db) return false;
  await db.update(safetyAlerts).set(data).where(eq(safetyAlerts.id, id));
  return true;
}

export async function resolveSafetyAlert(id: number, userId: number, note?: string) {
  const db = await getDb(); if (!db) return false;
  await db.update(safetyAlerts).set({
    status: "resolved",
    resolvedAt: new Date(),
    resolvedByUserId: userId,
    resolvedNote: note ?? null,
  }).where(eq(safetyAlerts.id, id));
  return true;
}

// ── Budget Tracking (travel_policies spentAmount 업데이트) ──
export async function updateBudgetSpent(meetupId: number, additionalAmount: number) {
  const db = await getDb(); if (!db) return false;
  const policy = await getTravelPolicy(meetupId);
  if (!policy) return false;
  const newSpent = Number(policy.spentAmount || 0) + additionalAmount;
  await db.update(travelPolicies).set({ spentAmount: String(newSpent) as any }).where(eq(travelPolicies.id, policy.id));
  return true;
}

// ── Registration Tier 연결 (registrations 테이블에 tierId 필드 확인) ──
export async function getRegistrationWithTier(registrationId: number) {
  const db = await getDb(); if (!db) return null;
  const reg = await db.select().from(registrations).where(eq(registrations.id, registrationId)).limit(1);
  if (!reg[0]) return null;
  // tierId가 registrations에 없으면 기본 tier 반환
  const meetupId = reg[0].meetupId;
  if (!meetupId) return { ...reg[0], tier: null };
  const tiers = await getAttendeeTiers(meetupId);
  const defaultTier = tiers.find(t => t.isDefault) ?? tiers[tiers.length - 1] ?? null;
  return { ...reg[0], tier: defaultTier };
}


// ── Booking Pipeline 통계 ──────────────────────────────────
export async function getBookingPipelineStats(meetupId: number) {
  const db = await getDb(); if (!db) return null;
  const where = eq(registrations.meetupId, meetupId);

  // 1. 초대 (전체 등록)
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where);
  // 2. RSVP (pending이 아닌 것 = 응답한 것)
  const [rsvped] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(and(where, sql`${registrations.status} != 'pending'`));
  // 3. 승인됨 (approved + completed)
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(and(where, sql`${registrations.status} IN ('approved', 'completed')`));
  // 4. 체크인 (pickupAssignments에 assignedRegistrationIds JSON 배열에서 카운트)
  const [checkedIn] = await db.select({ count: sql<number>`count(*)` })
    .from(pickupAssignments)
    .where(and(
      eq(pickupAssignments.meetupId, meetupId),
      sql`${pickupAssignments.status} IN ('picked_up', 'completed')`
    ));
  // 5. 완료 (completed)
  const [completed] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(and(where, eq(registrations.status, "completed")));

  const invited = total?.count ?? 0;
  const rsvpCount = rsvped?.count ?? 0;
  const approvedCount = approved?.count ?? 0;
  const checkedInCount = checkedIn?.count ?? 0;
  const completedCount = completed?.count ?? 0;

  return {
    stages: [
      { name: "invited", label: "초대", count: invited },
      { name: "rsvp", label: "RSVP", count: rsvpCount },
      { name: "approved", label: "승인", count: approvedCount },
      { name: "checkedIn", label: "체크인", count: checkedInCount },
      { name: "completed", label: "완료", count: completedCount },
    ],
    conversionRates: {
      inviteToRsvp: invited > 0 ? Math.round((rsvpCount / invited) * 100) : 0,
      rsvpToApproved: rsvpCount > 0 ? Math.round((approvedCount / rsvpCount) * 100) : 0,
      approvedToCheckin: approvedCount > 0 ? Math.round((checkedInCount / approvedCount) * 100) : 0,
      checkinToCompleted: checkedInCount > 0 ? Math.round((completedCount / checkedInCount) * 100) : 0,
    },
    bottleneck: (() => {
      const rates = [
        { stage: "invite→RSVP", rate: invited > 0 ? (rsvpCount / invited) * 100 : 100 },
        { stage: "RSVP→승인", rate: rsvpCount > 0 ? (approvedCount / rsvpCount) * 100 : 100 },
        { stage: "승인→체크인", rate: approvedCount > 0 ? (checkedInCount / approvedCount) * 100 : 100 },
        { stage: "체크인→완료", rate: checkedInCount > 0 ? (completedCount / checkedInCount) * 100 : 100 },
      ];
      const min = rates.reduce((a, b) => a.rate < b.rate ? a : b);
      return min.rate < 100 ? { stage: min.stage, rate: Math.round(min.rate) } : null;
    })(),
  };
}

// ── 경영진 리포트 데이터 ──────────────────────────────────
export async function getExecutiveReportData(meetupId: number) {
  const db = await getDb(); if (!db) return null;
  const where = eq(registrations.meetupId, meetupId);

  // 참석 통계
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(where);
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(and(where, sql`${registrations.status} IN ('approved', 'completed')`));
  const [completed] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(and(where, eq(registrations.status, "completed")));

  // 국가별 분포 (userProfiles에서 nationality 조인)
  const countryDist = await db.select({
    country: userProfiles.nationality,
    count: sql<number>`count(*)`,
  }).from(registrations)
    .leftJoin(userProfiles, eq(registrations.userId, userProfiles.userId))
    .where(and(where, sql`${userProfiles.nationality} IS NOT NULL AND ${userProfiles.nationality} != ''`))
    .groupBy(userProfiles.nationality)
    .orderBy(sql`count(*) DESC`)
    .limit(20);

  // 비용 데이터 (meetup_expenses)
  const expenses = await db.select().from(meetupExpenses).where(eq(meetupExpenses.meetupId, meetupId));
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const expenseByCategory = expenses.reduce((acc, e) => {
    const cat = e.category || "기타";
    acc[cat] = (acc[cat] || 0) + Number(e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  // 밋업 정보
  const meetup = await db.select().from(meetups).where(eq(meetups.id, meetupId)).limit(1);

  // 여행 정책
  const policy = await getTravelPolicy(meetupId);

  return {
    meetup: meetup[0] || null,
    attendance: {
      total: total?.count ?? 0,
      approved: approved?.count ?? 0,
      completed: completed?.count ?? 0,
      attendanceRate: (total?.count ?? 0) > 0 ? Math.round(((approved?.count ?? 0) / (total?.count ?? 0)) * 100) : 0,
    },
    countryDistribution: countryDist.map(c => ({ country: c.country || "Unknown", count: c.count })),
    expenses: {
      total: totalExpense,
      byCategory: expenseByCategory,
      items: expenses,
    },
    budget: policy ? {
      total: Number(policy.totalBudget || 0),
      spent: Number(policy.spentAmount || 0),
      remaining: Number(policy.totalBudget || 0) - Number(policy.spentAmount || 0),
      utilization: Number(policy.totalBudget) > 0 ? Math.round((Number(policy.spentAmount || 0) / Number(policy.totalBudget)) * 100) : 0,
    } : null,
    roi: totalExpense > 0 && (approved?.count ?? 0) > 0 ? {
      costPerAttendee: Math.round(totalExpense / (approved?.count ?? 1)),
      totalInvestment: totalExpense,
    } : null,
  };
}


// ══════════════════════════════════════════════════════════
// v6.14 - RSVP 리마인더 + 셀프 예약 포털
// ══════════════════════════════════════════════════════════

// ── RSVP Reminder Settings ──────────────────────────────
export async function getRsvpReminderSettings(meetupId: number) {
  const db = await getDb();
  const rows = await db!.select().from(rsvpReminderSettings).where(eq(rsvpReminderSettings.meetupId, meetupId)).limit(1);
  return rows[0] || null;
}

export async function upsertRsvpReminderSettings(meetupId: number, data: Partial<InsertRsvpReminderSetting>) {
  const db = await getDb();
  const existing = await getRsvpReminderSettings(meetupId);
  if (existing) {
    await db!.update(rsvpReminderSettings).set(data).where(eq(rsvpReminderSettings.id, existing.id));
    return { ...existing, ...data };
  } else {
    const [result] = await db!.insert(rsvpReminderSettings).values({ meetupId, ...data } as InsertRsvpReminderSetting);
    return { id: result.insertId, meetupId, ...data };
  }
}

// ── RSVP Reminder Logs ──────────────────────────────────
export async function createRsvpReminderLog(data: InsertRsvpReminderLog) {
  const db = await getDb();
  const [result] = await db!.insert(rsvpReminderLogs).values(data);
  return result.insertId;
}

export async function getRsvpReminderLogs(meetupId: number, limit = 50) {
  const db = await getDb();
  return db!.select().from(rsvpReminderLogs).where(eq(rsvpReminderLogs.meetupId, meetupId)).orderBy(desc(rsvpReminderLogs.sentAt)).limit(limit);
}

export async function getRsvpReminderLogsByInvitation(invitationId: number) {
  const db = await getDb();
  return db!.select().from(rsvpReminderLogs).where(eq(rsvpReminderLogs.invitationId, invitationId)).orderBy(desc(rsvpReminderLogs.sentAt));
}

// ── Pending RSVP 조회 (미응답 초대자) ──────────────────────
export async function getPendingRsvpInvitations(meetupId: number) {
  const db = await getDb();
  return db!.select().from(meetupInvitations)
    .where(and(
      eq(meetupInvitations.meetupId, meetupId),
      eq(meetupInvitations.status, "sent")
    ))
    .orderBy(desc(meetupInvitations.createdAt));
}

export async function getRsvpStats(meetupId: number) {
  const db = await getDb();
  const all = await db!.select().from(meetupInvitations).where(eq(meetupInvitations.meetupId, meetupId));
  const total = all.length;
  const sent = all.filter(i => i.status === "sent").length;
  const opened = all.filter(i => i.status === "opened").length;
  const accepted = all.filter(i => i.status === "accepted").length;
  const rejected = all.filter(i => i.status === "rejected").length;
  const expired = all.filter(i => i.status === "expired").length;
  return { total, sent, opened, accepted, rejected, expired, responseRate: total > 0 ? Math.round(((accepted + rejected) / total) * 100) : 0 };
}

// ── Self Booking Requests ──────────────────────────────
export async function createSelfBookingRequest(data: InsertSelfBookingRequest) {
  const db = await getDb();
  const [result] = await db!.insert(selfBookingRequests).values(data);
  return result.insertId;
}

export async function getSelfBookingRequests(meetupId: number) {
  const db = await getDb();
  return db!.select().from(selfBookingRequests).where(eq(selfBookingRequests.meetupId, meetupId)).orderBy(desc(selfBookingRequests.createdAt));
}

export async function getSelfBookingRequestsByUser(userId: number) {
  const db = await getDb();
  return db!.select().from(selfBookingRequests).where(eq(selfBookingRequests.userId, userId)).orderBy(desc(selfBookingRequests.createdAt));
}

export async function getSelfBookingRequestById(id: number) {
  const db = await getDb();
  const rows = await db!.select().from(selfBookingRequests).where(eq(selfBookingRequests.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateSelfBookingRequest(id: number, data: Partial<InsertSelfBookingRequest>) {
  const db = await getDb();
  await db!.update(selfBookingRequests).set(data).where(eq(selfBookingRequests.id, id));
}

export async function getSelfBookingStats(meetupId: number) {
  const db = await getDb();
  const all = await db!.select().from(selfBookingRequests).where(eq(selfBookingRequests.meetupId, meetupId));
  return {
    total: all.length,
    draft: all.filter(r => r.status === "draft").length,
    submitted: all.filter(r => r.status === "submitted").length,
    approved: all.filter(r => r.status === "approved").length,
    rejected: all.filter(r => r.status === "rejected").length,
    booked: all.filter(r => r.status === "booked").length,
    totalBudget: all.reduce((sum, r) => sum + Number(r.estimatedBudget || 0), 0),
    policyViolations: all.filter(r => !r.policyCompliant).length,
  };
}

// ── SNS Accounts ──────────────────────────────────────────
export async function getSnsAccounts(userId?: number) {
  const db = await getDb();
  if (userId) return db!.select().from(snsAccounts).where(eq(snsAccounts.userId, userId));
  return db!.select().from(snsAccounts);
}
export async function createSnsAccount(data: InsertSnsAccount) {
  const db = await getDb();
  const [result] = await db!.insert(snsAccounts).values(data);
  return result.insertId;
}
export async function updateSnsAccount(id: number, data: Partial<InsertSnsAccount>) {
  const db = await getDb();
  await db!.update(snsAccounts).set(data).where(eq(snsAccounts.id, id));
}
export async function deleteSnsAccount(id: number) {
  const db = await getDb();
  await db!.delete(snsAccounts).where(eq(snsAccounts.id, id));
}

// ── SNS Posts ──────────────────────────────────────────────
export async function getSnsPosts(filters?: { status?: string; platform?: string; meetupId?: number }) {
  const db = await getDb();
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(snsPosts.status, filters.status as any));
  if (filters?.platform) conditions.push(eq(snsPosts.platform, filters.platform as any));
  if (filters?.meetupId) conditions.push(eq(snsPosts.meetupId, filters.meetupId));
  if (conditions.length > 0) {
    return db!.select().from(snsPosts).where(and(...conditions)).orderBy(desc(snsPosts.createdAt));
  }
  return db!.select().from(snsPosts).orderBy(desc(snsPosts.createdAt));
}
export async function getSnsPostById(id: number) {
  const db = await getDb();
  const [post] = await db!.select().from(snsPosts).where(eq(snsPosts.id, id));
  return post;
}
export async function createSnsPost(data: InsertSnsPost) {
  const db = await getDb();
  const [result] = await db!.insert(snsPosts).values(data);
  return result.insertId;
}
export async function updateSnsPost(id: number, data: Partial<InsertSnsPost>) {
  const db = await getDb();
  await db!.update(snsPosts).set(data).where(eq(snsPosts.id, id));
}
export async function deleteSnsPost(id: number) {
  const db = await getDb();
  await db!.delete(snsPosts).where(eq(snsPosts.id, id));
}
export async function getSnsPostStats() {
  const db = await getDb();
  const all = await db!.select().from(snsPosts);
  return {
    total: all.length,
    draft: all.filter(p => p.status === "draft").length,
    scheduled: all.filter(p => p.status === "scheduled").length,
    published: all.filter(p => p.status === "published").length,
    failed: all.filter(p => p.status === "failed").length,
    aiGenerated: all.filter(p => p.aiGenerated).length,
  };
}

// ── SNS Templates ──────────────────────────────────────────
export async function getSnsTemplates() {
  const db = await getDb();
  return db!.select().from(snsTemplates).orderBy(desc(snsTemplates.createdAt));
}
export async function createSnsTemplate(data: InsertSnsTemplate) {
  const db = await getDb();
  const [result] = await db!.insert(snsTemplates).values(data);
  return result.insertId;
}
export async function updateSnsTemplate(id: number, data: Partial<InsertSnsTemplate>) {
  const db = await getDb();
  await db!.update(snsTemplates).set(data).where(eq(snsTemplates.id, id));
}
export async function deleteSnsTemplate(id: number) {
  const db = await getDb();
  await db!.delete(snsTemplates).where(eq(snsTemplates.id, id));
}

// ── AI Bulk Registration ──────────────────────────────────
export async function bulkCreateRegistrations(dataList: InsertRegistration[]) {
  const db = await getDb();
  if (dataList.length === 0) return [];
  const results = [];
  for (const data of dataList) {
    const [result] = await db!.insert(registrations).values(data);
    results.push(result.insertId);
  }
  return results;
}

// ── Event Checkins (현장 QR 체크인) ─────────────────────
export async function createEventCheckin(data: InsertEventCheckin) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(eventCheckins).values(data);
  return result.insertId;
}

export async function getEventCheckinByToken(qrToken: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(eventCheckins).where(eq(eventCheckins.qrToken, qrToken)).limit(1);
  return result[0];
}

export async function getEventCheckinByRegistration(registrationId: number, meetupId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(eventCheckins)
    .where(and(eq(eventCheckins.registrationId, registrationId), eq(eventCheckins.meetupId, meetupId)))
    .limit(1);
  return result[0];
}

export async function getEventCheckinsByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(eventCheckins)
    .where(eq(eventCheckins.meetupId, meetupId))
    .orderBy(desc(eventCheckins.updatedAt));
}

export async function updateEventCheckin(id: number, data: Partial<InsertEventCheckin>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(eventCheckins).set(data).where(eq(eventCheckins.id, id));
}

export async function getEventCheckinStats(meetupId: number) {
  const db = await getDb();
  if (!db) return { total: 0, checkedIn: 0, notCheckedIn: 0 };
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(eventCheckins).where(eq(eventCheckins.meetupId, meetupId));
  const [checkedIn] = await db.select({ count: sql<number>`count(*)` }).from(eventCheckins).where(and(eq(eventCheckins.meetupId, meetupId), eq(eventCheckins.checkedIn, true)));
  return {
    total: total.count,
    checkedIn: checkedIn.count,
    notCheckedIn: total.count - checkedIn.count,
  };
}

export async function bulkCreateEventCheckins(dataList: InsertEventCheckin[]) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return [];
  const ids: number[] = [];
  for (const data of dataList) {
    const [result] = await db.insert(eventCheckins).values(data);
    ids.push(result.insertId);
  }
  return ids;
}

export async function deleteEventCheckin(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(eventCheckins).where(eq(eventCheckins.id, id));
}

// ── User Accommodations (사용자 직접 입력 숙박 정보) ────────────────────────
export async function getUserAccommodations(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(userAccommodations).where(eq(userAccommodations.userId, userId)).orderBy(desc(userAccommodations.createdAt));
}
export async function createUserAccommodation(data: InsertUserAccommodation) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(userAccommodations).values(data);
  return result.insertId;
}
export async function updateUserAccommodation(id: number, userId: number, data: Partial<InsertUserAccommodation>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(userAccommodations).set(data).where(and(eq(userAccommodations.id, id), eq(userAccommodations.userId, userId)));
}
export async function deleteUserAccommodation(id: number, userId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(userAccommodations).where(and(eq(userAccommodations.id, id), eq(userAccommodations.userId, userId)));
}
export { userAccommodations } from "../drizzle/schema";

// ── Translation Cache ──────────────────────────────────────────────────────────
import { translationCache } from "../drizzle/schema";
export { translationCache } from "../drizzle/schema";

export async function getTranslationFromCache(sourceHash: string, targetLang: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(translationCache)
    .where(and(eq(translationCache.sourceHash, sourceHash), eq(translationCache.targetLang, targetLang)))
    .limit(1);
  return rows[0] || null;
}

export async function saveTranslationToCache(sourceHash: string, targetLang: string, sourceText: string, translatedText: string) {
  const db = await getDb(); if (!db) return;
  await db.insert(translationCache).values({ sourceHash, targetLang, sourceText, translatedText });
}

// ── Shared Accommodations ──────────────────────────────────────────────────────
import { sharedAccommodations } from "../drizzle/schema";
export { sharedAccommodations } from "../drizzle/schema";

export async function shareAccommodation(data: {
  accommodationId: number;
  meetupId: number;
  sharedByUserId: string;
  sharedByName: string | null;
  hotelName: string;
  hotelAddress?: string | null;
  checkInDate?: string | null;
  checkInTime?: string | null;
  checkOutDate?: string | null;
  checkOutTime?: string | null;
  roomType?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const [result] = await db.insert(sharedAccommodations).values(data);
  return result.insertId;
}

export async function unshareAccommodation(accommodationId: number, meetupId: number, userId: string) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(sharedAccommodations).where(
    and(
      eq(sharedAccommodations.accommodationId, accommodationId),
      eq(sharedAccommodations.meetupId, meetupId),
      eq(sharedAccommodations.sharedByUserId, userId)
    )
  );
}

export async function getSharedAccommodationsByMeetup(meetupId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(sharedAccommodations)
    .where(eq(sharedAccommodations.meetupId, meetupId))
    .orderBy(desc(sharedAccommodations.createdAt));
}

export async function getMySharedAccommodations(userId: string) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(sharedAccommodations)
    .where(eq(sharedAccommodations.sharedByUserId, userId));
}


// ── Immigration Cards (나라별 입국카드) ──────────────────────────────
export async function getImmigrationCards(activeOnly = true) {
  const db = await getDb(); if (!db) return [];
  if (activeOnly) {
    return db.select().from(immigrationCards).where(eq(immigrationCards.isActive, true));
  }
  return db.select().from(immigrationCards);
}

export async function getImmigrationCardByCountry(countryCode: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(immigrationCards)
    .where(and(eq(immigrationCards.countryCode, countryCode), eq(immigrationCards.isActive, true)));
  return rows[0] || null;
}

export async function upsertImmigrationCard(data: {
  id?: number; countryCode: string; countryName: string; countryNameLocal?: string;
  cardUrl: string; cardName: string; description?: string;
  requiredFields?: string; fieldLabels?: string; isActive?: boolean;
}) {
  const db = await getDb(); if (!db) return null;
  if (data.id) {
    await db.update(immigrationCards).set({
      countryCode: data.countryCode,
      countryName: data.countryName,
      countryNameLocal: data.countryNameLocal || null,
      cardUrl: data.cardUrl,
      cardName: data.cardName,
      description: data.description || null,
      requiredFields: data.requiredFields || null,
      fieldLabels: data.fieldLabels || null,
      isActive: data.isActive ?? true,
    }).where(eq(immigrationCards.id, data.id));
    return { id: data.id };
  }
  const result = await db.insert(immigrationCards).values({
    countryCode: data.countryCode,
    countryName: data.countryName,
    countryNameLocal: data.countryNameLocal || null,
    cardUrl: data.cardUrl,
    cardName: data.cardName,
    description: data.description || null,
    requiredFields: data.requiredFields || null,
    fieldLabels: data.fieldLabels || null,
    isActive: data.isActive ?? true,
  });
  return { id: Number(result[0].insertId) };
}

export async function deleteImmigrationCard(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(immigrationCards).where(eq(immigrationCards.id, id));
}

// ── v6.36: 여권+항공권 일괄 업로드 & 비회원→회원 연결 ──────────────────
export async function findRegistrationsByName(name: string, meetupId?: number) {
  const db = await getDb(); if (!db) return [];
  const conditions = [eq(registrations.name, name)];
  if (meetupId) conditions.push(eq(registrations.meetupId, meetupId));
  return db.select().from(registrations).where(and(...conditions)).orderBy(desc(registrations.createdAt));
}

export async function findPassportInfoByPassportNumber(passportNumber: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(passportInfo).where(eq(passportInfo.passportNumber, passportNumber));
  return rows[0] || null;
}

export async function linkRegistrationsToUser(userId: number, name: string) {
  const db = await getDb(); if (!db) return 0;
  const result = await db.update(registrations)
    .set({ userId })
    .where(and(eq(registrations.name, name), isNull(registrations.userId)));
  return (result as any)[0]?.affectedRows || 0;
}

export async function linkFlightTicketsToUser(userId: number, name: string) {
  const db = await getDb(); if (!db) return 0;
  const result = await db.update(flightTickets)
    .set({ userId })
    .where(and(eq(flightTickets.passengerName, name), isNull(flightTickets.userId)));
  return (result as any)[0]?.affectedRows || 0;
}

export async function linkPassportInfoToUser(userId: number, passportNumber: string) {
  const db = await getDb(); if (!db) return false;
  const existing = await findPassportInfoByPassportNumber(passportNumber);
  if (!existing) return false;
  if (existing.userId === 0 || existing.userId === null) {
    await db.update(passportInfo).set({ userId }).where(eq(passportInfo.id, existing.id));
    return true;
  }
  return false;
}

export async function createPassportInfoForGuest(data: Partial<InsertPassportInfo> & { passportNumber: string }) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(passportInfo).values({ ...data, userId: 0 } as any);
  return Number((result as any)[0].insertId);
}
