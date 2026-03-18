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

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다" });
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
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createMeetup({
          ...input,
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
          const message = `📋 새 밋업 신청\n[${locationLabel}] ${input.name} / ${schedule} / ${input.phone} / ${input.messengerId} / ${input.notes || "-"} / ${input.referrerName || "-"}`;
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
});

export type AppRouter = typeof appRouter;
