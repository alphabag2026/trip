import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

export const googleRouter = Router();

// Step 1: Redirect to Google authorization
googleRouter.get("/api/auth/google", (req: Request, res: Response) => {
  const { origin, returnPath } = req.query;
  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ error: "Google login not configured" });
    return;
  }
  const redirectUri = `${origin || ""}/api/auth/google/callback`;
  const state = JSON.stringify({ origin: origin || "", returnPath: returnPath || "/" });
  const stateEncoded = Buffer.from(state).toString("base64");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: stateEncoded,
    access_type: "offline",
    prompt: "select_account",
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.redirect(url);
});

// Step 2: Handle callback from Google
googleRouter.get("/api/auth/google/callback", async (req: Request, res: Response) => {
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

    const redirectUri = `${origin}/api/auth/google/callback`;

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code,
    });

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("[Google] Token exchange failed:", tokenData);
      res.redirect(`${origin}/login?error=google_token_failed`);
      return;
    }

    // Step 3: Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const googleId = String(userInfo.id);
    const googleEmail = userInfo.email || null;
    const googleName = userInfo.name || null;
    const googlePicture = userInfo.picture || null;

    const db = await getDb();
    if (!db) {
      res.redirect(`${origin}/login?error=db_unavailable`);
      return;
    }

    // Check if user already exists with this google ID (stored in openId)
    const googleOpenId = `google_${googleId}`;
    const existingByGoogle = await db.select().from(users).where(eq(users.openId, googleOpenId)).limit(1);

    let userId: number;
    let userOpenId: string;
    let userName: string;
    let isNewUser = false;

    if (existingByGoogle.length > 0) {
      // Existing google user - login
      userId = existingByGoogle[0].id;
      userOpenId = existingByGoogle[0].openId;
      userName = existingByGoogle[0].name || googleName || "";
    } else if (googleEmail) {
      // Check if email already registered
      const existingByEmail = await db.select().from(users).where(eq(users.email, googleEmail)).limit(1);
      if (existingByEmail.length > 0) {
        // Link google to existing email account
        userId = existingByEmail[0].id;
        userOpenId = existingByEmail[0].openId;
        userName = existingByEmail[0].name || googleName || "";
        const currentMethod = existingByEmail[0].loginMethod || "";
        if (!currentMethod.includes("google")) {
          await db.update(users).set({
            loginMethod: currentMethod ? `${currentMethod},google` : "google",
          }).where(eq(users.id, userId));
        }
      } else {
        // Create new user
        userOpenId = googleOpenId;
        userName = googleName || `User_${googleId.slice(-6)}`;
        const result = await db.insert(users).values({
          openId: userOpenId,
          name: userName,
          email: googleEmail,
          loginMethod: "google",
          role: "user",
        });
        userId = Number(result[0].insertId);
        isNewUser = true;
      }
    } else {
      // No email from google (very rare) - create user without email
      userOpenId = googleOpenId;
      userName = googleName || `User_${googleId.slice(-6)}`;
      const result = await db.insert(users).values({
        openId: userOpenId,
        name: userName,
        loginMethod: "google",
        role: "user",
      });
      userId = Number(result[0].insertId);
      isNewUser = true;
    }

    // Create session token using sdk (same as email/kakao login)
    const sessionToken = await sdk.createSessionToken(userOpenId, { name: userName, expiresInMs: ONE_YEAR_MS });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    // Update last signed in
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));

    // Redirect
    if (isNewUser) {
      res.redirect(`${origin}/welcome?type=personal&name=${encodeURIComponent(userName)}&from=google`);
    } else {
      res.redirect(`${origin}${returnPath}`);
    }
  } catch (error: any) {
    console.error("[Google] OAuth error:", error);
    const origin = req.query.state
      ? (() => {
          try {
            return JSON.parse(Buffer.from(String(req.query.state), "base64").toString("utf-8")).origin || "";
          } catch { return ""; }
        })()
      : "";
    res.redirect(`${origin}/login?error=google_auth_failed`);
  }
});
