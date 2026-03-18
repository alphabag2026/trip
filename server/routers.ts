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

// Admin guard
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "관리자 권한이 필요합니다" });
  return next({ ctx });
});

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
        title: z.string().min(1),
        type: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup"),
        locationType: z.enum(["domestic", "overseas"]).default("domestic"),
        destinationCountry: z.string().optional(),
        location: z.string().optional(),
        scheduleStart: z.string().optional(),
        scheduleEnd: z.string().optional(),
        description: z.string().optional(),
        maxParticipants: z.number().optional(),
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
        id: z.number(),
        title: z.string().optional(),
        type: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).optional(),
        locationType: z.enum(["domestic", "overseas"]).optional(),
        destinationCountry: z.string().optional(),
        location: z.string().optional(),
        scheduleStart: z.string().optional(),
        scheduleEnd: z.string().optional(),
        description: z.string().optional(),
        maxParticipants: z.number().optional(),
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
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteMeetup(input.id); return { success: true }; }),
  }),

  // ── Registrations ────────────────────────────────
  registration: router({
    list: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        locationType: z.string().optional(),
        meetupId: z.number().optional(),
        search: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getRegistrations(input)),
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getRegistrationById(input.id)),
    stats: adminProcedure.query(() => db.getRegistrationStats()),
    create: publicProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        name: z.string().min(1),
        phone: z.string().min(1),
        messengerId: z.string().min(1),
        locationType: z.enum(["domestic", "overseas"]).default("domestic"),
        scheduleStart: z.string().optional(),
        scheduleEnd: z.string().optional(),
        walletAddress: z.string().optional(),
        referrerName: z.string().optional(),
        teamName: z.string().optional(),
        teamIntro: z.string().optional(),
        notes: z.string().optional(),
        roommatePreference: z.string().optional(),
        category: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup"),
        customCategory: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createRegistration({
          ...input,
          scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : undefined,
          scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : undefined,
        });
        // Try sending telegram notification
        try {
          const config = await db.getTelegramConfig();
          if (config?.enabled && config.botToken && config.chatId) {
            const locationLabel = input.locationType === "overseas" ? "해외" : "내륙";
            const schedule = input.scheduleStart
              ? (input.scheduleEnd ? `${input.scheduleStart} ~ ${input.scheduleEnd}` : input.scheduleStart)
              : "미정";
            const message = `[${locationLabel}] ${input.name} / ${schedule} / ${input.phone} / ${input.messengerId} / ${input.notes || "-"} / ${input.referrerName || "-"}`;
            await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: config.chatId, text: `📋 새 밋업 신청\n${message}` }),
            });
            await db.updateRegistration(id, { telegramNotified: true });
          }
        } catch (e) { console.error("[Telegram] Failed to send notification:", e); }
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "approved", "rejected", "completed"]).optional(),
        category: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).optional(),
        customCategory: z.string().optional(),
        immigrationAssist: z.enum(["self", "agency", "pending"]).optional(),
        notes: z.string().optional(),
        passportOcrData: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateRegistration(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteRegistration(input.id); return { success: true }; }),

    // 여권 이미지 업로드
    uploadPassport: publicProcedure
      .input(z.object({ registrationId: z.number(), imageBase64: z.string(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `passports/${input.registrationId}-${nanoid(8)}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await db.updateRegistration(input.registrationId, { passportImageUrl: url });
        return { url };
      }),

    // 여권 OCR (LLM 기반)
    ocrPassport: adminProcedure
      .input(z.object({ registrationId: z.number() }))
      .mutation(async ({ input }) => {
        const reg = await db.getRegistrationById(input.registrationId);
        if (!reg?.passportImageUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "여권 이미지가 없습니다" });
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a passport OCR system. Extract the following fields from the passport image and return as JSON: fullName, passportNumber, nationality, dateOfBirth (YYYY-MM-DD), expiryDate (YYYY-MM-DD), gender (M/F), issuingCountry. Return ONLY valid JSON." },
            { role: "user", content: [
              { type: "text", text: "Extract passport information from this image:" },
              { type: "image_url", image_url: { url: reg.passportImageUrl, detail: "high" } },
            ]},
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const ocrText = typeof rawContent === "string" ? rawContent : "{}";
        let ocrData;
        try {
          const jsonMatch = ocrText.match(/\{[\s\S]*\}/);
          ocrData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch { ocrData = { raw: ocrText }; }
        await db.updateRegistration(input.registrationId, { passportOcrData: ocrData });
        return { ocrData };
      }),

    // 이름+전화번호로 조회 (공개)
    lookup: publicProcedure
      .input(z.object({ name: z.string().min(1), phone: z.string().min(1) }))
      .query(({ input }) => db.getRegistrationByNameAndPhone(input.name, input.phone)),

    // 엑셀 다운로드용 전체 데이터
    exportData: adminProcedure
      .input(z.object({
        category: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(({ input }) => db.getRegistrations(input)),
  }),

  // ── Travel Info ──────────────────────────────────
  travelInfo: router({
    list: publicProcedure.query(() => db.getTravelInfoList()),
    getByCountry: publicProcedure
      .input(z.object({ countryCode: z.string() }))
      .query(({ input }) => db.getTravelInfoByCountry(input.countryCode)),
    upsert: adminProcedure
      .input(z.object({
        countryCode: z.string().min(1),
        countryName: z.string().min(1),
        countryNameKo: z.string().optional(),
        requiredItems: z.array(z.string()).optional(),
        immigrationUrl: z.string().optional(),
        immigrationNotes: z.string().optional(),
        visaRequired: z.boolean().optional(),
        visaNotes: z.string().optional(),
        emergencyContact: z.string().optional(),
        timezone: z.string().optional(),
        currency: z.string().optional(),
        language: z.string().optional(),
        plugType: z.string().optional(),
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => { await db.upsertTravelInfo(input); return { success: true }; }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteTravelInfo(input.id); return { success: true }; }),
  }),

  // ── Itineraries ──────────────────────────────────
  itinerary: router({
    list: adminProcedure.query(() => db.getAllItineraries()),
    getByRegistration: publicProcedure
      .input(z.object({ registrationId: z.number() }))
      .query(({ input }) => db.getItinerariesByRegistration(input.registrationId)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getItineraryById(input.id)),
    create: adminProcedure
      .input(z.object({
        registrationId: z.number(),
        title: z.string().min(1),
        departureFlightNo: z.string().optional(),
        departureAirport: z.string().optional(),
        departureTime: z.string().optional(),
        arrivalFlightNo: z.string().optional(),
        arrivalAirport: z.string().optional(),
        arrivalTime: z.string().optional(),
        returnFlightNo: z.string().optional(),
        returnDepartureAirport: z.string().optional(),
        returnDepartureTime: z.string().optional(),
        returnArrivalAirport: z.string().optional(),
        returnArrivalTime: z.string().optional(),
        hotelName: z.string().optional(),
        hotelAddress: z.string().optional(),
        hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(),
        scheduleDetails: z.any().optional(),
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
        id: z.number(),
        title: z.string().optional(),
        departureFlightNo: z.string().optional(),
        departureAirport: z.string().optional(),
        departureTime: z.string().optional(),
        arrivalFlightNo: z.string().optional(),
        arrivalAirport: z.string().optional(),
        arrivalTime: z.string().optional(),
        returnFlightNo: z.string().optional(),
        returnDepartureAirport: z.string().optional(),
        returnDepartureTime: z.string().optional(),
        returnArrivalAirport: z.string().optional(),
        returnArrivalTime: z.string().optional(),
        hotelName: z.string().optional(),
        hotelAddress: z.string().optional(),
        hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(),
        scheduleDetails: z.any().optional(),
        sentViaWeb: z.boolean().optional(),
        sentViaMessenger: z.boolean().optional(),
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
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteItinerary(input.id); return { success: true }; }),
  }),

  // ── Telegram Config ──────────────────────────────
  telegram: router({
    getConfig: adminProcedure.query(() => db.getTelegramConfig()),
    updateConfig: adminProcedure
      .input(z.object({
        botToken: z.string().optional(),
        chatId: z.string().optional(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => { await db.upsertTelegramConfig(input); return { success: true }; }),
    testSend: adminProcedure.mutation(async () => {
      const config = await db.getTelegramConfig();
      if (!config?.botToken || !config?.chatId) throw new TRPCError({ code: "BAD_REQUEST", message: "텔레그램 설정이 없습니다" });
      const res = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: config.chatId, text: "✅ 텔레그램 연동 테스트 메시지입니다." }),
      });
      const data = await res.json();
      if (!data.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: data.description || "전송 실패" });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
