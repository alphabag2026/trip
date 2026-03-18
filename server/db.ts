import { eq, like, or, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  meetups, InsertMeetup,
  registrations, InsertRegistration,
  travelInfo, InsertTravelInfo,
  itineraries, InsertItinerary,
  telegramConfig, InsertTelegramConfig,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
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
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
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
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Meetups ────────────────────────────────────────
export async function createMeetup(data: InsertMeetup) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(meetups).values(data);
  return result[0].insertId;
}

export async function getMeetups(filters?: { type?: string; status?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.type) conditions.push(eq(meetups.type, filters.type as any));
  if (filters?.status) conditions.push(eq(meetups.status, filters.status as any));
  return db.select().from(meetups).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(meetups.createdAt));
}

export async function getMeetupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(meetups).where(eq(meetups.id, id)).limit(1);
  return result[0];
}

export async function updateMeetup(id: number, data: Partial<InsertMeetup>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(meetups).set(data).where(eq(meetups.id, id));
}

export async function deleteMeetup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(meetups).where(eq(meetups.id, id));
}

// ── Registrations ──────────────────────────────────
export async function createRegistration(data: InsertRegistration) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(registrations).values(data);
  return result[0].insertId;
}

export async function getRegistrations(filters?: {
  category?: string;
  status?: string;
  locationType?: string;
  meetupId?: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.category) conditions.push(eq(registrations.category, filters.category as any));
  if (filters?.status) conditions.push(eq(registrations.status, filters.status as any));
  if (filters?.locationType) conditions.push(eq(registrations.locationType, filters.locationType as any));
  if (filters?.meetupId) conditions.push(eq(registrations.meetupId, filters.meetupId));
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(or(
      like(registrations.name, s),
      like(registrations.phone, s),
      like(registrations.messengerId, s),
      like(registrations.teamName, s),
      like(registrations.referrerName, s),
      like(registrations.walletAddress, s),
      like(registrations.notes, s),
    ));
  }
  return db.select().from(registrations).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(registrations.createdAt));
}

export async function getRegistrationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(registrations).where(eq(registrations.id, id)).limit(1);
  return result[0];
}

export async function getRegistrationByNameAndPhone(name: string, phone: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations).where(and(eq(registrations.name, name), eq(registrations.phone, phone))).orderBy(desc(registrations.createdAt));
}

export async function updateRegistration(id: number, data: Partial<InsertRegistration>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(registrations).set(data).where(eq(registrations.id, id));
}

export async function deleteRegistration(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(registrations).where(eq(registrations.id, id));
}

export async function getRegistrationStats() {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, approved: 0, domestic: 0, overseas: 0 };
  const [total] = await db.select({ count: sql<number>`count(*)` }).from(registrations);
  const [pending] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "pending"));
  const [approved] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.status, "approved"));
  const [domestic] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.locationType, "domestic"));
  const [overseas] = await db.select({ count: sql<number>`count(*)` }).from(registrations).where(eq(registrations.locationType, "overseas"));
  return {
    total: total.count,
    pending: pending.count,
    approved: approved.count,
    domestic: domestic.count,
    overseas: overseas.count,
  };
}

// ── Travel Info ────────────────────────────────────
export async function getTravelInfoList() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(travelInfo).orderBy(travelInfo.countryNameKo);
}

export async function getTravelInfoByCountry(countryCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(travelInfo).where(eq(travelInfo.countryCode, countryCode)).limit(1);
  return result[0];
}

export async function upsertTravelInfo(data: InsertTravelInfo) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(travelInfo).values(data).onDuplicateKeyUpdate({
    set: {
      countryName: data.countryName,
      countryNameKo: data.countryNameKo,
      requiredItems: data.requiredItems,
      immigrationUrl: data.immigrationUrl,
      immigrationNotes: data.immigrationNotes,
      visaRequired: data.visaRequired,
      visaNotes: data.visaNotes,
      emergencyContact: data.emergencyContact,
      timezone: data.timezone,
      currency: data.currency,
      language: data.language,
      plugType: data.plugType,
      additionalNotes: data.additionalNotes,
    },
  });
}

export async function deleteTravelInfo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(travelInfo).where(eq(travelInfo.id, id));
}

// ── Itineraries ────────────────────────────────────
export async function createItinerary(data: InsertItinerary) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(itineraries).values(data);
  return result[0].insertId;
}

export async function getItinerariesByRegistration(registrationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(itineraries).where(eq(itineraries.registrationId, registrationId)).orderBy(desc(itineraries.createdAt));
}

export async function getItineraryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(itineraries).where(eq(itineraries.id, id)).limit(1);
  return result[0];
}

export async function updateItinerary(id: number, data: Partial<InsertItinerary>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(itineraries).set(data).where(eq(itineraries.id, id));
}

export async function deleteItinerary(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(itineraries).where(eq(itineraries.id, id));
}

export async function getAllItineraries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(itineraries).orderBy(desc(itineraries.createdAt));
}

// ── Telegram Config ────────────────────────────────
export async function getTelegramConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(telegramConfig).limit(1);
  return result[0];
}

export async function upsertTelegramConfig(data: InsertTelegramConfig) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getTelegramConfig();
  if (existing) {
    await db.update(telegramConfig).set(data).where(eq(telegramConfig.id, existing.id));
  } else {
    await db.insert(telegramConfig).values(data);
  }
}
