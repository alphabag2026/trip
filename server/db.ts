import { eq, like, or, and, desc, sql, gte, lte, between } from "drizzle-orm";
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
