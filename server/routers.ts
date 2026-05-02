import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import * as excel from "./excel";
import { invokeLLM } from "./_core/llm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { sdk } from "./_core/sdk";
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from "./email";
import { generateDemoHotels, generateDemoFlights } from "./demoTravelData";
import { generateDemoRideOptions, generateDemoRestaurants, calculateDeliveryPricing, SUPPORTED_CITIES, FOOD_CATEGORIES } from "./demoRideDeliveryData";
import { sendPushToAdmins, sendPushToUsers, sendPushToMeetupParticipants, sendPushToChatRoomMembers } from "./webPushHelper";
import { mystiflyClient, cabinClassToMystifly, type MystiflyFlight, type MystiflyBookingParams } from "./mystiflyClient";
import {
  generateFlightSearchLinks,
  generateHotelSearchLinks,
  getAirportInfo,
  AIRPORT_MAP,
  type AffiliateConfig,
  type FlightSearchParams,
  type HotelSearchParams,
} from "./affiliateHelper";

// adminProcedure: admin, superadmin, organizer 모두 접근 가능 (행사 운영 메뉴)
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "superadmin", "organizer"];
  if (!allowed.includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "관리자 또는 행사주최자 권한이 필요합니다" });
  return next({ ctx });
});

// superadminProcedure: admin, superadmin만 접근 가능 (플랫폼 관리 메뉴)
const superadminProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "superadmin"];
  if (!allowed.includes(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "슈퍼관리자 권한이 필요합니다" });
  return next({ ctx });
});

// ── MRZ Parser & Check Digit Validator (ICAO 9303) ──────────────────────────
function mrzCharValue(ch: string): number {
  if (ch === '<') return 0;
  const code = ch.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 65 && code <= 90) return code - 55; // A=10, B=11, ..., Z=35
  return 0;
}

function mrzCheckDigit(data: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += mrzCharValue(data[i]) * weights[i % 3];
  }
  return sum % 10;
}

function mrzDateToISO(yymmdd: string): string | null {
  if (!yymmdd || yymmdd.length !== 6 || yymmdd.includes('<')) return null;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const year = yy > 50 ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

function parseMrzLine1(line1: string): { surname: string; givenNames: string; issuingCountry: string } {
  const docType = line1.substring(0, 2);
  const issuingCountry = line1.substring(2, 5).replace(/</g, '');
  const nameField = line1.substring(5).replace(/<+$/, '');
  const nameParts = nameField.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts[1] || '').replace(/</g, ' ').trim();
  return { surname, givenNames, issuingCountry };
}

function parseMrzLine2(line2: string): {
  passportNumber: string | null;
  passportNumberValid: boolean;
  nationality: string;
  dateOfBirth: string | null;
  dobValid: boolean;
  gender: string;
  expiryDate: string | null;
  expiryValid: boolean;
  overallValid: boolean;
  allChecksValid: boolean;
} {
  // TD3: 44 characters
  const passportNumRaw = line2.substring(0, 9);
  const passportCheckDigit = parseInt(line2[9], 10);
  const nationality = line2.substring(10, 13).replace(/</g, '');
  const dobRaw = line2.substring(13, 19);
  const dobCheckDigit = parseInt(line2[19], 10);
  const gender = line2[20] === '<' ? '' : line2[20];
  const expiryRaw = line2.substring(21, 27);
  const expiryCheckDigit = parseInt(line2[27], 10);
  const personalNum = line2.substring(28, 42);
  const personalCheckDigit = line2[42];
  const overallCheckDigit = parseInt(line2[43], 10);

  // Validate check digits
  const calcPassportCheck = mrzCheckDigit(passportNumRaw);
  const passportNumberValid = calcPassportCheck === passportCheckDigit;
  const calcDobCheck = mrzCheckDigit(dobRaw);
  const dobValid = calcDobCheck === dobCheckDigit;
  const calcExpiryCheck = mrzCheckDigit(expiryRaw);
  const expiryValid = calcExpiryCheck === expiryCheckDigit;
  
  // Overall check digit: over pos 1-10, 14-20, 22-43 (0-indexed: 0-9, 13-19, 21-42)
  const overallData = line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43);
  const calcOverallCheck = mrzCheckDigit(overallData);
  const overallValid = calcOverallCheck === overallCheckDigit;

  const passportNumber = passportNumRaw.replace(/</g, '').trim() || null;
  const dateOfBirth = mrzDateToISO(dobRaw);
  const expiryDate = mrzDateToISO(expiryRaw);

  return {
    passportNumber,
    passportNumberValid,
    nationality,
    dateOfBirth,
    dobValid,
    gender,
    expiryDate,
    expiryValid,
    overallValid,
    allChecksValid: passportNumberValid && dobValid && expiryValid && overallValid,
  };
}

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
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, totpSecret, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // ── Email/Password Login ──
    emailLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다" });
        }
        // Check if 2FA is enabled
        if (user.totpEnabled && user.totpSecret) {
          return { requires2FA: true, userId: user.id } as const;
        }
        // No 2FA - create session directly
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        return { requires2FA: false, success: true } as const;
      }),
    // ── 2FA Verify (after email login) ──
    verify2FA: publicProcedure
      .input(z.object({ userId: z.number(), token: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(input.userId);
        if (!user || !user.totpSecret) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "사용자를 찾을 수 없습니다" });
        }
        const totp = new OTPAuth.TOTP({ issuer: "AlphaTrip", label: user.email || "user", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(user.totpSecret) });
        const delta = totp.validate({ token: input.token, window: 1 });
        if (delta === null) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "인증 코드가 올바르지 않습니다" });
        }
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        return { success: true } as const;
      }),
    // ── Setup 2FA (generate secret + QR) ──
    setup2FA: protectedProcedure.mutation(async ({ ctx }) => {
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({ issuer: "AlphaTrip", label: ctx.user.email || ctx.user.name || "user", algorithm: "SHA1", digits: 6, period: 30, secret });
      const uri = totp.toString();
      const qrDataUrl = await QRCode.toDataURL(uri);
      // Save secret temporarily (not enabled yet until confirmed)
      await db.updateUserTotp(ctx.user.id, secret.base32, false);
      return { secret: secret.base32, qrDataUrl, uri } as const;
    }),
    // ── Confirm 2FA (verify first code to enable) ──
    confirm2FA: protectedProcedure
      .input(z.object({ token: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.totpSecret) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA 설정이 시작되지 않았습니다" });
        }
        const totp = new OTPAuth.TOTP({ issuer: "AlphaTrip", label: user.email || "user", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(user.totpSecret) });
        const delta = totp.validate({ token: input.token, window: 1 });
        if (delta === null) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "인증 코드가 올바르지 않습니다. 다시 시도해주세요." });
        }
        await db.updateUserTotp(ctx.user.id, user.totpSecret, true);
        return { success: true } as const;
      }),
    // ── Disable 2FA ──
    disable2FA: protectedProcedure
      .input(z.object({ token: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.totpSecret || !user.totpEnabled) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "2FA가 활성화되어 있지 않습니다" });
        }
        const totp = new OTPAuth.TOTP({ issuer: "AlphaTrip", label: user.email || "user", algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(user.totpSecret) });
        const delta = totp.validate({ token: input.token, window: 1 });
        if (delta === null) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "인증 코드가 올바르지 않습니다" });
        }
        await db.updateUserTotp(ctx.user.id, null, false);
        return { success: true } as const;
      }),
    // ── Email Register ──
    emailRegister: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
        accountType: z.enum(["personal", "organizer", "agency", "partner"]).default("personal"),
        organizationName: z.string().optional(),
        // Organizer-specific fields
        contactPhone: z.string().optional(),
        businessRegistration: z.string().optional(),
        businessType: z.string().optional(),
        companyAddress: z.string().optional(),
        companyWebsite: z.string().optional(),
        companyDescription: z.string().optional(),
        industryCategory: z.string().optional(),
        employeeCount: z.number().optional(),
        foundedYear: z.number().optional(),
        eventExperience: z.string().optional(),
        expectedEventsPerYear: z.number().optional(),
        targetRegions: z.string().optional(),
        teamSize: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if email already exists
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "이미 등록된 이메일입니다" });
        }
        const hash = await bcrypt.hash(input.password, 12);
        // Map accountType to role
        const roleMap: Record<string, "user" | "organizer" | "agency" | "partner"> = {
          personal: "user",
          organizer: "organizer",
          agency: "agency",
          partner: "partner",
        };
        const role = roleMap[input.accountType] || "user";
        const user = await db.createUserWithPassword({
          email: input.email,
          name: input.name,
          passwordHash: hash,
          role,
        });
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "회원가입에 실패했습니다" });
        }
        // If organizer/agency/partner, create organization + company info
        if (input.accountType !== "personal" && input.organizationName) {
          try {
            const orgType = input.accountType === "organizer" ? "organizer" as const :
                            input.accountType === "agency" ? "agency" as const : "partner" as const;
            const orgResult = await db.createOrganization({
              name: input.organizationName,
              type: orgType,
              contactEmail: input.email,
              contactName: input.name,
              contactPhone: input.contactPhone || undefined,
              description: input.companyDescription || undefined,
              website: input.companyWebsite || undefined,
            });
            if (orgResult && orgResult.id) {
              await db.addOrganizationMember({ organizationId: orgResult.id, userId: user.id, memberRole: "owner" });
              // Update user's organizationId
              const dbInstance = await db.getDb();
              if (dbInstance) {
                const { users: usersTable, companyInfo: companyInfoTable } = await import("../drizzle/schema");
                const { eq: eqOp } = await import("drizzle-orm");
                await dbInstance.update(usersTable).set({ organizationId: orgResult.id }).where(eqOp(usersTable.id, user.id));
                // Save company info
                await dbInstance.insert(companyInfoTable).values({
                  organizationId: orgResult.id,
                  companyName: input.organizationName,
                  businessRegistration: input.businessRegistration || null,
                  businessType: input.businessType || null,
                  address: input.companyAddress || null,
                  contactPerson: input.name,
                  contactPhone: input.contactPhone || null,
                  contactEmail: input.email,
                  website: input.companyWebsite || null,
                  description: input.companyDescription || null,
                  industryCategory: input.industryCategory || null,
                  employeeCount: input.employeeCount || null,
                  foundedYear: input.foundedYear || null,
                }).onDuplicateKeyUpdate({ set: { companyName: input.organizationName } });
              }
            }
          } catch (orgErr) {
            console.error("[Register] Failed to create organization:", orgErr);
          }
        }
        // If organizer/agency/partner, create approval request (pending)
        if (input.accountType !== "personal") {
          try {
            await db.createOrganizerApproval({
              userId: user.id,
              userName: input.name,
              userEmail: input.email,
              userRole: input.accountType as "organizer" | "agency" | "partner",
              organizationName: input.organizationName || null,
              businessNumber: input.businessRegistration || null,
              businessType: input.businessType || null,
              experience: input.eventExperience || null,
              teamSize: input.teamSize ? String(input.teamSize) : null,
              status: "pending",
            });
          } catch (approvalErr) {
            console.error("[Register] Failed to create approval:", approvalErr);
          }
        }
        // Auto-verify email on registration (skip email verification step)
        try {
          await db.setUserEmailVerified(user.id, true);
          await db.updateOnboardingStep(user.id, "emailVerified", true);
        } catch (e) {
          console.error("[Register] Auto email verify failed:", e);
        }
        // Auto-login after registration
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, role } as const;
      }),
    // ── Change Password ──
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "비밀번호 로그인 사용자가 아닙니다" });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "현재 비밀번호가 올바르지 않습니다" });
        }
        const hash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(ctx.user.id, hash);
        return { success: true } as const;
      }),
    // ── Email Verification ──
    sendVerificationEmail: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이메일이 등록되지 않았습니다" });
        }
        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        await db.createEmailVerificationToken(user.id, token, expiresAt);
        const verifyUrl = `${input.origin}/verify-email?token=${token}`;
        // Send via Resend
        const { subject, html } = buildVerificationEmail({
          userName: user.name || user.email,
          verifyUrl,
          expiresIn: "24시간",
        });
        const emailResult = await sendEmail({ to: user.email, subject, html });
        if (!emailResult.success) {
          console.warn("[Email] Verification email failed, falling back to notifyOwner");
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `이메일 인증 요청 - ${user.email}`,
            content: `사용자 ${user.name || user.email}님이 이메일 인증을 요청했습니다.\n인증 링크: ${verifyUrl}\n만료: ${expiresAt.toISOString()}`,
          });
        }
        return { success: true, message: "인증 이메일이 발송되었습니다. 이메일을 확인해주세요." } as const;
      }),
    verifyEmail: publicProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        const tokenRecord = await db.getEmailVerificationToken(input.token);
        if (!tokenRecord) {
          throw new TRPCError({ code: "NOT_FOUND", message: "유효하지 않은 인증 링크입니다" });
        }
        if (tokenRecord.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 사용된 인증 링크입니다" });
        }
        if (new Date() > tokenRecord.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 인증 링크입니다. 다시 요청해주세요." });
        }
        await db.markEmailVerificationUsed(tokenRecord.id);
        await db.updateOnboardingStep(tokenRecord.userId, "emailVerified", true);
        // Also update users table emailVerified flag
        await db.setUserEmailVerified(tokenRecord.userId, true);
        return { success: true, message: "이메일이 성공적으로 인증되었습니다" } as const;
      }),
    // ── Password Reset ──
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string() }))
      .mutation(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        if (!user) {
          // Don't reveal if email exists or not
          return { success: true, message: "해당 이메일로 비밀번호 재설정 링크를 발송했습니다" } as const;
        }
        const token = nanoid(48);
        const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1h
        await db.createPasswordResetToken(user.id, token, expiresAt);
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        // Send via Resend
        const { subject, html } = buildPasswordResetEmail({
          userName: user.name || user.email || "User",
          resetUrl,
          expiresIn: "1시간",
        });
        const emailResult = await sendEmail({ to: user.email!, subject, html });
        if (!emailResult.success) {
          console.warn("[Email] Password reset email failed, falling back to notifyOwner");
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `비밀번호 재설정 요청 - ${user.email}`,
            content: `사용자 ${user.name || user.email}님이 비밀번호 재설정을 요청했습니다.\n재설정 링크: ${resetUrl}\n만료: ${expiresAt.toISOString()}`,
          });
        }
        return { success: true, message: "해당 이메일로 비밀번호 재설정 링크를 발송했습니다" } as const;
      }),
    validateResetToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const tokenRecord = await db.getPasswordResetToken(input.token);
        if (!tokenRecord || tokenRecord.usedAt || new Date() > tokenRecord.expiresAt) {
          return { valid: false } as const;
        }
        const user = await db.getUserById(tokenRecord.userId);
        return { valid: true, email: user?.email || "" } as const;
      }),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const tokenRecord = await db.getPasswordResetToken(input.token);
        if (!tokenRecord) {
          throw new TRPCError({ code: "NOT_FOUND", message: "유효하지 않은 재설정 링크입니다" });
        }
        if (tokenRecord.usedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 사용된 재설정 링크입니다" });
        }
        if (new Date() > tokenRecord.expiresAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "만료된 재설정 링크입니다. 다시 요청해주세요." });
        }
        const hash = await bcrypt.hash(input.newPassword, 12);
        await db.updateUserPassword(tokenRecord.userId, hash);
        await db.markPasswordResetUsed(tokenRecord.id);
        return { success: true, message: "비밀번호가 성공적으로 변경되었습니다" } as const;
      }),
    // ── Onboarding Progress ──
    getOnboardingProgress: protectedProcedure
      .query(async ({ ctx }) => {
        const progress = await db.getOnboardingProgress(ctx.user.id);
        if (!progress) {
          // Auto-create progress record
          await db.createOrUpdateOnboardingProgress(ctx.user.id, {});
          return {
            emailVerified: false,
            profileCompleted: false,
            firstMeetupJoined: false,
            passportRegistered: false,
            firstBooking: false,
            orgSetupCompleted: false,
            firstMeetupCreated: false,
          };
        }
        return {
          emailVerified: progress.emailVerified,
          profileCompleted: progress.profileCompleted,
          firstMeetupJoined: progress.firstMeetupJoined,
          passportRegistered: progress.passportRegistered,
          firstBooking: progress.firstBooking,
          orgSetupCompleted: progress.orgSetupCompleted,
          firstMeetupCreated: progress.firstMeetupCreated,
        };
      }),
    updateOnboardingStep: protectedProcedure
      .input(z.object({ step: z.string(), value: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        await db.updateOnboardingStep(ctx.user.id, input.step, input.value);
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
        invitedCountries: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 프로젝트 코드 자동 생성 (예: 104.340.300)
        const genCode = () => {
          const p = () => Math.floor(Math.random() * 900 + 100);
          return `${p()}.${p()}.${p()}`;
        };
        const projectCode = genCode();
        const shareToken = nanoid(16);
        const id = await db.createMeetup({
          ...input,
          baggageNotice: input.baggageNotice || "초과화물은 직접부담할 수 있습니다.",
          scheduleStart: input.scheduleStart ? new Date(input.scheduleStart) : undefined,
          scheduleEnd: input.scheduleEnd ? new Date(input.scheduleEnd) : undefined,
          createdBy: ctx.user.id,
          projectCode,
          shareToken,
          invitedCountries: input.invitedCountries || [],
        });

        // 전용 채팅방 자동 생성 (공지 / 일반 / 문의)
        const defaultRooms = [
          { name: `📢 ${input.title} - 공지`, roomType: "announcement" as const, description: "밋업 공지사항을 안내하는 채널입니다." },
          { name: `💬 ${input.title} - 일반`, roomType: "general" as const, description: "참가자들의 자유로운 소통 채널입니다." },
          { name: `❓ ${input.title} - 문의`, roomType: "support" as const, description: "밋업 관련 문의사항을 남기는 채널입니다." },
        ];
        for (const room of defaultRooms) {
          try {
            const roomId = await db.createChatRoom({
              meetupId: id,
              name: room.name,
              roomType: room.roomType,
              description: room.description,
              createdBy: ctx.user.id,
              autoTranslate: true,
            });
            // 생성자를 admin으로 자동 참여
            await db.addChatRoomMember({ roomId, userId: ctx.user.id, memberRole: "admin" });
          } catch (e) { /* 채팅방 생성 실패해도 밋업 생성은 성공 */ }
        }

        return { id, projectCode, shareToken };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(), title: z.string().optional(),
        type: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).optional(),
        locationType: z.enum(["domestic", "overseas"]).optional(),
        destinationCountry: z.string().optional(), location: z.string().optional(),
        scheduleStart: z.string().optional(), scheduleEnd: z.string().optional(),
        description: z.string().optional(), maxParticipants: z.number().optional(),
        status: z.enum(["draft", "open", "closed", "completed", "cancelled"]).optional(),
        baggageNotice: z.string().optional(),
        invitedCountries: z.array(z.string()).optional(),
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
    // 밋업 취소 (cancelled 상태로 변경 + 공지 채널에 취소 메시지 전송)
    cancel: adminProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const meetup = await db.getMeetupById(input.id);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        await db.updateMeetup(input.id, { status: "cancelled" });
        // 공지 채널에 취소 메시지 자동 전송
        try {
          const rooms = await db.getChatRooms({ meetupId: input.id, isActive: true });
          const announcementRoom = rooms.find((r: any) => r.roomType === "announcement");
          if (announcementRoom) {
            await db.createChatMessage({
              roomId: announcementRoom.id,
              userId: ctx.user.id,
              senderName: ctx.user.name || "관리자",
              senderRole: "admin",
              content: `⚠️ [밋업 취소 안내]\n\n"${meetup.title}" 밋업이 취소되었습니다.${input.reason ? `\n\n사유: ${input.reason}` : ""}\n\n불편을 드려 죄송합니다.`,
              messageType: "announcement",
            });
          }
          // 텔레그램 알림
          await sendTelegram(`⚠️ 밋업 취소: ${meetup.title}${input.reason ? ` (사유: ${input.reason})` : ""}`);
        } catch (e) { console.error("[MeetupCancel] Notification failed:", e); }
        return { success: true };
      }),
    // 참가자에게 공지 보내기 (밋업의 공지 채널에 메시지 전송)
    sendAnnouncement: adminProcedure
      .input(z.object({ meetupId: z.number(), title: z.string().min(1), content: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const meetup = await db.getMeetupById(input.meetupId);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        // 공지 채널 찾기
        const rooms = await db.getChatRooms({ meetupId: input.meetupId, isActive: true });
        const announcementRoom = rooms.find((r: any) => r.roomType === "announcement");
        if (!announcementRoom) throw new TRPCError({ code: "NOT_FOUND", message: "공지 채널이 없습니다. 밋업에 공지 채널을 먼저 생성해주세요." });
        // 공지 메시지 전송
        const msgId = await db.createChatMessage({
          roomId: announcementRoom.id,
          userId: ctx.user.id,
          senderName: ctx.user.name || "관리자",
          senderRole: "admin",
          content: `📢 ${input.title}\n\n${input.content}`,
          messageType: "announcement",
        });
        // 텔레그램 알림
        try {
          await sendTelegram(`📢 공지 [${meetup.title}]\n${input.title}\n${input.content.substring(0, 200)}`);
        } catch { /* ignore */ }
        return { success: true, messageId: msgId };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => { await db.deleteMeetup(input.id); return { success: true }; }),
    // 공유 토큰으로 밋업 조회 (비로그인 가능)
    getByShareToken: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const meetup = await db.getMeetupByShareToken(input.token);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        return meetup;
      }),
    // 프로젝트 코드로 밋업 조회 (비로그인 가능)
    getByProjectCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        const meetup = await db.getMeetupByProjectCode(input.code);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        return meetup;
      }),
    // 밋업 복제 (Clone)
    clone: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const original = await db.getMeetupById(input.id);
        if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        const genCode = () => {
          const p = () => Math.floor(Math.random() * 900 + 100);
          return `${p()}.${p()}.${p()}`;
        };
        const projectCode = genCode();
        const shareToken = nanoid(16);
        const newTitle = `${original.title} (복사본)`;
        const id = await db.createMeetup({
          title: newTitle,
          type: original.type || "meetup",
          locationType: original.locationType || "domestic",
          destinationCountry: original.destinationCountry || undefined,
          location: original.location || undefined,
          description: original.description || undefined,
          maxParticipants: original.maxParticipants || undefined,
          baggageNotice: original.baggageNotice || "초과화물은 직접부담할 수 있습니다.",
          invitedCountries: original.invitedCountries || [],
          createdBy: ctx.user.id,
          projectCode,
          shareToken,
          status: "draft",
        });
        // 전용 채팅방 자동 생성
        const defaultRooms = [
          { name: `📢 ${newTitle} - 공지`, roomType: "announcement" as const, description: "밋업 공지사항을 안내하는 채널입니다." },
          { name: `💬 ${newTitle} - 일반`, roomType: "general" as const, description: "참가자들의 자유로운 소통 채널입니다." },
          { name: `❓ ${newTitle} - 문의`, roomType: "support" as const, description: "밋업 관련 문의사항을 남기는 채널입니다." },
        ];
        for (const room of defaultRooms) {
          try {
            const roomId = await db.createChatRoom({
              meetupId: id, name: room.name, roomType: room.roomType,
              description: room.description, createdBy: ctx.user.id, autoTranslate: true,
            });
            await db.addChatRoomMember({ roomId, userId: ctx.user.id, memberRole: "admin" });
          } catch (e) { /* ignore */ }
        }
        return { id, projectCode, shareToken };
      }),
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
        email: z.string().email().optional(),
        password: z.string().min(4).optional(),
      }))
      .mutation(async ({ input }) => {
        // v12.3: 이메일+비밀번호 입력 시 자동 회원가입
        let autoUserId: number | undefined;
        if (input.email && input.password) {
          try {
            const existingUser = await db.getUserByEmail(input.email);
            if (existingUser) {
              autoUserId = existingUser.id;
            } else {
              const bcrypt = await import("bcryptjs");
              const passwordHash = await bcrypt.hash(input.password, 10);
              const newUser = await db.createUserWithPassword({
                email: input.email,
                passwordHash,
                name: input.name,
              });
              if (newUser) autoUserId = newUser.id;
              // 환영 이메일 발송
              try {
                const { buildWelcomeEmail } = await import("./email");
                const { sendEmail } = await import("./email");
                const welcomeEmail = buildWelcomeEmail({
                  userName: input.name,
                  loginUrl: "https://alphatrip.org/login",
                });
                await sendEmail({ to: input.email, subject: welcomeEmail.subject, html: welcomeEmail.html });
              } catch (emailErr) {
                console.error("[WelcomeEmail] Failed:", emailErr);
              }
            }
          } catch (e) {
            console.error("[AutoRegister] Failed:", e);
          }
        }
        const { password: _pw, ...regInput } = input;
        const id = await db.createRegistration({
          ...regInput,
          userId: autoUserId,
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
        // v10.8: 밋업 신청 시 팀 스케줄 자동 등록 + 팀원 알림
        try {
          if (input.meetupId && input.scheduleStart) {
            const meetup = await db.getMeetupById(input.meetupId);
            const scheduleTitle = `${input.name} - ${meetup?.title || '밋업'} 참석`;
            await db.createTeamSchedule({
              meetupId: input.meetupId,
              title: scheduleTitle,
              description: `${input.name}님이 밋업에 신청했습니다. 팀: ${input.teamName || '-'}`,
              location: meetup?.location || undefined,
              eventTime: new Date(input.scheduleStart),
              endTime: input.scheduleEnd ? new Date(input.scheduleEnd) : undefined,
              memberIds: [id],
              notified: false,
            });
            try {
              const teamMsg = `📅 팀 스케줄 자동 등록\n${input.name}님이 ${meetup?.title || '밋업'}에 참석 신청했습니다.\n📍 ${meetup?.location || '-'}\n🕐 ${input.scheduleStart}${input.scheduleEnd ? ' ~ ' + input.scheduleEnd : ''}`;
              await sendTelegram(teamMsg);
            } catch (e2) { console.error('[TeamSchedule Notify] Failed:', e2); }
          }
        } catch (e) { console.error('[TeamSchedule Auto] Failed:', e); }
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
        // 상태 변경 시 참가자에게 푸시 알림 발송
        if (input.status === "approved" || input.status === "rejected") {
          try {
            const reg = await db.getRegistrationById(id);
            if (reg?.userId) {
              const statusText = input.status === "approved" ? "승인" : "거절";
              const statusEmoji = input.status === "approved" ? "✅" : "❌";
              await sendPushToUsers([reg.userId], {
                title: `${statusEmoji} 참가 신청 ${statusText}`,
                body: input.status === "approved"
                  ? `${reg.name}님의 밋업 참가 신청이 승인되었습니다. 마이페이지에서 일정을 확인하세요!`
                  : `${reg.name}님의 밋업 참가 신청이 거절되었습니다.${input.notes ? " 사유: " + input.notes : ""}`,
                tag: `registration-${input.status}-${id}`,
                data: { type: "registration_status", registrationId: id },
              });
            }
          } catch (e) { console.error("[Push] Registration status push failed:", e); }
        }
        await db.updateRegistration(id, data);
        return { success: true };
      }),
    checkEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const user = await db.getUserByEmail(input.email);
        return { exists: !!user, userName: user?.name || null };
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
        // Notify delay via telegram + web push
        if (data.delayMinutes && data.delayMinutes > 0) {
          const flight = await db.getFlightScheduleById(id);
          if (flight && !flight.notifiedDelay) {
            await sendTelegram(`✈️ 항공편 지연 알림\n편명: ${flight.flightNo}\n지연: ${data.delayMinutes}분\n상태: ${data.flightStatus || flight.flightStatus}`);
            await db.updateFlightSchedule(id, { notifiedDelay: true });
            // 웹 푸시 알림 - 관리자 + 밋업 참가자
            try {
              await sendPushToAdmins({ title: "✈️ 항공편 지연", body: `${flight.flightNo} - ${data.delayMinutes}분 지연`, tag: `flight-delay-${id}` });
              if (flight.meetupId) {
                await sendPushToMeetupParticipants(flight.meetupId, { title: "✈️ 항공편 지연 알림", body: `${flight.flightNo}편이 ${data.delayMinutes}분 지연되었습니다.`, tag: `flight-delay-${id}` });
              }
            } catch (_) {}
          }
        }
        // 항공편 취소 시 웹 푸시
        if (data.flightStatus === "cancelled") {
          const flight = await db.getFlightScheduleById(id);
          try {
            await sendPushToAdmins({ title: "🚫 항공편 취소", body: `${flight?.flightNo || ''}편이 취소되었습니다.`, tag: `flight-cancel-${id}` });
            if (flight?.meetupId) {
              await sendPushToMeetupParticipants(flight.meetupId, { title: "🚫 항공편 취소", body: `${flight.flightNo}편이 취소되었습니다. 관리자에게 문의하세요.`, tag: `flight-cancel-${id}` });
            }
          } catch (_) {}
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
        vehiclePlateNumber: z.string().optional(), vehicleColor: z.string().optional(),
        vehicleType: z.string().optional(), vehiclePhotoUrl: z.string().optional(),
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
        vehiclePlateNumber: z.string().optional(), vehicleColor: z.string().optional(),
        vehicleType: z.string().optional(), vehiclePhotoUrl: z.string().optional(),
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
        accommodationPhotoUrl: z.string().optional(),
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
        accommodationPhotoUrl: z.string().optional(),
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
        // 기존 일정 조회 (변경 감지용)
        const oldEvent = await db.getScheduleEventById(id);
        await db.updateScheduleEvent(id, {
          ...data,
          eventTime: data.eventTime ? new Date(data.eventTime) : undefined,
          endTime: data.endTime ? new Date(data.endTime) : undefined,
        });
        // 일정 변경 시 웹 푸시 알림 (시간/장소 변경)
        if (oldEvent && (data.eventTime || data.location)) {
          try {
            const title = data.title || oldEvent.title;
            const changes: string[] = [];
            if (data.eventTime) changes.push(`시간: ${new Date(data.eventTime).toLocaleString("ko-KR")}`);
            if (data.location) changes.push(`장소: ${data.location}`);
            const body = `"${title}" 일정이 변경되었습니다. ${changes.join(", ")}`;
            await sendPushToAdmins({ title: "📅 일정 변경", body, tag: `schedule-change-${id}` });
            if (oldEvent.meetupId) {
              await sendPushToMeetupParticipants(oldEvent.meetupId, { title: "📅 일정 변경 알림", body, tag: `schedule-change-${id}` });
            }
          } catch (_) {}
        }
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
          // 웹 푸시 알림 - 밋업 참가자에게
          try {
            await sendPushToMeetupParticipants(event.meetupId, {
              title: `⏰ ${event.notifyBefore || 10}분 후 일정 시작`,
              body: `📍 ${event.title}\n📌 ${event.location || "미정"}`,
              tag: `schedule-reminder-${event.id}`,
            });
          } catch (_) {}
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
      .mutation(async ({ ctx, input }) => {
        const targetUser = (await db.getAllUsers()).find((u: any) => u.id === input.userId);
        const oldRole = targetUser?.role || "unknown";
        await db.updateUserRole(input.userId, input.role, input.organizationId);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "role_change",
          targetType: "user",
          targetId: input.userId,
          targetName: targetUser?.name || "Unknown",
          details: { oldRole, newRole: input.role, organizationId: input.organizationId },
        });
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
    // ── Enhanced Users with Org Info ──
    usersWithOrgs: superadminProcedure.query(async () => {
      return db.getAllUsersWithOrgs();
    }),
    // ── Assign User to Organization ──
    assignUserOrg: superadminProcedure
      .input(z.object({
        userId: z.number(),
        organizationId: z.number().nullable(),
      }))
      .mutation(async ({ ctx, input }) => {
        const targetUser = (await db.getAllUsers()).find((u: any) => u.id === input.userId);
        const org = input.organizationId ? await db.getOrganizationById(input.organizationId) : null;
        await db.assignUserToOrganization(input.userId, input.organizationId);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "settings_change",
          targetType: "user",
          targetId: input.userId,
          targetName: targetUser?.name || "Unknown",
          details: { type: "org_assignment", organizationId: input.organizationId, orgName: org?.name || null },
        });
        return { success: true };
      }),
    // ── Toggle Organization Active ──
    toggleOrgActive: superadminProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await db.getOrganizationById(input.id);
        await db.toggleOrganizationActive(input.id, input.isActive);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "org_toggle_active",
          targetType: "organization",
          targetId: input.id,
          targetName: org?.name || "Unknown",
          details: { isActive: input.isActive },
        });
        return { success: true };
      }),
    // ── Org Members with User Info ──
    orgMembers: superadminProcedure
      .input(z.object({ organizationId: z.number() }))
      .query(async ({ input }) => {
        return db.getOrganizationMembersWithUsers(input.organizationId);
      }),
    // ── Update Org Member Role ──
    updateOrgMemberRole: superadminProcedure
      .input(z.object({
        id: z.number(),
        memberRole: z.enum(["owner", "manager", "staff", "viewer"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateOrganizationMemberRole(input.id, input.memberRole);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "member_role_change",
          targetType: "member",
          targetId: input.id,
          details: { newRole: input.memberRole },
        });
        return { success: true };
      }),
    // ── Transfer Ownership ──
    transferOwnership: superadminProcedure
      .input(z.object({
        organizationId: z.number(),
        fromUserId: z.number(),
        toUserId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const org = await db.getOrganizationById(input.organizationId);
        const fromUser = (await db.getAllUsers()).find((u: any) => u.id === input.fromUserId);
        const toUser = (await db.getAllUsers()).find((u: any) => u.id === input.toUserId);
        await db.transferOrganizationOwnership(input.organizationId, input.fromUserId, input.toUserId);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "ownership_transfer",
          targetType: "organization",
          targetId: input.organizationId,
          targetName: org?.name || "Unknown",
          details: {
            fromUserId: input.fromUserId,
            fromUserName: fromUser?.name || "Unknown",
            toUserId: input.toUserId,
            toUserName: toUser?.name || "Unknown",
          },
        });
        return { success: true };
      }),
    // ── Audit Logs ──
    auditLogs: superadminProcedure
      .input(z.object({
        action: z.string().optional(),
        targetType: z.string().optional(),
        userId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getAuditLogs(input);
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
              { role: "system", content: `You are an expert passport OCR and MRZ (Machine Readable Zone) extraction system. You must extract information from passport images with maximum accuracy.

## EXTRACTION PRIORITY ORDER:
1. **MRZ Zone (HIGHEST PRIORITY)**: Always look for the Machine Readable Zone at the bottom of the passport identity page. It contains 2 lines of 44 characters each (TD3 format) or 3 lines of 30 characters each (TD1 format). Characters are ONLY: A-Z, 0-9, and < (filler).
2. **Visual Identity Zone (VIZ)**: The human-readable text printed on the passport page.
3. **Cross-validate**: Compare MRZ data with VIZ data. If they differ, prefer MRZ data as it is machine-standardized.

## MRZ TD3 FORMAT (Passports - 2 lines x 44 chars):
Line 1: P<ISSUING_COUNTRY<SURNAME<<GIVEN_NAMES<<<<<<<<<<<<<<<<<<
Line 2: PASSPORT_NO<CHECK_DIGIT<NATIONALITY<DOB<CHECK<SEX<EXPIRY<CHECK<PERSONAL_NO<<<<<<<<CHECK<OVERALL_CHECK

### Line 2 Field Positions:
- Pos 1-9: Passport number (may contain < as filler)
- Pos 10: Check digit for passport number
- Pos 11-13: Nationality (ISO 3166-1 alpha-3 code, e.g., KOR, USA, JPN, CHN, GBR, DEU, FRA, VNM, THA, PHL, IDN, MYS, IND, RUS, AUS, CAN, SGP)
- Pos 14-19: Date of birth (YYMMDD)
- Pos 20: Check digit for DOB
- Pos 21: Sex (M, F, or <)
- Pos 22-27: Expiry date (YYMMDD)
- Pos 28: Check digit for expiry date
- Pos 29-42: Personal number / optional data
- Pos 43: Check digit for personal number
- Pos 44: Overall check digit

## MRZ TD1 FORMAT (ID Cards - 3 lines x 30 chars):
Line 1: I<ISSUING_COUNTRY<DOCUMENT_NO<CHECK<OPTIONAL
Line 2: DOB<CHECK<SEX<EXPIRY<CHECK<NATIONALITY<OPTIONAL<OVERALL_CHECK
Line 3: SURNAME<<GIVEN_NAMES<<<<<<<<<<<<

## COUNTRY CODE TO NAME MAPPING (Korean):
KOR=한국, USA=미국, JPN=일본, CHN=중국, GBR=영국, DEU=독일, FRA=프랑스, CAN=캐나다, AUS=호주, SGP=싱가포르, THA=태국, VNM=베트남, PHL=필리핀, IDN=인도네시아, MYS=말레이시아, IND=인도, RUS=러시아, TWN=대만, HKG=홍콩, BRA=브라질, MEX=멕시코, ITA=이탈리아, ESP=스페인, NLD=네덜란드, SWE=스웨덴, TUR=터키, POL=폴란드, UKR=우크라이나, MNG=몽골, ARE=아랍에미리트, SAU=사우디아라비아, NZL=뉴질랜드

## IMPORTANT RULES:
- For names: Extract the LATIN/ENGLISH version. Convert MRZ < separators to spaces. Surname and given names are separated by <<.
- For dates: Convert YYMMDD to YYYY-MM-DD. If YY > 50, assume 19XX; if YY <= 50, assume 20XX.
- For passport numbers: Remove filler characters <. Some countries use letters+numbers (e.g., M12345678 for Korea).
- For non-Latin script passports (Arabic, Chinese, Cyrillic, Thai, etc.): ALWAYS extract the Latin transliteration from MRZ, not the native script.
- If a field is not visible or unreadable, set it to null.
- Include a confidence score (0.0-1.0) for each extracted field.

## OUTPUT FORMAT (strict JSON only):
{
  "fullName": "SURNAME GIVEN_NAMES",
  "passportNumber": "...",
  "nationality": "한국",
  "issuingCountry": "한국",
  "dateOfBirth": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD",
  "issueDate": "YYYY-MM-DD or null",
  "gender": "M or F",
  "phone": null,
  "rawMrz": "full MRZ text exactly as read, 2 lines separated by \\n",
  "mrzLine1": "44 chars of line 1",
  "mrzLine2": "44 chars of line 2",
  "confidence": {
    "fullName": 0.95,
    "passportNumber": 0.98,
    "nationality": 0.99,
    "dateOfBirth": 0.97,
    "expiryDate": 0.96,
    "gender": 0.99,
    "overall": 0.95
  }
}

Return ONLY valid JSON, no markdown code blocks, no explanation.` },
              { role: "user", content: [
                { type: "text", text: "Extract all passport information from this image. Focus on reading the MRZ (Machine Readable Zone) at the bottom of the passport page first, then cross-validate with the visual text above. Return the result as JSON." },
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
          // MRZ 교차 검증
          if (ocrData.mrzLine2 && typeof ocrData.mrzLine2 === "string" && ocrData.mrzLine2.length >= 44) {
            const mrz2 = ocrData.mrzLine2.replace(/[^A-Z0-9<]/g, "");
            if (mrz2.length >= 44) {
              const mrzParsed = parseMrzLine2(mrz2);
              ocrData._mrzValidation = mrzParsed;
              // 교차 검증: MRZ 파싱 결과와 OCR 결과 비교, MRZ가 체크디짓 통과하면 MRZ 우선
              if (mrzParsed.passportNumberValid && mrzParsed.passportNumber) {
                if (ocrData.passportNumber !== mrzParsed.passportNumber) {
                  ocrData.passportNumber = mrzParsed.passportNumber;
                  if (ocrData.confidence) ocrData.confidence.passportNumber = 0.99;
                }
              }
              if (mrzParsed.dobValid && mrzParsed.dateOfBirth) {
                if (ocrData.dateOfBirth !== mrzParsed.dateOfBirth) {
                  ocrData.dateOfBirth = mrzParsed.dateOfBirth;
                  if (ocrData.confidence) ocrData.confidence.dateOfBirth = 0.99;
                }
              }
              if (mrzParsed.expiryValid && mrzParsed.expiryDate) {
                if (ocrData.expiryDate !== mrzParsed.expiryDate) {
                  ocrData.expiryDate = mrzParsed.expiryDate;
                  if (ocrData.confidence) ocrData.confidence.expiryDate = 0.99;
                }
              }
              if (mrzParsed.gender) {
                ocrData.gender = mrzParsed.gender;
              }
              if (mrzParsed.nationality) {
                const countryMap: Record<string, string> = {
                  KOR: "한국", USA: "미국", JPN: "일본", CHN: "중국", GBR: "영국", DEU: "독일",
                  FRA: "프랑스", CAN: "캐나다", AUS: "호주", SGP: "싱가포르", THA: "태국",
                  VNM: "베트남", PHL: "필리핀", IDN: "인도네시아", MYS: "말레이시아", IND: "인도",
                  RUS: "러시아", TWN: "대만", HKG: "홍콩", BRA: "브라질", MEX: "멕시코",
                  ITA: "이탈리아", ESP: "스페인", NLD: "네덜란드", SWE: "스웨덴", TUR: "터키",
                  POL: "폴란드", UKR: "우크라이나", MNG: "몽골", ARE: "아랍에미리트",
                  SAU: "사우디아라비아", NZL: "뉴질랜드",
                };
                const mapped = countryMap[mrzParsed.nationality];
                if (mapped) ocrData.nationality = mapped;
              }
            }
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
  // v5.7 - Immigration Checklist
  // ══════════════════════════════════════════════════════════
  checklist: router({
    // 지원 국가 목록
    countries: publicProcedure.query(async () => {
      return db.getChecklistCountries();
    }),

    // 국가별 템플릿 조회 (비로그인도 가능)
    templates: publicProcedure
      .input(z.object({ countryCode: z.string().min(2).max(10) }))
      .query(async ({ input }) => {
        return db.getChecklistTemplates(input.countryCode);
      }),

    // 내 체크리스트 조회 (없으면 자동 초기화)
    myChecklist: protectedProcedure
      .input(z.object({ countryCode: z.string().min(2).max(10) }))
      .query(async ({ ctx, input }) => {
        let items = await db.getUserChecklist(ctx.user.id, input.countryCode);
        if (items.length === 0) {
          items = await db.initUserChecklist(ctx.user.id, input.countryCode);
        }
        return items;
      }),

    // 항목 체크/해제 토글
    toggleItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.toggleChecklistItem(ctx.user.id, input.itemId);
      }),

    // 커스텀 항목 추가
    addCustomItem: protectedProcedure
      .input(z.object({
        countryCode: z.string().min(2).max(10),
        title: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.addCustomChecklistItem(ctx.user.id, input.countryCode, input.title, input.description);
        return { id };
      }),

    // 커스텀 항목 삭제
    deleteCustomItem: protectedProcedure
      .input(z.object({ itemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCustomChecklistItem(ctx.user.id, input.itemId);
        return { success: true };
      }),

    // 전체 초기화 (리셋)
    reset: protectedProcedure
      .input(z.object({ countryCode: z.string().min(2).max(10) }))
      .mutation(async ({ ctx, input }) => {
        return db.resetUserChecklist(ctx.user.id, input.countryCode);
      }),

    // 진행률 조회
    progress: protectedProcedure
      .input(z.object({ countryCode: z.string().min(2).max(10) }))
      .query(async ({ ctx, input }) => {
        return db.getChecklistProgress(ctx.user.id, input.countryCode);
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
        // 웹 푸시 알림 - 채팅방 멤버에게 (발신자 제외)
        try {
          const room = await db.getChatRoomById(input.roomId);
          const senderName = ctx.user.name || "익명";
          const msgPreview = input.content.length > 50 ? input.content.substring(0, 50) + "..." : input.content;
          const pushTitle = input.messageType === "announcement" ? `📢 ${room?.name || "채팅방"}` : `💬 ${room?.name || "채팅방"}`;
          await sendPushToChatRoomMembers(input.roomId, ctx.user.id, {
            title: pushTitle,
            body: `${senderName}: ${msgPreview}`,
            tag: `chat-${input.roomId}`,
            data: { roomId: input.roomId, type: "chat_message" },
          });
        } catch (_) {}
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

    // AI 문구 다듬기 (입력 중인 메시지를 AI로 수정)
    aiRefine: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        mode: z.enum([
          "polite",       // 공손하게
          "casual",       // 캐주얼하게
          "business",     // 비즈니스 톤
          "grammar",      // 문법 교정
          "concise",      // 간결하게
          "elaborate",    // 자세하게
          "friendly",     // 친근하게
          "translate",    // 번역
        ]),
        targetLang: z.string().optional(), // translate 모드에서 사용
        sourceLang: z.string().optional(), // 원본 언어 힌트
      }))
      .mutation(async ({ input }) => {
        const langNames: Record<string, string> = {
          ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese", th: "Thai",
          vi: "Vietnamese", id: "Indonesian", ms: "Malay", tl: "Filipino",
          hi: "Hindi", ar: "Arabic", ru: "Russian", es: "Spanish", fr: "French",
          de: "German", pt: "Portuguese", it: "Italian", tr: "Turkish", pl: "Polish",
          nl: "Dutch", sv: "Swedish", uk: "Ukrainian", cs: "Czech", ro: "Romanian",
          mn: "Mongolian",
        };

        const modePrompts: Record<string, string> = {
          polite: "Rewrite the following message in a more polite and respectful tone. Keep the same meaning and language. Return ONLY the rewritten text.",
          casual: "Rewrite the following message in a casual, relaxed tone. Keep the same meaning and language. Return ONLY the rewritten text.",
          business: "Rewrite the following message in a professional business tone. Keep the same meaning and language. Return ONLY the rewritten text.",
          grammar: "Fix any grammar, spelling, or punctuation errors in the following message. Keep the same tone and language. Return ONLY the corrected text.",
          concise: "Rewrite the following message to be more concise and to the point. Keep the same meaning and language. Return ONLY the rewritten text.",
          elaborate: "Expand the following message with more detail and context while keeping the same meaning and language. Return ONLY the rewritten text.",
          friendly: "Rewrite the following message in a warm, friendly tone. Keep the same meaning and language. Return ONLY the rewritten text.",
          translate: `Translate the following message to ${langNames[input.targetLang || "en"] || input.targetLang || "English"}. Return ONLY the translated text.`,
        };

        const systemPrompt = modePrompts[input.mode] || modePrompts.grammar;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: input.text },
            ],
          });
          const content = response.choices[0]?.message?.content;
          const refined = (typeof content === "string" ? content.trim() : "") || input.text;
          return { refined, mode: input.mode, original: input.text };
        } catch (err) {
          console.error("AI refine error:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 문구 수정에 실패했습니다" });
        }
      }),

    // AI 자동 답장 제안 (컨텍스트 기반)
    aiSuggestReply: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        replyToMessageId: z.number().optional(),
        tone: z.enum(["auto", "polite", "casual", "business", "friendly"]).default("auto"),
        lang: z.string().max(10).default("auto"),
      }))
      .mutation(async ({ input, ctx }) => {
        // 최근 메시지 20개 가져오기
        const recentMessages = await db.getChatMessages(input.roomId, 20);
        if (!recentMessages || recentMessages.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "채팅방에 메시지가 없습니다" });
        }

        // 답장 대상 메시지 찾기
        let targetMessage = recentMessages[recentMessages.length - 1];
        if (input.replyToMessageId) {
          const found = recentMessages.find(m => m.id === input.replyToMessageId);
          if (found) targetMessage = found;
        }

        // 대화 컨텍스트 구성
        const contextLines = recentMessages.map(m => {
          const name = m.senderName || "익명";
          const isMe = m.userId === ctx.user.id;
          return `[${isMe ? "나" : name}]: ${(m.content || "").substring(0, 300)}`;
        }).join("\n");

        const toneGuide: Record<string, string> = {
          auto: "Match the tone and formality level of the conversation naturally.",
          polite: "Use a polite and respectful tone.",
          casual: "Use a casual, relaxed tone.",
          business: "Use a professional business tone.",
          friendly: "Use a warm, friendly tone.",
        };

        const langGuide = input.lang !== "auto"
          ? `Write the reply in ${input.lang} language.`
          : "Write the reply in the same language as the most recent messages.";

        const systemPrompt = `You are an AI assistant helping compose a chat reply. Based on the conversation context below, suggest a natural and appropriate reply.

${toneGuide[input.tone] || toneGuide.auto}
${langGuide}

Rules:
- Generate exactly 3 different reply suggestions (short, medium, detailed)
- Each suggestion should be on a separate line, prefixed with [1], [2], [3]
- Keep suggestions natural and contextually appropriate
- Do NOT include any explanation, just the reply suggestions
- Match the conversation style and topic`;

        const userPrompt = `Conversation context:\n${contextLines}\n\nThe message to reply to: "${(targetMessage.content || "").substring(0, 500)}"\n\nSuggest 3 reply options:`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          });
          const raw = response.choices[0]?.message?.content;
          const text = typeof raw === "string" ? raw.trim() : "";

          // [1], [2], [3] 파싱
          const suggestions: string[] = [];
          const lines = text.split("\n").filter(l => l.trim());
          for (const line of lines) {
            const cleaned = line.replace(/^\[\d+\]\s*/, "").trim();
            if (cleaned) suggestions.push(cleaned);
          }

          return {
            suggestions: suggestions.length > 0 ? suggestions.slice(0, 3) : [text],
            targetMessageId: targetMessage.id,
            targetContent: (targetMessage.content || "").substring(0, 200),
            tone: input.tone,
          };
        } catch (err) {
          console.error("AI suggest reply error:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 답장 제안에 실패했습니다" });
        }
      }),

    // AI 채팅 요약 (대화 내용 요약)
    aiSummarize: protectedProcedure
      .input(z.object({
        roomId: z.number(),
        messageCount: z.number().min(5).max(200).default(50),
        lang: z.string().max(10).default("auto"),
      }))
      .mutation(async ({ input, ctx }) => {
        const messages = await db.getChatMessages(input.roomId, input.messageCount);
        if (!messages || messages.length < 3) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "요약할 메시지가 충분하지 않습니다 (최소 3개)" });
        }

        const room = await db.getChatRoomById(input.roomId);
        const roomName = room?.name || "채팅방";

        // 대화 텍스트 구성
        const chatText = messages.map(m => {
          const name = m.senderName || "익명";
          const time = m.createdAt ? new Date(m.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "";
          return `[${time}] ${name}: ${(m.content || "").substring(0, 500)}`;
        }).join("\n");

        const langGuide = input.lang !== "auto"
          ? `Write the summary in ${input.lang} language.`
          : "Write the summary in Korean (한국어).";

        const systemPrompt = `You are an AI assistant that summarizes chat conversations. Analyze the conversation below and provide a structured summary.

${langGuide}

Provide the summary in this exact format:
## 📋 대화 요약
[2-3 sentence overview of the conversation]

## 🔑 핵심 내용
- [Key point 1]
- [Key point 2]
- [Key point 3]
(list all important points)

## ✅ 결정사항 / 합의
- [Decision or agreement 1]
- [Decision or agreement 2]
(if none, write "특별한 결정사항 없음")

## 📌 액션 아이템
- [Action item 1 - who needs to do what]
- [Action item 2]
(if none, write "특별한 액션 아이템 없음")

## 👥 주요 참여자
- [Name 1]: [brief role/contribution]
- [Name 2]: [brief role/contribution]

Keep the summary concise but comprehensive. Focus on substance, not small talk.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `채팅방: ${roomName}\n메시지 수: ${messages.length}개\n\n--- 대화 내용 ---\n${chatText}` },
            ],
          });
          const raw = response.choices[0]?.message?.content;
          const summary = typeof raw === "string" ? raw.trim() : "요약을 생성할 수 없습니다.";

          return {
            summary,
            roomName,
            messageCount: messages.length,
            timeRange: {
              from: messages[0]?.createdAt ? new Date(messages[0].createdAt).toISOString() : null,
              to: messages[messages.length - 1]?.createdAt ? new Date(messages[messages.length - 1].createdAt).toISOString() : null,
            },
          };
        } catch (err) {
          console.error("AI summarize error:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 대화 요약에 실패했습니다" });
        }
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

  // ── 출장자 여권 명단 (admin) ──────────────────────────────────
  passportList: router({
    getByMeetup: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getMeetupPassportList(input.meetupId);
      }),
  }),

  // ── 비용 사용 내역 (admin) ──────────────────────────────────
  expense: router({
    list: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getMeetupExpenses(input.meetupId);
      }),

    listAll: adminProcedure
      .query(async () => {
        return db.getAllMeetupExpenses();
      }),

    create: adminProcedure
      .input(z.object({
        meetupId: z.number(),
        category: z.enum(["flight", "hotel", "transport", "meal", "venue", "gift", "visa", "insurance", "misc"]),
        title: z.string().min(1),
        description: z.string().optional(),
        amount: z.number().min(0),
        currency: z.string().default("KRW"),
        paidBy: z.string().optional(),
        paidFor: z.string().optional(),
        receiptUrl: z.string().optional(),
        receiptKey: z.string().optional(),
        expenseDate: z.string().optional(),
        registeredVia: z.enum(["web", "telegram", "qr_scan"]).default("web"),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createMeetupExpense({ ...input, createdBy: ctx.user.id });
        return { id };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        category: z.enum(["flight", "hotel", "transport", "meal", "venue", "gift", "visa", "insurance", "misc"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        amount: z.number().min(0).optional(),
        currency: z.string().optional(),
        paidBy: z.string().optional(),
        paidFor: z.string().optional(),
        receiptUrl: z.string().optional(),
        receiptKey: z.string().optional(),
        expenseDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateMeetupExpense(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMeetupExpense(input.id);
        return { success: true };
      }),

    summary: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getMeetupExpenseSummary(input.meetupId);
      }),
  }),
  // ── Super Admin: Account Creation & Delegation ──────────────────
  superAdmin: router({
    createOrganizerAccount: superadminProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().min(1),
        password: z.string().min(6),
        role: z.enum(["organizer", "agency", "partner"]),
        organizationName: z.string().min(1),
        organizationType: z.enum(["organizer", "agency", "partner"]),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
        description: z.string().optional(),
        website: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allUsers = await db.getAllUsers();
        const existing = allUsers.find((u: any) => u.email === input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 이메일입니다" });
        const hash = await bcrypt.hash(input.password, 12);
        const result = await db.createOrganizerAccount({
          email: input.email,
          name: input.name,
          passwordHash: hash,
          role: input.role,
          organizationName: input.organizationName,
          organizationType: input.organizationType,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          description: input.description,
          website: input.website,
        });
        if (!result) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "계정 생성 실패" });
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "account_create",
          targetType: "user",
          targetId: result.userId,
          targetName: input.name,
          details: { email: input.email, role: input.role, organizationName: input.organizationName },
        });
        await db.createRoleDelegation({
          fromUserId: ctx.user.id,
          toUserId: result.userId,
          organizationId: result.organizationId,
          delegationType: "admin_grant",
          fromRole: "superadmin",
          toRole: input.role,
          notes: `슈퍼관리자가 ${input.role} 계정 생성: ${input.name} (${input.email})`,
          delegatedBy: ctx.user.id,
        });
        return { success: true, userId: result.userId, organizationId: result.organizationId };
      }),
    delegateRole: superadminProcedure
      .input(z.object({
        userId: z.number(),
        newRole: z.enum(["user", "admin", "superadmin", "organizer", "agency", "partner"]),
        organizationId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find((u: any) => u.id === input.userId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" });
        const oldRole = targetUser.role;
        await db.updateUserRole(input.userId, input.newRole, input.organizationId);
        await db.createRoleDelegation({
          fromUserId: ctx.user.id,
          toUserId: input.userId,
          organizationId: input.organizationId || null,
          delegationType: "role_change",
          fromRole: oldRole,
          toRole: input.newRole,
          notes: input.notes || `역할 변경: ${oldRole} → ${input.newRole}`,
          delegatedBy: ctx.user.id,
        });
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "role_change",
          targetType: "user",
          targetId: input.userId,
          targetName: targetUser.name || "Unknown",
          details: { oldRole, newRole: input.newRole, organizationId: input.organizationId },
        });
        return { success: true };
      }),
    delegationHistory: superadminProcedure
      .input(z.object({
        organizationId: z.number().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getRoleDelegations(input);
      }),
    resetPassword: superadminProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ ctx, input }) => {
        const allUsers = await db.getAllUsers();
        const targetUser = allUsers.find((u: any) => u.id === input.userId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" });
        const hash = await bcrypt.hash(input.newPassword, 12);
        const dbInst = await db.getDbInstance();
        if (dbInst) {
          const { users: usersTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await dbInst.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, input.userId));
        }
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "password_reset",
          targetType: "user",
          targetId: input.userId,
          targetName: targetUser.name || "Unknown",
          details: { resetBy: "superadmin" },
        });
        return { success: true };
      }),
  }),
  // ── Ad Banner Management ──────────────────────────────────────
  adBanner: router({
    list: publicProcedure
      .input(z.object({
        position: z.string().optional(),
        activeOnly: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return db.getAdBanners(input);
      }),
    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getAdBannerById(input.id);
      }),
    create: adminProcedure
      .input(z.object({
        position: z.enum(["hero_top", "middle_left", "middle_right", "bottom", "sidebar"]),
        title: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string(),
        linkUrl: z.string().optional(),
        linkText: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createAdBanner({ ...input, createdBy: ctx.user.id } as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "banner_create",
          targetType: "ad_banner",
          targetId: result?.id || 0,
          targetName: input.title || "Untitled",
          details: { position: input.position },
        });
        return result;
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        position: z.enum(["hero_top", "middle_left", "middle_right", "bottom", "sidebar"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        linkUrl: z.string().optional(),
        linkText: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        startDate: z.date().nullable().optional(),
        endDate: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateAdBanner(id, data as any);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "banner_update",
          targetType: "ad_banner",
          targetId: id,
          details: data,
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteAdBanner(input.id);
        await db.createAuditLog({
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown",
          action: "banner_delete",
          targetType: "ad_banner",
          targetId: input.id,
          details: {},
        });
        return { success: true };
      }),
    trackClick: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementAdBannerClick(input.id);
        return { success: true };
      }),
  }),

  // ── Organizer Approval Workflow ──
  organizerApproval: router({
    // Get all approvals (admin only)
    list: superadminProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).optional())
      .query(async ({ input }) => {
        return await db.getOrganizerApprovals(input?.status);
      }),
    // Get my approval status (for organizer users)
    myStatus: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOrganizerApprovalByUserId(ctx.user.id);
    }),
    // Approve organizer
    approve: superadminProcedure
      .input(z.object({ id: z.number(), reviewNote: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const approval = await db.getOrganizerApprovals();
        const target = approval.find(a => a.id === input.id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "승인 요청을 찾을 수 없습니다" });
        if (target.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 요청입니다" });
        await db.updateOrganizerApproval(input.id, {
          status: "approved",
          reviewNote: input.reviewNote || null,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        // Update user's isApproved status
        const dbInstance = await db.getDb();
        if (dbInstance && target.userId) {
          const { users: usersTable } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          await dbInstance.update(usersTable).set({ isApproved: true }).where(eqOp(usersTable.id, target.userId));
        }
        return { success: true };
      }),
    // Reject organizer
    reject: superadminProcedure
      .input(z.object({ id: z.number(), reviewNote: z.string().min(1, "거절 사유를 입력해주세요") }))
      .mutation(async ({ input, ctx }) => {
        const approval = await db.getOrganizerApprovals();
        const target = approval.find(a => a.id === input.id);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "승인 요청을 찾을 수 없습니다" });
        if (target.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 요청입니다" });
        await db.updateOrganizerApproval(input.id, {
          status: "rejected",
          reviewNote: input.reviewNote,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        return { success: true };
      }),
  }),

  // ── Dashboard Statistics ──
  dashboardStats: router({
    kpis: superadminProcedure.query(async () => {
      return await db.getDashboardKPIs();
    }),
    registrationTrend: superadminProcedure.query(async () => {
      return await db.getUserRegistrationStats();
    }),
    roleDistribution: superadminProcedure.query(async () => {
      return await db.getUserRoleDistribution();
    }),
    adBannerStats: superadminProcedure.query(async () => {
      return await db.getAdBannerClickStats();
    }),
  }),
  // ── Travel Search & Booking (호텔/항공 검색 + USDT 결제) ──
  travel: router({
    // Get all VAT rates
    vatRates: publicProcedure.query(async () => {
      return await db.getVatRates();
    }),
    // Get VAT rate for specific country
    vatRateByCountry: publicProcedure
      .input(z.object({ countryCode: z.string() }))
      .query(async ({ input }) => {
        return await db.getVatRateByCountry(input.countryCode);
      }),
    // Calculate USDT price (core business logic)
    calculateUsdtPrice: publicProcedure
      .input(z.object({
        localPrice: z.number(),
        localCurrency: z.string(),
        countryCode: z.string(),
        exchangeFeeRate: z.number().default(0.0185), // 1.85% default
        platformMarginRate: z.number().default(0.03), // 3% platform margin
      }))
      .query(async ({ input }) => {
        const vatInfo = await db.getVatRateByCountry(input.countryCode);
        if (!vatInfo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Country VAT info not found' });
        const vatRate = parseFloat(String(vatInfo.vatRate)) / 100;
        const exchangeRate = parseFloat(String(vatInfo.usdExchangeRate)) || 1;
        // Price without VAT
        const priceExVat = input.localPrice / (1 + vatRate);
        // Convert to USD
        const usdPrice = priceExVat / exchangeRate;
        // Apply exchange fee
        const exchangeFee = usdPrice * input.exchangeFeeRate;
        // Platform margin
        const platformMargin = usdPrice * input.platformMarginRate;
        // Final USDT price (no VAT + exchange fee + margin)
        const usdtPrice = usdPrice + exchangeFee + platformMargin;
        // User savings (compared to local price in USD)
        const localPriceInUsd = input.localPrice / exchangeRate;
        const savings = localPriceInUsd - usdtPrice;
        return {
          localPrice: input.localPrice,
          localCurrency: input.localCurrency,
          vatRate: vatRate * 100,
          vatAmount: (input.localPrice - priceExVat) / exchangeRate,
          priceExVat: priceExVat / exchangeRate,
          usdPrice: localPriceInUsd,
          exchangeFee,
          platformMargin,
          usdtPrice: Math.round(usdtPrice * 100) / 100,
          savings: Math.round(savings * 100) / 100,
          savingsPercent: Math.round((savings / localPriceInUsd) * 10000) / 100,
          countryName: vatInfo.countryName,
          exchangeRate,
        };
      }),
    // Search hotels (demo data - ready for Amadeus/Qunar API integration)
    searchHotels: publicProcedure
      .input(z.object({
        destination: z.string(),
        countryCode: z.string().default('KR'),
        checkIn: z.string(),
        checkOut: z.string(),
        guests: z.number().default(2),
        rooms: z.number().default(1),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        stars: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        // Log search
        try {
          await db.createTravelSearch({
            userId: ctx.user?.id,
            searchType: 'hotel',
            destination: input.destination,
            checkIn: new Date(input.checkIn),
            checkOut: new Date(input.checkOut),
            guests: input.guests,
            rooms: input.rooms,
            countryCode: input.countryCode,
          });
        } catch (e) { /* ignore search log errors */ }
        // Get VAT info for pricing
        const vatInfo = await db.getVatRateByCountry(input.countryCode);
        const vatRate = vatInfo ? parseFloat(String(vatInfo.vatRate)) / 100 : 0.1;
        const exchangeRate = vatInfo ? parseFloat(String(vatInfo.usdExchangeRate)) || 1 : 1;
        const currency = vatInfo?.currency || 'USD';
        // Demo hotel data (will be replaced with real API)
        const demoHotels = generateDemoHotels(input.destination, input.countryCode, currency, exchangeRate, vatRate, input.checkIn, input.checkOut);
        return { hotels: demoHotels, total: demoHotels.length, currency, vatRate: Math.round(vatRate * 10000) / 100, exchangeRate };
      }),
    // Search flights (demo data - ready for Amadeus API integration)
    // Mystifly API status check
    mystiflyStatus: publicProcedure.query(async () => {
      return {
        configured: mystiflyClient.isConfigured(),
        provider: 'Mystifly SSP PaaS',
        features: ['GDS Search (Amadeus/Sabre/Galileo)', 'Fare Revalidation', 'Booking', 'Ticketing', 'Cancellation'],
      };
    }),

    // Revalidate fare before booking (Mystifly)
    revalidateFare: publicProcedure
      .input(z.object({ fareSourceCode: z.string() }))
      .query(async ({ input }) => {
        if (!mystiflyClient.isConfigured()) {
          return { isValid: true, fareChanged: false, message: 'Demo mode - fare always valid' };
        }
        try {
          const result = await mystiflyClient.revalidateFare(input.fareSourceCode);
          return result;
        } catch (e: any) {
          return { isValid: false, fareChanged: false, message: e.message };
        }
      }),

    // Get fare rules (Mystifly)
    fareRules: publicProcedure
      .input(z.object({ fareSourceCode: z.string() }))
      .query(async ({ input }) => {
        if (!mystiflyClient.isConfigured()) {
          return { rules: 'Demo mode - Standard fare rules apply. Free cancellation within 24 hours. Changes subject to airline policy.' };
        }
        try {
          const rules = await mystiflyClient.getFareRules(input.fareSourceCode);
          return { rules };
        } catch (e: any) {
          return { rules: 'Unable to retrieve fare rules: ' + e.message };
        }
      }),

    // Book flight via Mystifly
    bookMystiflyFlight: protectedProcedure
      .input(z.object({
        fareSourceCode: z.string(),
        passengers: z.array(z.object({
          type: z.enum(['ADT', 'CHD', 'INF']),
          title: z.string(),
          firstName: z.string(),
          lastName: z.string(),
          dateOfBirth: z.string(),
          nationality: z.string().default('KR'),
          passportNumber: z.string().optional(),
          passportExpiry: z.string().optional(),
          passportCountry: z.string().optional(),
        })),
        contactEmail: z.string().email(),
        contactPhone: z.string(),
        // Price info for our booking record
        totalFareUsd: z.number(),
        usdtPrice: z.number(),
        localPrice: z.number().optional(),
        localCurrency: z.string().optional(),
        vatAmount: z.number().optional(),
        savingsAmount: z.number().optional(),
        // Flight info for display
        airline: z.string(),
        flightNumber: z.string(),
        origin: z.string(),
        destination: z.string(),
        departureTime: z.string(),
        arrivalTime: z.string(),
        countryCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Create our booking record first
        const bookingId = await db.createTravelBooking({
          userId: ctx.user.id,
          bookingType: 'flight',
          flightNumber: input.flightNumber,
          airline: input.airline,
          origin: input.origin,
          destination: input.destination,
          checkIn: new Date(input.departureTime),
          checkOut: new Date(input.arrivalTime),
          guests: input.passengers.length,
          localPrice: String(input.localPrice || input.totalFareUsd),
          localCurrency: input.localCurrency || 'USD',
          usdPrice: String(input.totalFareUsd),
          usdtPrice: String(input.usdtPrice),
          vatAmount: String(input.vatAmount || 0),
          savingsAmount: String(input.savingsAmount || 0),
          paymentMethod: 'usdt_trc20',
          countryCode: input.countryCode,
        });

        // If Mystifly is configured, actually book
        if (mystiflyClient.isConfigured()) {
          try {
            const mystiflyResult = await mystiflyClient.bookFlight({
              fareSourceCode: input.fareSourceCode,
              passengers: input.passengers,
              contactEmail: input.contactEmail,
              contactPhone: input.contactPhone,
            });

            // Update booking with Mystifly PNR
            await db.updateTravelBooking(bookingId, {
              externalBookingId: mystiflyResult.bookingId,
              externalPnr: mystiflyResult.pnr,
              status: 'pending_payment',
            });

            return {
              bookingId,
              pnr: mystiflyResult.pnr,
              mystiflyBookingId: mystiflyResult.bookingId,
              demoMode: false,
            };
          } catch (e: any) {
            // If Mystifly booking fails, keep our record but mark as failed
            await db.updateTravelBooking(bookingId, { status: 'booking_failed' });
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Flight booking failed: ${e.message}` });
          }
        }

        // Demo mode
        return {
          bookingId,
          pnr: `DEMO${String(bookingId).padStart(6, '0')}`,
          mystiflyBookingId: null,
          demoMode: true,
        };
      }),

    // Issue ticket after payment confirmed (admin)
    issueTicket: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        const booking = await db.getTravelBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });
        if (!booking.externalBookingId) {
          return { success: false, message: 'No Mystifly booking ID - demo mode booking' };
        }
        if (!mystiflyClient.isConfigured()) {
          return { success: false, message: 'Mystifly not configured' };
        }
        try {
          const result = await mystiflyClient.issueTicket(booking.externalBookingId);
          if (result.success) {
            await db.updateTravelBooking(input.bookingId, { status: 'ticketed' });
          }
          return result;
        } catch (e: any) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message });
        }
      }),

    // Cancel Mystifly booking (admin)
    cancelMystiflyBooking: adminProcedure
      .input(z.object({ bookingId: z.number() }))
      .mutation(async ({ input }) => {
        const booking = await db.getTravelBookingById(input.bookingId);
        if (!booking) throw new TRPCError({ code: 'NOT_FOUND' });
        if (!booking.externalBookingId) {
          await db.updateTravelBooking(input.bookingId, { status: 'cancelled' });
          return { success: true, message: 'Demo booking cancelled' };
        }
        if (!mystiflyClient.isConfigured()) {
          await db.updateTravelBooking(input.bookingId, { status: 'cancelled' });
          return { success: true, message: 'Booking cancelled (Mystifly not configured)' };
        }
        try {
          const result = await mystiflyClient.cancelBooking(booking.externalBookingId);
          if (result.success) {
            await db.updateTravelBooking(input.bookingId, { status: 'cancelled' });
          }
          return result;
        } catch (e: any) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message });
        }
      }),

    searchFlights: publicProcedure
      .input(z.object({
        origin: z.string(),
        destination: z.string(),
        departDate: z.string(),
        returnDate: z.string().optional(),
        passengers: z.number().default(1),
        cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
        countryCode: z.string().default('KR'),
      }))
      .query(async ({ input, ctx }) => {
        // Log search
        try {
          await db.createTravelSearch({
            userId: ctx.user?.id,
            searchType: 'flight',
            origin: input.origin,
            destination: input.destination,
            checkIn: new Date(input.departDate),
            checkOut: input.returnDate ? new Date(input.returnDate) : undefined,
            guests: input.passengers,
            countryCode: input.countryCode,
          });
        } catch (e) { /* ignore */ }

        const vatInfo = await db.getVatRateByCountry(input.countryCode);
        const vatRate = vatInfo ? parseFloat(String(vatInfo.vatRate)) / 100 : 0.1;
        const exchangeRate = vatInfo ? parseFloat(String(vatInfo.usdExchangeRate)) || 1 : 1;
        const currency = vatInfo?.currency || 'USD';

        const EXCHANGE_FEE_RATE = 0.0185;
        const PLATFORM_MARGIN_RATE = 0.03;

        // Try Mystifly API first
        if (mystiflyClient.isConfigured()) {
          try {
            const mystiflyFlights = await mystiflyClient.searchFlights({
              origin: input.origin,
              destination: input.destination,
              departDate: input.departDate,
              returnDate: input.returnDate,
              adults: input.passengers,
              cabinClass: cabinClassToMystifly(input.cabinClass),
            });

            // Convert Mystifly results to our format with USDT pricing
            const flights = mystiflyFlights.map(f => {
              const usdPrice = f.totalFare;
              const localPrice = Math.round(usdPrice * exchangeRate * (1 + vatRate));
              const priceExVat = localPrice / (1 + vatRate);
              const usdPriceExVat = priceExVat / exchangeRate;
              const exchangeFee = usdPriceExVat * EXCHANGE_FEE_RATE;
              const platformMargin = usdPriceExVat * PLATFORM_MARGIN_RATE;
              const usdtPrice = usdPriceExVat + exchangeFee + platformMargin;
              const localPriceInUsd = localPrice / exchangeRate;
              const savings = localPriceInUsd - usdtPrice;
              const savingsPercent = (savings / localPriceInUsd) * 100;

              return {
                id: f.fareSourceCode || `mystifly-${f.flightNumber}`,
                fareSourceCode: f.fareSourceCode,
                airline: f.validatingCarrierName,
                airlineCode: f.validatingCarrier,
                flightNumber: f.flightNumber,
                origin: f.origin,
                originCode: f.origin,
                destination: f.destination,
                destinationCode: f.destination,
                departureTime: f.departureTime,
                arrivalTime: f.arrivalTime,
                duration: f.duration,
                stops: f.stops,
                stopCities: f.stopCities,
                cabinClass: input.cabinClass,
                localPrice,
                localCurrency: currency,
                usdPrice: Math.round(localPriceInUsd * 100) / 100,
                usdtPrice: Math.round(usdtPrice * 100) / 100,
                vatAmount: Math.round((localPriceInUsd - usdPriceExVat) * 100) / 100,
                savings: Math.round(savings * 100) / 100,
                savingsPercent: Math.round(savingsPercent * 100) / 100,
                baggageIncluded: f.baggageAllowance,
                aircraft: f.aircraft,
                imageUrl: '',
                isRefundable: f.isRefundable,
                baseFare: f.baseFare,
                taxes: f.taxes,
                segments: f.segments,
                source: 'mystifly' as const,
              };
            });

            return {
              flights,
              total: flights.length,
              currency,
              vatRate: Math.round(vatRate * 10000) / 100,
              exchangeRate,
              source: 'mystifly',
              demoMode: false,
            };
          } catch (e: any) {
            console.error('[Mystifly] Search error, falling back to demo:', e.message);
            // Fall through to demo mode
          }
        }

        // Demo mode fallback
        const demoFlights = generateDemoFlights(input.origin, input.destination, currency, exchangeRate, vatRate, input.departDate, input.cabinClass);
        return {
          flights: demoFlights.map(f => ({ ...f, fareSourceCode: null, source: 'demo' as const, segments: [], isRefundable: false, baseFare: 0, taxes: 0 })),
          total: demoFlights.length,
          currency,
          vatRate: Math.round(vatRate * 10000) / 100,
          exchangeRate,
          source: 'demo',
          demoMode: true,
        };
      }),
    // Create booking
    createBooking: protectedProcedure
      .input(z.object({
        bookingType: z.enum(['hotel', 'flight']),
        propertyName: z.string().optional(),
        propertyAddress: z.string().optional(),
        flightNumber: z.string().optional(),
        airline: z.string().optional(),
        origin: z.string().optional(),
        destination: z.string().optional(),
        checkIn: z.string(),
        checkOut: z.string().optional(),
        guests: z.number().default(1),
        rooms: z.number().default(1),
        localPrice: z.number(),
        localCurrency: z.string(),
        usdPrice: z.number(),
        usdtPrice: z.number(),
        vatAmount: z.number().default(0),
        vatRate: z.number().default(0),
        savingsAmount: z.number().default(0),
        exchangeFee: z.number().default(0),
        platformMargin: z.number().default(0),
        paymentMethod: z.enum(['usdt_trc20', 'usdt_erc20', 'usdt_bep20', 'usd_card', 'local_card']).default('usdt_trc20'),
        countryCode: z.string().optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const bookingId = await db.createTravelBooking({
          userId: ctx.user.id,
          bookingType: input.bookingType,
          propertyName: input.propertyName,
          propertyAddress: input.propertyAddress,
          flightNumber: input.flightNumber,
          airline: input.airline,
          origin: input.origin,
          destination: input.destination,
          checkIn: new Date(input.checkIn),
          checkOut: input.checkOut ? new Date(input.checkOut) : undefined,
          guests: input.guests,
          rooms: input.rooms,
          localPrice: String(input.localPrice),
          localCurrency: input.localCurrency,
          usdPrice: String(input.usdPrice),
          usdtPrice: String(input.usdtPrice),
          vatAmount: String(input.vatAmount),
          vatRate: String(input.vatRate),
          savingsAmount: String(input.savingsAmount),
          exchangeFee: String(input.exchangeFee),
          platformMargin: String(input.platformMargin),
          paymentMethod: input.paymentMethod,
          countryCode: input.countryCode,
          imageUrl: input.imageUrl,
        });
        return { bookingId, walletAddress: 'TXyz...USDT_WALLET_ADDRESS' };
      }),
    // Get my bookings
    myBookings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getTravelBookings(ctx.user.id);
    }),
    // Get booking by id
    bookingById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const booking = await db.getTravelBookingById(input.id);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        return booking;
      }),
    // Confirm payment (admin or user with tx hash)
    confirmPayment: protectedProcedure
      .input(z.object({ bookingId: z.number(), txHash: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getTravelBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.updateTravelBooking(input.bookingId, {
          paymentTxHash: input.txHash,
          paymentStatus: 'received',
          status: 'confirmed',
        });
        return { success: true };
      }),
    // Admin: all bookings
    allBookings: superadminProcedure
      .input(z.object({ status: z.string().optional(), bookingType: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllTravelBookings(input);
      }),
    // Admin: booking stats
    bookingStats: superadminProcedure.query(async () => {
      return await db.getTravelBookingStats();
    }),
  }),

  // ══════════════════════════════════════════════════════════
  // v9.0 - Payment Gateway & Wallet System
  // ══════════════════════════════════════════════════════════
  payment: router({
    // Get enabled payment gateways
    gateways: publicProcedure.query(async () => {
      return await db.getEnabledPaymentGateways();
    }),
    // All gateways (admin)
    allGateways: adminProcedure.query(async () => {
      return await db.getPaymentGateways();
    }),
    // Update gateway config (admin)
    updateGateway: adminProcedure
      .input(z.object({
        id: z.number(),
        isEnabled: z.boolean().optional(),
        displayName: z.string().optional(),
        description: z.string().optional(),
        feePercent: z.number().optional(),
        minAmount: z.number().optional(),
        maxAmount: z.number().optional(),
        walletAddressTrc20: z.string().optional(),
        walletAddressErc20: z.string().optional(),
        walletAddressBep20: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = {};
        if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
        if (data.displayName) updateData.displayName = data.displayName;
        if (data.description) updateData.description = data.description;
        if (data.feePercent !== undefined) updateData.feePercent = String(data.feePercent);
        if (data.minAmount !== undefined) updateData.minAmount = String(data.minAmount);
        if (data.maxAmount !== undefined) updateData.maxAmount = String(data.maxAmount);
        if (data.walletAddressTrc20 !== undefined) updateData.walletAddressTrc20 = data.walletAddressTrc20;
        if (data.walletAddressErc20 !== undefined) updateData.walletAddressErc20 = data.walletAddressErc20;
        if (data.walletAddressBep20 !== undefined) updateData.walletAddressBep20 = data.walletAddressBep20;
        await db.updatePaymentGateway(id, updateData);
        return { success: true };
      }),

    // Create payment via NOWPayments
    createNowPayment: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        amountUsdt: z.number(),
        description: z.string().optional(),
        successUrl: z.string().optional(),
        cancelUrl: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getTravelBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });

        // Create NOWPayments invoice via their API
        const apiKey = process.env.NOWPAYMENTS_API_KEY;
        if (!apiKey) {
          // Fallback: create transaction record without actual API call (demo mode)
          const txId = await db.createPaymentTransaction({
            bookingId: input.bookingId,
            userId: ctx.user.id,
            method: 'nowpayments',
            amountUsdt: String(input.amountUsdt),
            amountLocal: booking.localPrice,
            localCurrency: booking.localCurrency,
            status: 'created',
            description: input.description || `Booking #${input.bookingId} payment`,
            gatewayStatus: 'demo_mode',
          });
          return {
            transactionId: txId,
            payUrl: null,
            payAddress: null,
            demoMode: true,
            message: 'NOWPayments API key not configured. Running in demo mode.',
          };
        }

        try {
          // Real NOWPayments API call
          const response = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              price_amount: input.amountUsdt,
              price_currency: 'usd',
              pay_currency: 'usdttrc20',
              order_id: `booking-${input.bookingId}`,
              order_description: input.description || `Booking #${input.bookingId}`,
              ipn_callback_url: `${input.successUrl?.split('/').slice(0, 3).join('/')}/api/webhooks/nowpayments`,
              success_url: input.successUrl,
              cancel_url: input.cancelUrl,
            }),
          });
          const data = await response.json();

          const txId = await db.createPaymentTransaction({
            bookingId: input.bookingId,
            userId: ctx.user.id,
            method: 'nowpayments',
            amountUsdt: String(input.amountUsdt),
            amountLocal: booking.localPrice,
            localCurrency: booking.localCurrency,
            gatewayInvoiceId: data.id?.toString(),
            gatewayPayUrl: data.invoice_url,
            gatewayStatus: data.payment_status || 'waiting',
            status: 'pending',
            description: input.description || `Booking #${input.bookingId} payment`,
          });

          return {
            transactionId: txId,
            invoiceId: data.id,
            payUrl: data.invoice_url,
            demoMode: false,
          };
        } catch (e: any) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `NOWPayments API error: ${e.message}` });
        }
      }),

    // Create direct USDT transfer payment
    createDirectPayment: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        amountUsdt: z.number(),
        network: z.enum(['trc20', 'erc20', 'bep20', 'polygon', 'solana']),
        senderWallet: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getTravelBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });

        // Get wallet address from gateway config
        const gateways = await db.getPaymentGateways();
        const directGateway = gateways.find(g => g.gateway === 'direct_usdt');
        let receiverWallet = '';
        if (directGateway) {
          if (input.network === 'trc20') receiverWallet = directGateway.walletAddressTrc20 || '';
          else if (input.network === 'erc20') receiverWallet = directGateway.walletAddressErc20 || '';
          else if (input.network === 'bep20') receiverWallet = directGateway.walletAddressBep20 || '';
        }

        const txId = await db.createPaymentTransaction({
          bookingId: input.bookingId,
          userId: ctx.user.id,
          method: 'direct_usdt',
          amountUsdt: String(input.amountUsdt),
          amountLocal: booking.localPrice,
          localCurrency: booking.localCurrency,
          txNetwork: input.network,
          senderWallet: input.senderWallet,
          receiverWallet,
          status: 'pending',
          description: `Direct USDT transfer for Booking #${input.bookingId}`,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        });

        return {
          transactionId: txId,
          receiverWallet,
          network: input.network,
          amountUsdt: input.amountUsdt,
          expiresIn: 1800, // 30 minutes
        };
      }),

    // Submit TX hash for direct payment
    submitTxHash: protectedProcedure
      .input(z.object({
        transactionId: z.number(),
        txHash: z.string().min(10),
      }))
      .mutation(async ({ input, ctx }) => {
        const tx = await db.getPaymentTransaction(input.transactionId);
        if (!tx || tx.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        if (tx.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transaction is not in pending state' });

        await db.updatePaymentTransaction(input.transactionId, {
          txHash: input.txHash,
          status: 'confirming',
        });

        // Also update booking
        if (tx.bookingId) {
          await db.updateTravelBooking(tx.bookingId, {
            paymentTxHash: input.txHash,
            paymentStatus: 'received',
          });
        }

        return { success: true, message: 'TX hash submitted. Awaiting blockchain confirmation.' };
      }),

    // Pay with platform balance
    payWithBalance: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        amountUsdt: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getTravelBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });

        const wallet = await db.getOrCreateWallet(ctx.user.id);
        const balance = parseFloat(String(wallet.balance));
        if (balance < input.amountUsdt) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Insufficient balance. Current: ${balance} USDT, Required: ${input.amountUsdt} USDT` });
        }

        // Deduct balance
        const newBalance = balance - input.amountUsdt;
        const newSpent = parseFloat(String(wallet.totalSpent)) + input.amountUsdt;
        await db.updateWalletBalance(wallet.id, {
          balance: String(newBalance),
          totalSpent: String(newSpent),
        });

        // Record wallet transaction
        await db.createWalletTransaction({
          walletId: wallet.id,
          userId: ctx.user.id,
          type: 'payment',
          amount: String(input.amountUsdt),
          balanceBefore: String(balance),
          balanceAfter: String(newBalance),
          referenceType: 'booking',
          referenceId: input.bookingId,
          status: 'completed',
          description: `Payment for Booking #${input.bookingId}`,
        });

        // Create payment transaction
        const txId = await db.createPaymentTransaction({
          bookingId: input.bookingId,
          userId: ctx.user.id,
          method: 'platform_token',
          amountUsdt: String(input.amountUsdt),
          amountPlatformToken: String(input.amountUsdt),
          status: 'completed',
          confirmedAt: new Date(),
          description: `Platform balance payment for Booking #${input.bookingId}`,
        });

        // Update booking status
        await db.updateTravelBooking(input.bookingId, {
          paymentStatus: 'confirmed',
          status: 'confirmed',
        });

        return { transactionId: txId, success: true, newBalance };
      }),

    // Admin: confirm payment manually
    adminConfirmPayment: adminProcedure
      .input(z.object({
        transactionId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const tx = await db.getPaymentTransaction(input.transactionId);
        if (!tx) throw new TRPCError({ code: 'NOT_FOUND' });

        await db.updatePaymentTransaction(input.transactionId, {
          status: 'completed',
          confirmedAt: new Date(),
          description: tx.description ? `${tx.description} | Admin confirmed: ${input.notes || ''}` : `Admin confirmed: ${input.notes || ''}`,
        });

        if (tx.bookingId) {
          await db.updateTravelBooking(tx.bookingId, {
            paymentStatus: 'confirmed',
            status: 'confirmed',
          });
        }

        return { success: true };
      }),

    // Get my transactions
    myTransactions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserPaymentTransactions(ctx.user.id);
    }),

    // Get transaction by id
    transactionById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const tx = await db.getPaymentTransaction(input.id);
        if (!tx || tx.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        return tx;
      }),

    // Admin: all transactions
    allTransactions: adminProcedure
      .input(z.object({ status: z.string().optional(), method: z.string().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllPaymentTransactions(input);
      }),
  }),

  // ── Platform Wallet System ──
  wallet: router({
    // Get my wallet
    myWallet: protectedProcedure.query(async ({ ctx }) => {
      return await db.getOrCreateWallet(ctx.user.id);
    }),

    // Get my wallet transactions
    myTransactions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserWalletTransactions(ctx.user.id);
    }),

    // Deposit USDT to platform wallet (creates pending deposit)
    deposit: protectedProcedure
      .input(z.object({
        amount: z.number().min(1),
        network: z.enum(['trc20', 'erc20', 'bep20', 'polygon', 'solana']),
        txHash: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const wallet = await db.getOrCreateWallet(ctx.user.id);

        // Get deposit wallet address
        const gateways = await db.getPaymentGateways();
        const directGateway = gateways.find(g => g.gateway === 'direct_usdt');
        let depositAddress = '';
        if (directGateway) {
          if (input.network === 'trc20') depositAddress = directGateway.walletAddressTrc20 || '';
          else if (input.network === 'erc20') depositAddress = directGateway.walletAddressErc20 || '';
          else if (input.network === 'bep20') depositAddress = directGateway.walletAddressBep20 || '';
        }

        const txId = await db.createWalletTransaction({
          walletId: wallet.id,
          userId: ctx.user.id,
          type: 'deposit',
          amount: String(input.amount),
          balanceBefore: String(wallet.balance),
          balanceAfter: String(wallet.balance), // Updated after admin confirms
          txHash: input.txHash,
          network: input.network,
          status: input.txHash ? 'pending' : 'pending',
          description: `USDT deposit via ${input.network.toUpperCase()}`,
        });

        return {
          transactionId: txId,
          depositAddress,
          network: input.network,
          amount: input.amount,
        };
      }),

    // Admin: confirm deposit
    adminConfirmDeposit: adminProcedure
      .input(z.object({
        walletTransactionId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const txs = await db.getUserWalletTransactions(0); // need to get by ID
        // Direct SQL for specific transaction
        const dbInst = await db.getDb();
        if (!dbInst) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        const result = await dbInst.select().from(db.walletTransactions).where(db.eq(db.walletTransactions.id, input.walletTransactionId));
        const tx = result[0];
        if (!tx) throw new TRPCError({ code: 'NOT_FOUND' });
        if (tx.status !== 'pending') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transaction already processed' });

        // Update wallet balance
        const wallet = await db.getOrCreateWallet(tx.userId);
        const currentBalance = parseFloat(String(wallet.balance));
        const depositAmount = parseFloat(String(tx.amount));
        const newBalance = currentBalance + depositAmount;
        const newDeposited = parseFloat(String(wallet.totalDeposited)) + depositAmount;

        await db.updateWalletBalance(wallet.id, {
          balance: String(newBalance),
          totalDeposited: String(newDeposited),
        });

        // Update transaction
        await dbInst.update(db.walletTransactions).set({
          status: 'completed',
          balanceAfter: String(newBalance),
        }).where(db.eq(db.walletTransactions.id, input.walletTransactionId));

        return { success: true, newBalance };
      }),
  }),

  // ══════════════════════════════════════════════════════════
  // v10.0 - Ride-Hailing & Delivery Services
  // ══════════════════════════════════════════════════════════
  ride: router({
    // Supported cities list
    cities: publicProcedure.query(() => SUPPORTED_CITIES),

    // Search ride options (public - allows demo browsing without login)
    search: publicProcedure
      .input(z.object({
        pickupLat: z.number(),
        pickupLng: z.number(),
        pickupAddress: z.string(),
        pickupPlaceName: z.string().optional(),
        dropoffLat: z.number(),
        dropoffLng: z.number(),
        dropoffAddress: z.string(),
        dropoffPlaceName: z.string().optional(),
        city: z.string().default('Bangkok'),
        countryCode: z.string().default('TH'),
        vehicleType: z.enum(['economy', 'comfort', 'premium', 'van', 'suv']).optional(),
        passengers: z.number().default(1),
      }))
      .mutation(async ({ input, ctx }) => {
        // Calculate distance (Haversine)
        const R = 6371;
        const dLat = (input.dropoffLat - input.pickupLat) * Math.PI / 180;
        const dLng = (input.dropoffLng - input.pickupLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(input.pickupLat * Math.PI / 180) * Math.cos(input.dropoffLat * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        let distanceKm = Math.round(R * c * 1.3 * 10) / 10; // 1.3x for road factor
        if (distanceKm < 1) distanceKm = 1 + Math.random() * 3;

        // Get VAT info
        const vatInfo = await db.getVatRateByCountry(input.countryCode);
        const vatRate = vatInfo ? parseFloat(String(vatInfo.vatRate)) / 100 : 0.07;
        const exchangeRate = vatInfo ? parseFloat(String(vatInfo.usdExchangeRate)) || 1 : 1;

        // Generate demo results
        const options = generateDemoRideOptions(input.city, distanceKm, exchangeRate, vatRate);

        // Log search
        try {
          await db.createRideSearch({
            userId: ctx.user?.id ?? null,
            pickupLat: String(input.pickupLat),
            pickupLng: String(input.pickupLng),
            pickupAddress: input.pickupAddress,
            pickupPlaceName: input.pickupPlaceName,
            dropoffLat: String(input.dropoffLat),
            dropoffLng: String(input.dropoffLng),
            dropoffAddress: input.dropoffAddress,
            dropoffPlaceName: input.dropoffPlaceName,
            countryCode: input.countryCode,
            city: input.city,
            vehicleType: input.vehicleType || 'economy',
            passengers: input.passengers,
            resultCount: options.length,
            searchResults: options,
          });
        } catch (e) { /* ignore */ }

        return {
          options,
          distanceKm,
          currency: vatInfo?.currency || 'THB',
          vatRate: Math.round(vatRate * 10000) / 100,
          exchangeRate,
        };
      }),

    // Book a ride
    book: protectedProcedure
      .input(z.object({
        rideOptionId: z.string(),
        pickupLat: z.number(),
        pickupLng: z.number(),
        pickupAddress: z.string(),
        pickupPlaceName: z.string().optional(),
        dropoffLat: z.number(),
        dropoffLng: z.number(),
        dropoffAddress: z.string(),
        dropoffPlaceName: z.string().optional(),
        vehicleType: z.enum(['economy', 'comfort', 'premium', 'van', 'suv']),
        vehicleName: z.string(),
        providerName: z.string(),
        priceLocal: z.number(),
        localCurrency: z.string(),
        priceUsd: z.number(),
        priceUsdt: z.number(),
        vatAmount: z.number(),
        vatSaved: z.number(),
        platformMarkup: z.number(),
        distanceKm: z.number(),
        estimatedMinutes: z.number(),
        passengers: z.number().default(1),
        countryCode: z.string().default('TH'),
        paymentMethod: z.enum(['direct_usdt', 'nowpayments', 'platform_token', 'visa_card']).default('direct_usdt'),
      }))
      .mutation(async ({ input, ctx }) => {
        const bookingId = await db.createRideBooking({
          userId: ctx.user.id,
          providerName: input.providerName,
          pickupLat: String(input.pickupLat),
          pickupLng: String(input.pickupLng),
          pickupAddress: input.pickupAddress,
          pickupPlaceName: input.pickupPlaceName,
          dropoffLat: String(input.dropoffLat),
          dropoffLng: String(input.dropoffLng),
          dropoffAddress: input.dropoffAddress,
          dropoffPlaceName: input.dropoffPlaceName,
          vehicleType: input.vehicleType,
          vehicleName: input.vehicleName,
          passengers: input.passengers,
          priceLocal: String(input.priceLocal),
          localCurrency: input.localCurrency,
          priceUsd: String(input.priceUsd),
          priceUsdt: String(input.priceUsdt),
          vatAmount: String(input.vatAmount),
          vatSaved: String(input.vatSaved),
          platformMarkup: String(input.platformMarkup),
          platformRevenue: String(input.platformMarkup),
          distanceKm: String(input.distanceKm),
          estimatedMinutes: input.estimatedMinutes,
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          status: 'confirmed',
          countryCode: input.countryCode,
          driverName: ['Somchai', 'Nguyen', 'Ahmad', 'Tanaka', 'Kim'][Math.floor(Math.random() * 5)],
          driverPhone: '+66-' + Math.floor(80000000 + Math.random() * 19999999),
          licensePlate: (Math.random() > 0.5 ? 'กท' : 'ขก') + ' ' + Math.floor(1000 + Math.random() * 8999),
        });

        return {
          bookingId,
          status: 'confirmed',
          driverEta: Math.round(2 + Math.random() * 6),
          message: 'Ride booked successfully! Driver is on the way.',
        };
      }),

    // Get my ride bookings
    myBookings: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserRideBookings(ctx.user.id);
    }),

    // Cancel ride
    cancel: protectedProcedure
      .input(z.object({ bookingId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getRideBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        if (booking.status === 'completed' || booking.status === 'cancelled') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel this ride' });
        }
        await db.updateRideBooking(input.bookingId, {
          status: 'cancelled',
          cancellationReason: input.reason || 'User cancelled',
        });
        return { success: true };
      }),

    // Rate ride
    rate: protectedProcedure
      .input(z.object({ bookingId: z.number(), rating: z.number().min(1).max(5), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const booking = await db.getRideBookingById(input.bookingId);
        if (!booking || booking.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.updateRideBooking(input.bookingId, {
          rating: input.rating,
          ratingComment: input.comment,
        });
        return { success: true };
      }),

    // Admin: all bookings
    allBookings: adminProcedure.query(async () => {
      return await db.getAllRideBookings();
    }),
  }),

  delivery: router({
    // Supported food categories
    categories: publicProcedure.query(() => FOOD_CATEGORIES),

    // Get restaurants for a city (public - allows demo browsing without login)
    restaurants: publicProcedure
      .input(z.object({
        city: z.string().default('Bangkok'),
        countryCode: z.string().default('TH'),
        category: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const vatInfo = await db.getVatRateByCountry(input.countryCode);
        const exchangeRate = vatInfo ? parseFloat(String(vatInfo.usdExchangeRate)) || 1 : 1;
        const vatRate = vatInfo ? parseFloat(String(vatInfo.vatRate)) / 100 : 0.07;
        let restaurants = generateDemoRestaurants(input.city, exchangeRate, vatRate);
        if (input.category && input.category !== 'all') {
          restaurants = restaurants.filter(r => r.category === input.category);
        }
        return {
          restaurants,
          total: restaurants.length,
          currency: vatInfo?.currency || 'THB',
          vatRate: Math.round(vatRate * 10000) / 100,
          exchangeRate,
        };
      }),

    // Calculate delivery pricing (public - allows demo browsing without login)
    calculatePrice: publicProcedure
      .input(z.object({
        subtotal: z.number(),
        deliveryFee: z.number(),
        countryCode: z.string().default('TH'),
      }))
      .query(async ({ input }) => {
        const vatInfo = await db.getVatRateByCountry(input.countryCode);
        const exchangeRate = vatInfo ? parseFloat(String(vatInfo.usdExchangeRate)) || 1 : 1;
        const vatRate = vatInfo ? parseFloat(String(vatInfo.vatRate)) / 100 : 0.07;
        const currency = vatInfo?.currency || 'THB';
        return calculateDeliveryPricing(input.subtotal, input.deliveryFee, currency, exchangeRate, vatRate);
      }),

    // Place delivery order
    order: protectedProcedure
      .input(z.object({
        orderType: z.enum(['food', 'package', 'document', 'grocery']).default('food'),
        // Pickup (restaurant)
        pickupAddress: z.string(),
        pickupPlaceName: z.string().optional(),
        pickupLat: z.number().optional(),
        pickupLng: z.number().optional(),
        // Delivery
        deliveryAddress: z.string(),
        deliveryPlaceName: z.string().optional(),
        deliveryLat: z.number().optional(),
        deliveryLng: z.number().optional(),
        deliveryPhone: z.string().optional(),
        deliveryInstructions: z.string().optional(),
        // Restaurant info
        restaurantName: z.string().optional(),
        restaurantCategory: z.string().optional(),
        // Order items
        orderItems: z.array(z.object({
          name: z.string(),
          qty: z.number(),
          price: z.number(),
          notes: z.string().optional(),
        })),
        // Pricing
        subtotal: z.number(),
        deliveryFee: z.number(),
        priceLocal: z.number(),
        localCurrency: z.string(),
        priceUsd: z.number(),
        priceUsdt: z.number(),
        vatAmount: z.number(),
        vatSaved: z.number(),
        platformMarkup: z.number(),
        countryCode: z.string().default('TH'),
        paymentMethod: z.enum(['direct_usdt', 'nowpayments', 'platform_token', 'visa_card']).default('direct_usdt'),
      }))
      .mutation(async ({ input, ctx }) => {
        const serviceFee = input.subtotal * 0.05;
        const orderId = await db.createDeliveryOrder({
          userId: ctx.user.id,
          orderType: input.orderType,
          pickupAddress: input.pickupAddress,
          pickupPlaceName: input.pickupPlaceName,
          pickupLat: input.pickupLat ? String(input.pickupLat) : undefined,
          pickupLng: input.pickupLng ? String(input.pickupLng) : undefined,
          deliveryAddress: input.deliveryAddress,
          deliveryPlaceName: input.deliveryPlaceName,
          deliveryLat: input.deliveryLat ? String(input.deliveryLat) : undefined,
          deliveryLng: input.deliveryLng ? String(input.deliveryLng) : undefined,
          deliveryPhone: input.deliveryPhone,
          deliveryInstructions: input.deliveryInstructions,
          restaurantName: input.restaurantName,
          restaurantCategory: input.restaurantCategory,
          orderItems: input.orderItems,
          subtotal: String(input.subtotal),
          deliveryFee: String(input.deliveryFee),
          serviceFee: String(Math.round(serviceFee)),
          priceLocal: String(input.priceLocal),
          localCurrency: input.localCurrency,
          priceUsd: String(input.priceUsd),
          priceUsdt: String(input.priceUsdt),
          vatAmount: String(input.vatAmount),
          vatSaved: String(input.vatSaved),
          platformMarkup: String(input.platformMarkup),
          platformRevenue: String(input.platformMarkup),
          estimatedMinutes: 25 + Math.floor(Math.random() * 20),
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          status: 'confirmed',
          countryCode: input.countryCode,
          driverName: ['Somchai', 'Nguyen', 'Ahmad', 'Tanaka', 'Kim'][Math.floor(Math.random() * 5)],
          driverPhone: '+66-' + Math.floor(80000000 + Math.random() * 19999999),
        });

        return {
          orderId,
          status: 'confirmed',
          estimatedMinutes: 25 + Math.floor(Math.random() * 20),
          message: 'Order placed successfully! Preparing your order.',
        };
      }),

    // Get my delivery orders
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserDeliveryOrders(ctx.user.id);
    }),

    // Cancel order
    cancel: protectedProcedure
      .input(z.object({ orderId: z.number(), reason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const order = await db.getDeliveryOrderById(input.orderId);
        if (!order || order.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        if (['delivered', 'cancelled', 'refunded'].includes(order.status || '')) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot cancel this order' });
        }
        await db.updateDeliveryOrder(input.orderId, {
          status: 'cancelled',
          cancellationReason: input.reason || 'User cancelled',
        });
        return { success: true };
      }),

    // Rate order
    rate: protectedProcedure
      .input(z.object({ orderId: z.number(), rating: z.number().min(1).max(5), comment: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const order = await db.getDeliveryOrderById(input.orderId);
        if (!order || order.userId !== ctx.user.id) throw new TRPCError({ code: 'NOT_FOUND' });
        await db.updateDeliveryOrder(input.orderId, {
          rating: input.rating,
          ratingComment: input.comment,
        });
        return { success: true };
      }),

    // Admin: all orders
    allOrders: adminProcedure.query(async () => {
      return await db.getAllDeliveryOrders();
    }),
  }),

  // ── Notes (메모) ──────────────────────────────────────────
  note: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserNotes(ctx.user.id);
    }),
    shared: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSharedNotes(input.meetupId);
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        content: z.string().optional(),
        color: z.enum(["yellow", "blue", "green", "pink", "purple"]).optional(),
        meetupId: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isShared: z.boolean().optional(),
        sharedWithMeetup: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createNote({
          userId: ctx.user.id,
          title: input.title,
          content: input.content || null,
          color: input.color || "yellow",
          meetupId: input.meetupId || null,
          tags: input.tags || null,
          isShared: input.isShared || false,
          sharedWithMeetup: input.sharedWithMeetup || null,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().optional(),
        color: z.enum(["yellow", "blue", "green", "pink", "purple"]).optional(),
        isPinned: z.boolean().optional(),
        isShared: z.boolean().optional(),
        sharedWithMeetup: z.number().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const note = await db.getNoteById(input.id);
        if (!note || note.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "메모를 찾을 수 없습니다" });
        }
        const { id, ...updateData } = input;
        await db.updateNote(id, updateData as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const note = await db.getNoteById(input.id);
        if (!note || note.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "메모를 찾을 수 없습니다" });
        }
        await db.deleteNote(input.id);
        return { success: true };
      }),
    togglePin: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const note = await db.getNoteById(input.id);
        if (!note || note.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "메모를 찾을 수 없습니다" });
        }
        await db.updateNote(input.id, { isPinned: !note.isPinned });
        return { success: true, isPinned: !note.isPinned };
      }),
  }),

  // ── Translator (통역) ───────────────────────────────────────
  translator: router({
    translate: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(5000),
        sourceLang: z.string().min(2).max(5),
        targetLang: z.string().min(2).max(5),
      }))
      .mutation(async ({ input }) => {
        const langNames: Record<string, string> = {
          ko: "Korean", en: "English", zh: "Chinese", ja: "Japanese",
          vi: "Vietnamese", th: "Thai", id: "Indonesian", ms: "Malay",
          ru: "Russian", fr: "French", de: "German", es: "Spanish",
          pt: "Portuguese", it: "Italian", ar: "Arabic", hi: "Hindi",
          tr: "Turkish", tl: "Filipino", mn: "Mongolian",
        };
        const srcName = langNames[input.sourceLang] || input.sourceLang;
        const tgtName = langNames[input.targetLang] || input.targetLang;
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the following text from ${srcName} to ${tgtName}. Only output the translated text, nothing else. Maintain the original tone and formatting. If the text contains proper nouns, keep them as-is or transliterate appropriately.`,
            },
            { role: "user", content: input.text },
          ],
        });
        const rawContent = response.choices[0]?.message?.content || "";
        const translatedText = typeof rawContent === "string" ? rawContent.trim() : "";
        return { translatedText };
      }),
  }),
  // ── Team Schedules (팀 스케줄) ────────────────────────
  teamSchedule: router({
    list: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getTeamSchedulesByMeetup(input.meetupId);
      }),
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        eventTime: z.string(),
        endTime: z.string().optional(),
        memberIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTeamSchedule({
          ...input,
          eventTime: new Date(input.eventTime),
          endTime: input.endTime ? new Date(input.endTime) : undefined,
          createdByUserId: ctx.user.id,
        });
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        eventTime: z.string().optional(),
        endTime: z.string().optional(),
        memberIds: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };
        if (data.eventTime) updateData.eventTime = new Date(data.eventTime);
        if (data.endTime) updateData.endTime = new Date(data.endTime);
        await db.updateTeamSchedule(id, updateData);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTeamSchedule(input.id);
        return { success: true };
      }),
    addMember: protectedProcedure
      .input(z.object({ scheduleId: z.number(), registrationId: z.number() }))
      .mutation(async ({ input }) => {
        const schedule = await db.getTeamScheduleById(input.scheduleId);
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
        const currentMembers = (schedule.memberIds as number[]) || [];
        if (!currentMembers.includes(input.registrationId)) {
          await db.updateTeamSchedule(input.scheduleId, {
            memberIds: [...currentMembers, input.registrationId],
          });
        }
        return { success: true };
      }),
  }),
  // ── Translation Requests (통역 요청) ────────────────────
  translationRequest: router({
    pending: protectedProcedure
      .input(z.object({ meetupId: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getPendingTranslationRequests(input.meetupId);
      }),
    myRequests: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getTranslationRequestsByInterpreter(ctx.user.id);
      }),
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        sourceLang: z.string(),
        targetLang: z.string(),
        context: z.string().optional(),
        location: z.string().optional(),
        scheduledTime: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createTranslationRequest({
          ...input,
          requesterId: ctx.user.id,
          scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : undefined,
        });
        return { id };
      }),
    assign: adminProcedure
      .input(z.object({ id: z.number(), interpreterId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateTranslationRequest(input.id, {
          interpreterId: input.interpreterId,
          status: "assigned",
        });
        return { success: true };
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["in_progress", "completed", "cancelled"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateTranslationRequest(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ── AI 프롬프트 밋업 자동 생성 ──────────────────────────
  aiMeetup: router({
    parsePrompt: protectedProcedure
      .input(z.object({ prompt: z.string().min(3) }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a meetup/event planning assistant. Parse the user's natural language input and extract structured meetup information.

Return ONLY valid JSON with these fields:
{
  "title": "string - meetup title (generate a professional title if not explicitly stated)",
  "type": "meetup" | "pre_visit" | "event" | "meeting" | "other",
  "locationType": "domestic" | "overseas",
  "destinationCountry": "string - ISO country code (e.g. TH, CN, KR, JP)",
  "location": "string - specific city or venue (e.g. Bangkok, Thailand)",
  "scheduleStart": "string - YYYY-MM-DD format",
  "scheduleEnd": "string - YYYY-MM-DD format",
  "description": "string - auto-generated description in Korean based on the input",
  "maxParticipants": number or null,
  "invitedCountries": ["string - ISO country codes of invited countries"],
  "suggestedBaggageNotice": "string - suggested baggage notice based on destination"
}

Rules:
- Current year is 2026 if not specified
- If only month/day given, assume 2026
- "내륙" or domestic Korean cities = locationType: "domestic"
- Any foreign country = locationType: "overseas"
- Generate a professional Korean title if the user doesn't provide one explicitly
- Generate a brief Korean description summarizing the meetup purpose
- For invited countries, parse country names to ISO codes (한국=KR, 중국=CN, 일본=JP, 태국=TH, 베트남=VN, 미국=US, etc.)
- If destination is overseas, suggest appropriate baggage notice
- Always respond in valid JSON only, no markdown.`,
            },
            {
              role: "user",
              content: input.prompt,
            },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            return {
              success: true,
              data: {
                title: parsed.title || "",
                type: parsed.type || "meetup",
                locationType: parsed.locationType || "domestic",
                destinationCountry: parsed.destinationCountry || "",
                location: parsed.location || "",
                scheduleStart: parsed.scheduleStart || "",
                scheduleEnd: parsed.scheduleEnd || "",
                description: parsed.description || "",
                maxParticipants: parsed.maxParticipants || 0,
                invitedCountries: parsed.invitedCountries || [],
                suggestedBaggageNotice: parsed.suggestedBaggageNotice || "초과화물은 직접부담할 수 있습니다.",
              },
            };
          } catch {
            return { success: false, data: null, error: "AI 응답 파싱 실패" };
          }
        }
        return { success: false, data: null, error: "AI 응답 없음" };
      }),
  }),

  // ── AI 신청 프롬프트 파싱 + 여권 스캔 ───────────────────────────────────────
  aiRegistration: router({
    parsePrompt: publicProcedure
      .input(z.object({ prompt: z.string().min(3), meetupId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a meetup registration assistant. Parse the user's natural language input and extract registration information.

Return ONLY valid JSON with these fields:
{
  "name": "string - 신청자 이름",
  "phone": "string - 전화번호",
  "messengerId": "string - 텔레그램/카카오톡 ID",
  "locationType": "domestic" | "overseas",
  "scheduleStart": "YYYY-MM-DD",
  "scheduleEnd": "YYYY-MM-DD",
  "walletAddress": "string - 지갑 주소",
  "referrerName": "string - 추천인",
  "teamName": "string - 팀명",
  "teamIntro": "string - 팀 소개",
  "notes": "string - 기타 메모",
  "category": "meetup" | "pre_visit" | "event" | "meeting" | "other",
  "transportType": "flight" | "ktx" | "none" | "other",
  "mealPreference": "string",
  "allergies": "string",
  "drinkAlcohol": "yes" | "no" | "sometimes",
  "smoking": "yes" | "no"
}

Rules:
- Current year is 2026 if not specified
- Parse Korean, English, Chinese input
- Extract phone numbers in any format
- Parse messenger IDs (telegram: @xxx, kakao: xxx)
- If destination mentions foreign country, locationType = "overseas"
- Generate reasonable defaults for missing fields
- Always respond in valid JSON only, no markdown.`,
            },
            { role: "user", content: input.prompt },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            return { success: true, data: parsed };
          } catch {
            return { success: false, data: null, error: "AI 응답 파싱 실패" };
          }
        }
        return { success: false, data: null, error: "AI 응답 없음" };
      }),

    // 여권 이미지 OCR - 신청 폼 자동 채움용
    scanPassport: publicProcedure
      .input(z.object({ imageBase64: z.string(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ input }) => {
        try {
          const ocrResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a passport OCR system for meetup registration. Extract information from the passport image and return JSON:
{
  "fullName": "string - full name as on passport",
  "firstName": "string",
  "lastName": "string",
  "passportNumber": "string",
  "nationality": "string - ISO country code (KR, CN, JP, etc.)",
  "nationalityName": "string - country name in Korean",
  "dateOfBirth": "YYYY-MM-DD",
  "gender": "M" | "F",
  "expiryDate": "YYYY-MM-DD",
  "issuingCountry": "string - ISO code",
  "phone": "string - if visible",
  "mrzLine1": "string - MRZ line 1 if readable",
  "mrzLine2": "string - MRZ line 2 if readable"
}
Return ONLY valid JSON. If a field is not readable, use empty string.`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract passport information from this image for meetup registration:" },
                  { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" } },
                ],
              },
            ],
            response_format: { type: "json_object" },
          });
          const ocrContent = ocrResponse.choices[0]?.message?.content;
          if (typeof ocrContent === "string") {
            const jsonMatch = ocrContent.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            // v12.3: 여권 유효성 검사
            const validation: { valid: boolean; warnings: string[]; errors: string[] } = { valid: true, warnings: [], errors: [] };
            // 만료일 검사
            if (parsed.expiryDate) {
              const expiry = new Date(parsed.expiryDate);
              const now = new Date();
              const sixMonthsLater = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
              if (expiry < now) {
                validation.valid = false;
                validation.errors.push("여권이 만료되었습니다. 갱신이 필요합니다.");
              } else if (expiry < sixMonthsLater) {
                validation.warnings.push("여권 만료일이 6개월 이내입니다. 입국 거부될 수 있습니다.");
              }
            } else {
              validation.warnings.push("여권 만료일을 읽을 수 없습니다. 직접 확인해주세요.");
            }
            // MRZ 검증 (MRZ 라인이 있는 경우)
            if (parsed.mrzLine2 && parsed.mrzLine2.length >= 44) {
              const mrzResult = parseMrzLine2(parsed.mrzLine2);
              if (!mrzResult.allChecksValid) {
                validation.warnings.push("MRZ 체크디짓 검증 실패 - 여권 정보를 다시 확인해주세요.");
              }
              if (!mrzResult.passportNumberValid) {
                validation.warnings.push("여권번호 MRZ 검증 실패");
              }
            }
            // 이름 검사
            if (!parsed.fullName && !parsed.firstName) {
              validation.warnings.push("이름을 읽을 수 없습니다. 직접 입력해주세요.");
            }
            // 여권번호 검사
            if (!parsed.passportNumber) {
              validation.warnings.push("여권번호를 읽을 수 없습니다.");
            }
            return {
              success: true,
              data: {
                name: parsed.fullName || `${parsed.firstName || ""} ${parsed.lastName || ""}`.trim(),
                passportNumber: parsed.passportNumber || "",
                nationality: parsed.nationality || "",
                nationalityName: parsed.nationalityName || "",
                dateOfBirth: parsed.dateOfBirth || "",
                gender: parsed.gender || "",
                expiryDate: parsed.expiryDate || "",
                issuingCountry: parsed.issuingCountry || "",
                phone: parsed.phone || "",
              },
              validation,
            };
          }
          return { success: false, data: null, error: "OCR 응답 없음" };
        } catch (e: any) {
          return { success: false, data: null, error: e.message || "OCR 실패" };
        }
      }),

    // 명함 OCR - 명함 사진에서 참가자 정보 자동 추출
    scanBusinessCard: publicProcedure
      .input(z.object({ imageBase64: z.string(), mimeType: z.string().default("image/jpeg") }))
      .mutation(async ({ input }) => {
        try {
          const ocrResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a business card OCR system. Extract contact information from the business card image and return JSON:
{
  "name": "string - full name (Korean name preferred if available)",
  "nameEn": "string - English name if available",
  "phone": "string - mobile phone number (format: 010-XXXX-XXXX or international)",
  "email": "string - email address",
  "company": "string - company/organization name",
  "position": "string - job title/position",
  "department": "string - department",
  "address": "string - office address",
  "website": "string - website URL",
  "messengerId": "string - telegram/kakao/wechat ID if visible",
  "walletAddress": "string - crypto wallet address if visible"
}
Return ONLY valid JSON. If a field is not readable or not present, use empty string.
Prioritize Korean text for name if both Korean and English are present.
For phone numbers, prefer mobile numbers (starting with 010, +82, etc.).`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract contact information from this business card image for meetup registration:" },
                  { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" } },
                ],
              },
            ],
            response_format: { type: "json_object" },
          });
          const ocrContent = ocrResponse.choices[0]?.message?.content;
          if (typeof ocrContent === "string") {
            const jsonMatch = ocrContent.match(/\{[\s\S]*\}/);
            const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
            return {
              success: true,
              data: {
                name: parsed.name || parsed.nameEn || "",
                nameEn: parsed.nameEn || "",
                phone: parsed.phone || "",
                email: parsed.email || "",
                company: parsed.company || "",
                position: parsed.position || "",
                department: parsed.department || "",
                address: parsed.address || "",
                website: parsed.website || "",
                messengerId: parsed.messengerId || "",
                walletAddress: parsed.walletAddress || "",
              },
            };
          }
          return { success: false, data: null, error: "OCR 응답 없음" };
        } catch (e: any) {
          return { success: false, data: null, error: e.message || "명함 OCR 실패" };
        }
      }),
  }),
  // ── Attendee Dashboard ──────────────────────────────
  attendeeDashboard: router({
    stats: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getRegistrationStatsByMeetup(input?.meetupId)),
    statsWithDateRange: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        dateRange: z.enum(["week", "month", "quarter", "year", "all"]).optional(),
      }).optional())
      .query(({ input }) => db.getRegistrationStatsByMeetupWithDateRange(input?.meetupId, input?.dateRange)),
    meetupComparison: adminProcedure
      .query(() => db.getMeetupComparisonStats()),
    dailyTrend: adminProcedure
      .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
      .query(({ input }) => db.getDailyRegistrationTrend(input?.days ?? 30)),
    bulkUpdateStatus: adminProcedure
      .input(z.object({
        ids: z.array(z.number()).min(1),
        status: z.enum(["approved", "rejected", "completed"]),
      }))
      .mutation(async ({ input }) => {
        await db.bulkUpdateRegistrationStatus(input.ids, input.status);
        return { success: true, count: input.ids.length };
      }),
    generateInvitation: adminProcedure
      .input(z.object({
        meetupId: z.number(),
        lang: z.enum(["ko", "en", "zh"]).default("ko"),
        origin: z.string(),
      }))
      .mutation(async ({ input }) => {
        const meetup = await db.getMeetupById(input.meetupId);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        const { generateInvitationImage } = await import("./invitation");
        const dateRange = meetup.scheduleStart && meetup.scheduleEnd
          ? `${new Date(meetup.scheduleStart).toLocaleDateString()} ~ ${new Date(meetup.scheduleEnd).toLocaleDateString()}`
          : "미정";
        const qrUrl = meetup.shareToken
          ? `${input.origin}/m/${meetup.shareToken}`
          : `${input.origin}/register/${meetup.id}`;
        const pngBuffer = await generateInvitationImage({
          meetupTitle: meetup.title,
          meetupType: meetup.type,
          location: meetup.location || "",
          country: meetup.destinationCountry || "",
          dateRange,
          maxParticipants: meetup.maxParticipants || undefined,
          description: meetup.description || undefined,
          qrUrl,
          lang: input.lang,
        });
        const key = `invitations/${meetup.id}-${input.lang}-${Date.now()}.png`;
        const { url } = await storagePut(key, pngBuffer, "image/png");
        return { url, meetupTitle: meetup.title };
      }),
  }),

  // ── AI 이미지/PDF 자동 인식 (v12.6) ─────────────────
  aiExtract: router({
    // 공통 AI 이미지/PDF 분석: 차량, 숙소, 이벤트, 여정표
    analyzeImage: adminProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        context: z.enum(["vehicle", "accommodation", "event", "itinerary", "channel"]),
      }))
      .mutation(async ({ input }) => {
        // S3에 이미지 업로드
        const buffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.includes("png") ? "png" : input.mimeType.includes("pdf") ? "pdf" : "jpg";
        const key = `ai-extract/${input.context}-${nanoid(12)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);

        const prompts: Record<string, string> = {
          vehicle: `You are a vehicle information extractor. Analyze this image and extract:
- vehicleName: vehicle model/name (e.g. "Toyota Alphard", "Grab Car")
- vehiclePlateNumber: license plate number
- vehicleColor: vehicle color
- vehicleType: vehicle type (sedan, SUV, van, bus, etc.)
- vehicleCapacity: estimated passenger capacity (number)
- driverName: driver name if visible
- driverPhone: driver phone if visible
Return ONLY valid JSON.`,
          accommodation: `You are a hotel/accommodation information extractor. Analyze this image and extract:
- hotelName: hotel or accommodation name
- roomNumber: room number
- roomType: room type (single/double/twin/suite)
- floorNumber: floor number
- checkIn: check-in date/time (ISO format YYYY-MM-DDTHH:mm)
- checkOut: check-out date/time (ISO format YYYY-MM-DDTHH:mm)
- address: hotel address
- notes: any additional notes
Return ONLY valid JSON.`,
          event: `You are a schedule/event information extractor. Analyze this image (could be a schedule table, excel screenshot, or event poster) and extract ALL events found.
Return JSON array format: { "events": [{ "title": "event name", "eventTime": "ISO datetime", "endTime": "ISO datetime or null", "location": "location", "description": "description", "eventType": "meetup|transfer|meal|meeting|free_time|departure|arrival|other" }] }
If multiple events are found (e.g. from a table/spreadsheet), extract ALL of them.
Return ONLY valid JSON.`,
          itinerary: `You are a travel itinerary information extractor. Analyze this image and extract:
- title: itinerary title or trip name
- departureFlightNo: departure flight number
- departureAirport: departure airport code
- departureTime: departure time (ISO format)
- arrivalFlightNo: arrival flight number  
- arrivalAirport: arrival airport code
- arrivalTime: arrival time (ISO format)
- returnFlightNo: return flight number
- returnDepartureAirport: return departure airport
- returnDepartureTime: return departure time (ISO format)
- returnArrivalAirport: return arrival airport
- returnArrivalTime: return arrival time (ISO format)
- hotelName: hotel name
- hotelAddress: hotel address
- hotelCheckIn: check-in (ISO format)
- hotelCheckOut: check-out (ISO format)
- scheduleDetails: array of schedule items [{time, activity, location}]
Return ONLY valid JSON.`,
        };

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: prompts[input.context] || prompts.vehicle },
              { role: "user", content: [
                { type: "text", text: "Extract information from this image:" },
                { type: "image_url", image_url: { url, detail: "high" } },
              ]},
            ],
          });
          const rawContent = response.choices?.[0]?.message?.content;
          const text = typeof rawContent === "string" ? rawContent : "{}";
          let extracted;
          try {
            const jsonMatch = text.match(/[\[\{][\s\S]*[\]\}]/);
            extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          } catch { extracted = { raw: text }; }
          return { imageUrl: url, extracted, success: true };
        } catch (e) {
          console.error("[AI Extract] Error:", e);
          return { imageUrl: url, extracted: {}, success: false };
        }
      }),

    // AI 프롬포트 기반 자동 입력
    analyzePrompt: adminProcedure
      .input(z.object({
        prompt: z.string().min(1),
        context: z.enum(["vehicle", "accommodation", "event", "itinerary", "channel"]),
      }))
      .mutation(async ({ input }) => {
        const prompts: Record<string, string> = {
          vehicle: `Parse this vehicle/pickup information and return JSON:
- vehicleName, vehiclePlateNumber, vehicleColor, vehicleType, vehicleCapacity (number), driverName, driverPhone, pickupLocation, pickupTime (ISO format)
Return ONLY valid JSON.`,
          accommodation: `Parse this accommodation information and return JSON:
- hotelName, roomNumber, roomType (single/double/twin/suite), floorNumber, checkIn (ISO), checkOut (ISO), address, notes
Return ONLY valid JSON.`,
          event: `Parse this event/schedule information and return JSON array:
{ "events": [{ "title", "eventTime" (ISO), "endTime" (ISO or null), "location", "description", "eventType" (meetup|transfer|meal|meeting|free_time|departure|arrival|other) }] }
Extract ALL events mentioned. Return ONLY valid JSON.`,
          itinerary: `Parse this travel itinerary information and return JSON:
- title, departureFlightNo, departureAirport, departureTime (ISO), arrivalFlightNo, arrivalAirport, arrivalTime (ISO),
  returnFlightNo, returnDepartureAirport, returnDepartureTime (ISO), returnArrivalAirport, returnArrivalTime (ISO),
  hotelName, hotelAddress, hotelCheckIn (ISO), hotelCheckOut (ISO),
  scheduleDetails: [{time, activity, location}]
Return ONLY valid JSON.`,
          channel: `Parse this communication channel information and return JSON:
- channelName: channel name/title
- channelType: one of pickup_driver|manager|hotel_checkin|transfer|general
- assignedTo: person name in charge
- assignedPhone: phone number
- description: channel description
Return ONLY valid JSON.`,
        };
        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: prompts[input.context] || prompts.vehicle },
              { role: "user", content: input.prompt },
            ],
          });
          const rawContent = response.choices?.[0]?.message?.content;
          const text = typeof rawContent === "string" ? rawContent : "{}";
          let extracted;
          try {
            const jsonMatch = text.match(/[\[\{][\s\S]*[\]\}]/);
            extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
          } catch { extracted = { raw: text }; }
          return { extracted, success: true };
        } catch (e) {
          console.error("[AI Prompt] Error:", e);
          return { extracted: {}, success: false };
        }
      }),
  }),

  // ── 숙소↔여정표 호텔 양방향 연동 (v12.6) ────────
  hotelSync: router({
    // 숙소 등록/수정 시 여정표 호텔 정보 동기화
    syncFromAccommodation: adminProcedure
      .input(z.object({
        accommodationId: z.number(),
        hotelName: z.string(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        roomNumber: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 해당 숙소에 배정된 참가자들의 여정표 업데이트
        const acc = await db.getAccommodationById(input.accommodationId);
        if (!acc) return { updated: 0 };
        const regIds = acc.assignedRegistrationIds as number[] | null;
        if (!regIds || regIds.length === 0) return { updated: 0 };
        let updated = 0;
        for (const regId of regIds) {
          const itineraries = await db.getItinerariesByRegistration(regId);
          for (const it of itineraries) {
            await db.updateItinerary(it.id, {
              hotelName: input.hotelName,
              hotelCheckIn: input.checkIn ? new Date(input.checkIn) : undefined,
              hotelCheckOut: input.checkOut ? new Date(input.checkOut) : undefined,
            });
            updated++;
          }
        }
        return { updated };
      }),

    // 여정표 호텔 수정 시 숙소 정보 동기화
    syncFromItinerary: adminProcedure
      .input(z.object({
        itineraryId: z.number(),
        hotelName: z.string(),
        hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const itinerary = await db.getItineraryById(input.itineraryId);
        if (!itinerary) return { updated: 0 };
        // 해당 참가자가 배정된 숙소 찾기
        const allAccommodations = await db.getAccommodations();
        let updated = 0;
        for (const acc of allAccommodations) {
          const regIds = acc.assignedRegistrationIds as number[] | null;
          if (regIds && regIds.includes(itinerary.registrationId)) {
            await db.updateAccommodation(acc.id, {
              hotelName: input.hotelName,
              checkIn: input.hotelCheckIn ? new Date(input.hotelCheckIn) : undefined,
              checkOut: input.hotelCheckOut ? new Date(input.hotelCheckOut) : undefined,
            });
            updated++;
          }
        }
        return { updated };
      }),
  }),

  // ── 고객용 차량/숙소 정보 조회 (v12.6) ─────────────
  myTravel: router({
    // 내 차량 배정 정보 조회
    myPickups: protectedProcedure.query(async ({ ctx }) => {
      const regs = await db.getRegistrations({ userId: ctx.user.id });
      if (!regs.length) return [];
      const regIds = regs.map(r => r.id);
      const allPickups = await db.getPickupAssignments();
      return allPickups.filter(p => {
        const assigned = p.assignedRegistrationIds as number[] | null;
        return assigned && assigned.some(id => regIds.includes(id));
      });
    }),
    // 내 숙소 배정 정보 조회
    myAccommodations: protectedProcedure.query(async ({ ctx }) => {
      const regs = await db.getRegistrations({ userId: ctx.user.id });
      if (!regs.length) return [];
      const regIds = regs.map(r => r.id);
      const allAccom = await db.getAccommodations();
      return allAccom.filter(a => {
        const assigned = a.assignedRegistrationIds as number[] | null;
        return assigned && assigned.some(id => regIds.includes(id));
      });
    }),
    // 내 여정표 조회
    myItineraries: protectedProcedure.query(async ({ ctx }) => {
      const regs = await db.getRegistrations({ userId: ctx.user.id });
      if (!regs.length) return [];
      const results: any[] = [];
      for (const reg of regs) {
        const its = await db.getItinerariesByRegistration(reg.id);
        results.push(...its);
      }
      return results;
    }),
  }),

  // ── Excel Templates & Export ─────────────────────────────
  excelExport: router({
    // Template downloads
    pickupTemplate: adminProcedure.query(async () => {
      const buf = await excel.generatePickupTemplate();
      return { base64: buf.toString("base64"), filename: "pickup_template.xlsx" };
    }),
    accommodationTemplate: adminProcedure.query(async () => {
      const buf = await excel.generateAccommodationTemplate();
      return { base64: buf.toString("base64"), filename: "accommodation_template.xlsx" };
    }),
    eventTemplate: adminProcedure.query(async () => {
      const buf = await excel.generateEventTemplate();
      return { base64: buf.toString("base64"), filename: "event_template.xlsx" };
    }),
    itineraryTemplate: adminProcedure.query(async () => {
      const buf = await excel.generateItineraryTemplate();
      return { base64: buf.toString("base64"), filename: "itinerary_template.xlsx" };
    }),
    attendeeTemplate: adminProcedure.query(async () => {
      const buf = await excel.generateAttendeeTemplate();
      return { base64: buf.toString("base64"), filename: "attendee_template.xlsx" };
    }),
    // Data exports
    exportPickups: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const data = await db.getPickupAssignments(input?.meetupId);
        const buf = await excel.exportPickupsToExcel(data);
        return { base64: buf.toString("base64"), filename: `pickups_export_${Date.now()}.xlsx` };
      }),
    exportAccommodations: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const data = await db.getAccommodations(input?.meetupId);
        const buf = await excel.exportAccommodationsToExcel(data);
        return { base64: buf.toString("base64"), filename: `accommodations_export_${Date.now()}.xlsx` };
      }),
    exportEvents: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const data = await db.getScheduleEvents(input?.meetupId);
        const buf = await excel.exportEventsToExcel(data);
        return { base64: buf.toString("base64"), filename: `events_export_${Date.now()}.xlsx` };
      }),
    exportItineraries: adminProcedure
      .input(z.object({ meetupId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const data = await db.getAllItineraries();
        const buf = await excel.exportItinerariesToExcel(data);
        return { base64: buf.toString("base64"), filename: `itineraries_export_${Date.now()}.xlsx` };
      }),
    exportAttendees: adminProcedure
      .input(z.object({ meetupId: z.number().optional(), status: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const data = await db.getRegistrations(input);
        const buf = await excel.exportAttendeesToExcel(data);
        return { base64: buf.toString("base64"), filename: `attendees_export_${Date.now()}.xlsx` };
      }),
    exportStats: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        period: z.enum(["week", "month", "quarter", "year", "all"]).default("all"),
      }).optional())
      .query(async ({ input }) => {
        const stats = await db.getRegistrationStatsByMeetup(input?.meetupId);
        const comparison = await db.getMeetupComparisonStats();
        const periodDays = { week: 7, month: 30, quarter: 90, year: 365, all: 3650 };
        const days = periodDays[input?.period || "all"];
        const trend = await db.getDailyRegistrationTrend(days);
        const buf = await excel.exportStatsToExcel({
          kpi: stats,
          byMeetup: comparison,
          dailyTrend: trend,
        });
        return { base64: buf.toString("base64"), filename: `stats_export_${Date.now()}.xlsx` };
      }),
  }),

  // ── Calendar Integration (캘린더 연동) ──────────────────────
  calendar: router({
    // .ics 파일 데이터 생성 (Google/Apple Calendar 추가용)
    generateIcs: publicProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        const meetup = await db.getMeetupById(input.meetupId);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        const formatDate = (d: Date | string | null) => {
          if (!d) return "";
          const date = new Date(d);
          return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        };
        const start = formatDate(meetup.scheduleStart);
        const end = formatDate(meetup.scheduleEnd || meetup.scheduleStart);
        const uid = `meetup-${meetup.id}-${meetup.projectCode}@alphatrip.org`;
        const ics = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//AlphaTrip//Meetup//KO",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTART:${start}`,
          `DTEND:${end}`,
          `SUMMARY:${(meetup.title || "").replace(/[\n,;]/g, " ")}`,
          `DESCRIPTION:${(meetup.description || "").replace(/\n/g, "\\n").replace(/[,;]/g, " ")}`,
          `LOCATION:${(meetup.location || "").replace(/[\n,;]/g, " ")}`,
          `URL:https://alphatrip.org/m/${meetup.shareToken}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\r\n");
        // Google Calendar URL
        const gcalStart = start.replace("Z", "");
        const gcalEnd = end.replace("Z", "");
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetup.title || "")}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(meetup.description || "")}&location=${encodeURIComponent(meetup.location || "")}&sf=true&output=xml`;
        return { ics, gcalUrl, meetup: { title: meetup.title, start: meetup.scheduleStart, end: meetup.scheduleEnd, location: meetup.location } };
      }),
    // 교통/식사 일정의 캘린더 데이터 생성
    generateScheduleIcs: publicProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        const schedule = await db.getMeetupScheduleById(input.scheduleId);
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "일정을 찾을 수 없습니다" });
        const formatDate = (d: Date | string | null) => {
          if (!d) return "";
          const date = new Date(d);
          return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
        };
        const start = formatDate(schedule.eventDate);
        const end = formatDate(schedule.endTime || schedule.eventDate);
        const uid = `schedule-${schedule.id}@alphatrip.org`;
        const loc = schedule.location || schedule.pickupLocation || schedule.restaurantName || "";
        const ics = [
          "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AlphaTrip//Schedule//KO",
          "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
          `UID:${uid}`, `DTSTART:${start}`, `DTEND:${end}`,
          `SUMMARY:${(schedule.title || "").replace(/[\n,;]/g, " ")}`,
          `DESCRIPTION:${(schedule.description || "").replace(/\n/g, "\\n").replace(/[,;]/g, " ")}`,
          `LOCATION:${loc.replace(/[\n,;]/g, " ")}`,
          "STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR",
        ].join("\r\n");
        const gcalStart = start.replace("Z", "");
        const gcalEnd = end.replace("Z", "");
        const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(schedule.title || "")}&dates=${gcalStart}/${gcalEnd}&details=${encodeURIComponent(schedule.description || "")}&location=${encodeURIComponent(loc)}&sf=true&output=xml`;
        return { ics, gcalUrl, schedule };
      }),
  }),

  // ── Meetup Schedules (교통/식사/관광 일정 관리) ──────────────
  meetupSchedule: router({
    list: publicProcedure
      .input(z.object({
        meetupId: z.number(),
        scheduleType: z.enum(["transport", "meal", "tour", "meeting", "free", "other"]).optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return db.getMeetupSchedules(input.meetupId, input.scheduleType, input.status);
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const row = await db.getMeetupScheduleById(input.id);
        if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "일정을 찾을 수 없습니다" });
        return row;
      }),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number(),
        scheduleType: z.enum(["transport", "meal", "tour", "meeting", "free", "other"]),
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().optional(),
        locationUrl: z.string().optional(),
        eventDate: z.string(),
        endTime: z.string().optional(),
        vehicleInfo: z.string().optional(),
        driverName: z.string().optional(),
        driverPhone: z.string().optional(),
        pickupLocation: z.string().optional(),
        dropoffLocation: z.string().optional(),
        restaurantName: z.string().optional(),
        cuisineType: z.string().optional(),
        reservationName: z.string().optional(),
        reservationPhone: z.string().optional(),
        menuInfo: z.string().optional(),
        costPerPerson: z.string().optional(),
        maxParticipants: z.number().optional(),
        isAllParticipants: z.boolean().optional(),
        assignedRegistrationIds: z.array(z.number()).optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cols = [
          "meetupId", "scheduleType", "title", "description", "location", "locationUrl",
          "eventDate", "endTime", "vehicleInfo", "driverName", "driverPhone",
          "pickupLocation", "dropoffLocation", "restaurantName", "cuisineType",
          "reservationName", "reservationPhone", "menuInfo", "costPerPerson",
          "maxParticipants", "isAllParticipants", "assignedRegistrationIds", "notes", "sortOrder", "createdBy",
        ];
        const vals = [
          input.meetupId, input.scheduleType, input.title, input.description || null,
          input.location || null, input.locationUrl || null,
          new Date(input.eventDate), input.endTime ? new Date(input.endTime) : null,
          input.vehicleInfo || null, input.driverName || null, input.driverPhone || null,
          input.pickupLocation || null, input.dropoffLocation || null,
          input.restaurantName || null, input.cuisineType || null,
          input.reservationName || null, input.reservationPhone || null,
          input.menuInfo || null, input.costPerPerson || null,
          input.maxParticipants || null, input.isAllParticipants ?? true,
          input.assignedRegistrationIds ? JSON.stringify(input.assignedRegistrationIds) : null,
          input.notes || null, input.sortOrder || 0, ctx.user.id,
        ];
        const insertData: any = {};
        cols.forEach((col, i) => { insertData[col] = vals[i]; });
        const insertId = await db.createMeetupSchedule(insertData);
        return { id: insertId };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        scheduleType: z.enum(["transport", "meal", "tour", "meeting", "free", "other"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        locationUrl: z.string().optional(),
        eventDate: z.string().optional(),
        endTime: z.string().optional(),
        vehicleInfo: z.string().optional(),
        driverName: z.string().optional(),
        driverPhone: z.string().optional(),
        pickupLocation: z.string().optional(),
        dropoffLocation: z.string().optional(),
        restaurantName: z.string().optional(),
        cuisineType: z.string().optional(),
        reservationName: z.string().optional(),
        reservationPhone: z.string().optional(),
        menuInfo: z.string().optional(),
        costPerPerson: z.string().optional(),
        maxParticipants: z.number().optional(),
        isAllParticipants: z.boolean().optional(),
        assignedRegistrationIds: z.array(z.number()).optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
        status: z.enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const sets: string[] = [];
        const vals: any[] = [];
        for (const [key, val] of Object.entries(data)) {
          if (val === undefined) continue;
          if (key === "eventDate" || key === "endTime") {
            sets.push(`${key} = ?`); vals.push(new Date(val as string));
          } else if (key === "assignedRegistrationIds") {
            sets.push(`${key} = ?`); vals.push(JSON.stringify(val));
          } else {
            sets.push(`${key} = ?`); vals.push(val);
          }
        }
        if (sets.length === 0) return { success: true };
        const updateData: any = {};
        for (const [key, val] of Object.entries(data)) {
          if (val === undefined) continue;
          if (key === "eventDate" || key === "endTime") updateData[key] = new Date(val as string);
          else updateData[key] = val;
        }
        await db.updateMeetupSchedule(id, updateData);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMeetupSchedule(input.id);
        return { success: true };
      }),
    // 참가자에게 일정 알림 보내기 (공지 채널에 전송)
    notify: adminProcedure
      .input(z.object({ id: z.number(), meetupId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const schedule = await db.getMeetupScheduleById(input.id);
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "일정을 찾을 수 없습니다" });
        const typeLabels: Record<string, string> = { transport: "🚗 교통", meal: "🍽️ 식사", tour: "🗺️ 관광", meeting: "📋 미팅", free: "🆓 자유시간", other: "📌 기타" };
        const typeLabel = typeLabels[schedule.scheduleType] || "📌 일정";
        const eventDate = new Date(schedule.eventDate);
        const dateStr = eventDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
        let msg = `${typeLabel} 안내\n\n📌 ${schedule.title}\n🕐 ${dateStr}`;
        if (schedule.location) msg += `\n📍 ${schedule.location}`;
        if (schedule.restaurantName) msg += `\n🍽️ ${schedule.restaurantName}`;
        if (schedule.pickupLocation) msg += `\n🚗 픽업: ${schedule.pickupLocation}`;
        if (schedule.driverName) msg += `\n👤 기사: ${schedule.driverName} ${schedule.driverPhone || ""}`;
        if (schedule.menuInfo) msg += `\n📋 메뉴: ${schedule.menuInfo}`;
        if (schedule.notes) msg += `\n\n${schedule.notes}`;
        // 공지 채널에 전송
        const rooms = await db.getChatRooms({ meetupId: input.meetupId, isActive: true });
        const announcementRoom = rooms.find((r: any) => r.roomType === "announcement");
        if (announcementRoom) {
          await db.createChatMessage({
            roomId: announcementRoom.id, userId: ctx.user.id,
            senderName: ctx.user.name || "관리자", senderRole: "admin",
            content: msg, messageType: "announcement",
          });
        }
        // 알림 상태 업데이트
        await db.updateMeetupSchedule(input.id, { notified: true, notifiedAt: new Date() });
        // 텔레그램 알림
        try { await sendTelegram(msg.substring(0, 500)); } catch { /* ignore */ }
        return { success: true };
      }),
  }),

  // ── Schedule Reminders (일정 알림 자동화) ──────────────────
  scheduleReminder: router({
    list: adminProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return db.getScheduleReminders(input.scheduleId);
      }),
    create: adminProcedure
      .input(z.object({
        scheduleId: z.number(),
        meetupId: z.number(),
        reminderMinutes: z.number().min(1),
        reminderType: z.enum(["telegram", "chat", "both"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 일정 정보 가져와서 알림 시각 계산
        const schedule = await db.getMeetupScheduleById(input.scheduleId);
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "일정을 찾을 수 없습니다" });
        const eventDate = new Date(schedule.eventDate);
        const scheduledAt = new Date(eventDate.getTime() - input.reminderMinutes * 60 * 1000);
        if (scheduledAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "알림 시간이 이미 지났습니다" });
        const id = await db.createScheduleReminder({
          scheduleId: input.scheduleId,
          meetupId: input.meetupId,
          reminderMinutes: input.reminderMinutes,
          reminderType: input.reminderType || "both",
          scheduledAt,
          createdBy: ctx.user.id,
        });
        return { id };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteScheduleReminder(input.id);
        return { success: true };
      }),
    // 수동으로 리마인더 전송 트리거
    sendNow: adminProcedure
      .input(z.object({ scheduleId: z.number(), meetupId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const schedule = await db.getMeetupScheduleById(input.scheduleId);
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "일정을 찾을 수 없습니다" });
        const typeLabels: Record<string, string> = { transport: "🚗 교통", meal: "🍽️ 식사", tour: "🗺️ 관광", meeting: "📋 미팅", free: "🆓 자유시간", other: "📌 기타" };
        const typeLabel = typeLabels[schedule.scheduleType] || "📌 일정";
        const eventDate = new Date(schedule.eventDate);
        const now = new Date();
        const diffMin = Math.round((eventDate.getTime() - now.getTime()) / 60000);
        let timeStr = "";
        if (diffMin > 60) timeStr = `${Math.round(diffMin / 60)}시간 후`;
        else if (diffMin > 0) timeStr = `${diffMin}분 후`;
        else timeStr = "곧";
        const dateStr = eventDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
        let msg = `⏰ 리마인더: ${typeLabel}\n\n📌 ${schedule.title}\n🕐 ${dateStr} (${timeStr} 시작)`;
        if (schedule.location) msg += `\n📍 ${schedule.location}`;
        if (schedule.restaurantName) msg += `\n🍽️ ${schedule.restaurantName}`;
        if (schedule.pickupLocation) msg += `\n🚗 픽업: ${schedule.pickupLocation}`;
        if (schedule.driverName) msg += `\n👤 기사: ${schedule.driverName} ${schedule.driverPhone || ""}`;
        if (schedule.notes) msg += `\n\n${schedule.notes}`;
        // 공지 채널에 전송
        const rooms = await db.getChatRooms({ meetupId: input.meetupId, isActive: true });
        const announcementRoom = rooms.find((r: any) => r.roomType === "announcement");
        if (announcementRoom) {
          await db.createChatMessage({
            roomId: announcementRoom.id, userId: ctx.user.id,
            senderName: ctx.user.name || "시스템", senderRole: "admin",
            content: msg, messageType: "announcement",
          });
        }
        // 텔레그램 알림
        try { await sendTelegram(msg.substring(0, 500)); } catch { /* ignore */ }
        return { success: true };
      }),
    // 미응답자에게 RSVP 리마인더 전송
    sendRsvpReminder: adminProcedure
      .input(z.object({ scheduleId: z.number(), meetupId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const schedule = await db.getMeetupScheduleById(input.scheduleId);
        if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "일정을 찾을 수 없습니다" });
        const rsvps = await db.getScheduleRsvps(input.scheduleId);
        const respondedRegIds = new Set(rsvps.map(r => r.registrationId));
        // 전체 참가자 목록 가져오기
        const allRegs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });
        const noResponseRegs = allRegs.filter((r: any) => !respondedRegIds.has(r.id));
        const dateStr = new Date(schedule.eventDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
        const msg = `📋 참석 여부 확인 요청\n\n📌 ${schedule.title}\n🕐 ${dateStr}\n\n아직 참석 여부를 응답하지 않으셨습니다. 밋업 포털에서 응답해 주세요!\n미응답자: ${noResponseRegs.length}명`;
        // 공지 채널에 전송
        const rooms = await db.getChatRooms({ meetupId: input.meetupId, isActive: true });
        const announcementRoom = rooms.find((r: any) => r.roomType === "announcement");
        if (announcementRoom) {
          await db.createChatMessage({
            roomId: announcementRoom.id, userId: ctx.user.id,
            senderName: ctx.user.name || "시스템", senderRole: "admin",
            content: msg, messageType: "announcement",
          });
        }
        try { await sendTelegram(msg.substring(0, 500)); } catch { /* ignore */ }
        return { success: true, noResponseCount: noResponseRegs.length };
      }),
  }),

  // ── Schedule RSVPs (참가자 일정 참석 여부) ──────────────────
  scheduleRsvp: router({
    // 특정 일정의 RSVP 목록 (관리자)
    list: adminProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return db.getScheduleRsvps(input.scheduleId);
      }),
    // 특정 일정의 RSVP 통계
    stats: publicProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return db.getScheduleRsvpStats(input.scheduleId);
      }),
    // 밋업 전체 RSVP 요약
    meetupSummary: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getMeetupRsvpSummary(input.meetupId);
      }),
    // 내 RSVP 조회 (참가자)
    myResponse: protectedProcedure
      .input(z.object({ scheduleId: z.number(), registrationId: z.number() }))
      .query(async ({ input }) => {
        return db.getScheduleRsvpByUser(input.scheduleId, input.registrationId);
      }),
    // RSVP 응답 (참가자)
    respond: protectedProcedure
      .input(z.object({
        scheduleId: z.number(),
        meetupId: z.number(),
        registrationId: z.number(),
        response: z.enum(["attending", "not_attending", "maybe"]),
        note: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.upsertScheduleRsvp({
          scheduleId: input.scheduleId,
          meetupId: input.meetupId,
          registrationId: input.registrationId,
          userId: ctx.user.id,
          response: input.response,
          note: input.note || null,
        });
        return { id, success: true };
      }),
    // 밋업 일정 전체의 내 RSVP 목록 (참가자)
    myMeetupResponses: protectedProcedure
      .input(z.object({ meetupId: z.number(), registrationId: z.number() }))
      .query(async ({ input }) => {
        const allRsvps = await db.getMeetupRsvpSummary(input.meetupId);
        return allRsvps.filter(r => r.registrationId === input.registrationId);
      }),
  }),
  // ── Live Location (실시간 위치 공유) ──────────────────────────
  liveLocation: router({
    // 위치 업데이트 (참가자가 주기적으로 호출)
    update: protectedProcedure
      .input(z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
        heading: z.number().optional(),
        speed: z.number().optional(),
        altitude: z.number().optional(),
        meetupId: z.number().optional(),
        roomId: z.number().optional(),
        shareType: z.enum(["room", "meetup", "both"]).optional(),
        batteryLevel: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.upsertUserLocation({
          userId: ctx.user.id,
          latitude: String(input.latitude),
          longitude: String(input.longitude),
          accuracy: input.accuracy ? String(input.accuracy) : null,
          heading: input.heading ? String(input.heading) : null,
          speed: input.speed ? String(input.speed) : null,
          altitude: input.altitude ? String(input.altitude) : null,
          meetupId: input.meetupId || null,
          roomId: input.roomId || null,
          shareType: input.shareType || "both",
          batteryLevel: input.batteryLevel || null,
          isSharing: true,
        });

        // 위치 이력 저장
        await db.saveLocationHistory({
          userId: ctx.user.id,
          meetupId: input.meetupId || null,
          roomId: input.roomId || null,
          latitude: String(input.latitude),
          longitude: String(input.longitude),
          accuracy: input.accuracy ? String(input.accuracy) : null,
          altitude: input.altitude ? String(input.altitude) : null,
          heading: input.heading ? String(input.heading) : null,
          speed: input.speed ? String(input.speed) : null,
        });

        // 지오펜스 체크 (밋업이 있는 경우)
        if (input.meetupId) {
          try {
            const activeGeofences = await db.getActiveGeofencesByMeetup(input.meetupId);
            for (const fence of activeGeofences) {
              const distance = getDistanceFromLatLon(
                input.latitude, input.longitude,
                Number(fence.latitude), Number(fence.longitude)
              );
              const isInside = distance <= fence.radius;

              const recentEvent = await db.getRecentGeofenceEventForUser(ctx.user.id, fence.id);
              const wasInside = recentEvent?.eventType === 'enter';

              if (isInside && !wasInside && fence.notifyOnEnter) {
                await db.createGeofenceEvent({
                  geofenceId: fence.id,
                  userId: ctx.user.id,
                  eventType: 'enter',
                  latitude: String(input.latitude),
                  longitude: String(input.longitude),
                  notified: true,
                });
                // 관리자 알림
                try {
                  const userName = ctx.user.name || 'Unknown';
                  const { notifyOwner } = await import("./_core/notification");
                  await notifyOwner({ title: `[지오펜스] ${userName} 도착`, content: `${userName}님이 "${fence.name}" 영역에 도착했습니다.` });
                  // 웹 푸시 알림 발송
                  try {
                    const webpush = require("web-push");
                    const vPub = process.env.VAPID_PUBLIC_KEY || "";
                    const vPri = process.env.VAPID_PRIVATE_KEY || "";
                    if (vPub && vPri) {
                      webpush.setVapidDetails("mailto:admin@meetup-travel.1page.to", vPub, vPri);
                      const adminSubs = await db.getAdminPushSubscriptions();
                      for (const sub of adminSubs) {
                        try {
                          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: `📍 ${userName} 도착`, body: `${userName}님이 "${fence.name}" 영역에 도착했습니다.`, icon: "/favicon.ico" }));
                        } catch (pe: any) { if (pe.statusCode === 410 || pe.statusCode === 404) await db.deletePushSubscription(sub.endpoint); }
                      }
                    }
                  } catch (_pushErr) {}
                } catch (_) {}
              } else if (!isInside && wasInside && fence.notifyOnExit) {
                await db.createGeofenceEvent({
                  geofenceId: fence.id,
                  userId: ctx.user.id,
                  eventType: 'exit',
                  latitude: String(input.latitude),
                  longitude: String(input.longitude),
                  notified: true,
                });
                try {
                  const userName = ctx.user.name || 'Unknown';
                  const { notifyOwner } = await import("./_core/notification");
                  await notifyOwner({ title: `[지오펜스] ${userName} 이탈`, content: `${userName}님이 "${fence.name}" 영역에서 이탈했습니다.` });
                  // 웹 푸시 알림 발송
                  try {
                    const webpush = require("web-push");
                    const vPub = process.env.VAPID_PUBLIC_KEY || "";
                    const vPri = process.env.VAPID_PRIVATE_KEY || "";
                    if (vPub && vPri) {
                      webpush.setVapidDetails("mailto:admin@meetup-travel.1page.to", vPub, vPri);
                      const adminSubs = await db.getAdminPushSubscriptions();
                      for (const sub of adminSubs) {
                        try {
                          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: `🚨 ${userName} 이탈`, body: `${userName}님이 "${fence.name}" 영역에서 이탈했습니다.`, icon: "/favicon.ico" }));
                        } catch (pe: any) { if (pe.statusCode === 410 || pe.statusCode === 404) await db.deletePushSubscription(sub.endpoint); }
                      }
                    }
                  } catch (_pushErr) {}
                } catch (_) {}
              }
            }
          } catch (_) { /* 지오펜스 체크 실패해도 위치 업데이트는 성공 */ }
        }

        return { success: true };
      }),

    // 위치 공유 중지
    stopSharing: protectedProcedure
      .input(z.object({ roomId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (input.roomId) {
          await db.stopSharingLocationInChatRoom(ctx.user.id, input.roomId);
        } else {
          await db.stopSharingLocation(ctx.user.id);
        }
        return { success: true };
      }),

    // 내 위치 조회
    myLocation: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLocation(ctx.user.id);
    }),

    // 채팅방 참여자들의 실시간 위치 조회
    getChatRoomLocations: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(async ({ input }) => {
        const locations = await db.getActiveLocationsByChatRoom(input.roomId);
        return locations.map(loc => ({
          userId: loc.userId,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          accuracy: loc.accuracy ? Number(loc.accuracy) : null,
          heading: loc.heading ? Number(loc.heading) : null,
          speed: loc.speed ? Number(loc.speed) : null,
          shareType: loc.shareType,
          batteryLevel: loc.batteryLevel,
          updatedAt: loc.updatedAt,
        }));
      }),

    // 밋업 전체 참가자 위치 조회 (관리자용)
    getMeetupLocations: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        const locations = await db.getActiveLocationsByMeetup(input.meetupId);
        return locations.map(loc => ({
          userId: loc.userId,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          accuracy: loc.accuracy ? Number(loc.accuracy) : null,
          heading: loc.heading ? Number(loc.heading) : null,
          speed: loc.speed ? Number(loc.speed) : null,
          altitude: loc.altitude ? Number(loc.altitude) : null,
          shareType: loc.shareType,
          batteryLevel: loc.batteryLevel,
          meetupId: loc.meetupId,
          roomId: loc.roomId,
          updatedAt: loc.updatedAt,
        }));
      }),

    // 전체 활성 위치 조회 (슈퍼관리자용)
    getAllActiveLocations: protectedProcedure.query(async () => {
      const locations = await db.getAllActiveLocations();
      return locations.map(loc => ({
        userId: loc.userId,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        accuracy: loc.accuracy ? Number(loc.accuracy) : null,
        heading: loc.heading ? Number(loc.heading) : null,
        speed: loc.speed ? Number(loc.speed) : null,
        shareType: loc.shareType,
        batteryLevel: loc.batteryLevel,
        meetupId: loc.meetupId,
        roomId: loc.roomId,
        updatedAt: loc.updatedAt,
      }));
    }),

    // 사용자 이름으로 위치 검색
    searchUser: protectedProcedure
      .input(z.object({
        searchTerm: z.string().min(1),
        roomId: z.number().optional(),
        meetupId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const results = await db.searchActiveLocationsByName(input.searchTerm, input.roomId, input.meetupId);
        return results.map(r => ({
          userId: r.user.id,
          userName: r.user.name,
          email: r.user.email,
          latitude: Number(r.location.latitude),
          longitude: Number(r.location.longitude),
          accuracy: r.location.accuracy ? Number(r.location.accuracy) : null,
          heading: r.location.heading ? Number(r.location.heading) : null,
          speed: r.location.speed ? Number(r.location.speed) : null,
          shareType: r.location.shareType,
          batteryLevel: r.location.batteryLevel,
          updatedAt: r.location.updatedAt,
        }));
      }),
  }),

  // ── Geofence Router ──────────────────────────────────
  geofence: router({
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius: z.number().min(10).max(50000),
        type: z.enum(['poi', 'hotel', 'airport', 'restaurant', 'venue', 'custom']).optional(),
        notifyOnEnter: z.boolean().optional(),
        notifyOnExit: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createGeofence({
          meetupId: input.meetupId,
          name: input.name,
          description: input.description || null,
          latitude: String(input.latitude),
          longitude: String(input.longitude),
          radius: input.radius,
          type: input.type || 'custom',
          notifyOnEnter: input.notifyOnEnter ?? true,
          notifyOnExit: input.notifyOnExit ?? true,
          isActive: true,
          createdBy: ctx.user.id,
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        radius: z.number().optional(),
        type: z.enum(['poi', 'hotel', 'airport', 'restaurant', 'venue', 'custom']).optional(),
        notifyOnEnter: z.boolean().optional(),
        notifyOnExit: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, any> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.latitude !== undefined) updateData.latitude = String(data.latitude);
        if (data.longitude !== undefined) updateData.longitude = String(data.longitude);
        if (data.radius !== undefined) updateData.radius = data.radius;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.notifyOnEnter !== undefined) updateData.notifyOnEnter = data.notifyOnEnter;
        if (data.notifyOnExit !== undefined) updateData.notifyOnExit = data.notifyOnExit;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        await db.updateGeofence(id, updateData);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteGeofence(input.id);
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        const fences = await db.listGeofencesByMeetup(input.meetupId);
        return fences.map((f: any) => ({
          ...f,
          latitude: Number(f.latitude),
          longitude: Number(f.longitude),
        }));
      }),

    events: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const events = await db.listGeofenceEventsByMeetup(input.meetupId, input.limit || 100);
        return events.map((e: any) => ({
          id: e.event.id,
          geofenceId: e.event.geofenceId,
          geofenceName: e.geofence.name,
          geofenceType: e.geofence.type,
          userId: e.event.userId,
          eventType: e.event.eventType,
          latitude: Number(e.event.latitude),
          longitude: Number(e.event.longitude),
          notified: e.event.notified,
          createdAt: e.event.createdAt,
        }));
      }),
  }),

  // ── Location History Router ──────────────────────────
  locationHistory: router({
    getByUser: protectedProcedure
      .input(z.object({
        userId: z.number(),
        meetupId: z.number().optional(),
        startTime: z.number().optional(), // unix ms
        endTime: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const history = await db.getLocationHistoryByUser(input.userId, {
          meetupId: input.meetupId,
          startTime: input.startTime ? new Date(input.startTime) : undefined,
          endTime: input.endTime ? new Date(input.endTime) : undefined,
          limit: input.limit,
        });
        return history.map((h: any) => ({
          id: h.id,
          userId: h.userId,
          latitude: Number(h.latitude),
          longitude: Number(h.longitude),
          accuracy: h.accuracy ? Number(h.accuracy) : null,
          altitude: h.altitude ? Number(h.altitude) : null,
          heading: h.heading ? Number(h.heading) : null,
          speed: h.speed ? Number(h.speed) : null,
          createdAt: h.createdAt,
        }));
      }),
    getByMeetup: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const history = await db.getLocationHistoryByMeetup(input.meetupId, {
          startTime: input.startTime ? new Date(input.startTime) : undefined,
          endTime: input.endTime ? new Date(input.endTime) : undefined,
          limit: input.limit,
        });
        return history.map((h: any) => ({
          id: h.id,
          userId: h.userId,
          latitude: Number(h.latitude),
          longitude: Number(h.longitude),
          accuracy: h.accuracy ? Number(h.accuracy) : null,
          heading: h.heading ? Number(h.heading) : null,
          speed: h.speed ? Number(h.speed) : null,
          createdAt: h.createdAt,
        }));
      }),
  }),

  // ── Push Notifications ─────────────────────────────────────────────
  pushNotification: router({
    getVapidPublicKey: publicProcedure.query(() => {
      return { publicKey: process.env.VAPID_PUBLIC_KEY || "" };
    }),
    subscribe: protectedProcedure
      .input(z.object({ endpoint: z.string(), p256dh: z.string(), auth: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.savePushSubscription({ userId: ctx.user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth });
        return { success: !!result };
      }),
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await db.deletePushSubscription(input.endpoint);
        return { success: true };
      }),
    getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
      const subs = await db.getPushSubscriptionsByUserId(ctx.user.id);
      return subs.map((s: any) => ({ id: s.id, endpoint: s.endpoint, createdAt: s.createdAt }));
    }),
    testPush: protectedProcedure.mutation(async ({ ctx }) => {
      const webpush = require("web-push");
      const vapidPublic = process.env.VAPID_PUBLIC_KEY || "";
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY || "";
      if (!vapidPublic || !vapidPrivate) return { success: false, error: "VAPID keys not configured" };
      webpush.setVapidDetails("mailto:admin@meetup-travel.1page.to", vapidPublic, vapidPrivate);
      const subs = await db.getPushSubscriptionsByUserId(ctx.user.id);
      let sent = 0;
      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title: "푸시 알림 테스트", body: "웹 푸시 알림이 정상적으로 동작합니다!", icon: "/favicon.ico" }));
          sent++;
        } catch (e: any) {
          if (e.statusCode === 410 || e.statusCode === 404) await db.deletePushSubscription(sub.endpoint);
        }
      }
      return { success: true, sent };
    }),
  }),

  // ── Location History CSV Export ──────────────────────────────────
  locationExport: router({
    exportCsv: protectedProcedure
      .input(z.object({ meetupId: z.number(), userId: z.number().optional(), startTime: z.number().optional(), endTime: z.number().optional() }))
      .mutation(async ({ input }) => {
        const history = await db.getLocationHistoryForExport(input.meetupId, {
          userId: input.userId,
          startTime: input.startTime ? new Date(input.startTime) : undefined,
          endTime: input.endTime ? new Date(input.endTime) : undefined,
        });
        const header = "사용자ID,사용자명,위도,경도,정확도(m),속도(m/s),방향,시간";
        const rows = history.map((h: any) => {
          const time = h.createdAt ? new Date(h.createdAt).toISOString() : "";
          return [h.userId, (h.userName || "").replace(/,/g, " "), Number(h.latitude).toFixed(7), Number(h.longitude).toFixed(7), h.accuracy ? Number(h.accuracy).toFixed(2) : "", h.speed ? Number(h.speed).toFixed(2) : "", h.heading ? Number(h.heading).toFixed(2) : "", time].join(",");
        });
        const csv = "\uFEFF" + header + "\n" + rows.join("\n");
        return { csv, count: history.length };
      }),
  }),

  // ── Location Heatmap ──────────────────────────────────────────────────
  locationHeatmap: router({
    getData: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const data = await db.getLocationHistoryForHeatmap(input.meetupId, {
          startTime: input.startTime ? new Date(input.startTime) : undefined,
          endTime: input.endTime ? new Date(input.endTime) : undefined,
        });
        return {
          points: data.map((d: any) => ({
            lat: Number(d.lat),
            lng: Number(d.lng),
          })),
          count: data.length,
        };
      }),
   }),

  // ── 주변 장소 즐겨찾기 ──
  placeFavorite: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getPlaceFavorites(ctx.user.id);
    }),
    add: protectedProcedure
      .input(z.object({
        placeId: z.string(),
        name: z.string(),
        address: z.string().optional(),
        lat: z.number(),
        lng: z.number(),
        category: z.string().optional(),
        rating: z.number().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const already = await db.isPlaceFavorited(ctx.user.id, input.placeId);
        if (already) throw new TRPCError({ code: "CONFLICT", message: "이미 즐겨찾기에 추가된 장소입니다" });
        const id = await db.addPlaceFavorite({
          userId: ctx.user.id,
          placeId: input.placeId,
          name: input.name,
          address: input.address ?? null,
          lat: String(input.lat),
          lng: String(input.lng),
          category: input.category ?? null,
          rating: input.rating != null ? String(input.rating) : null,
          photoUrl: input.photoUrl ?? null,
        });
        return { id };
      }),
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ok = await db.removePlaceFavorite(input.id, ctx.user.id);
        if (!ok) throw new TRPCError({ code: "NOT_FOUND", message: "즐겨찾기를 찾을 수 없습니다" });
        return { success: true };
      }),
    check: protectedProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ ctx, input }) => {
        return { favorited: await db.isPlaceFavorited(ctx.user.id, input.placeId) };
      }),
  }),

  // ══════════════════════════════════════════════════════════
  // v6.12 - Travel Policies, Attendee Tiers, Emergency Contacts, Safety Alerts
  // ══════════════════════════════════════════════════════════

  travelPolicy: router({
    get: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getTravelPolicy(input.meetupId);
      }),
    upsert: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        allowedFlightClass: z.enum(["economy", "premium_economy", "business", "first", "any"]).optional(),
        maxFlightBudget: z.number().optional(),
        flightBudgetCurrency: z.string().optional(),
        allowedHotelStars: z.number().optional(),
        maxHotelBudgetPerNight: z.number().optional(),
        hotelBudgetCurrency: z.string().optional(),
        maxTravelDays: z.number().optional(),
        minAdvanceBookingDays: z.number().optional(),
        totalBudget: z.number().optional(),
        totalBudgetCurrency: z.string().optional(),
        requireApproval: z.boolean().optional(),
        autoRejectOverBudget: z.boolean().optional(),
        policyNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { meetupId, maxFlightBudget, maxHotelBudgetPerNight, totalBudget, ...rest } = input;
        const data: any = { ...rest };
        if (maxFlightBudget !== undefined) data.maxFlightBudget = String(maxFlightBudget);
        if (maxHotelBudgetPerNight !== undefined) data.maxHotelBudgetPerNight = String(maxHotelBudgetPerNight);
        if (totalBudget !== undefined) data.totalBudget = String(totalBudget);
        data.createdBy = ctx.user.id;
        const id = await db.upsertTravelPolicy(meetupId, data);
        return { id };
      }),
  }),

  attendeeTier: router({
    list: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return db.getAttendeeTiers(input.meetupId);
      }),
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        tierName: z.string(),
        tierLevel: z.number().default(0),
        color: z.string().default("#6366f1"),
        flightClass: z.enum(["economy", "premium_economy", "business", "first", "any"]).optional(),
        maxFlightBudget: z.number().optional(),
        hotelStars: z.number().optional(),
        maxHotelBudgetPerNight: z.number().optional(),
        mealAllowance: z.number().optional(),
        transportAllowance: z.number().optional(),
        airportPickup: z.boolean().default(false),
        loungeAccess: z.boolean().default(false),
        prioritySeating: z.boolean().default(false),
        giftBag: z.boolean().default(false),
        vipDinner: z.boolean().default(false),
        dedicatedInterpreter: z.boolean().default(false),
        customBenefits: z.array(z.string()).optional(),
        description: z.string().optional(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const { maxFlightBudget, maxHotelBudgetPerNight, mealAllowance, transportAllowance, ...rest } = input;
        const data: any = { ...rest };
        if (maxFlightBudget !== undefined) data.maxFlightBudget = String(maxFlightBudget);
        if (maxHotelBudgetPerNight !== undefined) data.maxHotelBudgetPerNight = String(maxHotelBudgetPerNight);
        if (mealAllowance !== undefined) data.mealAllowance = String(mealAllowance);
        if (transportAllowance !== undefined) data.transportAllowance = String(transportAllowance);
        const id = await db.createAttendeeTier(data);
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        tierName: z.string().optional(),
        tierLevel: z.number().optional(),
        color: z.string().optional(),
        flightClass: z.enum(["economy", "premium_economy", "business", "first", "any"]).optional(),
        maxFlightBudget: z.number().nullable().optional(),
        hotelStars: z.number().optional(),
        maxHotelBudgetPerNight: z.number().nullable().optional(),
        mealAllowance: z.number().nullable().optional(),
        transportAllowance: z.number().nullable().optional(),
        airportPickup: z.boolean().optional(),
        loungeAccess: z.boolean().optional(),
        prioritySeating: z.boolean().optional(),
        giftBag: z.boolean().optional(),
        vipDinner: z.boolean().optional(),
        dedicatedInterpreter: z.boolean().optional(),
        customBenefits: z.array(z.string()).optional(),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, maxFlightBudget, maxHotelBudgetPerNight, mealAllowance, transportAllowance, ...rest } = input;
        const data: any = { ...rest };
        if (maxFlightBudget !== undefined) data.maxFlightBudget = maxFlightBudget !== null ? String(maxFlightBudget) : null;
        if (maxHotelBudgetPerNight !== undefined) data.maxHotelBudgetPerNight = maxHotelBudgetPerNight !== null ? String(maxHotelBudgetPerNight) : null;
        if (mealAllowance !== undefined) data.mealAllowance = mealAllowance !== null ? String(mealAllowance) : null;
        if (transportAllowance !== undefined) data.transportAllowance = transportAllowance !== null ? String(transportAllowance) : null;
        await db.updateAttendeeTier(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAttendeeTier(input.id);
        return { success: true };
      }),
  }),

  emergencyContact: router({
    list: protectedProcedure
      .input(z.object({ registrationId: z.number().optional(), meetupId: z.number().optional() }))
      .query(async ({ input }) => {
        if (input.registrationId) return db.getEmergencyContacts(input.registrationId);
        if (input.meetupId) return db.getEmergencyContactsByMeetup(input.meetupId);
        return [];
      }),
    upsert: protectedProcedure
      .input(z.object({
        registrationId: z.number().optional(),
        meetupId: z.number().optional(),
        contactName: z.string(),
        relationship: z.string(),
        phone: z.string(),
        email: z.string().optional(),
        countryCode: z.string().optional(),
        notes: z.string().optional(),
        isPrimary: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.upsertEmergencyContact({
          userId: ctx.user.id,
          registrationId: input.registrationId ?? null,
          meetupId: input.meetupId ?? null,
          contactName: input.contactName,
          relationship: input.relationship,
          phone: input.phone,
          email: input.email ?? null,
          countryCode: input.countryCode ?? null,
          notes: input.notes ?? null,
          isPrimary: input.isPrimary,
        });
        return { id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteEmergencyContact(input.id);
        return { success: true };
      }),
  }),

  safetyAlert: router({
    list: protectedProcedure
      .input(z.object({ meetupId: z.number(), activeOnly: z.boolean().default(true) }))
      .query(async ({ input }) => {
        return db.getSafetyAlerts(input.meetupId, input.activeOnly);
      }),
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        alertType: z.enum(["sos", "weather", "security", "health", "travel_advisory", "general"]).default("general"),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        title: z.string(),
        description: z.string().optional(),
        affectedArea: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        radius: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const data: any = {
          ...input,
          reportedByUserId: ctx.user.id,
          reportedByName: ctx.user.name,
        };
        if (input.latitude !== undefined) data.latitude = String(input.latitude);
        if (input.longitude !== undefined) data.longitude = String(input.longitude);
        const id = await db.createSafetyAlert(data);
        return { id };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["active", "monitoring", "resolved", "dismissed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSafetyAlert(id, data as any);
        return { success: true };
      }),
    resolve: protectedProcedure
      .input(z.object({ id: z.number(), note: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        await db.resolveSafetyAlert(input.id, ctx.user.id, input.note);
        return { success: true };
      }),
    // SOS 긴급 신고 (참석자용)
    sos: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        description: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const data: any = {
          meetupId: input.meetupId,
          alertType: "sos",
          severity: "critical",
          title: `SOS: ${ctx.user.name || "참석자"} 긴급 신고`,
          description: input.description,
          reportedByUserId: ctx.user.id,
          reportedByName: ctx.user.name,
        };
        if (input.latitude !== undefined) data.latitude = String(input.latitude);
        if (input.longitude !== undefined) data.longitude = String(input.longitude);
        const id = await db.createSafetyAlert(data);
        return { id, message: "SOS 신고가 접수되었습니다. 관리자에게 알림이 전송됩니다." };
      }),
  }),

  // ── Budget Dashboard ──────────────────────────────
  budgetDashboard: router({
    summary: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        const policy = await db.getTravelPolicy(input.meetupId);
        const tiers = await db.getAttendeeTiers(input.meetupId);
        return {
          policy,
          tiers,
          totalBudget: policy ? Number(policy.totalBudget || 0) : 0,
          spentAmount: policy ? Number(policy.spentAmount || 0) : 0,
          remainingBudget: policy ? Number(policy.totalBudget || 0) - Number(policy.spentAmount || 0) : 0,
          budgetUtilization: policy && Number(policy.totalBudget) > 0
            ? Math.round((Number(policy.spentAmount || 0) / Number(policy.totalBudget)) * 100)
            : 0,
        };
      }),
  }),

  // ── Booking Pipeline Dashboard ─────────────────────────────
  bookingPipeline: router({
    stats: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBookingPipelineStats(input.meetupId);
      }),
  }),

  // ── SOS Emergency ─────────────────────────────────────────
  sos: router({
    send: protectedProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        message: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. safety_alerts에 SOS 기록
        const alert = await db.createSafetyAlert({
          meetupId: input.meetupId || 0,
          alertType: "sos",
          severity: "critical",
          title: `SOS from ${ctx.user.name}`,
          description: input.message || `Emergency SOS from ${ctx.user.name}. Location: ${input.latitude || 'N/A'}, ${input.longitude || 'N/A'}`,
          affectedArea: input.latitude && input.longitude ? `${input.latitude}, ${input.longitude}` : undefined,
        });
        // 2. 관리자에게 알림
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `🚨 SOS 긴급 알림 - ${ctx.user.name}`,
            content: `참가자 ${ctx.user.name}이(가) SOS 긴급 버튼을 눌렀습니다.\n메시지: ${input.message || '없음'}\n위치: ${input.latitude || 'N/A'}, ${input.longitude || 'N/A'}`,
          });
        } catch (e) { console.error("SOS notify error:", e); }
        // 3. 웹 푸시 알림
        try {
          await sendPushToAdmins({
            title: `🚨 SOS - ${ctx.user.name}`,
            body: input.message || "긴급 도움 요청",
            data: { url: "/admin/safety-center" },
          });
        } catch (e) { console.error("SOS push error:", e); }
        return { success: true, alertId: alert };
      }),
  }),

  // ── Executive Report ──────────────────────────────────────
  executiveReport: router({
    getData: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getExecutiveReportData(input.meetupId);
      }),
  }),
  // ── RSVP Reminder ──────────────────────────────────────
  rsvpReminder: router({
    getSettings: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRsvpReminderSettings(input.meetupId);
      }),
    updateSettings: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        enabled: z.boolean().optional(),
        reminderDays: z.array(z.number()).optional(),
        channels: z.array(z.string()).optional(),
        emailSubjectTemplate: z.string().optional(),
        emailBodyTemplate: z.string().optional(),
        smsTemplate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { meetupId, ...data } = input;
        return await db.upsertRsvpReminderSettings(meetupId, { ...data, createdBy: ctx.user.id } as any);
      }),
    getStats: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRsvpStats(input.meetupId);
      }),
    getPending: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPendingRsvpInvitations(input.meetupId);
      }),
    getLogs: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getRsvpReminderLogs(input.meetupId);
      }),
    sendReminders: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        reminderType: z.enum(["d7", "d3", "d1", "custom"]),
        channel: z.enum(["email", "sms", "telegram", "push"]).default("email"),
        customSubject: z.string().optional(),
        customBody: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const pending = await db.getPendingRsvpInvitations(input.meetupId);
        if (pending.length === 0) return { sent: 0, failed: 0, skipped: 0 };
        const meetup = await db.getMeetupById(input.meetupId);
        let sent = 0, failed = 0, skipped = 0;
        for (const inv of pending) {
          try {
            if (!inv.recipientEmail && input.channel === "email") { skipped++; continue; }
            const subject = input.customSubject || `[Reminder] ${meetup?.title || 'Event'} - RSVP Required`;
            const body = input.customBody || `Dear ${inv.recipientName || 'Guest'},\n\nThis is a reminder to RSVP for ${meetup?.title || 'the event'}. Please respond at your earliest convenience.\n\nBest regards,\nAlpha Trip Team`;
            // Log the reminder
            await db.createRsvpReminderLog({
              meetupId: input.meetupId,
              invitationId: inv.id,
              reminderType: input.reminderType,
              channel: input.channel,
              recipientEmail: inv.recipientEmail,
              recipientPhone: inv.recipientPhone,
              recipientName: inv.recipientName,
              subject,
              body,
              status: "sent",
            });
            sent++;
          } catch (e: any) {
            await db.createRsvpReminderLog({
              meetupId: input.meetupId,
              invitationId: inv.id,
              reminderType: input.reminderType,
              channel: input.channel,
              recipientName: inv.recipientName,
              status: "failed",
              errorMessage: e.message,
            });
            failed++;
          }
        }
        // Update last run
        await db.upsertRsvpReminderSettings(input.meetupId, { lastRunAt: new Date() } as any);
        return { sent, failed, skipped, total: pending.length };
      }),
  }),
  // ── Self Booking Portal ──────────────────────────────────
  selfBooking: router({
    create: protectedProcedure
      .input(z.object({
        meetupId: z.number(),
        registrationId: z.number(),
        bookingType: z.enum(["flight", "hotel", "both"]),
        flightDepartureCity: z.string().optional(),
        flightArrivalCity: z.string().optional(),
        flightDepartureDate: z.string().optional(),
        flightReturnDate: z.string().optional(),
        flightClass: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
        flightPreferences: z.string().optional(),
        hotelCity: z.string().optional(),
        hotelCheckIn: z.string().optional(),
        hotelCheckOut: z.string().optional(),
        hotelStarRating: z.number().optional(),
        hotelRoomType: z.string().optional(),
        hotelPreferences: z.string().optional(),
        estimatedBudget: z.string().optional(),
        currency: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 정책 준수 확인
        const policy = await db.getTravelPolicy(input.meetupId);
        let policyCompliant = true;
        const violations: string[] = [];
        if (policy) {
          if (input.flightClass && policy.allowedFlightClass && policy.allowedFlightClass !== "any") {
            const classOrder = ["economy", "premium_economy", "business", "first"];
            if (classOrder.indexOf(input.flightClass) > classOrder.indexOf(policy.allowedFlightClass)) {
              policyCompliant = false;
              violations.push(`Flight class ${input.flightClass} exceeds policy limit (${policy.allowedFlightClass})`);
            }
          }
          if (input.estimatedBudget && policy.totalBudget) {
            const budget = Number(input.estimatedBudget);
            const maxPerPerson = Number(policy.totalBudget) / 10; // rough per-person estimate
            if (budget > maxPerPerson) {
              violations.push(`Estimated budget $${budget} may exceed per-person allocation`);
            }
          }
        }
        const id = await db.createSelfBookingRequest({
          ...input,
          userId: ctx.user.id,
          policyCompliant,
          policyViolations: violations.length > 0 ? violations : null,
          status: "submitted",
        } as any);
        // Notify admins
        try {
          await sendPushToAdmins({
            title: "New Self-Booking Request",
            body: `${ctx.user.name} submitted a ${input.bookingType} booking request`,
            data: { url: "/admin/self-bookings" },
          });
        } catch (e) { /* ignore */ }
        return { id, policyCompliant, violations };
      }),
    myRequests: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getSelfBookingRequestsByUser(ctx.user.id);
      }),
    listByMeetup: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSelfBookingRequests(input.meetupId);
      }),
    stats: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSelfBookingStats(input.meetupId);
      }),
    approve: protectedProcedure
      .input(z.object({ id: z.number(), adminNotes: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSelfBookingRequest(input.id, {
          status: "approved",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
          adminNotes: input.adminNotes,
        });
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ id: z.number(), rejectionReason: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateSelfBookingRequest(input.id, {
          status: "rejected",
          rejectionReason: input.rejectionReason,
        });
        return { success: true };
      }),
    updateStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["draft", "submitted", "approved", "rejected", "booked", "cancelled"]) }))
      .mutation(async ({ input }) => {
        await db.updateSelfBookingRequest(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ── SNS 게시물 관리 ────────────────────────────────────────
  snsPost: router({
    list: adminProcedure
      .input(z.object({ status: z.string().optional(), platform: z.string().optional(), meetupId: z.number().optional() }).optional())
      .query(({ input }) => db.getSnsPosts(input)),
    get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getSnsPostById(input.id)),
    stats: adminProcedure.query(() => db.getSnsPostStats()),
    create: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        platform: z.enum(["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram", "all"]).default("all"),
        contentType: z.enum(["text", "image", "video", "carousel"]).default("text"),
        title: z.string().optional(),
        content: z.string().min(1),
        imageUrls: z.array(z.string()).optional(),
        hashtags: z.array(z.string()).optional(),
        scheduledAt: z.string().optional(),
        status: z.enum(["draft", "scheduled"]).default("draft"),
        aiGenerated: z.boolean().default(false),
        aiPrompt: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createSnsPost({
          ...input,
          createdBy: ctx.user.id,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          imageUrls: input.imageUrls || [],
          hashtags: input.hashtags || [],
        });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        title: z.string().optional(),
        platform: z.enum(["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram", "all"]).optional(),
        imageUrls: z.array(z.string()).optional(),
        hashtags: z.array(z.string()).optional(),
        scheduledAt: z.string().optional(),
        status: z.enum(["draft", "scheduled", "published", "cancelled"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSnsPost(id, {
          ...data,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        });
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSnsPost(input.id);
      return { success: true };
    }),
    // AI 콘텐츠 생성
    generateContent: adminProcedure
      .input(z.object({
        meetupId: z.number().optional(),
        platform: z.enum(["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram", "all"]).default("all"),
        tone: z.enum(["professional", "casual", "exciting", "informative"]).default("professional"),
        language: z.string().default("ko"),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        let meetupInfo = "";
        if (input.meetupId) {
          const meetup = await db.getMeetupById(input.meetupId);
          if (meetup) {
            meetupInfo = `\n밋업 정보:\n- 제목: ${meetup.title}\n- 장소: ${meetup.location || "미정"}\n- 기간: ${meetup.scheduleStart ? new Date(meetup.scheduleStart).toLocaleDateString() : ""} ~ ${meetup.scheduleEnd ? new Date(meetup.scheduleEnd).toLocaleDateString() : ""}\n- 설명: ${meetup.description || ""}\n- 유형: ${meetup.type}`;
          }
        }
        const platformGuide: Record<string, string> = {
          twitter: "최대 280자, 해시태그 3-5개, 간결하고 임팩트 있는 문체",
          instagram: "시각적 설명, 해시태그 10-15개, 이모지 사용, CTA 포함",
          tiktok: "짧고 재미있는 톤, 트렌드 해시태그, 점은 층 타겟",
          facebook: "상세한 설명, 링크 포함 가능, 커뮤니티 참여 유도",
          linkedin: "전문적인 톤, 업계 키워드, 네트워킹 강조",
          telegram: "간결한 안내, 링크 포함, 직접적 CTA",
          all: "다양한 플랫폼에 적합한 범용 콘텐츠",
        };
        const toneGuide: Record<string, string> = {
          professional: "전문적이고 신뢰감 있는 톤",
          casual: "친근하고 편안한 톤",
          exciting: "흥미진진하고 에너지 넘치는 톤",
          informative: "정보 전달에 초점을 맞춘 톤",
        };
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a social media content creator for meetup/event promotion.
Generate engaging SNS post content based on the given information.

Platform: ${input.platform} - ${platformGuide[input.platform] || platformGuide.all}
Tone: ${input.tone} - ${toneGuide[input.tone]}
Language: ${input.language === "ko" ? "한국어" : input.language}

Return ONLY valid JSON:
{
  "title": "string - 게시물 제목",
  "content": "string - 본문 (플랫폼 가이드에 맞게)",
  "hashtags": ["string - 해시태그 배열"],
  "imagePrompt": "string - AI 이미지 생성을 위한 영어 프롬프트 (professional event poster style)",
  "suggestedSchedule": "string - 최적 게시 시간 제안 (ISO format)"
}`,
            },
            {
              role: "user",
              content: `${meetupInfo}\n${input.additionalContext ? `추가 컨텍스트: ${input.additionalContext}` : "일반적인 밋업 홍보 콘텐츠를 생성해주세요."}`,
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          try {
            const parsed = JSON.parse(content);
            return { success: true, data: parsed };
          } catch {
            return { success: false, data: null, error: "AI 응답 파싱 실패" };
          }
        }
        return { success: false, data: null, error: "AI 응답 없음" };
      }),
    // AI 이미지 생성
    generateImage: adminProcedure
      .input(z.object({ prompt: z.string().min(3) }))
      .mutation(async ({ input }) => {
        try {
          const { generateImage } = await import("./_core/imageGeneration");
          const result = await generateImage({ prompt: input.prompt });
          return { success: true, url: result.url };
        } catch (e: any) {
          return { success: false, url: null, error: e.message || "이미지 생성 실패" };
        }
      }),
  }),

  // ── SNS 템플릿 ────────────────────────────────────────────
  snsTemplate: router({
    list: adminProcedure.query(() => db.getSnsTemplates()),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        platform: z.enum(["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram", "all"]).default("all"),
        contentType: z.enum(["text", "image", "video", "carousel"]).default("text"),
        templateContent: z.string().min(1),
        imagePrompt: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createSnsTemplate({ ...input, createdBy: ctx.user.id, hashtags: input.hashtags || [] });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        templateContent: z.string().optional(),
        imagePrompt: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSnsTemplate(id, data);
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSnsTemplate(input.id);
      return { success: true };
    }),
  }),

  // ── SNS 계정 관리 ─────────────────────────────────────────
  snsAccount: router({
    list: adminProcedure.query(({ ctx }) => db.getSnsAccounts()),
    create: adminProcedure
      .input(z.object({
        platform: z.enum(["twitter", "instagram", "tiktok", "facebook", "linkedin", "telegram"]),
        accountName: z.string().min(1),
        accountId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createSnsAccount({ ...input, userId: ctx.user.id });
        return { id };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), accountName: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSnsAccount(id, data);
        return { success: true };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteSnsAccount(input.id);
      return { success: true };
    }),
  }),

  // ── AI 일괄 등록 ───────────────────────────────────────────
  aiBulk: router({
    parseRegistrations: adminProcedure
      .input(z.object({ text: z.string().min(5), meetupId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a data extraction assistant. Parse the following text containing multiple participant registrations.
Extract each person's information and return a JSON array.

Return ONLY valid JSON:
{
  "participants": [
    {
      "name": "string",
      "phone": "string",
      "messengerId": "string - telegram/kakao ID",
      "locationType": "domestic" | "overseas",
      "category": "meetup" | "pre_visit" | "event" | "meeting" | "other",
      "teamName": "string",
      "referrerName": "string",
      "notes": "string"
    }
  ],
  "totalCount": number
}

Rules:
- Parse Korean, English, Chinese names
- Extract phone numbers in any format
- Parse messenger IDs (telegram: @xxx, kakao: xxx)
- If no category specified, default to "meetup"
- If no locationType specified, default to "domestic"
- Always respond in valid JSON only.`,
            },
            { role: "user", content: input.text },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          try {
            const parsed = JSON.parse(content);
            return { success: true, data: parsed };
          } catch {
            return { success: false, data: null, error: "AI 응답 파싱 실패" };
          }
        }
        return { success: false, data: null, error: "AI 응답 없음" };
      }),
    bulkCreate: adminProcedure
      .input(z.object({
        meetupId: z.number(),
        participants: z.array(z.object({
          name: z.string(),
          phone: z.string().optional(),
          messengerId: z.string().optional(),
          locationType: z.enum(["domestic", "overseas"]).default("domestic"),
          category: z.enum(["meetup", "pre_visit", "event", "meeting", "other"]).default("meetup"),
          teamName: z.string().optional(),
          referrerName: z.string().optional(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const dataList = input.participants.map(p => ({
          meetupId: input.meetupId,
          name: p.name,
          phone: p.phone || "",
          messengerId: p.messengerId || "",
          locationType: p.locationType as "domestic" | "overseas",
          category: p.category as any,
          teamName: p.teamName || "",
          referrerName: p.referrerName || "",
          notes: p.notes || "",
          status: "approved" as const,
        }));
        const ids = await db.bulkCreateRegistrations(dataList);
        return { success: true, count: ids.length, ids };
      }),
  }),

  // ── AI 스케줄 자동 생성 ─────────────────────────────────────
  aiSchedule: router({
    generate: adminProcedure
      .input(z.object({ meetupId: z.number(), preferences: z.string().optional() }))
      .mutation(async ({ input }) => {
        const meetup = await db.getMeetupById(input.meetupId);
        if (!meetup) throw new TRPCError({ code: "NOT_FOUND", message: "밋업을 찾을 수 없습니다" });
        const existingEvents = await db.getScheduleEvents(input.meetupId);
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a meetup schedule planner. Generate a detailed schedule for the given meetup.

Return ONLY valid JSON:
{
  "schedules": [
    {
      "title": "string - 일정 제목 (한국어)",
      "location": "string - 장소",
      "eventTime": "string - ISO datetime",
      "endTime": "string - ISO datetime",
      "description": "string - 상세 설명 (한국어)",
      "eventOrder": number
    }
  ]
}

Rules:
- Generate schedules in Korean
- Include typical meetup activities: 환영식, 네트워킹, 세션, 식사, 관광, 자유시간, 환송식
- Consider the meetup type and location
- Space events reasonably throughout the day
- Include meal times
- If preferences are given, incorporate them`,
            },
            {
              role: "user",
              content: `밋업: ${meetup.title}\n장소: ${meetup.location || "미정"}\n기간: ${meetup.scheduleStart ? new Date(meetup.scheduleStart).toISOString() : ""} ~ ${meetup.scheduleEnd ? new Date(meetup.scheduleEnd).toISOString() : ""}\n유형: ${meetup.type}\n기존 일정 수: ${existingEvents.length}\n${input.preferences ? `선호사항: ${input.preferences}` : ""}`,
            },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content;
        if (typeof content === "string") {
          try {
            const parsed = JSON.parse(content);
            return { success: true, data: parsed };
          } catch {
            return { success: false, data: null, error: "AI 응답 파싱 실패" };
          }
        }
        return { success: false, data: null, error: "AI 응답 없음" };
      }),
    // 생성된 스케줄 일괄 저장
    bulkSave: adminProcedure
      .input(z.object({
        meetupId: z.number(),
        schedules: z.array(z.object({
          title: z.string(),
          location: z.string().optional(),
          eventTime: z.string(),
          endTime: z.string().optional(),
          description: z.string().optional(),
          eventOrder: z.number().default(0),
        })),
      }))
      .mutation(async ({ input }) => {
        const ids = [];
        for (const s of input.schedules) {
          const id = await db.createScheduleEvent({
            meetupId: input.meetupId,
            title: s.title,
            location: s.location,
            eventTime: new Date(s.eventTime),
            endTime: s.endTime ? new Date(s.endTime) : undefined,
            description: s.description,
            eventOrder: s.eventOrder,
          });
          ids.push(id);
        }
        return { success: true, count: ids.length, ids };
      }),
  }),
  // ══ v6.19 - 현장 QR 체크인 ══
  eventCheckin: router({
    // QR 토큰 발급 (개별)
    generateToken: adminProcedure
      .input(z.object({ registrationId: z.number(), meetupId: z.number() }))
      .mutation(async ({ input }) => {
        // 이미 발급된 토큰이 있으면 반환
        const existing = await db.getEventCheckinByRegistration(input.registrationId, input.meetupId);
        if (existing) return { id: existing.id, qrToken: existing.qrToken, alreadyExists: true };
        const qrToken = nanoid(32);
        const id = await db.createEventCheckin({
          registrationId: input.registrationId,
          meetupId: input.meetupId,
          qrToken,
        });
        return { id, qrToken, alreadyExists: false };
      }),
    // QR 토큰 일괄 발급
    bulkGenerateTokens: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .mutation(async ({ input }) => {
        const regs = await db.getRegistrations({ meetupId: input.meetupId, status: "approved" });
        let created = 0;
        let skipped = 0;
        for (const reg of regs) {
          const existing = await db.getEventCheckinByRegistration(reg.id, input.meetupId);
          if (existing) { skipped++; continue; }
          const qrToken = nanoid(32);
          await db.createEventCheckin({
            registrationId: reg.id,
            meetupId: input.meetupId,
            qrToken,
          });
          created++;
        }
        return { created, skipped, total: regs.length };
      }),
    // QR 코드 이미지 생성 (base64)
    getQrImage: publicProcedure
      .input(z.object({ qrToken: z.string() }))
      .query(async ({ input }) => {
        const QRCode = await import("qrcode");
        const checkin = await db.getEventCheckinByToken(input.qrToken);
        if (!checkin) throw new TRPCError({ code: "NOT_FOUND", message: "QR token not found" });
        // QR 코드에 체크인 URL 인코딩
        const checkinUrl = `${process.env.VITE_OAUTH_PORTAL_URL ? '' : ''}/checkin-scan?token=${input.qrToken}`;
        const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
          width: 400,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        return { qrDataUrl, qrToken: input.qrToken, checkedIn: checkin.checkedIn };
      }),
    // QR 스캔으로 체크인 처리
    scanCheckin: protectedProcedure
      .input(z.object({
        qrToken: z.string(),
        locationNote: z.string().optional(),
        deviceInfo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const checkin = await db.getEventCheckinByToken(input.qrToken);
        if (!checkin) throw new TRPCError({ code: "NOT_FOUND", message: "유효하지 않은 QR 코드입니다" });
        if (checkin.checkedIn) {
          const reg = await db.getRegistrationById(checkin.registrationId);
          return {
            success: false,
            alreadyCheckedIn: true,
            checkedInAt: checkin.checkedInAt,
            participantName: reg?.name || "Unknown",
            message: "이미 체크인된 참가자입니다",
          };
        }
        await db.updateEventCheckin(checkin.id, {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: ctx.user.id,
          checkInMethod: "qr_scan",
          locationNote: input.locationNote,
          deviceInfo: input.deviceInfo,
        });
        const reg = await db.getRegistrationById(checkin.registrationId);
        const meetup = await db.getMeetupById(checkin.meetupId);
        const stats = await db.getEventCheckinStats(checkin.meetupId);
        // 비동기 알림 (응답 지연 방지)
        (async () => {
          try {
            // 1) 주최자에게 텔레그램 알림
            await sendTelegram(
              `✅ <b>체크인 완료</b>\n` +
              `👤 ${reg?.name || "Unknown"}\n` +
              `📋 ${meetup?.title || "Unknown"}\n` +
              `📊 ${stats.checkedIn + 1}/${stats.total} 체크인 완료`
            );
            // 2) 참가자에게 이메일 환영 메시지
            if (reg?.email) {
              const { sendEmail } = await import("./email");
              await sendEmail({
                to: reg.email,
                subject: `🎉 ${meetup?.title || "밋업"} 체크인 완료!`,
                html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                  <h2 style="color:#6366f1">환영합니다, ${reg.name}님! 🎉</h2>
                  <p><strong>${meetup?.title || "밋업"}</strong>에 성공적으로 체크인되었습니다.</p>
                  <p style="color:#666;font-size:14px">체크인 시간: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
                  <p>즐거운 시간 보내세요!</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
                  <p style="color:#999;font-size:12px">Alpha Trip</p>
                </div>`,
              });
            }
          } catch (e) { console.error("[Checkin Notification]", e); }
        })();
        return {
          success: true,
          alreadyCheckedIn: false,
          participantName: reg?.name || "Unknown",
          meetupTitle: meetup?.title || "Unknown",
          checkedInAt: new Date(),
          message: "체크인 완료!",
        };
      }),
    // 수동 체크인 (관리자)
    manualCheckin: adminProcedure
      .input(z.object({ registrationId: z.number(), meetupId: z.number(), locationNote: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        let checkin = await db.getEventCheckinByRegistration(input.registrationId, input.meetupId);
        if (!checkin) {
          const qrToken = nanoid(32);
          const id = await db.createEventCheckin({
            registrationId: input.registrationId,
            meetupId: input.meetupId,
            qrToken,
            checkedIn: true,
            checkedInAt: new Date(),
            checkedInBy: ctx.user.id,
            checkInMethod: "manual",
            locationNote: input.locationNote,
          });
          return { success: true, id };
        }
        if (checkin.checkedIn) return { success: false, message: "이미 체크인됨" };
        await db.updateEventCheckin(checkin.id, {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: ctx.user.id,
          checkInMethod: "manual",
          locationNote: input.locationNote,
        });
        return { success: true, id: checkin.id };
      }),
    // 체크인 취소
    undoCheckin: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateEventCheckin(input.id, {
          checkedIn: false,
          checkedInAt: null as any,
          checkedInBy: null as any,
        });
        return { success: true };
      }),
    // 밋업별 체크인 목록
    listByMeetup: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        // 참가자 정보 조인
        const enriched = await Promise.all(checkins.map(async (c) => {
          const reg = await db.getRegistrationById(c.registrationId);
          return { ...c, participantName: reg?.name, participantPhone: reg?.phone, participantTeam: reg?.teamName };
        }));
        return enriched;
      }),
    // 체크인 통계
    stats: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(({ input }) => db.getEventCheckinStats(input.meetupId)),
    // 내 QR 코드 조회 (참가자용)
    myQr: protectedProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ ctx, input }) => {
        // userId로 registration 찾기
        const regs = await db.getRegistrations({ userId: ctx.user.id, meetupId: input.meetupId });
        if (regs.length === 0) return null;
        const reg = regs[0];
        const checkin = await db.getEventCheckinByRegistration(reg.id, input.meetupId);
        if (!checkin) return null;
        const QRCode = await import("qrcode");
        const checkinUrl = `/checkin-scan?token=${checkin.qrToken}`;
        const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
          width: 400,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        return {
          qrToken: checkin.qrToken,
          qrDataUrl,
          checkedIn: checkin.checkedIn,
          checkedInAt: checkin.checkedInAt,
          registrationName: reg.name,
        };
      }),
    // 토큰으로 참가자 정보 조회 (공개)
    getByToken: publicProcedure
      .input(z.object({ qrToken: z.string() }))
      .query(async ({ input }) => {
        const checkin = await db.getEventCheckinByToken(input.qrToken);
        if (!checkin) return null;
        const reg = await db.getRegistrationById(checkin.registrationId);
        const meetup = await db.getMeetupById(checkin.meetupId);
        return {
          id: checkin.id,
          checkedIn: checkin.checkedIn,
          checkedInAt: checkin.checkedInAt,
          participantName: reg?.name,
          meetupTitle: meetup?.title,
          meetupId: checkin.meetupId,
        };
      }),
    // QR 코드 이메일 발송 (개별)
    sendQrEmail: adminProcedure
      .input(z.object({ checkinId: z.number(), origin: z.string().optional() }))
      .mutation(async ({ input }) => {
        const { sendEmail } = await import("./email");
        const QRCode = await import("qrcode");
        const checkinRows = await (async () => {
          const d = await db.getDb(); if (!d) return [];
          const { eventCheckins: ec } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          return d.select().from(ec).where(eqOp(ec.id, input.checkinId)).limit(1);
        })();
        const checkin = checkinRows[0];
        if (!checkin) throw new TRPCError({ code: "NOT_FOUND", message: "체크인 레코드를 찾을 수 없습니다" });
        const reg = await db.getRegistrationById(checkin.registrationId);
        if (!reg?.email) throw new TRPCError({ code: "BAD_REQUEST", message: "참가자 이메일이 없습니다" });
        const meetup = await db.getMeetupById(checkin.meetupId);
        const baseUrl = input.origin || "";
        const checkinUrl = `${baseUrl}/checkin-scanner?token=${checkin.qrToken}`;
        const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 300, margin: 2 });
        await sendEmail({
          to: reg.email,
          subject: `🎫 ${meetup?.title || "밋업"} - QR 체크인 코드`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#6366f1">🎫 QR 체크인 코드</h2>
            <p><strong>${reg.name}</strong>님, <strong>${meetup?.title || "밋업"}</strong>의 QR 체크인 코드입니다.</p>
            <div style="text-align:center;margin:24px 0">
              <img src="${qrDataUrl}" alt="QR Code" style="width:250px;height:250px" />
            </div>
            <p style="text-align:center;color:#666;font-size:14px">행사 현장에서 이 QR 코드를 보여주세요.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
            <p style="color:#999;font-size:12px">Alpha Trip</p>
          </div>`,
        });
        return { success: true };
      }),
    // QR 코드 일괄 이메일 발송
    bulkSendQrEmail: adminProcedure
      .input(z.object({ meetupId: z.number(), origin: z.string().optional() }))
      .mutation(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        const { sendEmail } = await import("./email");
        const QRCode = await import("qrcode");
        let sent = 0, skipped = 0, failed = 0;
        for (const checkin of checkins) {
          const reg = await db.getRegistrationById(checkin.registrationId);
          if (!reg?.email) { skipped++; continue; }
          try {
            const meetup = await db.getMeetupById(checkin.meetupId);
            const baseUrl = input.origin || "";
            const checkinUrl = `${baseUrl}/checkin-scanner?token=${checkin.qrToken}`;
            const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 300, margin: 2 });
            await sendEmail({
              to: reg.email,
              subject: `🎫 ${meetup?.title || "밋업"} - QR 체크인 코드`,
              html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h2 style="color:#6366f1">🎫 QR 체크인 코드</h2>
                <p><strong>${reg.name}</strong>님, <strong>${meetup?.title || "밋업"}</strong>의 QR 체크인 코드입니다.</p>
                <div style="text-align:center;margin:24px 0">
                  <img src="${qrDataUrl}" alt="QR Code" style="width:250px;height:250px" />
                </div>
                <p style="text-align:center;color:#666;font-size:14px">행사 현장에서 이 QR 코드를 보여주세요.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
                <p style="color:#999;font-size:12px">Alpha Trip</p>
              </div>`,
            });
            sent++;
          } catch { failed++; }
        }
        return { sent, skipped, failed, total: checkins.length };
      }),
    // QR 코드 텔레그램 발송 (개별)
    sendQrTelegram: adminProcedure
      .input(z.object({ checkinId: z.number(), origin: z.string().optional() }))
      .mutation(async ({ input }) => {
        const checkinRows = await (async () => {
          const d = await db.getDb(); if (!d) return [];
          const { eventCheckins: ec } = await import("../drizzle/schema");
          const { eq: eqOp } = await import("drizzle-orm");
          return d.select().from(ec).where(eqOp(ec.id, input.checkinId)).limit(1);
        })();
        const checkin = checkinRows[0];
        if (!checkin) throw new TRPCError({ code: "NOT_FOUND" });
        const reg = await db.getRegistrationById(checkin.registrationId);
        const meetup = await db.getMeetupById(checkin.meetupId);
        const baseUrl = input.origin || "";
        const checkinUrl = `${baseUrl}/checkin-scanner?token=${checkin.qrToken}`;
        const ok = await sendTelegram(
          `🎫 <b>QR 체크인 코드</b>\n` +
          `👤 ${reg?.name || "Unknown"}\n` +
          `📋 ${meetup?.title || "Unknown"}\n` +
          `🔗 <a href="${checkinUrl}">체크인 링크</a>`
        );
        return { success: ok };
      }),
    // QR 코드 일괄 텔레그램 발송
    bulkSendQrTelegram: adminProcedure
      .input(z.object({ meetupId: z.number(), origin: z.string().optional() }))
      .mutation(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        let sent = 0, failed = 0;
        for (const checkin of checkins) {
          const reg = await db.getRegistrationById(checkin.registrationId);
          const meetup = await db.getMeetupById(checkin.meetupId);
          const baseUrl = input.origin || "";
          const checkinUrl = `${baseUrl}/checkin-scanner?token=${checkin.qrToken}`;
          try {
            await sendTelegram(
              `🎫 <b>QR 체크인 코드</b>\n` +
              `👤 ${reg?.name || "Unknown"}\n` +
              `📋 ${meetup?.title || "Unknown"}\n` +
              `🔗 <a href="${checkinUrl}">체크인 링크</a>`
            );
            sent++;
          } catch { failed++; }
        }
        return { sent, failed, total: checkins.length };
      }),

    // ── 네임택 PDF 생성 ──────────────────────────────────
    generateNametag: adminProcedure
      .input(z.object({ registrationId: z.number(), meetupId: z.number() }))
      .mutation(async ({ input }) => {
        const reg = await db.getRegistrationById(input.registrationId);
        if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
        const checkin = await db.getEventCheckinsByMeetup(input.meetupId);
        const token = checkin.find(c => c.registrationId === input.registrationId);
        const QRCode = await import("qrcode");
        const checkinUrl = token ? `${process.env.VITE_OAUTH_PORTAL_URL || ""}/checkin/${token.qrToken}` : "";
        const qrDataUrl = token ? await QRCode.toDataURL(checkinUrl, { width: 200, margin: 1 }) : "";
        return {
          name: reg.name,
          organization: reg.teamName || "",
          email: reg.email || "",
          phone: reg.phone || "",
          qrDataUrl,
          qrToken: token?.qrToken || "",
          registrationId: reg.id,
          meetupId: input.meetupId,
        };
      }),

    // ── 일괄 네임택 데이터 ──────────────────────────────────
    bulkNametagData: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .mutation(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        const checkedInOnly = checkins.filter(c => c.checkedIn);
        const QRCode = await import("qrcode");
        const results = [];
        for (const c of checkedInOnly) {
          const reg = await db.getRegistrationById(c.registrationId);
          if (!reg) continue;
          const checkinUrl = `${process.env.VITE_OAUTH_PORTAL_URL || ""}/checkin/${c.qrToken}`;
          const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 200, margin: 1 });
          results.push({
            name: reg.name,
            organization: reg.teamName || "",
            email: reg.email || "",
            qrDataUrl,
            registrationId: reg.id,
          });
        }
        return { nametags: results, total: results.length };
      }),

    // ── 시간대별 체크인 추이 ──────────────────────────────────
    getHourlyStats: adminProcedure
      .input(z.object({ meetupId: z.number() }))
      .query(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        const checkedIn = checkins.filter(c => c.checkedIn && c.checkedInAt);
        const hourlyMap: Record<string, number> = {};
        for (const c of checkedIn) {
          const hour = new Date(c.checkedInAt!).getHours();
          const key = `${hour.toString().padStart(2, "0")}:00`;
          hourlyMap[key] = (hourlyMap[key] || 0) + 1;
        }
        // 0~23시 전체 시간대 생성
        const hourly = Array.from({ length: 24 }, (_, i) => {
          const key = `${i.toString().padStart(2, "0")}:00`;
          return { hour: key, count: hourlyMap[key] || 0 };
        });
        const total = checkins.length;
        const checkedInCount = checkedIn.length;
        const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;
        return { hourly, total, checkedInCount, rate };
      }),

    // ── 리마인더 발송 (이메일) ──────────────────────────────────
    sendReminder: adminProcedure
      .input(z.object({ meetupId: z.number(), subject: z.string().optional(), message: z.string().optional() }))
      .mutation(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        const QRCode = await import("qrcode");
        let sent = 0, failed = 0;
        for (const c of checkins) {
          const reg = await db.getRegistrationById(c.registrationId);
          if (!reg || !reg.email) { failed++; continue; }
          try {
            const checkinUrl = `${process.env.VITE_OAUTH_PORTAL_URL || ""}/checkin/${c.qrToken}`;
            const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 300, margin: 2 });
            const subject = input.subject || "[Alpha Trip] 밋업 리마인더 - 내일 행사가 시작됩니다!";
            const customMsg = input.message || "내일 행사에서 만나요! 아래 QR 코드를 현장에서 제시해 주세요.";
            const html = `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#6366f1;">🎉 밋업 리마인더</h2>
                <p>안녕하세요, <strong>${reg.name}</strong>님!</p>
                <p>${customMsg}</p>
                <div style="text-align:center;margin:24px 0;">
                  <img src="${qrDataUrl}" alt="QR Code" style="width:200px;height:200px;" />
                </div>
                <p style="text-align:center;font-size:12px;color:#666;">체크인 코드: ${c.qrToken}</p>
                <a href="${checkinUrl}" style="display:block;text-align:center;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px auto;max-width:200px;">셀프 체크인</a>
                <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />
                <p style="font-size:12px;color:#999;">Alpha Trip - Meetup & Travel Automation</p>
              </div>
            `;
            await sendEmail({ to: reg.email, subject, html });
            sent++;
          } catch { failed++; }
        }
        return { sent, failed, total: checkins.length };
      }),

    // ── 리마인더 발송 (텔레그램) ──────────────────────────────────
    sendReminderTelegram: adminProcedure
      .input(z.object({ meetupId: z.number(), message: z.string().optional() }))
      .mutation(async ({ input }) => {
        const checkins = await db.getEventCheckinsByMeetup(input.meetupId);
        let sent = 0, failed = 0;
        for (const c of checkins) {
          const reg = await db.getRegistrationById(c.registrationId);
          if (!reg || !reg.messengerId) { failed++; continue; }
          try {
            const checkinUrl = `${process.env.VITE_OAUTH_PORTAL_URL || ""}/checkin/${c.qrToken}`;
            const customMsg = input.message || "내일 행사가 시작됩니다! 아래 링크로 셀프 체크인하세요.";
            await sendTelegram(
              `🎉 밋업 리마인더\n\n안녕하세요, ${reg.name}님! (${reg.messengerId})\n${customMsg}\n\n🔗 셀프 체크인: ${checkinUrl}\n📋 체크인 코드: ${c.qrToken}`
            );
            sent++;
          } catch { failed++; }
        }
        return { sent, failed, total: checkins.length };
      }),
  }),
});
// ── Haversine 거리 계산 (미터) ─────────────────────────────
function getDistanceFromLatLon(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
// ── LLM 여행정보 파싱 헬퍼 ───────────────────────────────────
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

