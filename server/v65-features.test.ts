import { describe, it, expect, vi } from "vitest";
import { existsSync } from "fs";
import path from "path";

describe("v6.5 - Resend Email, Kakao OAuth, Email Verification UI", () => {
  // ── Resend Email Service ──
  describe("Resend Email Service", () => {
    it("should have email.ts utility file", () => {
      const emailPath = path.join(__dirname, "email.ts");
      expect(existsSync(emailPath)).toBe(true);
    });

    it("should export sendEmail and email builder functions", async () => {
      const emailModule = await import("./email");
      expect(typeof emailModule.sendEmail).toBe("function");
      expect(typeof emailModule.buildVerificationEmail).toBe("function");
      expect(typeof emailModule.buildPasswordResetEmail).toBe("function");
    });

    it("should export buildWelcomeEmail function", async () => {
      const emailModule = await import("./email");
      expect(emailModule.buildWelcomeEmail).toBeDefined();
      expect(typeof emailModule.buildWelcomeEmail).toBe("function");
    });
  });

  // ── Kakao OAuth ──
  describe("Kakao OAuth", () => {
    it("should have kakaoAuth.ts router file", () => {
      const kakaoPath = path.join(__dirname, "kakaoAuth.ts");
      expect(existsSync(kakaoPath)).toBe(true);
    });

    it("should export kakaoRouter", async () => {
      const kakaoModule = await import("./kakaoAuth");
      expect(kakaoModule.kakaoRouter).toBeDefined();
    });

    it("should be registered in server/_core/index.ts", async () => {
      const indexContent = await import("fs").then(fs =>
        fs.readFileSync(path.join(__dirname, "_core/index.ts"), "utf-8")
      );
      expect(indexContent).toContain("kakaoRouter");
      expect(indexContent).toContain("kakaoAuth");
    });
  });

  // ── Login Page Kakao Button ──
  describe("Login Page Kakao Integration", () => {
    it("should have Kakao login button in LoginPage", async () => {
      const fs = await import("fs");
      const loginContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/LoginPage.tsx"),
        "utf-8"
      );
      expect(loginContent).toContain("kakao");
      expect(loginContent).toContain("/api/auth/kakao");
      expect(loginContent).toContain("FEE500"); // Kakao yellow color
    });

    it("should have Kakao button in both login and register sections", async () => {
      const fs = await import("fs");
      const loginContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/LoginPage.tsx"),
        "utf-8"
      );
      // Should have two Kakao buttons (login + register)
      const kakaoButtonCount = (loginContent.match(/api\/auth\/kakao/g) || []).length;
      expect(kakaoButtonCount).toBeGreaterThanOrEqual(2);
    });
  });

  // ── MyPage Email Verification Card ──
  describe("MyPage Email Verification", () => {
    it("should have EmailVerificationCard component in MyPage", async () => {
      const fs = await import("fs");
      const myPageContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/MyPage.tsx"),
        "utf-8"
      );
      expect(myPageContent).toContain("EmailVerificationCard");
      expect(myPageContent).toContain("emailVerification.verified");
      expect(myPageContent).toContain("emailVerification.unverified");
      expect(myPageContent).toContain("sendVerificationEmail");
    });

    it("should have cooldown timer for resend", async () => {
      const fs = await import("fs");
      const myPageContent = fs.readFileSync(
        path.join(__dirname, "../client/src/pages/MyPage.tsx"),
        "utf-8"
      );
      expect(myPageContent).toContain("cooldown");
      expect(myPageContent).toContain("setCooldown");
    });
  });

  // ── Translation Keys ──
  describe("Translation Keys", () => {
    it("should have email verification keys in ko.json", async () => {
      const fs = await import("fs");
      const ko = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../client/src/locales/ko.json"),
          "utf-8"
        )
      );
      expect(ko.myPage.emailVerification.verified).toBe("이메일 인증 완료");
      expect(ko.myPage.emailVerification.unverified).toBe("이메일 인증이 필요합니다");
      expect(ko.myPage.emailVerification.sendBtn).toBe("인증 메일 발송");
      expect(ko.myPage.emailVerification.resend).toBe("재발송");
    });

    it("should have email verification keys in en.json", async () => {
      const fs = await import("fs");
      const en = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../client/src/locales/en.json"),
          "utf-8"
        )
      );
      expect(en.myPage.emailVerification.verified).toBe("Email Verified");
      expect(en.myPage.emailVerification.unverified).toBe("Email verification required");
    });

    it("should have kakao login keys in ko.json", async () => {
      const fs = await import("fs");
      const ko = JSON.parse(
        fs.readFileSync(
          path.join(__dirname, "../client/src/locales/ko.json"),
          "utf-8"
        )
      );
      expect(ko.loginPage.kakaoLogin).toBe("카카오로 로그인");
      expect(ko.loginPage.kakaoRegister).toBe("카카오로 간편 가입");
    });

    it("should have translations in all 23 locale files", async () => {
      const fs = await import("fs");
      const localesDir = path.join(__dirname, "../client/src/locales");
      const files = fs.readdirSync(localesDir).filter((f: string) => f.endsWith(".json"));
      expect(files.length).toBe(23);
      
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(localesDir, file), "utf-8"));
        expect(data.myPage?.emailVerification?.verified).toBeTruthy();
        expect(data.loginPage?.kakaoLogin).toBeTruthy();
      }
    });
  });

  // ── DB Schema ──
  describe("DB Schema", () => {
    it("should have emailVerificationTokens table in schema", async () => {
      const fs = await import("fs");
      const schema = fs.readFileSync(
        path.join(__dirname, "../drizzle/schema.ts"),
        "utf-8"
      );
      expect(schema).toContain("emailVerificationTokens");
      expect(schema).toContain("passwordResetTokens");
      expect(schema).toContain("onboardingProgress");
    });
  });
});
