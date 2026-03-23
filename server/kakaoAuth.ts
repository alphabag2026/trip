import { Router, Request, Response } from "express";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || "";
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET || "";

export const kakaoRouter = Router();

// Step 1: Redirect to Kakao authorization
kakaoRouter.get("/api/auth/kakao", (req: Request, res: Response) => {
  const { origin, returnPath } = req.query;
  if (!KAKAO_CLIENT_ID) {
    res.status(500).json({ error: "Kakao login not configured" });
    return;
  }
  const redirectUri = `${origin || ""}/api/auth/kakao/callback`;
  const state = JSON.stringify({ origin: origin || "", returnPath: returnPath || "/" });
  const stateEncoded = Buffer.from(state).toString("base64");
  const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(stateEncoded)}`;
  res.redirect(url);
});

// Step 2: Handle callback from Kakao
kakaoRouter.get("/api/auth/kakao/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    // Parse state
    let origin = "";
    let returnPath = "/";
    if (state && typeof state === "string") {
      try {
        const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
        origin = parsed.origin || "";
        returnPath = parsed.returnPath || "/";
      } catch {}
    }

    const redirectUri = `${origin}/api/auth/kakao/callback`;

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: redirectUri,
      code,
    });
    if (KAKAO_CLIENT_SECRET) {
      tokenParams.append("client_secret", KAKAO_CLIENT_SECRET);
    }

    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[Kakao] Token exchange failed:", tokenData);
      res.redirect(`${origin}/login?error=kakao_token_failed`);
      return;
    }

    // Step 3: Get user info
    const userInfoRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const kakaoId = String(userInfo.id);
    const kakaoEmail = userInfo.kakao_account?.email || null;
    const kakaoNickname = userInfo.kakao_account?.profile?.nickname || null;
    const kakaoProfileImage = userInfo.kakao_account?.profile?.profile_image_url || null;

    const db = await getDb();
    if (!db) {
      res.redirect(`${origin}/login?error=db_unavailable`);
      return;
    }

    // Check if user already exists with this kakao ID (stored in openId)
    const kakaoOpenId = `kakao_${kakaoId}`;
    const existingByKakao = await db.select().from(users).where(eq(users.openId, kakaoOpenId)).limit(1);

    let userId: number;
    let userOpenId: string;
    let userName: string;
    let isNewUser = false;

    if (existingByKakao.length > 0) {
      // Existing kakao user - login
      userId = existingByKakao[0].id;
      userOpenId = existingByKakao[0].openId;
      userName = existingByKakao[0].name || kakaoNickname || "";
    } else if (kakaoEmail) {
      // Check if email already registered
      const existingByEmail = await db.select().from(users).where(eq(users.email, kakaoEmail)).limit(1);
      if (existingByEmail.length > 0) {
        // Link kakao to existing email account
        userId = existingByEmail[0].id;
        userOpenId = existingByEmail[0].openId;
        userName = existingByEmail[0].name || kakaoNickname || "";
        await db.update(users).set({
          loginMethod: existingByEmail[0].loginMethod ? `${existingByEmail[0].loginMethod},kakao` : "kakao",
        }).where(eq(users.id, userId));
      } else {
        // Create new user
        userOpenId = kakaoOpenId;
        userName = kakaoNickname || `User_${kakaoId.slice(-6)}`;
        const result = await db.insert(users).values({
          openId: userOpenId,
          name: userName,
          email: kakaoEmail,
          loginMethod: "kakao",
          role: "user",
        });
        userId = Number(result[0].insertId);
        isNewUser = true;
      }
    } else {
      // No email from kakao - create user without email
      userOpenId = kakaoOpenId;
      userName = kakaoNickname || `User_${kakaoId.slice(-6)}`;
      const result = await db.insert(users).values({
        openId: userOpenId,
        name: userName,
        loginMethod: "kakao",
        role: "user",
      });
      userId = Number(result[0].insertId);
      isNewUser = true;
    }

    // Create session token using sdk (same as email login)
    const sessionToken = await sdk.createSessionToken(userOpenId, { name: userName, expiresInMs: ONE_YEAR_MS });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    // Update last signed in
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));

    // Redirect
    if (isNewUser) {
      res.redirect(`${origin}/welcome?type=personal&name=${encodeURIComponent(userName)}&from=kakao`);
    } else {
      res.redirect(`${origin}${returnPath}`);
    }
  } catch (error: any) {
    console.error("[Kakao] OAuth error:", error);
    const origin = req.query.state
      ? (() => {
          try {
            return JSON.parse(Buffer.from(String(req.query.state), "base64").toString("utf-8")).origin || "";
          } catch { return ""; }
        })()
      : "";
    res.redirect(`${origin}/login?error=kakao_auth_failed`);
  }
});
