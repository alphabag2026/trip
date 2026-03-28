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
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
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
  return db.select().from(registrations).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(registrations.createdAt));
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
  const conditions = [];
  if (filters?.meetupId) conditions.push(eq(flightSchedules.meetupId, filters.meetupId));
  if (filters?.registrationId) conditions.push(eq(flightSchedules.registrationId, filters.registrationId));
  if (filters?.direction) conditions.push(eq(flightSchedules.direction, filters.direction as any));
  return db.select().from(flightSchedules).where(conditions.length ? and(...conditions) : undefined).orderBy(flightSchedules.scheduledDeparture);
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
  if (!db) return { meetups: [], registrations: [], totalAttendees: 0, pendingRegistrations: 0 };

  // organizer가 생성한 밋업 또는 소속 조직의 밋업
  const userRow = await db.select().from(users).where(eq(users.id, userId));
  const user = userRow[0];
  if (!user) return { meetups: [], registrations: [], totalAttendees: 0, pendingRegistrations: 0 };

  const allMeetups = await db.select().from(meetups);
  const allRegs = await db.select().from(registrations);

  // 소속 조직의 멤버인 경우 해당 조직의 밋업 표시
  const memberRows = await db.select().from(organizationMembers).where(eq(organizationMembers.userId, userId));
  const orgIds = memberRows.map((m: any) => m.organizationId);

  // 사용자가 만든 밋업 또는 조직 관련 밋업
  const myMeetups = allMeetups;
  const myRegs = allRegs.filter((r: any) => myMeetups.some((m: any) => m.id === r.meetupId));

  return {
    meetups: myMeetups.slice(0, 10),
    registrations: myRegs.slice(0, 20),
    totalAttendees: myRegs.length,
    pendingRegistrations: myRegs.filter((r: any) => r.status === "pending").length,
    orgIds,
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
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUserWithPassword(data: {
  email: string;
  name: string;
  passwordHash: string;
  role?: "user" | "admin" | "superadmin" | "organizer" | "agency" | "partner";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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

export { eq, desc, asc, and, gt, isNull } from "drizzle-orm";
export { companyInfo, meetupInvitations, invitationStatistics, transportationOptions, participantTransportation, roleDelegations, adBanners } from "../drizzle/schema";
