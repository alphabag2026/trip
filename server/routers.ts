import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import {
  generateFlightSearchLinks,
  generateHotelSearchLinks,
  getAirportInfo,
  AIRPORT_MAP,
  type AffiliateConfig,
  type FlightSearchParams,
  type HotelSearchParams,
} from "./affiliateHelper";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다" });
  return next({ ctx });
});

const superadminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "superadmin" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "슈퍼관리자 권한이 필요합니다" });
  return next({ ctx });
});

// Telegram helper
async function sendTelegram(text: string) {
  const config = await db.getTelegramConfig();
  if (!config?.enabled || !config.botToken || !config.chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch { return false; }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Meetups ──────────────────────────────────────
  meetup: router({
    list: publicProcedure
      .input(z.object({ type: z.string().optional(), status: z.string().optional() }).optional())
      .query(({ input }) => db.getMeetups(input)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getMeetupById(input.id)),
    create: adminProcedure
      .input(z.object({
        title: z.string().min(1), type: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup"),
        locationType: z.enum(["domestic", "overseas"]).default("domestic"),
        destinationCountry: z.string().optional(), location: z.string().optional(),
        scheduleStart: z.string().optional(), scheduleEnd: z.string().optional(),
        description: z.string().optional(), maxParticipants: z.number().optional(),
        baggageNotice: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createMeetup({
          ...input,
          baggageNotice: input.baggageNotice || "초과화물은 직접부담할 수 있습니다.",
          scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : undefined,
          scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : undefined,
          createdBy: ctx.user.id,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), title: z.string().optional(),
        type: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).optional(),
        locationType: z.enum(["domestic", "overseas"]).optional(),
        destinationCountry: z.string().optional(), location: z.string().optional(),
        scheduleStart: z.string().optional(), scheduleEnd: z.string().optional(),
        description: z.string().optional(), maxParticipants: z.number().optional(),
        status: z.enum(["draft", "open", "closed", "completed"]).optional(),
        baggageNotice: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMeetup(id, {
          ...data,
          scheduleStart: data.scheduleStart ? new Date(data.scheduleStart) : undefined,
          scheduleEnd: data.scheduleEnd ? new Date(data.scheduleEnd) : undefined,
        });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteMeetup(input.id); return { success: true }; }),
  }),

  // ── Registrations ────────────────────────────────
  registration: router({
    list: adminProcedure
      .input(z.object({
        category: z.string().optional(), status: z.string().optional(),
        locationType: z.string().optional(), meetupId: z.number().optional(),
        search: z.string().optional(), dateFrom: z.string().optional(),
        dateTo: z.string().optional(), country: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getRegistrations(input)),
    getById: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getRegistrationById(input.id)),
    stats: adminProcedure.query(() => db.getRegistrationStats()),
    create: publicProcedure
      .input(z.object({
        meetupId: z.number().optional(), name: z.string().min(1), phone: z.string().min(1),
        messengerId: z.string().min(1), locationType: z.enum(["domestic", "overseas"]).default("domestic"),
        scheduleStart: z.string().optional(), scheduleEnd: z.string().optional(),
        walletAddress: z.string().optional(), referrerName: z.string().optional(),
        teamName: z.string().optional(), teamIntro: z.string().optional(),
        notes: z.string().optional(), roommatePreference: z.string().optional(),
        category: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup"),
        customCategory: z.string().optional(),
        checkedBagRequest: z.boolean().optional(),
        checkedBagCount: z.number().optional(),
        checkedBagWeight: z.string().optional(),
        checkedBagNotes: z.string().optional(),
        preferredDepartureTime: z.string().optional(),
        mealPreference: z.string().optional(),
        allergies: z.string().optional(),
        drinkAlcohol: z.enum(["yes", "no", "sometimes"]).optional(),
        smoking: z.enum(["yes", "no"]).optional(),
        transportType: z.enum(["flight", "ktx", "none", "other"]).optional(),
        transportNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createRegistration({
          ...input,
          scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : undefined,
          scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : undefined,
        });
        try {
          const locationLabel = input.locationType === "overseas" ? "해외" : "내륙";
          const schedule = input.scheduleStart
            ? (input.scheduleEnd ? `${input.scheduleStart} ~ ${input.scheduleEnd}` : input.scheduleStart) : "미정";
          const bagInfo = input.checkedBagRequest ? `\n🧳 위탁수화물: ${input.checkedBagCount || 0}개 (${input.checkedBagWeight || "-"}) ${input.checkedBagNotes || ""}` : "";
          const departureTimeInfo = input.preferredDepartureTime ? `\n🕐 출발 희망시간대: ${input.preferredDepartureTime}` : "";
          const mealInfo = input.mealPreference ? `\n🍽 식사: ${input.mealPreference}` : "";
          const allergyInfo = input.allergies ? `\n⚠️ 알레르기: ${input.allergies}` : "";
          const drinkLabel = input.drinkAlcohol === "yes" ? "음주" : input.drinkAlcohol === "sometimes" ? "가끔" : input.drinkAlcohol === "no" ? "비음주" : "";
          const drinkInfo = drinkLabel ? `\n🍺 ${drinkLabel}` : "";
          const smokeInfo = input.smoking ? `\n🚬 ${input.smoking === "yes" ? "흡연" : "비흡연"}` : "";
          const transportLabel = input.transportType === "flight" ? "비행기" : input.transportType === "ktx" ? "고속철도" : input.transportType === "none" ? "교통수단 없음" : input.transportType === "other" ? "기타" : "";
          const transportInfo = transportLabel ? `\n🚄 교통수단: ${transportLabel}${input.transportNotes ? ` (${input.transportNotes})` : ""}` : "";
          const message = `📋 새 밋업 신청\n[${locationLabel}] ${input.name} / ${schedule} / ${input.phone} / ${input.messengerId} / ${input.notes || "-"} / ${input.referrerName || "-"}${bagInfo}${departureTimeInfo}${transportInfo}${mealInfo}${allergyInfo}${drinkInfo}${smokeInfo}`;
          const sent = await sendTelegram(message);
          if (sent) await db.updateRegistration(id, { telegramNotified: true });
        } catch (e) { console.error("[Telegram] Failed:", e); }
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), status: z.enum(["pending", "approved", "rejected", "completed"]).optional(),
        category: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).optional(),
        customCategory: z.string().optional(),
        immigrationAssist: z.enum(["self", "agency", "pending"]).optional(),
        notes: z.string().optional(), passportOcrData: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateRegistration(id, data);
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteRegistration(input.id); return { success: true }; }),
    uploadPassport: publicProcedure
      .input(z.object({ registrationId: z.number(), imageBase64: z.string(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `passports/${input.registrationId}-${nanoid(8)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateRegistration(input.registrationId, { passportImageUrl: url });
        // v3.1: 여권 업로드 시 자동 OCR 실행
        try {
          const ocrResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a passport OCR system. Extract: fullName, passportNumber, nationality, dateOfBirth (YYYY-MM-DD), expiryDate (YYYY-MM-DD), gender (M/F), issuingCountry. Return ONLY valid JSON." },
              { role: "user", content: [
                { type: "text", text: "Extract passport information from this image:" },
                { type: "image_url", image_url: { url, detail: "high" } },
              ]},
            ],
          });
          const rawOcr = ocrResponse.choices?.[0]?.message?.content;
          const ocrText = typeof rawOcr === "string" ? rawOcr : "{}";
          let ocrData;
          try { const jsonMatch = ocrText.match(/\{[\s\S]*\}/); ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {}; }
          catch { ocrData = { raw: ocrText }; }
          await db.updateRegistration(input.registrationId, { passportOcrData: ocrData });
          return { url, ocrData, ocrSuccess: true };
        } catch (e) {
          console.error("[OCR] Auto OCR failed:", e);
          return { url, ocrData: null, ocrSuccess: false };
        }
      }),
    ocrPassport: adminProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ input }) => {
        const reg = await db.getRegistrationById(input.registrationId);
        if (!reg?.passportImageUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "여권 이미지가 없습니다" });
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a passport OCR system. Extract: fullName, passportNumber, nationality, dateOfBirth (YYYY-MM-DD), expiryDate (YYYY-MM-DD), gender (M/F), issuingCountry. Return ONLY valid JSON." },
            { role: "user", content: [
              { type: "text", text: "Extract passport information from this image:" },
              { type: "image_url", image_url: { url: reg.passportImageUrl, detail: "high" } },
            ]},
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const ocrText = typeof rawContent === "string" ? rawContent : "{}";
        let ocrData;
        try { const jsonMatch = ocrText.match(/\{[\s\S]*\}/); ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {}; }
        catch { ocrData = { raw: ocrText }; }
        await db.updateRegistration(input.registrationId, { passportOcrData: ocrData });
        return { ocrData };
      }),
    lookup: publicProcedure
      .input(z.object({ name: z.string().min(1), phone: z.string().min(1) }))
      .query(({ input }) => db.getRegistrationByNameAndPhone(input.name, input.phone)),
    exportData: adminProcedure
      .input(z.object({ category: z.string().optional(), status: z.string().optional(), search: z.string().optional(),
        dateFrom: z.string().optional(), dateTo: z.string().optional() }).optional())
      .query(({ input }) => db.getRegistrations(input)),
    // v3.1: 여권 OCR 데이터 엑셀 다운로드용 조회
    exportPassportOcr: adminProcedure
      .input(z.object({ meetupId: z.number().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const regs = await db.getRegistrations(input ? { meetupId: input.meetupId, status: input.status } : undefined);
        return regs
          .filter(r => r.passportOcrData)
          .map(r => {
            const ocr = r.passportOcrData as any || {};
            return {
              registrationId: r.id, name: r.name, phone: r.phone, messengerId: r.messengerId,
              teamName: r.teamName || "", category: r.category, status: r.status,
              passportFullName: ocr.fullName || "", passportNumber: ocr.passportNumber || "",
              nationality: ocr.nationality || "", dateOfBirth: ocr.dateOfBirth || "",
              expiryDate: ocr.expiryDate || "", gender: ocr.gender || "",
              issuingCountry: ocr.issuingCountry || "",
            };
          });
      }),
  }),

  // ── Flight Schedules ─────────────────────────────
  flight: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number().optional(), registrationId: z.number().optional(), direction: z.string().optional() }).optional())
      .query(({ input }) => db.getFlightSchedules(input)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getFlightScheduleById(input.id)),
    getByRegistration: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getFlightSchedules({ registrationId: input.registrationId })),
    delayed: adminProcedure.query(() => db.getDelayedFlights()),
    // 참석자용: 내 항공편 실시간 조회
    getMyFlights: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getFlightSchedules({ registrationId: input.registrationId })),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(), registrationId: z.number().optional(),
        flightNo: z.string().min(1), airline: z.string().optional(),
        departureAirport: z.string().optional(), arrivalAirport: z.string().optional(),
        scheduledDeparture: z.string().optional(), scheduledArrival: z.string().optional(),
        direction: z.enum(["outbound", "return"]).default("outbound"),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFlightSchedule({
          ...input,
          scheduledDeparture: input.scheduledDeparture ? new Date(input.scheduledDeparture) : undefined,
          scheduledArrival: input.scheduledArrival ? new Date(input.scheduledArrival) : undefined,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), flightNo: z.string().optional(), airline: z.string().optional(),
        departureAirport: z.string().optional(), arrivalAirport: z.string().optional(),
        scheduledDeparture: z.string().optional(), scheduledArrival: z.string().optional(),
        actualDeparture: z.string().optional(), actualArrival: z.string().optional(),
        delayMinutes: z.number().optional(),
        flightStatus: z.enum(["scheduled", "boarding", "departed", "in_air", "landed", "delayed", "cancelled"]).optional(),
        direction: z.enum(["outbound", "return"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.scheduledDeparture) updateData.scheduledDeparture = new Date(data.scheduledDeparture);
        if (data.scheduledArrival) updateData.scheduledArrival = new Date(data.scheduledArrival);
        if (data.actualDeparture) updateData.actualDeparture = new Date(data.actualDeparture);
        if (data.actualArrival) updateData.actualArrival = new Date(data.actualArrival);
        await db.updateFlightSchedule(id, updateData);
        // Notify delay via telegram
        if (data.delayMinutes && data.delayMinutes > 0) {
          const flight = await db.getFlightScheduleById(id);
          if (flight && !flight.notifiedDelay) {
            await sendTelegram(`✈️ 항공편 지연 알림\n편명: ${flight.flightNo}\n지연: ${data.delayMinutes}분\n상태: ${data.flightStatus || flight.flightStatus}`);
            await db.updateFlightSchedule(id, { notifiedDelay: true });
          }
        }
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteFlightSchedule(input.id); return { success: true }; }),
  }),

  // ── Pickup Assignments ───────────────────────────
  pickup: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getPickupAssignments(input?.meetupId)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getPickupAssignmentById(input.id)),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(), vehicleName: z.string().min(1),
        vehicleCapacity: z.number().default(4), driverName: z.string().optional(),
        driverPhone: z.string().optional(), pickupLocation: z.string().optional(),
        pickupTime: z.string().optional(), assignedRegistrationIds: z.array(z.number()).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPickupAssignment({
          ...input,
          pickupTime: input.pickupTime ? new Date(input.pickupTime) : undefined,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), vehicleName: z.string().optional(), vehicleCapacity: z.number().optional(),
        driverName: z.string().optional(), driverPhone: z.string().optional(),
        pickupLocation: z.string().optional(), pickupTime: z.string().optional(),
        assignedRegistrationIds: z.array(z.number()).optional(),
        status: z.enum(["pending", "en_route", "waiting", "picked_up", "completed"]).optional(),
        notes: z.string().optional(), pickupPhotoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const oldPickup = await db.getPickupAssignmentById(id);
        await db.updatePickupAssignment(id, {
          ...data,
          pickupTime: data.pickupTime ? new Date(data.pickupTime) : undefined,
        });
        // 픽업 상태 변경 시 텔레그램 알림
        if (data.status && oldPickup && data.status !== oldPickup.status) {
          const statusLabel: Record<string, string> = { pending: "대기", en_route: "이동중", waiting: "대기중", picked_up: "픽업완료", completed: "완료" };
          await sendTelegram(`🚗 픽업 상태 변경\n차량: ${oldPickup.vehicleName}\n상태: ${statusLabel[data.status] || data.status}\n기사: ${oldPickup.driverName || "미정"}\n장소: ${oldPickup.pickupLocation || "미정"}`);
          // 해당 차량 탑승자들에게 알림
          const regIds = oldPickup.assignedRegistrationIds as number[] | null;
          if (regIds) {
            for (const regId of regIds) {
              const reg = await db.getRegistrationById(regId);
              if (reg?.messengerId) {
                await sendTelegram(`🚗 ${reg.name}님, 픽업 차량(${oldPickup.vehicleName}) 상태: ${statusLabel[data.status] || data.status}\n기사: ${oldPickup.driverName || "미정"} / 연락처: ${oldPickup.driverPhone || "미정"}\n장소: ${oldPickup.pickupLocation || "미정"}`);
              }
            }
          }
        }
        return { success: true };
      }),
    // 참석자용: 내 픽업 정보 조회
    getMyPickup: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(async ({ input }) => {
        const allPickups = await db.getPickupAssignments();
        return allPickups.filter(p => {
          const ids = p.assignedRegistrationIds as number[] | null;
          return ids && ids.includes(input.registrationId);
        });
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deletePickupAssignment(input.id); return { success: true }; }),
    // 자동 배치: 승인된 참가자들을 차량에 자동 배정
    autoAssign: adminProcedure
      .input(z.object({ meetupId: z.number(), vehicleCapacity: z.number().default(4) }))
      .mutation(async ({ input }) => {
        const regs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });
        const vehicles: { name: string; ids: number[] }[] = [];
        let currentVehicle: number[] = [];
        let vehicleNum = 1;
        for (const reg of regs) {
          currentVehicle.push(reg.id);
          if (currentVehicle.length >= input.vehicleCapacity) {
            vehicles.push({ name: `차량 ${vehicleNum}`, ids: [...currentVehicle] });
            currentVehicle = []; vehicleNum++;
          }
        }
        if (currentVehicle.length > 0) vehicles.push({ name: `차량 ${vehicleNum}`, ids: currentVehicle });
        for (const v of vehicles) {
          await db.createPickupAssignment({
            meetupId: input.meetupId, vehicleName: v.name,
            vehicleCapacity: input.vehicleCapacity, assignedRegistrationIds: v.ids,
          });
        }
        return { vehicleCount: vehicles.length, totalAssigned: regs.length };
      }),
  }),

  // ── Accommodation ────────────────────────────────
  accommodation: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getAccommodations(input?.meetupId)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getAccommodationById(input.id)),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(), hotelName: z.string().min(1),
        roomNumber: z.string().optional(), roomType: z.enum(["single", "double", "twin", "suite"]).default("twin"),
        assignedRegistrationIds: z.array(z.number()).optional(),
        checkIn: z.string().optional(), checkOut: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createAccommodation({
          ...input,
          checkIn: input.checkIn ? new Date(input.checkIn) : undefined,
          checkOut: input.checkOut ? new Date(input.checkOut) : undefined,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), hotelName: z.string().optional(), roomNumber: z.string().optional(),
        roomType: z.enum(["single", "double", "twin", "suite"]).optional(),
        assignedRegistrationIds: z.array(z.number()).optional(),
        checkIn: z.string().optional(), checkOut: z.string().optional(), notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAccommodation(id, {
          ...data,
          checkIn: data.checkIn ? new Date(data.checkIn) : undefined,
          checkOut: data.checkOut ? new Date(data.checkOut) : undefined,
        });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteAccommodation(input.id); return { success: true }; }),
    // 자동 배치: 2인1실 자동 매칭 (roommatePreference 우선)
    autoAssign: adminProcedure
      .input(z.object({ meetupId: z.number(), hotelName: z.string() }))
      .mutation(async ({ input }) => {
        const regs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });
        const assigned = new Set<number>();
        const rooms: { ids: number[]; roomNum: number }[] = [];
        let roomNum = 1;
        // First pass: match roommate preferences
        for (const reg of regs) {
          if (assigned.has(reg.id)) continue;
          if (reg.roommatePreference) {
            const mate = regs.find(r => r.name === reg.roommatePreference && !assigned.has(r.id) && r.id !== reg.id);
            if (mate) {
              rooms.push({ ids: [reg.id, mate.id], roomNum });
              assigned.add(reg.id); assigned.add(mate.id); roomNum++;
            }
          }
        }
        // Second pass: pair remaining
        const remaining = regs.filter(r => !assigned.has(r.id));
        for (let i = 0; i < remaining.length; i += 2) {
          const pair = [remaining[i].id];
          if (i + 1 < remaining.length) pair.push(remaining[i + 1].id);
          rooms.push({ ids: pair, roomNum }); roomNum++;
        }
        for (const room of rooms) {
          await db.createAccommodation({
            meetupId: input.meetupId, hotelName: input.hotelName,
            roomNumber: `${room.roomNum}`, roomType: "twin",
            assignedRegistrationIds: room.ids,
          });
        }
        return { roomCount: rooms.length, totalAssigned: regs.length };
      }),
  }),

  // ── Schedule Events ──────────────────────────────
  schedule: router({
    list: publicProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getScheduleEvents(input?.meetupId)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getScheduleEventById(input.id)),
    upcoming: publicProcedure.query(() => db.getUpcomingEvents(10)),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(), title: z.string().min(1),
        location: z.string().optional(), eventTime: z.string(),
        endTime: z.string().optional(), description: z.string().optional(),
        notifyBefore: z.number().default(10), eventOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createScheduleEvent({
          ...input,
          eventTime: new Date(input.eventTime),
          endTime: input.endTime ? new Date(input.endTime) : undefined,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), title: z.string().optional(), location: z.string().optional(),
        eventTime: z.string().optional(), endTime: z.string().optional(),
        description: z.string().optional(), notifyBefore: z.number().optional(),
        eventOrder: z.number().optional(), notified: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateScheduleEvent(id, {
          ...data,
          eventTime: data.eventTime ? new Date(data.eventTime) : undefined,
          endTime: data.endTime ? new Date(data.endTime) : undefined,
        });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteScheduleEvent(input.id); return { success: true }; }),
    // 10분 전 알림 트리거 (관리자 텔레그램 + 참석자별)
    triggerNotifications: adminProcedure.mutation(async () => {
      const upcoming = await db.getUpcomingEvents(10);
      let sent = 0;
      for (const event of upcoming) {
        const msg = `⏰ 일정 알림 (${event.notifyBefore || 10}분 전)\n📍 ${event.title}\n🕐 ${event.eventTime.toLocaleString("ko-KR")}\n📌 ${event.location || "미정"}${event.description ? `\n📝 ${event.description}` : ""}`;
        const ok = await sendTelegram(msg);
        if (ok) {
          await db.updateScheduleEvent(event.id, { notified: true, notifiedAt: new Date() });
          sent++;
        }
        // 참석자별 개별 알림 (밋업에 속한 승인된 참석자들에게)
        if (event.meetupId) {
          const regs = await db.getRegistrations({ meetupId: event.meetupId, status: "approved" });
          for (const reg of regs) {
            if (reg.messengerId) {
              await sendTelegram(`📢 ${reg.name}님, ${event.notifyBefore || 10}분 후 다음 일정이 시작됩니다!\n📍 ${event.title}\n📌 ${event.location || "미정"}\n🕐 ${event.eventTime.toLocaleString("ko-KR")}\n\n준비하시고 이동해 주세요!`);
            }
          }
        }
      }
      return { triggered: sent, total: upcoming.length };
    }),
    // 자동 스케줄 체크 (프론트에서 폴링)
    checkAndNotify: publicProcedure.mutation(async () => {
      const upcoming = await db.getUpcomingEvents(10);
      let sent = 0;
      for (const event of upcoming) {
        const msg = `⏰ 자동 알림 (${event.notifyBefore || 10}분 전)\n📍 ${event.title}\n🕐 ${event.eventTime.toLocaleString("ko-KR")}\n📌 ${event.location || "미정"}`;
        const ok = await sendTelegram(msg);
        if (ok) {
          await db.updateScheduleEvent(event.id, { notified: true, notifiedAt: new Date() });
          sent++;
        }
      }
      return { triggered: sent, total: upcoming.length, checkedAt: new Date() };
    }),
  }),

  // ── Pickup Photos ────────────────────────────────
  pickupPhoto: router({
    list: publicProcedure
      .input(z.object({
        meetupId: z.number().optional(), pickupAssignmentId: z.number().optional(),
        registrationId: z.number().optional(), photoType: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getPickupPhotos(input)),
    upload: publicProcedure
      .input(z.object({
        meetupId: z.number().optional(), pickupAssignmentId: z.number().optional(),
        registrationId: z.number().optional(),
        photoType: z.enum(["pickup_location", "arrival_person", "vehicle", "other"]).default("pickup_location"),
        imageBase64: z.string(), mimeType: z.string().default("image/jpeg"),
        uploadedBy: z.string().optional(), caption: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `pickup-photos/${nanoid(12)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const id = await db.createPickupPhoto({
          meetupId: input.meetupId, pickupAssignmentId: input.pickupAssignmentId,
          registrationId: input.registrationId, photoUrl: url,
          photoType: input.photoType, uploadedBy: input.uploadedBy, caption: input.caption,
        });
        return { id, url };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deletePickupPhoto(input.id); return { success: true }; }),
  }),

  // ── Modification Requests ────────────────────────
  modRequest: router({
    list: adminProcedure
      .input(z.object({ registrationId: z.number().optional(), status: z.string().optional() }).optional())
      .query(({ input }) => db.getModificationRequests(input)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getModificationRequestById(input.id)),
    create: publicProcedure
      .input(z.object({
        registrationId: z.number(), itineraryId: z.number().optional(),
        requestType: z.enum(["flight_change", "hotel_change", "schedule_change", "other"]).default("other"),
        description: z.string().min(1), currentValue: z.string().optional(), requestedValue: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createModificationRequest(input);
        await sendTelegram(`📝 여정표 수정 요청\n신청ID: ${input.registrationId}\n유형: ${input.requestType}\n내용: ${input.description}`);
        return { id };
      }),
    process: adminProcedure
      .input(z.object({
        id: z.number(), status: z.enum(["approved", "rejected", "completed"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateModificationRequest(input.id, {
          status: input.status, adminNotes: input.adminNotes,
          processedBy: ctx.user.id, processedAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // ── Telegram ─────────────────────────────────────
  telegram: router({
    getConfig: adminProcedure.query(() => db.getTelegramConfig()),
    updateConfig: adminProcedure
      .input(z.object({ botToken: z.string().optional(), chatId: z.string().optional(), enabled: z.boolean().optional() }))
      .mutation(async ({ input }) => { await db.upsertTelegramConfig(input); return { success: true }; }),
    testSend: adminProcedure.mutation(async () => {
      const ok = await sendTelegram("✅ 텔레그램 연동 테스트 메시지입니다.");
      if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "전송 실패" });
      return { success: true };
    }),
    // Webhook 설정 (봇 토큰으로 Telegram에 webhook URL 등록)
    setupWebhook: adminProcedure
      .input(z.object({ webhookUrl: z.string().url() }))
      .mutation(async ({ input }) => {
        const config = await db.getTelegramConfig();
        if (!config?.botToken) throw new TRPCError({ code: "BAD_REQUEST", message: "봇 토큰이 설정되지 않았습니다" });
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/setWebhook`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.webhookUrl, allowed_updates: ["message", "edited_message"], drop_pending_updates: false }),
        });
        const result = await response.json() as any;
        if (!result.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.description || "Webhook 설정 실패" });
        return { success: true, description: result.description };
      }),
    // Webhook 해제
    removeWebhook: adminProcedure.mutation(async () => {
      const config = await db.getTelegramConfig();
      if (!config?.botToken) throw new TRPCError({ code: "BAD_REQUEST", message: "봇 토큰이 설정되지 않았습니다" });
      const response = await fetch(`https://api.telegram.org/bot${config.botToken}/deleteWebhook`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drop_pending_updates: true }),
      });
      const result = await response.json() as any;
      return { success: result.ok, description: result.description };
    }),
    // Webhook 상태 확인
    webhookInfo: adminProcedure.query(async () => {
      const config = await db.getTelegramConfig();
      if (!config?.botToken) return { url: "", has_custom_certificate: false, pending_update_count: 0, last_error_date: null, last_error_message: null };
      try {
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getWebhookInfo`);
        const data = await response.json() as any;
        return data.result || { url: "", pending_update_count: 0 };
      } catch { return { url: "", pending_update_count: 0 }; }
    }),
    // 출장자 명단 전송
    sendRoster: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .mutation(async ({ input }) => {
        const meetup = await db.getMeetupById(input.meetupId);
        const regs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        let msg = `📋 출장자 명단 - ${meetup.title}\n총 ${regs.length}명\n${"─".repeat(20)}\n`;
        regs.forEach((r, i) => {
          msg += `${i + 1}. ${r.name} / ${r.phone} / ${r.messengerId}${r.teamName ? ` / ${r.teamName}` : ""}\n`;
        });
        const ok = await sendTelegram(msg);
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "전송 실패" });
        return { success: true, count: regs.length };
      }),
    // 스케줄표 전송
    sendSchedule: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .mutation(async ({ input }) => {
        const meetup = await db.getMeetupById(input.meetupId);
        const events = await db.getScheduleEvents(input.meetupId);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        let msg = `📅 스케줄표 - ${meetup.title}\n${"─".repeat(20)}\n`;
        events.forEach((e, i) => {
          msg += `${i + 1}. ${e.eventTime.toLocaleString("ko-KR")} - ${e.title}${e.location ? ` @ ${e.location}` : ""}\n`;
        });
        const ok = await sendTelegram(msg);
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "전송 실패" });
        return { success: true, count: events.length };
      }),
    // 항공편 검색 결과 텔레그램 전송
    sendFlightSearch: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        origin: z.string(),
        destination: z.string(),
        departureDate: z.string(),
        returnDate: z.string().optional(),
        passengers: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        const settings = await db.getAffiliateSettings();
        const configMap: Record<string, string> = {};
        settings.forEach(s => {
          if (s.isActive && s.affiliateId) configMap[s.platform] = s.affiliateId;
        });
        const originInfo = getAirportInfo(input.origin);
        const destInfo = getAirportInfo(input.destination);
        const links = generateFlightSearchLinks({
          origin: input.origin,
          destination: input.destination,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          passengers: input.passengers,
        }, {
          tripComAffId: configMap.trip_com,
          skyscannerAffId: configMap.skyscanner,
          travelpayoutsMarker: configMap.travelpayouts,
        });
        let meetupTitle = '';
        if (input.meetupId) {
          const meetup = await db.getMeetupById(input.meetupId);
          meetupTitle = meetup ? ` - ${meetup.title}` : '';
        }
        let msg = `✈️ <b>항공편 검색 결과${meetupTitle}</b>\n`;
        msg += `${"─".repeat(20)}\n`;
        msg += `🛫 ${input.origin}(${originInfo?.cityKo || originInfo?.city || input.origin}) → ${input.destination}(${destInfo?.cityKo || destInfo?.city || input.destination})\n`;
        msg += `📅 ${input.departureDate}${input.returnDate ? ` ~ ${input.returnDate}` : ' (편도)'}\n`;
        msg += `👥 ${input.passengers}명\n`;
        msg += `${"─".repeat(20)}\n\n`;
        msg += `🔗 <b>예약 링크:</b>\n`;
        links.forEach(l => {
          msg += `• <a href="${l.url}">${l.platformName}</a>\n`;
        });
        msg += `\n💡 위 링크를 클릭하여 최저가를 비교해 보세요!`;
        const ok = await sendTelegram(msg);
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "텔레그램 전송 실패" });
        return { success: true, linksCount: links.length };
      }),
    // 호텔 검색 결과 텔레그램 전송
    sendHotelSearch: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        city: z.string(),
        checkIn: z.string(),
        checkOut: z.string(),
        rooms: z.number().default(1),
        guests: z.number().default(2),
      }))
      .mutation(async ({ input }) => {
        const settings = await db.getAffiliateSettings();
        const configMap: Record<string, string> = {};
        settings.forEach(s => {
          if (s.isActive && s.affiliateId) configMap[s.platform] = s.affiliateId;
        });
        const links = generateHotelSearchLinks({
          city: input.city,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          rooms: input.rooms,
          guests: input.guests,
        }, {
          tripComAffId: configMap.trip_com,
          bookingComAffId: configMap.booking_com,
          agodaCid: configMap.agoda,
          travelpayoutsMarker: configMap.travelpayouts,
        });
        let meetupTitle = '';
        if (input.meetupId) {
          const meetup = await db.getMeetupById(input.meetupId);
          meetupTitle = meetup ? ` - ${meetup.title}` : '';
        }
        let msg = `🏨 <b>호텔 검색 결과${meetupTitle}</b>\n`;
        msg += `${"─".repeat(20)}\n`;
        msg += `📍 ${input.city}\n`;
        msg += `📅 ${input.checkIn} ~ ${input.checkOut}\n`;
        msg += `🚪 ${input.rooms}실 / 👥 ${input.guests}명\n`;
        msg += `${"─".repeat(20)}\n\n`;
        msg += `🔗 <b>예약 링크:</b>\n`;
        links.forEach(l => {
          msg += `• <a href="${l.url}">${l.platformName}</a>\n`;
        });
        msg += `\n💡 위 링크를 클릭하여 최저가를 비교해 보세요!`;
        const ok = await sendTelegram(msg);
        if (!ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "텔레그램 전송 실패" });
        return { success: true, linksCount: links.length };
      }),
  }),

  // ── Travel Info ──────────────────────────────────
  travelInfo: router({
    list: publicProcedure.query(() => db.getTravelInfoList()),
    getByCountry: publicProcedure.input(z.object({ countryCode: z.string() })).query(({ input }) => db.getTravelInfoByCountry(input.countryCode)),
    upsert: adminProcedure
      .input(z.object({
        countryCode: z.string().min(1), countryName: z.string().min(1),
        countryNameKo: z.string().optional(), requiredItems: z.array(z.string()).optional(),
        immigrationUrl: z.string().optional(), immigrationNotes: z.string().optional(),
        visaRequired: z.boolean().optional(), visaNotes: z.string().optional(),
        emergencyContact: z.string().optional(), timezone: z.string().optional(),
        currency: z.string().optional(), language: z.string().optional(),
        plugType: z.string().optional(), additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => { await db.upsertTravelInfo(input); return { success: true }; }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteTravelInfo(input.id); return { success: true }; }),
    // v3.1: LLM 기반 국가별 여행 준비물/정보 자동 생성
    generateInfo: adminProcedure
      .input(z.object({ countryCode: z.string().min(1), countryName: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a travel information expert. Generate comprehensive travel preparation info for the given country in Korean. Return ONLY valid JSON with these fields: countryNameKo (Korean name), requiredItems (array of strings - essential items to prepare), immigrationUrl (official immigration/visa website URL), immigrationNotes (immigration card/visa notes in Korean), visaRequired (boolean for Korean passport holders), visaNotes (visa details), emergencyContact (local emergency numbers), timezone (e.g. UTC+7), currency (local currency name and code), language (official language), plugType (power plug type e.g. Type A/B), additionalNotes (other useful tips in Korean)." },
            { role: "user", content: `Generate travel preparation information for: ${input.countryName} (${input.countryCode})` },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const text = typeof rawContent === "string" ? rawContent : "{}";
        let info;
        try { const jsonMatch = text.match(/\{[\s\S]*\}/); info = jsonMatch ? JSON.parse(jsonMatch[0]) : {}; }
        catch { info = {}; }
        // Save to DB
        await db.upsertTravelInfo({
          countryCode: input.countryCode, countryName: input.countryName,
          countryNameKo: info.countryNameKo || input.countryName,
          requiredItems: info.requiredItems || [],
          immigrationUrl: info.immigrationUrl || "",
          immigrationNotes: info.immigrationNotes || "",
          visaRequired: info.visaRequired ?? false,
          visaNotes: info.visaNotes || "",
          emergencyContact: info.emergencyContact || "",
          timezone: info.timezone || "",
          currency: info.currency || "",
          language: info.language || "",
          plugType: info.plugType || "",
          additionalNotes: info.additionalNotes || "",
        });
        return { success: true, info };
      }),
    // v3.1: 참석자에게 국가별 여행 준비물 일괄/개별 전송
    sendToParticipants: adminProcedure
      .input(z.object({
        countryCode: z.string(), meetupId: z.number().optional(),
        registrationIds: z.array(z.number()).optional(),
        method: z.enum(["telegram", "web"]).default("telegram"),
      }))
      .mutation(async ({ input }) => {
        const info = await db.getTravelInfoByCountry(input.countryCode);
        if (!info) throw new TRPCError({ code: "NOT_FOUND", message: "해당 국가 여행 정보가 없습니다" });
        let regs;
        if (input.registrationIds?.length) {
          const allRegs = await db.getRegistrations();
          regs = allRegs.filter(r => input.registrationIds!.includes(r.id));
        } else if (input.meetupId) {
          regs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });
        } else {
          regs = await db.getRegistrations({ status: "approved" });
        }
        if (input.method === "telegram") {
          const items = (info.requiredItems as string[] || []).join(", ");
          let msg = `🌍 ${info.countryNameKo || info.countryName} 여행 준비 안내\n${'─'.repeat(20)}\n`;
          msg += `📋 준비물: ${items || '없음'}\n`;
          msg += `💱 통화: ${info.currency || '미정'}\n`;
          msg += `🕐 시간대: ${info.timezone || '미정'}\n`;
          msg += `🗣 언어: ${info.language || '미정'}\n`;
          msg += `🔌 플러그: ${info.plugType || '미정'}\n`;
          if (info.visaRequired) msg += `⚠️ 비자 필요: ${info.visaNotes || '확인 필요'}\n`;
          if (info.immigrationUrl) msg += `🔗 출입국 신청: ${info.immigrationUrl}\n`;
          if (info.immigrationNotes) msg += `📝 출입국 참고: ${info.immigrationNotes}\n`;
          if (info.emergencyContact) msg += `🚨 긴급연락처: ${info.emergencyContact}\n`;
          msg += `\n대상자 ${regs.length}명: ${regs.map(r => r.name).join(", ")}`;
          await sendTelegram(msg);
        }
        return { success: true, sentCount: regs.length };
      }),
  }),

  // ── Itineraries ──────────────────────────────────
  itinerary: router({
    list: adminProcedure.query(() => db.getAllItineraries()),
    getByRegistration: publicProcedure.input(z.object({ registrationId: z.number() })).query(({ input }) => db.getItinerariesByRegistration(input.registrationId)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getItineraryById(input.id)),
    create: adminProcedure
      .input(z.object({
        registrationId: z.number(), title: z.string().min(1),
        departureFlightNo: z.string().optional(), departureAirport: z.string().optional(),
        departureTime: z.string().optional(), arrivalFlightNo: z.string().optional(),
        arrivalAirport: z.string().optional(), arrivalTime: z.string().optional(),
        returnFlightNo: z.string().optional(), returnDepartureAirport: z.string().optional(),
        returnDepartureTime: z.string().optional(), returnArrivalAirport: z.string().optional(),
        returnArrivalTime: z.string().optional(), hotelName: z.string().optional(),
        hotelAddress: z.string().optional(), hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(), scheduleDetails: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createItinerary({
          ...input,
          departureTime: input.departureTime ? new Date(input.departureTime) : undefined,
          arrivalTime: input.arrivalTime ? new Date(input.arrivalTime) : undefined,
          returnDepartureTime: input.returnDepartureTime ? new Date(input.returnDepartureTime) : undefined,
          returnArrivalTime: input.returnArrivalTime ? new Date(input.returnArrivalTime) : undefined,
          hotelCheckIn: input.hotelCheckIn ? new Date(input.hotelCheckIn) : undefined,
          hotelCheckOut: input.hotelCheckOut ? new Date(input.hotelCheckOut) : undefined,
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), title: z.string().optional(),
        departureFlightNo: z.string().optional(), departureAirport: z.string().optional(),
        departureTime: z.string().optional(), arrivalFlightNo: z.string().optional(),
        arrivalAirport: z.string().optional(), arrivalTime: z.string().optional(),
        returnFlightNo: z.string().optional(), returnDepartureAirport: z.string().optional(),
        returnDepartureTime: z.string().optional(), returnArrivalAirport: z.string().optional(),
        returnArrivalTime: z.string().optional(), hotelName: z.string().optional(),
        hotelAddress: z.string().optional(), hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(), scheduleDetails: z.any().optional(),
        sentViaWeb: z.boolean().optional(), sentViaMessenger: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateItinerary(id, {
          ...data,
          departureTime: data.departureTime ? new Date(data.departureTime) : undefined,
          arrivalTime: data.arrivalTime ? new Date(data.arrivalTime) : undefined,
          returnDepartureTime: data.returnDepartureTime ? new Date(data.returnDepartureTime) : undefined,
          returnArrivalTime: data.returnArrivalTime ? new Date(data.returnArrivalTime) : undefined,
          hotelCheckIn: data.hotelCheckIn ? new Date(data.hotelCheckIn) : undefined,
          hotelCheckOut: data.hotelCheckOut ? new Date(data.hotelCheckOut) : undefined,
        });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteItinerary(input.id); return { success: true }; }),
  }),

  // ── Communication Channels (v3.0) ────────────────
  channel: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getChannels(input?.meetupId)),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getChannelById(input.id)),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        channelType: z.enum(["pickup_driver", "manager", "hotel_checkin", "transfer", "general"]).default("general"),
        channelName: z.string().min(1), description: z.string().optional(),
        assignedTo: z.string().optional(), assignedPhone: z.string().optional(),
        relatedPickupId: z.number().optional(), relatedAccommodationId: z.number().optional(),
      }))
      .mutation(async ({ input }) => { const id = await db.createChannel(input); return { id }; }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), channelName: z.string().optional(),
        channelType: z.enum(["pickup_driver", "manager", "hotel_checkin", "transfer", "general"]).optional(),
        description: z.string().optional(), assignedTo: z.string().optional(),
        assignedPhone: z.string().optional(), isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => { const { id, ...data } = input; await db.updateChannel(id, data); return { success: true }; }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteChannel(input.id); return { success: true }; }),
    // 백오피스용: 모든 채널 + 읽지 않은 메시지 카운트
    allWithUnread: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const channels = await db.getChannels(input?.meetupId);
        const result = [];
        for (const ch of channels) {
          const unread = await db.getUnreadCount(ch.id);
          const messages = await db.getMessages(ch.id, 1);
          result.push({
            ...ch,
            unreadCount: unread,
            lastMessage: messages[0] || null,
          });
        }
        return result;
      }),
  }),

  // ── Messages (v3.0) ─────────────────────────────────
  message: router({
    list: publicProcedure
      .input(z.object({ channelId: z.number(), limit: z.number().default(100) }))
      .query(({ input }) => db.getMessages(input.channelId, input.limit)),
    send: publicProcedure
      .input(z.object({
        channelId: z.number(), senderName: z.string().min(1),
        senderRole: z.enum(["admin", "manager", "driver", "participant", "hotel_staff"]).default("participant"),
        senderRegistrationId: z.number().optional(),
        content: z.string().min(1),
        messageType: z.enum(["text", "photo", "location", "status_update", "alert"]).default("text"),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createMessage(input);
        // Send to telegram for status_update and alert types
        if (input.messageType === "status_update" || input.messageType === "alert") {
          const channel = await db.getChannelById(input.channelId);
          const prefix = input.messageType === "alert" ? "🚨" : "📢";
          await sendTelegram(`${prefix} [${channel?.channelName || "채널"}] ${input.senderName}: ${input.content}`);
        }
        return { id };
      }),
    markRead: publicProcedure
      .input(z.object({ channelId: z.number() }))
      .mutation(async ({ input }) => { await db.markMessagesRead(input.channelId); return { success: true }; }),
    unreadCount: publicProcedure
      .input(z.object({ channelId: z.number() }))
      .query(({ input }) => db.getUnreadCount(input.channelId)),
    uploadPhoto: publicProcedure
      .input(z.object({ channelId: z.number(), senderName: z.string(), senderRole: z.enum(["admin", "manager", "driver", "participant", "hotel_staff"]).default("participant"), imageBase64: z.string(), mimeType: z.string().default("image/jpeg"), caption: z.string().optional() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : "jpg";
        const key = `channel-photos/${input.channelId}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const id = await db.createMessage({
          channelId: input.channelId, senderName: input.senderName, senderRole: input.senderRole,
          content: input.caption || "사진", messageType: "photo", photoUrl: url,
        });
        return { id, photoUrl: url };
      }),
  }),

  // ── Vouchers (v3.0) ─────────────────────────────────
  voucher: router({
    list: adminProcedure
      .input(z.object({ registrationId: z.number().optional(), meetupId: z.number().optional(), voucherType: z.string().optional() }).optional())
      .query(({ input }) => db.getVouchers(input)),
    getByRegistration: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getVouchers({ registrationId: input.registrationId })),
    upload: adminProcedure
      .input(z.object({
        registrationId: z.number(), meetupId: z.number().optional(),
        voucherType: z.enum(["flight", "hotel", "transport", "other"]).default("other"),
        title: z.string().min(1), fileBase64: z.string(), fileName: z.string(), mimeType: z.string().default("application/pdf"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const key = `vouchers/${input.registrationId}-${nanoid(8)}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        const id = await db.createVoucher({
          registrationId: input.registrationId, meetupId: input.meetupId,
          voucherType: input.voucherType, title: input.title,
          fileUrl: url, fileKey: key, fileName: input.fileName, mimeType: input.mimeType,
          notes: input.notes, uploadedBy: ctx.user.id,
        });
        return { id, url };
      }),
    sendToParticipant: adminProcedure
      .input(z.object({ voucherId: z.number(), method: z.enum(["web", "telegram", "email"]).default("web") }))
      .mutation(async ({ input }) => {
        const voucher = await db.getVoucherById(input.voucherId);
        if (!voucher) throw new TRPCError({ code: "NOT_FOUND" });
        const reg = await db.getRegistrationById(voucher.registrationId);
        if (!reg) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.method === "telegram") {
          await sendTelegram(`📎 바우처 전송\n${reg.name}님 - ${voucher.title}\n${voucher.fileUrl}`);
        }
        await db.updateVoucher(input.voucherId, { sentToParticipant: true, sentAt: new Date(), sentMethod: input.method });
        return { success: true };
      }),
    bulkUpload: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        voucherType: z.enum(["flight", "hotel", "transport", "other"]).default("other"),
        files: z.array(z.object({
          registrationId: z.number(), title: z.string(), fileBase64: z.string(), fileName: z.string(), mimeType: z.string().default("application/pdf"),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const results = [];
        for (const file of input.files) {
          const buffer = Buffer.from(file.fileBase64, "base64");
          const key = `vouchers/${file.registrationId}-${nanoid(8)}-${file.fileName}`;
          const { url } = await storagePut(key, buffer, file.mimeType);
          const id = await db.createVoucher({
            registrationId: file.registrationId, meetupId: input.meetupId,
            voucherType: input.voucherType, title: file.title,
            fileUrl: url, fileKey: key, fileName: file.fileName, mimeType: file.mimeType,
            uploadedBy: ctx.user.id,
          });
          results.push({ id, registrationId: file.registrationId, url });
        }
        return { success: true, count: results.length, results };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteVoucher(input.id); return { success: true }; }),
  }),

  // ── Assignment Confirmation (v3.0) ──────────────────
  assignment: router({
    getMyAssignments: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getAssignmentsForRegistration(input.registrationId)),
    confirm: publicProcedure
      .input(z.object({ registrationId: z.number(), type: z.enum(["flight", "accommodation", "pickup"]) }))
      .mutation(async ({ input }) => {
        await db.confirmAssignment(input.registrationId, input.type);
        // v3.1: 관리자에게 배치 확정 알림 전송
        const reg = await db.getRegistrationById(input.registrationId);
        const typeLabel = input.type === "flight" ? "항공편" : input.type === "accommodation" ? "숙소" : "픽업 차량";
        if (reg) {
          await sendTelegram(`✅ 배치 확정 알림\n${reg.name}님이 ${typeLabel} 배치를 확정했습니다.\n전화: ${reg.phone} / 메신저: ${reg.messengerId}`);
        }
        return { success: true };
      }),
    // v3.1: 배치 확정 현황 조회
    confirmationStatus: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const regs = await db.getRegistrations(input?.meetupId ? { meetupId: input.meetupId, status: "approved" } : { status: "approved" });
        return regs.map(r => ({
          id: r.id, name: r.name, phone: r.phone,
          flightConfirmed: (r as any).flightConfirmed || false,
          accommodationConfirmed: (r as any).accommodationConfirmed || false,
          pickupConfirmed: (r as any).pickupConfirmed || false,
        }));
      }),
  }),

  // ══════════════════════════════════════════════════════
  // v3.3 - AI Chatbot, Surveys, Broadcast Messages
  // ══════════════════════════════════════════════════════

  chatbot: router({
    ask: publicProcedure
      .input(z.object({
        sessionId: z.string(),
        message: z.string(),
        meetupId: z.number().optional(),
        registrationId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Build context from meetup info
        let contextInfo = "";
        if (input.meetupId) {
          const meetup = await db.getMeetupById(input.meetupId);
          if (meetup) {
            contextInfo += `\n밋업 정보: ${meetup.title}, 장소: ${meetup.location || "미정"}, 국가: ${meetup.destinationCountry || "미정"}`;
            if (meetup.destinationCountry) {
              const ti = await db.getTravelInfoByCountry(meetup.destinationCountry);
              if (ti) {
                contextInfo += `\n여행 준비물: ${JSON.stringify(ti.requiredItems || [])}`;
                contextInfo += `\n비자 필요: ${ti.visaRequired ? "예" : "아니오"}`;
                contextInfo += `\n시간대: ${ti.timezone || ""}, 통화: ${ti.currency || ""}, 플러그: ${ti.plugType || ""}`;
                if (ti.immigrationUrl) contextInfo += `\n출입국 신청: ${ti.immigrationUrl}`;
              }
            }
          }
        }
        // Get chat history
        const history = await db.getChatbotLogs(input.sessionId);
        const chatHistory = history.slice(-10).flatMap(h => [
          { role: "user" as const, content: h.userMessage },
          { role: "assistant" as const, content: h.botResponse },
        ]);

        const response = await invokeLLM({
          messages: [
            { role: "system", content: `당신은 해외 밋업 출장 도우미 AI입니다. 참석자들의 질문에 친절하게 답변해주세요.\n현재 컨텍스트:${contextInfo}\n\n답변 시 다음을 참고하세요:\n- 여행 준비물, 비자, 출입국 관련 질문에 정확히 답변\n- 일정, 픽업, 숙소 관련 안내\n- 현지 문화, 날씨, 교통 정보 제공\n- 모르는 내용은 백오피스 관리자에게 문의하라고 안내` },
            ...chatHistory,
            { role: "user", content: input.message },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const botResponse: string = typeof rawContent === "string" ? rawContent : "죄송합니다. 잠시 후 다시 시도해주세요.";

        await db.createChatbotLog({
          sessionId: input.sessionId,
          registrationId: input.registrationId || null,
          userMessage: input.message,
          botResponse,
          context: input.meetupId ? `meetup:${input.meetupId}` : null,
        });

        return { response: botResponse };
      }),
    history: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(({ input }) => db.getChatbotLogs(input.sessionId)),
  }),

  survey: router({
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        questions: z.array(z.object({
          id: z.string(),
          text: z.string(),
          type: z.enum(["rating", "text", "choice"]),
          options: z.array(z.string()).optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createSurvey({
          ...input,
          questions: input.questions,
          createdBy: ctx.user.id,
        });
        return result;
      }),
    list: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getSurveys(input?.meetupId)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getSurveyById(input.id)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "closed"]).optional(),
        questions: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSurvey(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSurvey(input.id);
        return { success: true };
      }),
    respond: publicProcedure
      .input(z.object({
        surveyId: z.number(),
        registrationId: z.number().optional(),
        respondentName: z.string().optional(),
        respondentPhone: z.string().optional(),
        answers: z.array(z.object({ questionId: z.string(), value: z.any() })),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createSurveyResponse({
          surveyId: input.surveyId,
          registrationId: input.registrationId || null,
          respondentName: input.respondentName || null,
          respondentPhone: input.respondentPhone || null,
          answers: input.answers,
        });
        return result;
      }),
    responses: adminProcedure
      .input(z.object({ surveyId: z.number() }))
      .query(({ input }) => db.getSurveyResponses(input.surveyId)),
    sendViaTelegram: adminProcedure
      .input(z.object({ surveyId: z.number(), meetupId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const survey = await db.getSurveyById(input.surveyId);
        if (!survey) throw new TRPCError({ code: "NOT_FOUND" });
        const regs = await db.getApprovedRegistrations(input.meetupId ?? undefined);
        const surveyUrl = `설문조사: ${survey.title}`;
        const questions = (survey.questions as any[]) || [];
        let msg = `📋 설문조사 안내\n\n제목: ${survey.title}`;
        if (survey.description) msg += `\n설명: ${survey.description}`;
        msg += `\n\n질문 ${questions.length}개`;
        msg += `\n\n웹사이트에서 응답해주세요.`;
        await sendTelegram(msg);
        await db.updateSurvey(input.surveyId, { sentViaTelegram: true, sentAt: new Date(), status: "active" });
        return { success: true, recipientCount: regs.length };
      }),
  }),

  broadcast: router({
    send: adminProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
        meetupId: z.number().optional(),
        targetType: z.enum(["all", "meetup", "approved_only"]).default("all"),
        sendViaTelegram: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const regs = input.meetupId
          ? await db.getApprovedRegistrations(input.meetupId)
          : await db.getApprovedRegistrations();

        // Send via telegram
        let telegramSent = false;
        if (input.sendViaTelegram) {
          let msg = `📢 단체 공지\n\n${input.title}\n\n${input.content}`;
          if (regs.length > 0) {
            msg += `\n\n대상: ${regs.length}명`;
          }
          telegramSent = await sendTelegram(msg);
        }

        const result = await db.createBroadcastMessage({
          meetupId: input.meetupId || null,
          title: input.title,
          content: input.content,
          targetType: input.targetType,
          sentViaTelegram: telegramSent,
          sentViaWeb: true,
          recipientCount: regs.length,
          sentBy: ctx.user.id,
          sentAt: new Date(),
        });

        return { success: true, recipientCount: regs.length, telegramSent };
      }),
    list: adminProcedure
      .query(() => db.getBroadcastMessages()),
  }),

  // ── Baggage Tracking ─────────────────────────────────
  baggage: router({
    create: publicProcedure
      .input(z.object({
        registrationId: z.number(),
        meetupId: z.number().optional(),
        flightScheduleId: z.number().optional(),
        tagNumber: z.string().optional(),
        baggageType: z.string().optional(),
        weight: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createBaggageTracking(input);
        return result;
      }),
    uploadTagPhoto: publicProcedure
      .input(z.object({
        baggageId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `baggage-tags/${input.baggageId}-${nanoid(8)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);

        // LLM OCR: 수화물 태그 번호 인식
        let ocrResult: any = null;
        let tagNumber: string | undefined;
        try {
          const ocrResponse = await invokeLLM({
            messages: [
              { role: "system", content: "수화물 태그 사진에서 태그 번호를 인식해주세요. 태그 번호는 보통 10자리 숫자입니다. JSON으로 응답해주세요." },
              { role: "user", content: [
                { type: "text" as const, text: "이 수화물 태그 사진에서 태그 번호를 읽어주세요." },
                { type: "image_url" as const, image_url: { url } }
              ]}
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "baggage_tag_ocr",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    tagNumber: { type: "string", description: "수화물 태그 번호" },
                    airline: { type: "string", description: "항공사 이름" },
                    destination: { type: "string", description: "목적지 공항 코드" },
                    confidence: { type: "string", description: "인식 신뢰도 (high/medium/low)" },
                  },
                  required: ["tagNumber", "airline", "destination", "confidence"],
                  additionalProperties: false,
                },
              },
            },
          });
          const parsed = JSON.parse(ocrResponse.choices[0].message.content as string);
          ocrResult = parsed;
          tagNumber = parsed.tagNumber;
        } catch (e) {
          console.error("[Baggage OCR] Failed:", e);
        }

        await db.updateBaggageTracking(input.baggageId, {
          tagPhotoUrl: url,
          ocrResult,
          ...(tagNumber ? { tagNumber } : {}),
        });

        return { url, ocrResult, tagNumber };
      }),
    getByRegistration: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getBaggageByRegistration(input.registrationId)),
    getByMeetup: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(({ input }) => db.getBaggageByMeetup(input.meetupId)),
    list: adminProcedure.query(() => db.getAllBaggage()),
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        baggageStatus: z.enum(["checked_in", "loaded", "in_transit", "arrived", "claimed", "delayed", "lost"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const updateData: any = { baggageStatus: input.baggageStatus };
        if (input.notes) updateData.notes = input.notes;
        if (input.baggageStatus === "claimed") updateData.claimedAt = new Date();
        await db.updateBaggageTracking(input.id, updateData);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        tagNumber: z.string().optional(),
        baggageType: z.string().optional(),
        weight: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBaggageTracking(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBaggageTracking(input.id);
        return { success: true };
      }),
  }),

  // ── Checkin Info ────────────────────────────────────
  checkin: router({
    create: adminProcedure
      .input(z.object({
        registrationId: z.number(),
        meetupId: z.number().optional(),
        flightScheduleId: z.number().optional(),
        airline: z.string().optional(),
        flightNo: z.string().optional(),
        checkinCounter: z.string().optional(),
        gateNumber: z.string().optional(),
        seatNumber: z.string().optional(),
        boardingTime: z.string().optional(),
        checkinStatus: z.enum(["not_checked_in", "online_checkin", "counter_checkin", "boarding_pass_issued", "boarded"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.createCheckinInfo({
          ...input,
          boardingTime: input.boardingTime ? new Date(input.boardingTime) : undefined,
        });
        return result;
      }),
    getByRegistration: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getCheckinByRegistration(input.registrationId)),
    getByMeetup: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(({ input }) => db.getCheckinByMeetup(input.meetupId)),
    list: adminProcedure.query(() => db.getAllCheckins()),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        checkinCounter: z.string().optional(),
        gateNumber: z.string().optional(),
        seatNumber: z.string().optional(),
        boardingTime: z.string().optional(),
        checkinStatus: z.enum(["not_checked_in", "online_checkin", "counter_checkin", "boarding_pass_issued", "boarded"]).optional(),
        boardingPassUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateCheckinInfo(id, {
          ...data,
          boardingTime: data.boardingTime ? new Date(data.boardingTime) : undefined,
        });
        return { success: true };
      }),
    uploadBoardingPass: publicProcedure
      .input(z.object({
        checkinId: z.number(),
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `boarding-passes/${input.checkinId}-${nanoid(8)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateCheckinInfo(input.checkinId, { boardingPassUrl: url });
        return { url };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCheckinInfo(input.id);
        return { success: true };
      }),
  }),

  // ══ v3.8 - 식사 통계, 프로필 수정, 호텔 방 배정 ══
  mealStats: router({
    get: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getMealStats(input.meetupId);
      }),
  }),

  profile: router({
    get: publicProcedure
      .input(z.object({ name: z.string().min(1), phone: z.string().min(1) }))
      .query(async ({ input }) => {
        const results = await db.getRegistrationByNameAndPhone(input.name, input.phone);
        if (results.length === 0) return null;
        return results[0];
      }),
    update: publicProcedure
      .input(z.object({
        registrationId: z.number(),
        name: z.string().min(1),
        phone: z.string().min(1),
        mealPreference: z.string().optional(),
        allergies: z.string().optional(),
        drinkAlcohol: z.enum(["yes", "no", "sometimes"]).optional(),
        smoking: z.enum(["yes", "no"]).optional(),
        preferredDepartureTime: z.string().optional(),
        checkedBagRequest: z.boolean().optional(),
        checkedBagCount: z.number().optional(),
        checkedBagWeight: z.string().optional(),
        checkedBagNotes: z.string().optional(),
        roommatePreference: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 본인 인증: 이름+전화번호로 확인
        const results = await db.getRegistrationByNameAndPhone(input.name, input.phone);
        const match = results.find((r: any) => r.id === input.registrationId);
        if (!match) throw new TRPCError({ code: "FORBIDDEN", message: "본인 인증에 실패했습니다." });
        const { registrationId, name, phone, ...updateData } = input;
        await db.updateRegistrationProfile(registrationId, updateData as any);
        return { success: true };
      }),
  }),

  hotelRoom: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getHotelRoomAssignments(input.meetupId);
      }),
    assign: adminProcedure
      .input(z.object({
        registrationId: z.number(),
        roomNumber: z.string(),
        floor: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateHotelRoom(input.registrationId, {
          hotelRoomNumber: input.roomNumber,
          hotelFloor: input.floor || null,
          hotelNotes: input.notes || null,
        });
        return { success: true };
      }),
    bulkAssign: adminProcedure
      .input(z.object({
        assignments: z.array(z.object({
          registrationId: z.number(),
          roomNumber: z.string(),
          floor: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.bulkUpdateHotelRooms(input.assignments);
        return { success: true, count: input.assignments.length };
      }),
    remove: adminProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateHotelRoom(input.registrationId, {
          hotelRoomNumber: null,
          hotelFloor: null,
          hotelNotes: null,
        });
        return { success: true };
      }),
  }),

  // ══════════════════════════════════════════════════════════
  // v4.0 - 멀티테넌트 클라우드 플랫폼
  // ══════════════════════════════════════════════════════════

  // ── Organizations (조직/업체 관리) ──────────────────────
  organization: router({
    list: superadminProcedure
      .input(z.object({ type: z.string().optional() }))
      .query(async ({ input }) => {
        return db.getOrganizations(input.type);
      }),
    get: superadminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getOrganizationById(input.id);
      }),
    create: superadminProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["platform", "organizer", "agency", "partner"]),
        region: z.string().optional(),
        country: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
        telegramChatId: z.string().optional(),
        parentOrgId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createOrganization({ ...input, createdBy: ctx.user.id });
        return result;
      }),
    update: superadminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        type: z.enum(["platform", "organizer", "agency", "partner"]).optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        address: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
        telegramChatId: z.string().optional(),
        isActive: z.boolean().optional(),
        parentOrgId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateOrganization(id, data);
        return { success: true };
      }),
    delete: superadminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteOrganization(input.id);
        return { success: true };
      }),
  }),

  // ── Partner Categories (파트너 카테고리) ────────────────
  partnerCategory: router({
    list: adminProcedure.query(async () => {
      return db.getPartnerCategories();
    }),
    create: superadminProcedure
      .input(z.object({
        name: z.string(),
        nameKo: z.string().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createPartnerCategory(input);
      }),
    update: superadminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameKo: z.string().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePartnerCategory(id, data);
        return { success: true };
      }),
    delete: superadminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePartnerCategory(input.id);
        return { success: true };
      }),
  }),

  // ── Partners (파트너 업체) ──────────────────────────────
  partner: router({
    list: adminProcedure
      .input(z.object({
        categoryId: z.number().optional(),
        organizationId: z.number().optional(),
        region: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return db.getPartners(input);
      }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getPartnerById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        organizationId: z.number().optional(),
        categoryId: z.number().optional(),
        name: z.string(),
        region: z.string().optional(),
        country: z.string().optional(),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        capacity: z.number().optional(),
        priceRange: z.string().optional(),
        operatingHours: z.string().optional(),
        languages: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createPartner({ ...input, managedBy: ctx.user.id });
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        organizationId: z.number().optional(),
        categoryId: z.number().optional(),
        name: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        address: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        capacity: z.number().optional(),
        priceRange: z.string().optional(),
        operatingHours: z.string().optional(),
        languages: z.string().optional(),
        rating: z.number().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePartner(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePartner(input.id);
        return { success: true };
      }),
  }),

  // ── Organization Members ──────────────────────────────
  orgMember: router({
    list: superadminProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrganizationMembers(input.organizationId);
      }),
    add: superadminProcedure
      .input(z.object({
        organizationId: z.number(),
        userId: z.number(),
        memberRole: z.enum(["owner", "manager", "staff", "viewer"]),
      }))
      .mutation(async ({ input }) => {
        return db.addOrganizationMember(input);
      }),
    remove: superadminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeOrganizationMember(input.id);
        return { success: true };
      }),
  }),

  // ── Meetup Partners (밋업-파트너 연결) ─────────────────
  meetupPartner: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getMeetupPartners(input.meetupId);
      }),
    add: adminProcedure
      .input(z.object({
        meetupId: z.number(),
        partnerId: z.number(),
        serviceType: z.string().optional(),
        serviceDate: z.date().optional(),
        serviceNotes: z.string().optional(),
        cost: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.addMeetupPartner(input);
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        serviceType: z.string().optional(),
        serviceDate: z.date().optional(),
        serviceNotes: z.string().optional(),
        cost: z.string().optional(),
        status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMeetupPartner(id, data);
        return { success: true };
      }),
    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeMeetupPartner(input.id);
        return { success: true };
      }),
  }),

  // ── Platform Stats (슈퍼어드민 대시보드) ────────────────
  platform: router({
    stats: superadminProcedure.query(async () => {
      return db.getPlatformStats();
    }),
    users: superadminProcedure.query(async () => {
      return db.getAllUsers();
    }),
    updateUserRole: superadminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "superadmin", "organizer", "agency", "partner"]),
        organizationId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role, input.organizationId);
        return { success: true };
      }),
    seedCategories: superadminProcedure.mutation(async () => {
      const defaults = [
        { name: "Restaurant", nameKo: "식당", icon: "utensils", sortOrder: 1 },
        { name: "Hotel", nameKo: "호텔", icon: "hotel", sortOrder: 2 },
        { name: "Club", nameKo: "클럽", icon: "music", sortOrder: 3 },
        { name: "Massage", nameKo: "마사지", icon: "spa", sortOrder: 4 },
        { name: "Travel", nameKo: "여행", icon: "map", sortOrder: 5 },
        { name: "Cruise", nameKo: "크루즈", icon: "ship", sortOrder: 6 },
        { name: "Vehicle", nameKo: "차량", icon: "car", sortOrder: 7 },
        { name: "Interpreter", nameKo: "통역", icon: "languages", sortOrder: 8 },
        { name: "Activity", nameKo: "액티비티", icon: "activity", sortOrder: 9 },
        { name: "Other", nameKo: "기타", icon: "more-horizontal", sortOrder: 10 },
      ];
      for (const cat of defaults) {
        await db.createPartnerCategory(cat);
      }
      return { success: true, count: defaults.length };
    }),
  }),

  // ── Hotel Room Telegram Notification ────────────────────
  hotelRoomNotify: router({
    assignAndNotify: adminProcedure
      .input(z.object({
        registrationId: z.number(),
        roomNumber: z.string(),
        floor: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateHotelRoom(input.registrationId, {
          hotelRoomNumber: input.roomNumber,
          hotelFloor: input.floor || null,
          hotelNotes: input.notes || null,
        });
        // 참석자 정보 조회하여 텔레그램 발송
        const allRegs = await db.getRegistrations();
        const reg = allRegs.find(r => r.id === input.registrationId);
        if (reg?.messengerId) {
          const config = await db.getTelegramConfig();
          if (config?.enabled && config.botToken) {
            const msg = `🏨 <b>호텔 방 배정 안내</b>\n\n` +
              `안녕하세요, ${reg.name}님!\n` +
              `호텔 방이 배정되었습니다.\n\n` +
              `🔑 방 번호: <b>${input.roomNumber}</b>\n` +
              (input.floor ? `🏢 층: <b>${input.floor}</b>\n` : "") +
              (input.notes ? `📝 메모: ${input.notes}\n` : "") +
              `\n궁금한 사항은 관리자에게 문의해주세요.`;
            try {
              await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: reg.messengerId, text: msg, parse_mode: "HTML" }),
              });
            } catch (e) { /* silent */ }
          }
        }
        return { success: true, notified: !!reg?.messengerId };
      }),
    bulkAssignCsv: adminProcedure
      .input(z.object({
        assignments: z.array(z.object({
          name: z.string(),
          phone: z.string(),
          roomNumber: z.string(),
          floor: z.string().optional(),
          notes: z.string().optional(),
        })),
        sendNotification: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const allRegs = await db.getRegistrations();
        let matched = 0;
        let notified = 0;
        const errors: string[] = [];
        for (const row of input.assignments) {
          const reg = allRegs.find(r => r.name === row.name && r.phone === row.phone);
          if (!reg) {
            errors.push(`${row.name} (${row.phone}) - 참석자를 찾을 수 없습니다`);
            continue;
          }
          await db.updateHotelRoom(reg.id, {
            hotelRoomNumber: row.roomNumber,
            hotelFloor: row.floor || null,
            hotelNotes: row.notes || null,
          });
          matched++;
          if (input.sendNotification && reg.messengerId) {
            const config = await db.getTelegramConfig();
            if (config?.enabled && config.botToken) {
              const msg = `🏨 <b>호텔 방 배정 안내</b>\n\n` +
                `안녕하세요, ${reg.name}님!\n` +
                `호텔 방이 배정되었습니다.\n\n` +
                `🔑 방 번호: <b>${row.roomNumber}</b>\n` +
                (row.floor ? `🏢 층: <b>${row.floor}</b>\n` : "") +
                (row.notes ? `📝 메모: ${row.notes}\n` : "");
              try {
                await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ chat_id: reg.messengerId, text: msg, parse_mode: "HTML" }),
                });
                notified++;
              } catch (e) { /* silent */ }
            }
          }
        }
        return { success: true, matched, notified, errors };
      }),
  }),

  // ══════════════════════════════════════════════════════════
  // v4.2 - 회원 프로필 / 여권 / 출장이력
  // ══════════════════════════════════════════════════════════
  userProfile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProfile(ctx.user.id);
    }),
    upsert: protectedProcedure
      .input(z.object({
        phone: z.string().optional(),
        nationality: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        organization: z.string().optional(),
        position: z.string().optional(),
        department: z.string().optional(),
        bio: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        dietaryRestrictions: z.string().optional(),
        allergies: z.string().optional(),
        medicalNotes: z.string().optional(),
        preferredLanguage: z.string().optional(),
        telegramId: z.string().optional(),
        profileImageUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertUserProfile(ctx.user.id, input);
      }),
    completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
      await db.upsertUserProfile(ctx.user.id, { onboardingCompleted: true });
      return { success: true };
    }),
    onboardingStatus: protectedProcedure.query(async ({ ctx }) => {
      return db.getOnboardingStatus(ctx.user.id);
    }),
  }),

  passport: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getPassportInfo(ctx.user.id);
    }),
    save: protectedProcedure
      .input(z.object({
        passportNumber: z.string().optional(),
        issuingCountry: z.string().optional(),
        nationality: z.string().optional(),
        fullName: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.enum(["M", "F"]).optional(),
        issueDate: z.string().optional(),
        expiryDate: z.string().optional(),
        passportImageUrl: z.string().optional(),
        passportImageKey: z.string().optional(),
        ocrData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.upsertPassportInfo(ctx.user.id, input);
      }),
    // 여권 스캔 OCR - 이미지를 LLM으로 분석하여 여권 정보 추출
    scan: protectedProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. 이미지 S3 업로드
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `passports/scan-${ctx.user.id}-${nanoid(8)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        // 2. LLM OCR 실행
        try {
          const ocrResponse = await invokeLLM({
            messages: [
              { role: "system", content: `You are a passport OCR system. Extract the following fields from the passport image and return ONLY valid JSON:
- fullName (full name as shown on passport, in ENGLISH/LATIN characters)
- passportNumber
- nationality (country name in Korean, e.g. "한국", "미국")
- issuingCountry (country name in Korean)
- dateOfBirth (YYYY-MM-DD format)
- expiryDate (YYYY-MM-DD format)
- issueDate (YYYY-MM-DD format, if visible)
- gender (M or F)
- phone (if visible, otherwise null)
Return ONLY valid JSON, no markdown or explanation.` },
              { role: "user", content: [
                { type: "text", text: "Extract passport information from this image:" },
                { type: "image_url", image_url: { url, detail: "high" } },
              ]},
            ],
          });
          const rawOcr = ocrResponse.choices?.[0]?.message?.content;
          const ocrText = typeof rawOcr === "string" ? rawOcr : "{}";
          let ocrData: any;
          try {
            const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
            ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          } catch {
            ocrData = { raw: ocrText };
          }
          return {
            success: true,
            imageUrl: url,
            imageKey: key,
            ocrData,
          };
        } catch (e) {
          console.error("[Passport Scan] OCR failed:", e);
          return { success: false, imageUrl: url, imageKey: key, ocrData: null };
        }
      }),
    // 여권 스캔 결과로 프로필 + 여권 정보 한번에 저장
    scanAndRegister: protectedProcedure
      .input(z.object({
        // 프로필 정보
        phone: z.string().min(1),
        nationality: z.string().optional(),
        birthDate: z.string().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        preferredLanguage: z.string().default("ko"),
        telegramId: z.string().optional(),
        // 여권 정보
        passportNumber: z.string().optional(),
        issuingCountry: z.string().optional(),
        passportNationality: z.string().optional(),
        fullName: z.string().optional(),
        passportBirthDate: z.string().optional(),
        passportGender: z.enum(["M", "F"]).optional(),
        issueDate: z.string().optional(),
        expiryDate: z.string().optional(),
        passportImageUrl: z.string().optional(),
        passportImageKey: z.string().optional(),
        ocrData: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 프로필 저장
        await db.upsertUserProfile(ctx.user.id, {
          phone: input.phone,
          nationality: input.nationality,
          birthDate: input.birthDate,
          gender: input.gender,
          preferredLanguage: input.preferredLanguage,
          telegramId: input.telegramId,
          onboardingCompleted: true,
        });
        // 여권 정보 저장
        if (input.passportNumber || input.fullName) {
          await db.upsertPassportInfo(ctx.user.id, {
            passportNumber: input.passportNumber,
            issuingCountry: input.issuingCountry,
            nationality: input.passportNationality,
            fullName: input.fullName,
            birthDate: input.passportBirthDate,
            gender: input.passportGender,
            issueDate: input.issueDate,
            expiryDate: input.expiryDate,
            passportImageUrl: input.passportImageUrl,
            passportImageKey: input.passportImageKey,
            ocrData: input.ocrData,
          });
        }
        return { success: true };
      }),
    // 중복 프로필 감지 - 동일 여권번호 또는 이름+생년월일로 기존 사용자 확인
    checkDuplicate: protectedProcedure
      .input(z.object({
        passportNumber: z.string().optional(),
        fullName: z.string().optional(),
        birthDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.checkPassportDuplicate(ctx.user.id, input.passportNumber, input.fullName, input.birthDate);
      }),
  }),

  tripHistory: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getTripHistory(ctx.user.id);
    }),
  }),

  // ── Invitations (조직 멤버 초대) ──────────────────────────
  invitation: router({
    create: protectedProcedure
      .input(z.object({
        organizationId: z.number(),
        email: z.string().email().optional(),
        memberRole: z.enum(["owner", "manager", "staff", "viewer"]).default("staff"),
        message: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 조직 멤버인지 확인 (owner/manager만 초대 가능)
        const members = await db.getOrganizationMembers(input.organizationId);
        const myMembership = members.find((m: any) => m.userId === ctx.user.id);
        if (!myMembership || (myMembership.memberRole !== "owner" && myMembership.memberRole !== "manager" && ctx.user.role !== "admin" && ctx.user.role !== "superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "초대 권한이 없습니다" });
        }
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일 후 만료
        return db.createInvitation({
          organizationId: input.organizationId,
          invitedBy: ctx.user.id,
          email: input.email || null,
          inviteToken: token,
          memberRole: input.memberRole,
          message: input.message || null,
          expiresAt,
        });
      }),
    getByToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const inv = await db.getInvitationByToken(input.token);
        if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "초대를 찾을 수 없습니다" });
        // 조직 정보도 함께 반환
        const org = await db.getOrganizationById(inv.organizationId);
        return { ...inv, organization: org };
      }),
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const inv = await db.getInvitationByToken(input.token);
        if (!inv) throw new TRPCError({ code: "NOT_FOUND", message: "초대를 찾을 수 없습니다" });
        if (inv.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 초대입니다" });
        if (new Date(inv.expiresAt) < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 초대입니다" });
        // 조직 멤버로 추가
        await db.addOrganizationMember({
          organizationId: inv.organizationId,
          userId: ctx.user.id,
          memberRole: inv.memberRole,
        });
        // 초대 상태 업데이트
        await db.updateInvitation(inv.id, {
          status: "accepted",
          acceptedBy: ctx.user.id,
          acceptedAt: new Date(),
        });
        // 사용자 조직 연결
        await db.updateUserRole(ctx.user.id, ctx.user.role, inv.organizationId);
        return { success: true };
      }),
    listByOrg: protectedProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return db.getInvitationsByOrg(input.organizationId);
      }),
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.cancelInvitation(input.id);
        return { success: true };
      }),
  }),

   // ── Role-based Dashboard ──────────────────────────────
  roleDashboard: router({
    organizer: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrganizerDashboardData(ctx.user.id);
    }),
    agency: protectedProcedure.query(async ({ ctx }) => {
      return db.getAgencyDashboardData(ctx.user.id);
    }),
    partner: protectedProcedure.query(async ({ ctx }) => {
      return db.getPartnerDashboardData(ctx.user.id);
    }),
  }),
  // ── Hotel Vouchers ──────────────────────────────────────
  hotelVoucher: router({
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        registrationId: z.number().optional(),
        userId: z.number().optional(),
        hotelName: z.string().min(1),
        hotelNameLocal: z.string().optional(),
        hotelAddress: z.string().min(1),
        hotelAddressLocal: z.string().optional(),
        hotelPhone: z.string().optional(),
        hotelLatitude: z.string().optional(),
        hotelLongitude: z.string().optional(),
        bookingId: z.string().optional(),
        guestName: z.string().optional(),
        roomType: z.string().optional(),
        roomCount: z.number().optional(),
        guestsPerRoom: z.number().optional(),
        checkInDate: z.string().optional(),
        checkInTime: z.string().optional(),
        checkOutDate: z.string().optional(),
        checkOutTime: z.string().optional(),
        includeMeals: z.boolean().optional(),
        specialRequests: z.string().optional(),
        includes: z.string().optional(),
        cancellationPolicy: z.string().optional(),
        checkInInstructions: z.string().optional(),
        voucherFileUrl: z.string().optional(),
        voucherFileKey: z.string().optional(),
        voucherFileType: z.enum(["image", "pdf"]).optional(),
        localLanguage: z.string().optional(),
        localCurrency: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createHotelVoucher(input as any);
        return { id };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getHotelVoucher(input.id);
      }),
    listByRegistration: protectedProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(async ({ input }) => {
        return db.getHotelVouchersByRegistration(input.registrationId);
      }),
    listByMeetup: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getHotelVouchersByMeetup(input.meetupId);
      }),
    listAll: protectedProcedure.query(async () => {
      return db.getAllHotelVouchers();
    }),
    listMy: protectedProcedure.query(async ({ ctx }) => {
      return db.getHotelVouchersByUser(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        hotelName: z.string().optional(),
        hotelNameLocal: z.string().optional(),
        hotelAddress: z.string().optional(),
        hotelAddressLocal: z.string().optional(),
        hotelPhone: z.string().optional(),
        hotelLatitude: z.string().optional(),
        hotelLongitude: z.string().optional(),
        bookingId: z.string().optional(),
        guestName: z.string().optional(),
        roomType: z.string().optional(),
        roomCount: z.number().optional(),
        guestsPerRoom: z.number().optional(),
        checkInDate: z.string().optional(),
        checkInTime: z.string().optional(),
        checkOutDate: z.string().optional(),
        checkOutTime: z.string().optional(),
        includeMeals: z.boolean().optional(),
        specialRequests: z.string().optional(),
        includes: z.string().optional(),
        cancellationPolicy: z.string().optional(),
        checkInInstructions: z.string().optional(),
        voucherFileUrl: z.string().optional(),
        voucherFileKey: z.string().optional(),
        voucherFileType: z.enum(["image", "pdf"]).optional(),
        localLanguage: z.string().optional(),
        localCurrency: z.string().optional(),
        status: z.enum(["active", "cancelled", "expired"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateHotelVoucher(id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteHotelVoucher(input.id);
        return { success: true };
      }),
    // CSV 일괄 배정
    bulkAssign: adminProcedure
      .input(z.object({
        rows: z.array(z.object({
          userId: z.number().optional(),
          meetupId: z.number().optional(),
          hotelName: z.string().min(1),
          hotelAddress: z.string().min(1),
          hotelNameLocal: z.string().optional(),
          hotelAddressLocal: z.string().optional(),
          hotelPhone: z.string().optional(),
          hotelLatitude: z.string().optional(),
          hotelLongitude: z.string().optional(),
          guestName: z.string().optional(),
          roomType: z.string().optional(),
          checkInDate: z.string().optional(),
          checkOutDate: z.string().optional(),
          bookingId: z.string().optional(),
          specialRequests: z.string().optional(),
          localLanguage: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        let successCount = 0;
        const errors: string[] = [];
        for (const row of input.rows) {
          try {
            await db.createHotelVoucher(row as any);
            successCount++;
          } catch (e: any) {
            errors.push(`${row.guestName || 'unknown'}: ${e.message}`);
          }
        }
        return { successCount, errorCount: errors.length, errors };
      }),
  }),
  // ── Flight Tickets ──────────────────────────────────────
  flightTicket: router({
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        registrationId: z.number().optional(),
        userId: z.number().optional(),
        passengerName: z.string().min(1),
        passportNumber: z.string().optional(),
        nationality: z.string().optional(),
        outboundAirline: z.string().optional(),
        outboundFlightNo: z.string().optional(),
        outboundDepartureAirport: z.string().optional(),
        outboundDepartureCode: z.string().optional(),
        outboundArrivalAirport: z.string().optional(),
        outboundArrivalCode: z.string().optional(),
        outboundDepartureDate: z.string().optional(),
        outboundDepartureTime: z.string().optional(),
        outboundArrivalDate: z.string().optional(),
        outboundArrivalTime: z.string().optional(),
        outboundSeatClass: z.string().optional(),
        outboundSeatNumber: z.string().optional(),
        returnAirline: z.string().optional(),
        returnFlightNo: z.string().optional(),
        returnDepartureAirport: z.string().optional(),
        returnDepartureCode: z.string().optional(),
        returnArrivalAirport: z.string().optional(),
        returnArrivalCode: z.string().optional(),
        returnDepartureDate: z.string().optional(),
        returnDepartureTime: z.string().optional(),
        returnArrivalDate: z.string().optional(),
        returnArrivalTime: z.string().optional(),
        returnSeatClass: z.string().optional(),
        returnSeatNumber: z.string().optional(),
        bookingReference: z.string().optional(),
        ticketNumber: z.string().optional(),
        ticketFileUrl: z.string().optional(),
        ticketFileKey: z.string().optional(),
        ticketFileType: z.enum(["image", "pdf", "generated"]).optional(),
        isGenerated: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createFlightTicket(input as any);
        return { id };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getFlightTicket(input.id);
      }),
    listByRegistration: protectedProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(async ({ input }) => {
        return db.getFlightTicketsByRegistration(input.registrationId);
      }),
    listByMeetup: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getFlightTicketsByMeetup(input.meetupId);
      }),
    listAll: protectedProcedure.query(async () => {
      return db.getAllFlightTickets();
    }),
    listMy: protectedProcedure.query(async ({ ctx }) => {
      return db.getFlightTicketsByUser(ctx.user.id);
    }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        passengerName: z.string().optional(),
        passportNumber: z.string().optional(),
        nationality: z.string().optional(),
        outboundAirline: z.string().optional(),
        outboundFlightNo: z.string().optional(),
        outboundDepartureAirport: z.string().optional(),
        outboundDepartureCode: z.string().optional(),
        outboundArrivalAirport: z.string().optional(),
        outboundArrivalCode: z.string().optional(),
        outboundDepartureDate: z.string().optional(),
        outboundDepartureTime: z.string().optional(),
        outboundArrivalDate: z.string().optional(),
        outboundArrivalTime: z.string().optional(),
        outboundSeatClass: z.string().optional(),
        outboundSeatNumber: z.string().optional(),
        returnAirline: z.string().optional(),
        returnFlightNo: z.string().optional(),
        returnDepartureAirport: z.string().optional(),
        returnDepartureCode: z.string().optional(),
        returnArrivalAirport: z.string().optional(),
        returnArrivalCode: z.string().optional(),
        returnDepartureDate: z.string().optional(),
        returnDepartureTime: z.string().optional(),
        returnArrivalDate: z.string().optional(),
        returnArrivalTime: z.string().optional(),
        returnSeatClass: z.string().optional(),
        returnSeatNumber: z.string().optional(),
        bookingReference: z.string().optional(),
        ticketNumber: z.string().optional(),
        ticketFileUrl: z.string().optional(),
        ticketFileKey: z.string().optional(),
        ticketFileType: z.enum(["image", "pdf", "generated"]).optional(),
        isGenerated: z.boolean().optional(),
        status: z.enum(["active", "cancelled", "used"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFlightTicket(id, data as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFlightTicket(input.id);
        return { success: true };
      }),
    // CSV 일괄 배정
    bulkAssign: adminProcedure
      .input(z.object({
        rows: z.array(z.object({
          userId: z.number().optional(),
          meetupId: z.number().optional(),
          passengerName: z.string().min(1),
          passportNumber: z.string().optional(),
          nationality: z.string().optional(),
          outboundAirline: z.string().optional(),
          outboundFlightNo: z.string().optional(),
          outboundDepartureAirport: z.string().optional(),
          outboundDepartureCode: z.string().optional(),
          outboundArrivalAirport: z.string().optional(),
          outboundArrivalCode: z.string().optional(),
          outboundDepartureDate: z.string().optional(),
          outboundDepartureTime: z.string().optional(),
          outboundArrivalDate: z.string().optional(),
          outboundArrivalTime: z.string().optional(),
          returnAirline: z.string().optional(),
          returnFlightNo: z.string().optional(),
          returnDepartureAirport: z.string().optional(),
          returnDepartureCode: z.string().optional(),
          returnArrivalAirport: z.string().optional(),
          returnArrivalCode: z.string().optional(),
          returnDepartureDate: z.string().optional(),
          returnDepartureTime: z.string().optional(),
          returnArrivalDate: z.string().optional(),
          returnArrivalTime: z.string().optional(),
          bookingReference: z.string().optional(),
          ticketNumber: z.string().optional(),
          isGenerated: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        let successCount = 0;
        const errors: string[] = [];
        for (const row of input.rows) {
          try {
            await db.createFlightTicket(row as any);
            successCount++;
          } catch (e: any) {
            errors.push(`${row.passengerName || 'unknown'}: ${e.message}`);
          }
        }
        return { successCount, errorCount: errors.length, errors };
      }),
  }),

  // ── Immigration Checklist ──────────────────────────────────
  immigration: router({
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserImmigrationStatus(ctx.user.id);
    }),
    statusByUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return db.getUserImmigrationStatus(input.userId);
      }),
  }),

  // ══════════════════════════════════════════════════════════
  // v5.0 - Affiliate Booking System
  // ══════════════════════════════════════════════════════════
  booking: router({
    // 공항 코드 목록
    airports: publicProcedure.query(() => {
      return Object.entries(AIRPORT_MAP).map(([code, info]) => ({
        code, ...info,
      }));
    }),

    // 항공편 검색 + 어필리에이트 링크 생성
    searchFlights: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        origin: z.string().min(3).max(4),
        destination: z.string().min(3).max(4),
        departureDate: z.string(),
        returnDate: z.string().optional(),
        passengers: z.number().default(1),
        cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
        source: z.enum(["backoffice", "mypage", "telegram"]).default("backoffice"),
      }))
      .mutation(async ({ input, ctx }) => {
        // 어필리에이트 설정 로드
        const settings = await db.getAffiliateSettings();
        const config: AffiliateConfig = {};
        for (const s of settings) {
          if (!s.isActive) continue;
          if (s.platform === "trip_com") config.tripComAffId = s.affiliateId || undefined;
          if (s.platform === "booking_com") config.bookingComAffId = s.affiliateId || undefined;
          if (s.platform === "skyscanner") config.skyscannerAffId = s.affiliateId || undefined;
          if (s.platform === "travelpayouts") config.travelpayoutsMarker = s.marker || undefined;
        }

        const searchParams: FlightSearchParams = {
          origin: input.origin.toUpperCase(),
          destination: input.destination.toUpperCase(),
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          passengers: input.passengers,
          cabinClass: input.cabinClass,
        };

        const platforms = generateFlightSearchLinks(searchParams, config);

        // 검색 기록 저장
        const originInfo = getAirportInfo(input.origin);
        const destInfo = getAirportInfo(input.destination);
        const searchId = await db.createBookingSearch({
          meetupId: input.meetupId,
          userId: ctx.user.id,
          searchType: "flight",
          originCode: input.origin.toUpperCase(),
          originCity: originInfo.city,
          destinationCode: input.destination.toUpperCase(),
          destinationCity: destInfo.city,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          passengers: input.passengers,
          cabinClass: input.cabinClass,
          resultCount: platforms.length,
          searchResults: platforms,
          source: input.source,
        });

        // 각 플랫폼별 링크 저장
        for (const p of platforms) {
          await db.createBookingLink({
            searchId,
            meetupId: input.meetupId,
            userId: ctx.user.id,
            platform: p.platform as any,
            linkType: "flight",
            affiliateUrl: p.url,
            productName: `${input.origin} → ${input.destination} (${input.departureDate})`,
            currency: p.currency,
          });
        }

        return { searchId, platforms, origin: originInfo, destination: destInfo };
      }),

    // 호텔 검색 + 어필리에이트 링크 생성
    searchHotels: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        city: z.string().min(1),
        checkIn: z.string(),
        checkOut: z.string(),
        rooms: z.number().default(1),
        guests: z.number().default(2),
        source: z.enum(["backoffice", "mypage", "telegram"]).default("backoffice"),
      }))
      .mutation(async ({ input, ctx }) => {
        const settings = await db.getAffiliateSettings();
        const config: AffiliateConfig = {};
        for (const s of settings) {
          if (!s.isActive) continue;
          if (s.platform === "trip_com") config.tripComAffId = s.affiliateId || undefined;
          if (s.platform === "booking_com") config.bookingComAffId = s.affiliateId || undefined;
          if (s.platform === "agoda") config.agodaCid = s.affiliateId || undefined;
          if (s.platform === "travelpayouts") config.travelpayoutsMarker = s.marker || undefined;
        }

        const searchParams: HotelSearchParams = {
          city: input.city,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          rooms: input.rooms,
          guests: input.guests,
        };

        const platforms = generateHotelSearchLinks(searchParams, config);

        const searchId = await db.createBookingSearch({
          meetupId: input.meetupId,
          userId: ctx.user.id,
          searchType: "hotel",
          hotelCity: input.city,
          hotelCheckIn: input.checkIn,
          hotelCheckOut: input.checkOut,
          rooms: input.rooms,
          guests: input.guests,
          resultCount: platforms.length,
          searchResults: platforms,
          source: input.source,
        });

        for (const p of platforms) {
          await db.createBookingLink({
            searchId,
            meetupId: input.meetupId,
            userId: ctx.user.id,
            platform: p.platform as any,
            linkType: "hotel",
            affiliateUrl: p.url,
            productName: `${input.city} (${input.checkIn} ~ ${input.checkOut})`,
            currency: p.currency,
          });
        }

        return { searchId, platforms };
      }),

    // 링크 클릭 추적
    trackClick: publicProcedure
      .input(z.object({ linkId: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementBookingLinkClick(input.linkId);
        return { success: true };
      }),

    // 검색 기록 목록
    searchHistory: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        searchType: z.string().optional(),
        source: z.string().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input }) => {
        return db.getBookingSearches(input || {});
      }),

    // 검색 결과 참석자에게 발송 (텔레그램)
    sendToAttendees: adminProcedure
      .input(z.object({
        searchId: z.number(),
        meetupId: z.number(),
        message: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const search = await db.getBookingSearchById(input.searchId);
        if (!search) throw new TRPCError({ code: "NOT_FOUND" });

        const links = await db.getBookingLinks({ searchId: input.searchId });
        const regs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });

        // 텔레그램 메시지 구성
        let msg = "";
        if (search.searchType === "flight") {
          msg = `\u2708\uFE0F <b>항공편 검색 결과</b>\n${search.originCode} → ${search.destinationCode}\n${search.departureDate}${search.returnDate ? " ~ " + search.returnDate : ""}\n\n`;
        } else {
          msg = `\uD83C\uDFE8 <b>호텔 검색 결과</b>\n${search.hotelCity}\n${search.hotelCheckIn} ~ ${search.hotelCheckOut}\n\n`;
        }

        for (const link of links) {
          msg += `\u2022 <a href="${link.affiliateUrl}">${link.productName || link.platform}</a>\n`;
        }

        if (input.message) msg += `\n${input.message}`;

        const sent = await sendTelegram(msg);

        await db.updateBookingSearch(input.searchId, {
          sentToAttendees: true,
          sentAt: new Date(),
          sentCount: regs.length,
        });

        return { success: sent, recipientCount: regs.length };
      }),

    // 링크 목록
    links: protectedProcedure
      .input(z.object({
        searchId: z.number().optional(),
        meetupId: z.number().optional(),
        platform: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getBookingLinks(input || {});
      }),
  }),

  // ── Affiliate Settings & Revenue ──────────────────────────
  affiliate: router({
    // 설정 목록
    settings: adminProcedure.query(async () => {
      return db.getAffiliateSettings();
    }),

    // 설정 업데이트
    upsertSetting: adminProcedure
      .input(z.object({
        platform: z.enum(["trip_com", "booking_com", "agoda", "skyscanner", "klook", "travelpayouts"]),
        affiliateId: z.string().optional(),
        apiKey: z.string().optional(),
        apiSecret: z.string().optional(),
        marker: z.string().optional(),
        isActive: z.boolean().default(false),
        commissionRateFlight: z.string().optional(),
        commissionRateHotel: z.string().optional(),
        commissionRateTour: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertAffiliateSetting(input);
        return { success: true };
      }),

    // 수익 목록
    revenue: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        platform: z.string().optional(),
        status: z.string().optional(),
        revenueMonth: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAffiliateRevenue(input || {});
      }),

    // 수익 통계
    stats: adminProcedure.query(async () => {
      return db.getRevenueStats();
    }),

    // 카테고리/플랫폼별 수익
    breakdown: adminProcedure.query(async () => {
      return db.getRevenueByCategoryAndPlatform();
    }),

    // 월별 수익
    monthly: adminProcedure
      .input(z.object({ months: z.number().default(6) }).optional())
      .query(async ({ input }) => {
        return db.getMonthlyRevenue(input?.months || 6);
      }),

    // 수익 추가 (수동 입력)
    addRevenue: adminProcedure
      .input(z.object({
        bookingLinkId: z.number().optional(),
        meetupId: z.number().optional(),
        platform: z.enum(["trip_com", "booking_com", "agoda", "skyscanner", "klook", "travelpayouts"]),
        revenueType: z.enum(["flight", "hotel", "tour", "transfer"]).default("flight"),
        bookingAmount: z.string().optional(),
        commissionRate: z.string().optional(),
        commissionAmount: z.string(),
        currency: z.string().default("USD"),
        status: z.enum(["pending", "confirmed", "paid", "cancelled"]).default("pending"),
        externalBookingId: z.string().optional(),
        notes: z.string().optional(),
        revenueMonth: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createAffiliateRevenue(input);
        return { id };
      }),

    // 수익 상태 업데이트
    updateRevenue: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "paid", "cancelled"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateAffiliateRevenue(id, data);
        return { success: true };
      }),
  }),

  // ── API Keys Management ──────────────────────────────────
  apiKeys: router({
    // API 키 목록
    list: adminProcedure.query(async () => {
      return db.getAllApiKeys();
    }),

    // API 키 생성
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        organizationId: z.number().optional(),
        permissions: z.array(z.string()).optional(),
        rateLimit: z.number().default(1000),
        expiresInDays: z.number().optional(), // null = never expires
      }))
      .mutation(async ({ ctx, input }) => {
        const { nanoid } = await import("nanoid");
        const crypto = await import("crypto");
        
        // Generate a secure API key: mt_live_ + 40 random chars
        const rawKey = `mt_live_${nanoid(40)}`;
        const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
        const keyPrefix = rawKey.slice(0, 12);

        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : undefined;

        const id = await db.createApiKey({
          name: input.name,
          keyHash,
          keyPrefix,
          organizationId: input.organizationId || undefined,
          userId: ctx.user.id,
          permissions: input.permissions ? JSON.stringify(input.permissions) : null,
          rateLimit: input.rateLimit,
          expiresAt,
          isActive: true,
        });

        // Return the raw key ONLY on creation (never stored)
        return { id, apiKey: rawKey, keyPrefix };
      }),

    // API 키 비활성화/활성화
    toggle: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input }) => {
        await db.updateApiKey(input.id, { isActive: input.isActive });
        return { success: true };
      }),

    // API 키 삭제
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteApiKey(input.id);
        return { success: true };
      }),

    // API 사용 통계
    usage: adminProcedure
      .input(z.object({ apiKeyId: z.number() }))
      .query(async ({ input }) => {
        return db.getApiUsageStats(input.apiKeyId);
      }),

    // API 요청 로그
    logs: adminProcedure
      .input(z.object({ apiKeyId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return db.getApiRequestLogs(input.apiKeyId, input.limit);
      }),

    // API 요청 로그 (기간 필터링)
    logsFiltered: adminProcedure
      .input(z.object({
        apiKeyId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(100),
      }))
      .query(async ({ input }) => {
        return db.getApiRequestLogsFiltered(input.apiKeyId, {
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          limit: input.limit,
        });
      }),
  }),

  // ── Telegram Uploads (텔레그램 여행정보 자동 업로드) ──────────
  telegramUpload: router({
    // 목록 조회
    list: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        parsedType: z.string().optional(),
        meetupId: z.number().optional(),
        limit: z.number().default(100),
      }).optional())
      .query(async ({ input }) => {
        return db.getTelegramUploads(input || {});
      }),

    // 상세 조회
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getTelegramUploadById(input.id);
      }),

    // 통계
    stats: adminProcedure.query(async () => {
      return db.getTelegramUploadStats();
    }),

    // 웹훅 수신 (텔레그램 봇에서 호출)
    webhook: publicProcedure
      .input(z.object({
        message_id: z.string().optional(),
        chat_id: z.string().optional(),
        from_user: z.string().optional(),
        text: z.string().optional(),
        file_url: z.string().optional(),
        file_type: z.enum(["text", "image", "document", "photo"]).default("text"),
        meetup_id: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // 1. 저장
        const id = await db.createTelegramUpload({
          meetupId: input.meetup_id,
          uploadedBy: input.from_user,
          telegramMessageId: input.message_id,
          telegramChatId: input.chat_id,
          rawText: input.text,
          rawFileUrl: input.file_url,
          rawFileType: input.file_type,
          status: "pending",
        });

        // 2. LLM으로 자동 파싱
        try {
          const parseResult = await parseTravelInfoWithLLM(input.text || "", input.file_type);
          await db.updateTelegramUpload(id, {
            parsedType: parseResult.type as any,
            parsedData: parseResult.data,
            parsedConfidence: parseResult.confidence,
            parsedSummary: parseResult.summary,
            status: "parsed",
          });
        } catch (e) {
          console.error("[TelegramUpload] LLM parsing failed:", e);
        }

        return { id };
      }),

    // 수동 재파싱
    reparse: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const upload = await db.getTelegramUploadById(input.id);
        if (!upload) throw new TRPCError({ code: "NOT_FOUND" });
        const parseResult = await parseTravelInfoWithLLM(upload.rawText || "", upload.rawFileType || "text");
        await db.updateTelegramUpload(input.id, {
          parsedType: parseResult.type as any,
          parsedData: parseResult.data,
          parsedConfidence: parseResult.confidence,
          parsedSummary: parseResult.summary,
          status: "parsed",
        });
        return { success: true, ...parseResult };
      }),

    // 승인 (백오피스에 적용)
    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        meetupId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const upload = await db.getTelegramUploadById(input.id);
        if (!upload) throw new TRPCError({ code: "NOT_FOUND" });
        if (!upload.parsedData) throw new TRPCError({ code: "BAD_REQUEST", message: "파싱 데이터가 없습니다" });

        let appliedToTable = "";
        let appliedToId = 0;
        const data = upload.parsedData as any;
        const meetupId = input.meetupId || upload.meetupId;

        try {
          switch (upload.parsedType) {
            case "flight": {
              appliedToId = await db.createFlightSchedule({
                meetupId: meetupId || undefined,
                flightNo: data.flightNo || "TBD",
                airline: data.airline,
                departureAirport: data.departureAirport,
                arrivalAirport: data.arrivalAirport,
                scheduledDeparture: data.departureTime ? new Date(data.departureTime) : new Date(),
                scheduledArrival: data.arrivalTime ? new Date(data.arrivalTime) : undefined,
              });
              appliedToTable = "flight_schedules";
              break;
            }
            case "hotel": {
              appliedToId = await db.createAccommodation({
                meetupId: meetupId || undefined,
                hotelName: data.hotelName || "미정",
                roomNumber: data.roomNumber,
                roomType: data.roomType || "twin",
                checkIn: data.checkIn ? new Date(data.checkIn) : undefined,
                checkOut: data.checkOut ? new Date(data.checkOut) : undefined,
                notes: data.notes || `텔레그램 업로드 #${upload.id}에서 자동 생성`,
              });
              appliedToTable = "accommodation_assignments";
              break;
            }
            case "schedule": {
              appliedToId = await db.createScheduleEvent({
                meetupId: meetupId || undefined,
                title: data.title || "일정",
                location: data.location,
                eventTime: data.eventTime ? new Date(data.eventTime) : new Date(),
                endTime: data.endTime ? new Date(data.endTime) : undefined,
                description: data.description || `텔레그램 업로드 #${upload.id}에서 자동 생성`,
              });
              appliedToTable = "schedule_events";
              break;
            }
            default: {
              // general/transfer/unknown → 승인만 표시
              appliedToTable = "none";
              break;
            }
          }
        } catch (e) {
          console.error("[TelegramUpload] Apply failed:", e);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "데이터 적용 실패" });
        }

        await db.updateTelegramUpload(input.id, {
          status: appliedToTable === "none" ? "approved" : "applied",
          appliedToTable: appliedToTable || undefined,
          appliedToId: appliedToId || undefined,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes,
          meetupId: meetupId || undefined,
        });

        return { success: true, appliedToTable, appliedToId };
      }),

    // 거절
    reject: adminProcedure
      .input(z.object({ id: z.number(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateTelegramUpload(input.id, {
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.notes,
        });
        return { success: true };
      }),

    // 삭제
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTelegramUpload(input.id);
        return { success: true };
      }),
  }),

  // ── Community Chat Rooms (커뮤니티 채팅방) ──────────────────
  // ── 사용자 검색 (채팅방 초대용) ─────────────────────
  userSearch: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(async () => {
        const allUsers = await db.getAllUsers();
        return allUsers.map((u: any) => ({ id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl }));
      }),
  }),

  chatRoom: router({
    // 채팅방 목록 (로그인 사용자)
    list: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        roomType: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getChatRooms({ ...input, isActive: true });
      }),

    // 내 채팅방 목록
    myRooms: protectedProcedure.query(async ({ ctx }) => {
      return db.getChatRoomsByUser(ctx.user.id);
    }),

    // 읽지 않은 메시지 수 (모든 방)
    unreadCounts: protectedProcedure.query(async ({ ctx }) => {
      return db.getUnreadCountsForUser(ctx.user.id);
    }),

    // 채팅방 상세
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getChatRoomById(input.id);
      }),

    // 채팅방 생성 (관리자 또는 리더)
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        meetupId: z.number().optional(),
        roomType: z.enum(["general", "announcement", "support", "social", "direct", "group"]).default("general"),
        maxMembers: z.number().default(100),
        memberUserIds: z.array(z.number()).optional(), // 초대할 사용자 ID 목록
        autoTranslate: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        // 일반 채팅방은 관리자만, direct/group은 누구나
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
        if (!isAdmin && input.roomType !== "direct" && input.roomType !== "group") {
          throw new TRPCError({ code: "FORBIDDEN", message: "일반/공지/문의 채팅방은 관리자만 생성할 수 있습니다" });
        }
        const id = await db.createChatRoom({
          name: input.name,
          description: input.description,
          meetupId: input.meetupId,
          roomType: input.roomType,
          maxMembers: input.maxMembers,
          createdBy: ctx.user.id,
          autoTranslate: input.autoTranslate,
        });
        // 생성자를 admin으로 자동 참여
        await db.addChatRoomMember({
          roomId: id,
          userId: ctx.user.id,
          nickname: ctx.user.name || "관리자",
          memberRole: "admin",
        });
        // 초대 멤버 자동 추가
        if (input.memberUserIds && input.memberUserIds.length > 0) {
          for (const uid of input.memberUserIds) {
            if (uid === ctx.user.id) continue; // 생성자 중복 방지
            try {
              await db.addChatRoomMember({
                roomId: id,
                userId: uid,
                nickname: "",
                memberRole: "member",
              });
            } catch {} // 이미 존재하는 멤버 무시
          }
          // 시스템 메시지
          await db.createChatMessage({
            roomId: id,
            userId: ctx.user.id,
            senderName: "시스템",
            content: `${ctx.user.name || "관리자"}님이 ${input.memberUserIds.length}명을 초대했습니다.`,
            messageType: "system",
          });
        }
        return { id };
      }),

    // 멤버 초대 (기존 방에 추가)
    inviteMembers: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        userIds: z.array(z.number()).min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const room = await db.getChatRoomById(input.roomId);
        if (!room) throw new TRPCError({ code: "NOT_FOUND" });
        // 방 생성자 또는 관리자만 초대 가능
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
        if (room.createdBy !== ctx.user.id && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "방 생성자 또는 관리자만 초대할 수 있습니다" });
        }
        let added = 0;
        for (const uid of input.userIds) {
          try {
            await db.addChatRoomMember({
              roomId: input.roomId,
              userId: uid,
              nickname: "",
              memberRole: "member",
            });
            added++;
          } catch {}
        }
        if (added > 0) {
          await db.createChatMessage({
            roomId: input.roomId,
            userId: ctx.user.id,
            senderName: "시스템",
            content: `${added}명이 초대되었습니다.`,
            messageType: "system",
          });
        }
        return { added };
      }),

    // 채팅방 수정
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        roomType: z.enum(["general", "announcement", "support", "social"]).optional(),
        isActive: z.boolean().optional(),
        maxMembers: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateChatRoom(id, data);
        return { success: true };
      }),

    // 채팅방 삭제
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteChatRoom(input.id);
        return { success: true };
      }),

    // 참여
    join: protectedProcedure
      .input(z.object({ roomId: z.number(), nickname: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const room = await db.getChatRoomById(input.roomId);
        if (!room) throw new TRPCError({ code: "NOT_FOUND" });
        if (!room.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "비활성화된 채팅방입니다" });
        const members = await db.getChatRoomMembers(input.roomId);
        if (room.maxMembers && members.length >= room.maxMembers) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "채팅방 정원이 초과되었습니다" });
        }
        const isAdmin = ctx.user.role === "admin" || ctx.user.role === "superadmin";
        const id = await db.addChatRoomMember({
          roomId: input.roomId,
          userId: ctx.user.id,
          nickname: input.nickname || ctx.user.name || "익명",
          memberRole: isAdmin ? "moderator" : "member",
        });
        // 시스템 메시지
        await db.createChatMessage({
          roomId: input.roomId,
          userId: ctx.user.id,
          senderName: "시스템",
          content: `${input.nickname || ctx.user.name || "새 멤버"}님이 참여했습니다.`,
          messageType: "system",
        });
        return { id };
      }),

    // 나가기
    leave: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.removeChatRoomMember(input.roomId, ctx.user.id);
        await db.createChatMessage({
          roomId: input.roomId,
          userId: ctx.user.id,
          senderName: "시스템",
          content: `${ctx.user.name || "멤버"}님이 나갔습니다.`,
          messageType: "system",
        });
        return { success: true };
      }),

    // 멤버 목록
    members: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return db.getChatRoomMembers(input.roomId);
      }),

    // 멤버 관리 (관리자)
    updateMember: adminProcedure
      .input(z.object({
        roomId: z.number(),
        userId: z.number(),
        memberRole: z.enum(["admin", "moderator", "member"]).optional(),
        isMuted: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { roomId, userId, ...data } = input;
        await db.updateChatRoomMember(roomId, userId, data);
        return { success: true };
      }),

    // 멤버 강퇴
    kickMember: adminProcedure
      .input(z.object({ roomId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        await db.removeChatRoomMember(input.roomId, input.userId);
        return { success: true };
      }),
  }),

  // ── Chat Messages (채팅 메시지) ──────────────────────────────
  chatMessage: router({
    // 메시지 목록
    list: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        limit: z.number().default(50),
        before: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const messages = await db.getChatMessages(input.roomId, input.limit, input.before);
        return messages.reverse(); // 오래된 순서로 반환
      }),

    // 메시지 전송
    send: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        content: z.string().min(1).max(5000),
        messageType: z.enum(["text", "image", "file", "announcement", "video", "location", "voice"]).default("text"),
        fileUrl: z.string().optional(),
        fileName: z.string().optional(),
        replyToId: z.number().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        locationName: z.string().optional(),
        originalLang: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 공지 메시지는 관리자만
        if (input.messageType === "announcement" && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "공지 메시지는 관리자만 작성할 수 있습니다" });
        }
        const roleLabel = (ctx.user.role === "admin" || ctx.user.role === "superadmin") ? "admin" : "attendee";
        const id = await db.createChatMessage({
          roomId: input.roomId,
          userId: ctx.user.id,
          senderName: ctx.user.name || "익명",
          senderRole: roleLabel,
          content: input.content,
          messageType: input.messageType,
          fileUrl: input.fileUrl,
          fileName: input.fileName,
          replyToId: input.replyToId,
          latitude: input.latitude?.toString(),
          longitude: input.longitude?.toString(),
          locationName: input.locationName,
          originalLang: input.originalLang,
        });
        // 읽음 처리
        await db.updateChatRoomMember(input.roomId, ctx.user.id, { lastReadAt: new Date() });
        // 텔레그램 알림 전송 (공지 메시지인 경우 또는 관리자 메시지인 경우)
        if (input.messageType === "announcement" || roleLabel === "admin") {
          try {
            const room = await db.getChatRoomById(input.roomId);
            const senderName = ctx.user.name || "관리자";
            const prefix = input.messageType === "announcement" ? "📢 공지" : "💬 새 메시지";
            await sendTelegram(`${prefix} [${room?.name || "채팅방"}]\n👤 ${senderName}: ${input.content.substring(0, 200)}`);
          } catch { /* 텔레그램 알림 실패 무시 */ }
        }
        return { id, shouldNotify: true };
      }),

    // 메시지 수정
    edit: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const msg = await db.getChatMessageById(input.id);
        if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
        if (msg.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.updateChatMessage(input.id, { content: input.content, isEdited: true });
        return { success: true };
      }),

    // 메시지 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const msg = await db.getChatMessageById(input.id);
        if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
        if (msg.userId !== ctx.user.id && ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await db.softDeleteChatMessage(input.id);
        return { success: true };
      }),

    // 읽음 처리
    markRead: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateChatRoomMember(input.roomId, ctx.user.id, { lastReadAt: new Date() });
        return { success: true };
      }),

    // 파일 업로드 (사진/영상/음성/문서)
    uploadFile: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        fileName: z.string(),
        fileData: z.string(), // base64
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const fileKey = `chat/${input.roomId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        let msgType: string = "file";
        if (input.mimeType.startsWith("image/")) msgType = "image";
        else if (input.mimeType.startsWith("video/")) msgType = "video";
        else if (input.mimeType.startsWith("audio/")) msgType = "voice";
        const id = await db.createChatMessage({
          roomId: input.roomId,
          userId: ctx.user.id,
          senderName: ctx.user.name || "익명",
          senderRole: (ctx.user.role === "admin" || ctx.user.role === "superadmin") ? "admin" : "attendee",
          content: input.fileName,
          messageType: msgType as any,
          fileUrl: url,
          fileName: input.fileName,
        });
        return { id, url };
      }),

    // 메시지 번역 (LLM 기반)
    translate: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        targetLang: z.string(), // ko, en, ja, zh, th, vi 등
      }))
      .mutation(async ({ input }) => {
        const msg = await db.getChatMessageById(input.messageId);
        if (!msg || !msg.content) throw new TRPCError({ code: "NOT_FOUND" });
        try {
          const langNames: Record<string, string> = {
            ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese", th: "Thai",
            vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Filipino",
            hi: "Hindi", ar: "Arabic", ru: "Russian", es: "Spanish", fr: "French",
            de: "German", pt: "Portuguese", it: "Italian", tr: "Turkish", pl: "Polish",
            nl: "Dutch", sv: "Swedish", uk: "Ukrainian", cs: "Czech", ro: "Romanian",
            mn: "Mongolian",
          };
          const targetName = langNames[input.targetLang] || input.targetLang;
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are a professional translator. Translate the following message to ${targetName}. Return ONLY the translated text, nothing else.` },
              { role: "user", content: msg.content },
            ],
          });
          const translated = response.choices[0]?.message?.content || msg.content;
          return { translated, originalLang: msg.originalLang || "unknown", targetLang: input.targetLang };
        } catch {
          return { translated: msg.content, originalLang: "unknown", targetLang: input.targetLang };
        }
      }),

    // 텍스트 번역 (직접 입력)
    translateText: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        targetLang: z.string(),
        sourceLang: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const langNames: Record<string, string> = {
            ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese", th: "Thai",
            vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Filipino",
            hi: "Hindi", ar: "Arabic", ru: "Russian", es: "Spanish", fr: "French",
            de: "German", pt: "Portuguese", it: "Italian", tr: "Turkish", pl: "Polish",
            nl: "Dutch", sv: "Swedish", uk: "Ukrainian", cs: "Czech", ro: "Romanian",
            mn: "Mongolian",
          };
          const targetName = langNames[input.targetLang] || input.targetLang;
          const sourceHint = input.sourceLang ? ` from ${langNames[input.sourceLang] || input.sourceLang}` : "";
          const response = await invokeLLM({
            messages: [
              { role: "system", content: `You are a professional translator. Translate the following text${sourceHint} to ${targetName}. Return ONLY the translated text, nothing else.` },
              { role: "user", content: input.text },
            ],
          });
          const translated = response.choices[0]?.message?.content || input.text;
          return { translated, targetLang: input.targetLang };
        } catch {
          return { translated: input.text, targetLang: input.targetLang };
        }
      }),

    // 미디어 갤러리 - 채팅방 내 공유된 미디어 목록
    mediaList: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        mediaType: z.enum(["all", "image", "video", "file"]).default("all"),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const type = input.mediaType === "all" ? undefined : input.mediaType;
        const items = await db.getChatMediaMessages(input.roomId, type, input.limit, input.offset);
        return items;
      }),

    // 미디어 갤러리 - 미디어 수 통계
    mediaCount: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return db.getChatMediaCount(input.roomId);
      }),

    // 메시지 고정 (Pin)
    pin: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const msg = await db.getChatMessageById(input.messageId);
        if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
        // 관리자 또는 방 관리자만 고정 가능
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          const member = (await db.getChatRoomMembers(msg.roomId)).find(m => m.userId === ctx.user.id);
          if (!member || (member.memberRole !== "admin" && member.memberRole !== "moderator")) {
            throw new TRPCError({ code: "FORBIDDEN", message: "관리자 또는 모더레이터만 메시지를 고정할 수 있습니다" });
          }
        }
        await db.pinChatMessage(input.messageId, ctx.user.id);
        // 채팅방의 pinnedMessageId도 업데이트
        await db.updateChatRoom(msg.roomId, { pinnedMessageId: input.messageId });
        return { success: true };
      }),

    // 메시지 고정 해제
    unpin: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const msg = await db.getChatMessageById(input.messageId);
        if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && ctx.user.role !== "superadmin") {
          const member = (await db.getChatRoomMembers(msg.roomId)).find(m => m.userId === ctx.user.id);
          if (!member || (member.memberRole !== "admin" && member.memberRole !== "moderator")) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        await db.unpinChatMessage(input.messageId);
        // 다음 고정 메시지로 업데이트하거나 null
        const remaining = await db.getPinnedMessages(msg.roomId);
        const nextPinned = remaining.find(m => m.id !== input.messageId);
        await db.updateChatRoom(msg.roomId, { pinnedMessageId: nextPinned?.id || null });
        return { success: true };
      }),

    // 고정된 메시지 목록
    pinnedList: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        return db.getPinnedMessages(input.roomId);
      }),
  }),

  //  // ── WebRTC Signaling (시그널링 서버) ──────────────────────────
  webrtc: router({
    // ICE 서버 설정 조회 (TURN 서버 지원)
    getIceServers: protectedProcedure.query(async () => {
      const turnUrl = process.env.TURN_SERVER_URL;
      const turnUser = process.env.TURN_SERVER_USERNAME;
      const turnPass = process.env.TURN_SERVER_CREDENTIAL;

      const servers: { urls: string | string[]; username?: string; credential?: string }[] = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
      ];

      // 커스텀 TURN 서버가 설정된 경우 추가
      if (turnUrl) {
        servers.push({
          urls: turnUrl,
          ...(turnUser && { username: turnUser }),
          ...(turnPass && { credential: turnPass }),
        });
      }

      // 무료 공개 TURN 서버 (폴백)
      servers.push(
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
      );

      return { iceServers: servers };
    }),

    // TURN 서버 설정 저장 (관리자용)
    setTurnConfig: adminProcedure
      .input(z.object({
        turnUrl: z.string().optional(),
        turnUsername: z.string().optional(),
        turnCredential: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 환경변수로 저장 (process.env는 런타임에서 변경 가능)
        if (input.turnUrl !== undefined) process.env.TURN_SERVER_URL = input.turnUrl;
        if (input.turnUsername !== undefined) process.env.TURN_SERVER_USERNAME = input.turnUsername;
        if (input.turnCredential !== undefined) process.env.TURN_SERVER_CREDENTIAL = input.turnCredential;
        return { success: true };
      }),

    // TURN 서버 설정 조회 (관리자용)
    getTurnConfig: adminProcedure.query(async () => {
      return {
        turnUrl: process.env.TURN_SERVER_URL || "",
        turnUsername: process.env.TURN_SERVER_USERNAME || "",
        turnCredential: process.env.TURN_SERVER_CREDENTIAL ? "****" : "",
      };
    }),

    // 통화 시작 (발신)
    initiateCall: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        targetUserId: z.number(),
        callType: z.enum(["voice", "video"]),
        offer: z.string(), // SDP offer (JSON stringified)
      }))
      .mutation(async ({ input, ctx }) => {
        const callId = nanoid(12);
        // 메모리 기반 시그널링 저장소 (서버 최소화 방식)
        if (!(globalThis as any).__webrtcSignals) (globalThis as any).__webrtcSignals = new Map();
        (globalThis as any).__webrtcSignals.set(callId, {
          callId,
          roomId: input.roomId,
          callerId: ctx.user.id,
          callerName: ctx.user.name || "익명",
          targetUserId: input.targetUserId,
          callType: input.callType,
          offer: input.offer,
          answer: null,
          callerCandidates: [],
          answerCandidates: [],
          status: "ringing", // ringing, connected, ended
          createdAt: Date.now(),
        });
        // 30초 후 자동 정리
        setTimeout(() => { (globalThis as any).__webrtcSignals?.delete(callId); }, 60000);
        return { callId };
      }),

    // 통화 응답 (수신)
    answerCall: protectedProcedure
      .input(z.object({
        callId: z.string(),
        answer: z.string(), // SDP answer
      }))
      .mutation(async ({ input, ctx }) => {
        const signal = (globalThis as any).__webrtcSignals?.get(input.callId);
        if (!signal) throw new TRPCError({ code: "NOT_FOUND", message: "통화를 찾을 수 없습니다" });
        if (signal.targetUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        signal.answer = input.answer;
        signal.status = "connected";
        return { success: true };
      }),

    // ICE candidate 추가
    addIceCandidate: protectedProcedure
      .input(z.object({
        callId: z.string(),
        candidate: z.string(), // ICE candidate JSON
        role: z.enum(["caller", "answerer"]),
      }))
      .mutation(async ({ input }) => {
        const signal = (globalThis as any).__webrtcSignals?.get(input.callId);
        if (!signal) throw new TRPCError({ code: "NOT_FOUND" });
        if (input.role === "caller") signal.callerCandidates.push(input.candidate);
        else signal.answerCandidates.push(input.candidate);
        return { success: true };
      }),

    // 통화 상태 폴링 (수신자용)
    pollIncoming: protectedProcedure
      .input(z.object({ roomId: z.number().optional() }))
      .query(async ({ ctx }) => {
        if (!(globalThis as any).__webrtcSignals) return null;
        for (const [, signal] of (globalThis as any).__webrtcSignals) {
          if (signal.targetUserId === ctx.user.id && signal.status === "ringing") {
            return {
              callId: signal.callId,
              callerId: signal.callerId,
              callerName: signal.callerName,
              callType: signal.callType,
              offer: signal.offer,
            };
          }
        }
        return null;
      }),

    // 통화 상태 확인 (발신자용)
    getCallStatus: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .query(async ({ input }) => {
        const signal2 = (globalThis as any).__webrtcSignals?.get(input.callId);
        if (!signal2) return { status: "ended" as const, answer: null, candidates: [] as string[] };
        return {
          status: signal2.status as "ringing" | "connected" | "ended",
          answer: signal2.answer,
          candidates: signal2.answerCandidates,
        };
      }),

    // 발신자 ICE candidates 가져오기 (수신자용)
    getCallerCandidates: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .query(async ({ input }) => {
        const signal3 = (globalThis as any).__webrtcSignals?.get(input.callId);
        if (!signal3) return { candidates: [] as string[] };
        return { candidates: signal3.callerCandidates };
      }),

    // 통화 종료
    endCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input }) => {
        const signal4 = (globalThis as any).__webrtcSignals?.get(input.callId);
        if (signal4) signal4.status = "ended";
        setTimeout(() => { (globalThis as any).__webrtcSignals?.delete(input.callId); }, 5000);
        // 그룹 통화에서도 제거
        const groupStore = (globalThis as any).__groupCalls;
        if (groupStore) {
          for (const [, gc] of groupStore) {
            if (gc.callId === input.callId) {
              gc.status = "ended";
              setTimeout(() => { groupStore.delete(gc.callId); }, 5000);
            }
          }
        }
        return { success: true };
      }),

    // ── 그룹 영상 통화 (Mesh 방식, 3~8명) ──────────────────
    // 그룹 통화 생성
    createGroupCall: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        callType: z.enum(["voice", "video"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const callId = nanoid(12);
        if (!(globalThis as any).__groupCalls) (globalThis as any).__groupCalls = new Map();
        (globalThis as any).__groupCalls.set(callId, {
          callId,
          roomId: input.roomId,
          callType: input.callType,
          hostId: ctx.user.id,
          hostName: ctx.user.name || "익명",
          // 참여자 목록: { userId, name, offers: Map<targetUserId, offer>, answers: Map<fromUserId, answer>, candidates: Map<targetUserId, candidate[]> }
          participants: [{ userId: ctx.user.id, name: ctx.user.name || "익명", joinedAt: Date.now() }],
          // Mesh 시그널링: 각 피어 간 offer/answer/ICE 저장
          peerSignals: new Map<string, any>(), // key: "fromId-toId"
          maxParticipants: 8,
          status: "active",
          createdAt: Date.now(),
        });
        // 5분 후 자동 정리
        setTimeout(() => { (globalThis as any).__groupCalls?.delete(callId); }, 300000);
        return { callId };
      }),

    // 그룹 통화 참여
    joinGroupCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const gc = (globalThis as any).__groupCalls?.get(input.callId);
        if (!gc) throw new TRPCError({ code: "NOT_FOUND", message: "그룹 통화를 찾을 수 없습니다" });
        if (gc.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "통화가 종료되었습니다" });
        if (gc.participants.length >= gc.maxParticipants) throw new TRPCError({ code: "BAD_REQUEST", message: "최대 인원을 초과했습니다" });
        if (!gc.participants.find((p: any) => p.userId === ctx.user.id)) {
          gc.participants.push({ userId: ctx.user.id, name: ctx.user.name || "익명", joinedAt: Date.now() });
        }
        return {
          callType: gc.callType,
          participants: gc.participants.map((p: any) => ({ userId: p.userId, name: p.name })),
        };
      }),

    // 그룹 통화 나가기
    leaveGroupCall: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const gc = (globalThis as any).__groupCalls?.get(input.callId);
        if (!gc) return { success: true };
        gc.participants = gc.participants.filter((p: any) => p.userId !== ctx.user.id);
        // 모든 참여자가 나가면 통화 종료
        if (gc.participants.length === 0) {
          gc.status = "ended";
          setTimeout(() => { (globalThis as any).__groupCalls?.delete(input.callId); }, 5000);
        }
        return { success: true };
      }),

    // Mesh 시그널링: 피어에게 offer 전송
    sendGroupOffer: protectedProcedure
      .input(z.object({
        callId: z.string(),
        targetUserId: z.number(),
        offer: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const gc = (globalThis as any).__groupCalls?.get(input.callId);
        if (!gc) throw new TRPCError({ code: "NOT_FOUND" });
        const key = `${ctx.user.id}-${input.targetUserId}`;
        gc.peerSignals.set(key, {
          fromUserId: ctx.user.id,
          toUserId: input.targetUserId,
          offer: input.offer,
          answer: null,
          fromCandidates: [] as string[],
          toCandidates: [] as string[],
        });
        return { success: true };
      }),

    // Mesh 시그널링: offer에 answer 응답
    sendGroupAnswer: protectedProcedure
      .input(z.object({
        callId: z.string(),
        fromUserId: z.number(),
        answer: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const gc = (globalThis as any).__groupCalls?.get(input.callId);
        if (!gc) throw new TRPCError({ code: "NOT_FOUND" });
        const key = `${input.fromUserId}-${ctx.user.id}`;
        const sig = gc.peerSignals.get(key);
        if (sig) sig.answer = input.answer;
        return { success: true };
      }),

    // Mesh 시그널링: ICE candidate 추가
    addGroupIceCandidate: protectedProcedure
      .input(z.object({
        callId: z.string(),
        targetUserId: z.number(),
        candidate: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const gc = (globalThis as any).__groupCalls?.get(input.callId);
        if (!gc) throw new TRPCError({ code: "NOT_FOUND" });
        // from->to 방향 확인
        const key1 = `${ctx.user.id}-${input.targetUserId}`;
        const key2 = `${input.targetUserId}-${ctx.user.id}`;
        const sig1 = gc.peerSignals.get(key1);
        const sig2 = gc.peerSignals.get(key2);
        if (sig1) sig1.fromCandidates.push(input.candidate);
        else if (sig2) sig2.toCandidates.push(input.candidate);
        return { success: true };
      }),

    // Mesh 시그널링: 내게 온 신호 폴링
    pollGroupSignals: protectedProcedure
      .input(z.object({ callId: z.string() }))
      .query(async ({ input, ctx }) => {
        const gc = (globalThis as any).__groupCalls?.get(input.callId);
        if (!gc) return { participants: [], offers: [], answers: [], candidates: [], status: "ended" as const };
        const myOffers: any[] = [];
        const myAnswers: any[] = [];
        const myCandidates: any[] = [];
        for (const [, sig] of gc.peerSignals) {
          // 내게 온 offer (다른 사람이 나에게 보냈)
          if (sig.toUserId === ctx.user.id && sig.offer && !sig.answer) {
            myOffers.push({ fromUserId: sig.fromUserId, offer: sig.offer });
          }
          // 내 offer에 대한 answer
          if (sig.fromUserId === ctx.user.id && sig.answer) {
            myAnswers.push({ fromUserId: sig.toUserId, answer: sig.answer });
          }
          // 내게 온 ICE candidates
          if (sig.fromUserId === ctx.user.id && sig.toCandidates.length > 0) {
            myCandidates.push({ fromUserId: sig.toUserId, candidates: sig.toCandidates });
          }
          if (sig.toUserId === ctx.user.id && sig.fromCandidates.length > 0) {
            myCandidates.push({ fromUserId: sig.fromUserId, candidates: sig.fromCandidates });
          }
        }
        return {
          participants: gc.participants.map((p: any) => ({ userId: p.userId, name: p.name })),
          offers: myOffers,
          answers: myAnswers,
          candidates: myCandidates,
          status: gc.status as "active" | "ended",
        };
      }),

    // 그룹 통화 상태 확인 (방 내 활성 그룹 통화 조회)
    getActiveGroupCall: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        if (!(globalThis as any).__groupCalls) return null;
        for (const [, gc] of (globalThis as any).__groupCalls) {
          if (gc.roomId === input.roomId && gc.status === "active") {
            return {
              callId: gc.callId,
              callType: gc.callType,
              hostName: gc.hostName,
              participantCount: gc.participants.length,
              maxParticipants: gc.maxParticipants,
            };
          }
        }
        return null;
      }),
  }),
});

// ── LLM 여행정보 파싱 헬퍼 ──────────────────────────────────
async function parseTravelInfoWithLLM(text: string, fileType: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a travel information parser. Analyze the given text and extract structured travel data.
Return JSON with the following structure:
{
  "type": "flight" | "hotel" | "schedule" | "transfer" | "general" | "unknown",
  "confidence": 0-100,
  "summary": "brief Korean summary of the content",
  "data": {
    // For flight: flightNo, airline, departureAirport, arrivalAirport, departureTime (ISO), arrivalTime (ISO), terminal, gate, notes
    // For hotel: hotelName, address, roomNumber, roomType, checkIn (ISO), checkOut (ISO), notes
    // For schedule: title, location, eventTime (ISO), endTime (ISO), description
    // For transfer: vehicleType, pickupLocation, pickupTime (ISO), driverName, driverPhone, notes
    // For general/unknown: content, notes
  }
}
Always respond in valid JSON only.`,
        },
        {
          role: "user",
          content: `Parse this travel information (source: ${fileType}):\n\n${text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return {
        type: parsed.type || "unknown",
        confidence: parsed.confidence || 50,
        summary: parsed.summary || "파싱 완료",
        data: parsed.data || {},
      };
    }
    return { type: "unknown", confidence: 0, summary: "파싱 실패", data: {} };
  } catch (e) {
    console.error("[LLM Parse] Error:", e);
    return { type: "unknown", confidence: 0, summary: "LLM 파싱 오류", data: {} };
  }
}

export type AppRouter = typeof appRouter;
