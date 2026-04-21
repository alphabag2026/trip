import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("App Download Prompt Components", () => {
  const componentPath = path.resolve(__dirname, "../client/src/components/AppDownloadPrompt.tsx");

  it("AppDownloadPrompt.tsx component file exists", () => {
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it("exports AppDownloadModal component", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("export function AppDownloadModal");
  });

  it("exports AppCallBanner component", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("export function AppCallBanner");
  });

  it("exports AppDownloadCard component", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("export function AppDownloadCard");
  });

  it("AppDownloadModal handles voice, video, and group call types", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain('"voice"');
    expect(content).toContain('"video"');
    expect(content).toContain('"group"');
  });

  it("includes App Store and Play Store download URLs", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("APP_STORE_URL");
    expect(content).toContain("PLAY_STORE_URL");
    expect(content).toContain("apps.apple.com");
    expect(content).toContain("play.google.com");
  });

  it("detects mobile platform (iOS, Android, Desktop)", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("detectPlatform");
    expect(content).toContain('"ios"');
    expect(content).toContain('"android"');
    expect(content).toContain('"desktop"');
  });

  it("uses i18n translation keys for all text", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain('t("appDownload.');
    expect(content).toContain("useTranslation");
  });

  it("AppCallBanner supports session-based dismissal", () => {
    const content = fs.readFileSync(componentPath, "utf-8");
    expect(content).toContain("sessionStorage");
    expect(content).toContain("app-banner-dismissed");
  });
});

describe("CommunityChat integration with App Download", () => {
  const chatPath = path.resolve(__dirname, "../client/src/pages/CommunityChat.tsx");

  it("CommunityChat imports AppDownloadModal and AppCallBanner", () => {
    const content = fs.readFileSync(chatPath, "utf-8");
    expect(content).toContain("AppDownloadModal");
    expect(content).toContain("AppCallBanner");
    expect(content).toContain("from \"@/components/AppDownloadPrompt\"");
  });

  it("CommunityChat has showAppDownload state", () => {
    const content = fs.readFileSync(chatPath, "utf-8");
    expect(content).toContain("showAppDownload");
    expect(content).toContain("setShowAppDownload");
  });

  it("Call buttons trigger app download modal instead of direct calls", () => {
    const content = fs.readFileSync(chatPath, "utf-8");
    // Voice call button should open app download modal
    expect(content).toContain('setAppDownloadCallType("voice"); setShowAppDownload(true)');
    // Video call button should open app download modal
    expect(content).toContain('setAppDownloadCallType("video"); setShowAppDownload(true)');
    // Group call button should open app download modal
    expect(content).toContain('setAppDownloadCallType("group"); setShowAppDownload(true)');
  });

  it("renders AppCallBanner in chat header area", () => {
    const content = fs.readFileSync(chatPath, "utf-8");
    expect(content).toContain("<AppCallBanner");
  });

  it("renders AppDownloadModal in chat component", () => {
    const content = fs.readFileSync(chatPath, "utf-8");
    expect(content).toContain("<AppDownloadModal");
  });
});

describe("Home and MyPage integration with AppDownloadCard", () => {
  it("Home.tsx imports and renders AppDownloadCard", () => {
    const homePath = path.resolve(__dirname, "../client/src/pages/Home.tsx");
    const content = fs.readFileSync(homePath, "utf-8");
    expect(content).toContain("AppDownloadCard");
    expect(content).toContain("from \"@/components/AppDownloadPrompt\"");
    expect(content).toContain("<AppDownloadCard");
  });

  it("MyPage.tsx imports and renders AppDownloadCard", () => {
    const myPagePath = path.resolve(__dirname, "../client/src/pages/MyPage.tsx");
    const content = fs.readFileSync(myPagePath, "utf-8");
    expect(content).toContain("AppDownloadCard");
    expect(content).toContain("from \"@/components/AppDownloadPrompt\"");
    expect(content).toContain("<AppDownloadCard");
  });

  it("OrganizerHome.tsx imports and renders AppDownloadCard", () => {
    const orgPath = path.resolve(__dirname, "../client/src/pages/OrganizerHome.tsx");
    const content = fs.readFileSync(orgPath, "utf-8");
    expect(content).toContain("AppDownloadCard");
    expect(content).toContain("from \"@/components/AppDownloadPrompt\"");
    expect(content).toContain("<AppDownloadCard");
  });
});

describe("Translation files include appDownload keys", () => {
  const localesDir = path.resolve(__dirname, "../client/src/locales");
  const requiredKeys = [
    "modalTitle", "modalDesc", "voiceCall", "videoCall", "groupCall",
    "benefit1", "benefit2", "benefit3", "appStore", "playStore",
    "continueWeb", "bannerText", "bannerLink", "cardTitle", "cardDesc"
  ];

  for (const lang of ["ko", "en", "ja", "zh", "vi", "th"]) {
    it(`${lang}.json has appDownload section with all required keys`, () => {
      const filePath = path.join(localesDir, `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(data.appDownload).toBeDefined();
      for (const key of requiredKeys) {
        expect(data.appDownload[key]).toBeDefined();
        expect(data.appDownload[key].length).toBeGreaterThan(0);
      }
    });
  }
});
