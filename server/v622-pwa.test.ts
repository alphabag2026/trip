import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";

const CLIENT_DIR = path.resolve(__dirname, "../client");
const PUBLIC_DIR = path.resolve(CLIENT_DIR, "public");

describe("v6.22 - PWA App Conversion", () => {
  // ── manifest.json ──
  describe("manifest.json", () => {
    let manifest: any;

    beforeAll(() => {
      const raw = fs.readFileSync(path.join(PUBLIC_DIR, "manifest.json"), "utf-8");
      manifest = JSON.parse(raw);
    });

    it("should have correct app name", () => {
      expect(manifest.name).toContain("Alpha Trip");
      expect(manifest.short_name).toBe("Alpha Trip");
    });

    it("should have standalone display mode", () => {
      expect(manifest.display).toBe("standalone");
    });

    it("should have theme_color and background_color", () => {
      expect(manifest.theme_color).toBeTruthy();
      expect(manifest.background_color).toBeTruthy();
    });

    it("should have icons with proper sizes", () => {
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
      const sizes = manifest.icons.map((i: any) => i.sizes);
      expect(sizes).toContain("192x192");
      expect(sizes).toContain("512x512");
    });

    it("should have start_url set to /", () => {
      expect(manifest.start_url).toBe("/");
    });

    it("should have portrait orientation", () => {
      expect(manifest.orientation).toBe("portrait-primary");
    });

    it("should have categories", () => {
      expect(manifest.categories).toBeDefined();
      expect(manifest.categories.length).toBeGreaterThan(0);
    });
  });

  // ── index.html meta tags ──
  describe("index.html PWA meta tags", () => {
    let html: string;

    beforeAll(() => {
      html = fs.readFileSync(path.join(CLIENT_DIR, "index.html"), "utf-8");
    });

    it("should have manifest link", () => {
      expect(html).toContain('<link rel="manifest"');
    });

    it("should have theme-color meta tag", () => {
      expect(html).toContain('name="theme-color"');
    });

    it("should have apple-touch-icon", () => {
      expect(html).toContain('rel="apple-touch-icon"');
    });

    it("should have apple-mobile-web-app-capable", () => {
      expect(html).toContain('name="apple-mobile-web-app-capable"');
      expect(html).toContain('content="yes"');
    });

    it("should have apple-mobile-web-app-status-bar-style", () => {
      expect(html).toContain('name="apple-mobile-web-app-status-bar-style"');
    });

    it("should have apple-mobile-web-app-title", () => {
      expect(html).toContain('name="apple-mobile-web-app-title"');
      expect(html).toContain('content="Alpha Trip"');
    });

    it("should have mobile-web-app-capable", () => {
      expect(html).toContain('name="mobile-web-app-capable"');
    });

    it("should have application-name", () => {
      expect(html).toContain('name="application-name"');
    });
  });

  // ── Service Worker (sw.js) ──
  describe("Service Worker (sw.js)", () => {
    let sw: string;

    beforeAll(() => {
      sw = fs.readFileSync(path.join(PUBLIC_DIR, "sw.js"), "utf-8");
    });

    it("should have install event listener", () => {
      expect(sw).toContain("addEventListener('install'");
    });

    it("should have activate event listener", () => {
      expect(sw).toContain("addEventListener('activate'");
    });

    it("should have push event listener", () => {
      expect(sw).toContain("addEventListener('push'");
    });

    it("should have notificationclick event listener", () => {
      expect(sw).toContain("addEventListener('notificationclick'");
    });
  });

  // ── vite-plugin-pwa config ──
  describe("vite-plugin-pwa configuration", () => {
    let viteConfig: string;

    beforeAll(() => {
      viteConfig = fs.readFileSync(path.resolve(__dirname, "../vite.config.ts"), "utf-8");
    });

    it("should import VitePWA", () => {
      expect(viteConfig).toContain("VitePWA");
    });

    it("should have autoUpdate register type", () => {
      expect(viteConfig).toContain('registerType: "autoUpdate"');
    });

    it("should have workbox runtime caching", () => {
      expect(viteConfig).toContain("runtimeCaching");
    });

    it("should cache API calls with NetworkFirst", () => {
      expect(viteConfig).toContain('"NetworkFirst"');
    });

    it("should cache CDN images with CacheFirst", () => {
      expect(viteConfig).toContain('"CacheFirst"');
      expect(viteConfig).toContain("cdn-images");
    });

    it("should cache Google Fonts", () => {
      expect(viteConfig).toContain("google-fonts");
    });

    it("should have Alpha Trip in manifest name", () => {
      expect(viteConfig).toContain("Alpha Trip");
    });
  });

  // ── PWAInstallPrompt component ──
  describe("PWAInstallPrompt component", () => {
    let component: string;

    beforeAll(() => {
      component = fs.readFileSync(
        path.join(CLIENT_DIR, "src/components/PWAInstallPrompt.tsx"),
        "utf-8"
      );
    });

    it("should handle beforeinstallprompt event", () => {
      expect(component).toContain("beforeinstallprompt");
    });

    it("should detect iOS devices", () => {
      expect(component).toContain("isIOS");
    });

    it("should detect standalone mode", () => {
      expect(component).toContain("isInStandaloneMode");
    });

    it("should have iOS Safari install guide", () => {
      expect(component).toContain("showIOSGuide");
      expect(component).toContain("iosTitle");
      expect(component).toContain("iosStep1");
      expect(component).toContain("iosStep2");
      expect(component).toContain("iosStep3");
    });

    it("should have dismiss functionality with localStorage", () => {
      expect(component).toContain("pwa-install-dismissed");
      expect(component).toContain("localStorage");
    });
  });

  // ── AppInstallGuide page ──
  describe("AppInstallGuide page", () => {
    let page: string;

    beforeAll(() => {
      page = fs.readFileSync(
        path.join(CLIENT_DIR, "src/pages/AppInstallGuide.tsx"),
        "utf-8"
      );
    });

    it("should exist as a page component", () => {
      expect(page).toBeTruthy();
    });

    it("should have Android installation guide", () => {
      expect(page).toContain("android");
      expect(page).toContain("androidStep1");
      expect(page).toContain("androidStep2");
      expect(page).toContain("androidStep3");
    });

    it("should have iOS installation guide", () => {
      expect(page).toContain("ios");
      expect(page).toContain("iosStep1");
      expect(page).toContain("iosStep2");
      expect(page).toContain("iosStep3");
      expect(page).toContain("iosStep4");
    });

    it("should have Desktop installation guide", () => {
      expect(page).toContain("desktop");
      expect(page).toContain("desktopStep1");
      expect(page).toContain("desktopStep2");
      expect(page).toContain("desktopStep3");
    });

    it("should have FAQ section", () => {
      expect(page).toContain("faqTitle");
      expect(page).toContain("faq1Q");
      expect(page).toContain("faq2Q");
      expect(page).toContain("faq3Q");
    });

    it("should have platform tab switching", () => {
      expect(page).toContain("activeTab");
      expect(page).toContain("setActiveTab");
    });

    it("should have install button for supported browsers", () => {
      expect(page).toContain("handleInstall");
      expect(page).toContain("deferredPrompt");
    });

    it("should have features section", () => {
      expect(page).toContain("feature1Title");
      expect(page).toContain("feature2Title");
      expect(page).toContain("feature3Title");
      expect(page).toContain("feature4Title");
    });
  });

  // ── App.tsx route registration ──
  describe("App.tsx route registration", () => {
    let appTsx: string;

    beforeAll(() => {
      appTsx = fs.readFileSync(
        path.join(CLIENT_DIR, "src/App.tsx"),
        "utf-8"
      );
    });

    it("should have /app-install route", () => {
      expect(appTsx).toContain("/app-install");
    });

    it("should lazy-load AppInstallGuide", () => {
      expect(appTsx).toContain("AppInstallGuide");
    });

    it("should include PWAInstallPrompt component", () => {
      expect(appTsx).toContain("PWAInstallPrompt");
    });
  });

  // ── AppDownloadPrompt component ──
  describe("AppDownloadPrompt component", () => {
    let component: string;

    beforeAll(() => {
      component = fs.readFileSync(
        path.join(CLIENT_DIR, "src/components/AppDownloadPrompt.tsx"),
        "utf-8"
      );
    });

    it("should have AppDownloadCard export", () => {
      expect(component).toContain("export function AppDownloadCard");
    });

    it("should have AppDownloadModal export", () => {
      expect(component).toContain("export function AppDownloadModal");
    });

    it("should have AppDownloadBanner export", () => {
      expect(component).toContain("export function AppDownloadBanner");
    });

    it("should link to /app-install page", () => {
      expect(component).toContain("/app-install");
    });

    it("should check standalone mode to hide when installed", () => {
      expect(component).toContain("isInStandaloneMode");
    });
  });

  // ── i18n translations ──
  describe("i18n translations", () => {
    let ko: any;
    let en: any;

    beforeAll(() => {
      ko = JSON.parse(fs.readFileSync(path.join(CLIENT_DIR, "src/locales/ko.json"), "utf-8"));
      en = JSON.parse(fs.readFileSync(path.join(CLIENT_DIR, "src/locales/en.json"), "utf-8"));
    });

    it("should have pWAInstallPrompt translations in ko", () => {
      expect(ko.pWAInstallPrompt).toBeDefined();
      expect(ko.pWAInstallPrompt.iosTitle).toBeTruthy();
      expect(ko.pWAInstallPrompt.iosStep1).toBeTruthy();
    });

    it("should have pWAInstallPrompt translations in en", () => {
      expect(en.pWAInstallPrompt).toBeDefined();
      expect(en.pWAInstallPrompt.iosTitle).toBeTruthy();
    });

    it("should have appInstall translations in ko", () => {
      expect(ko.appInstall).toBeDefined();
      expect(ko.appInstall.howToInstall).toBeTruthy();
      expect(ko.appInstall.androidStep1).toBeTruthy();
      expect(ko.appInstall.iosStep1).toBeTruthy();
      expect(ko.appInstall.desktopStep1).toBeTruthy();
      expect(ko.appInstall.faqTitle).toBeTruthy();
    });

    it("should have appInstall translations in en", () => {
      expect(en.appInstall).toBeDefined();
      expect(en.appInstall.howToInstall).toBeTruthy();
      expect(en.appInstall.androidStep1).toBeTruthy();
      expect(en.appInstall.iosStep1).toBeTruthy();
      expect(en.appInstall.desktopStep1).toBeTruthy();
      expect(en.appInstall.faqTitle).toBeTruthy();
    });

    it("should have appDownload.installGuide in ko", () => {
      expect(ko.appDownload.installGuide).toBeTruthy();
    });

    it("should have appDownload.installGuide in en", () => {
      expect(en.appDownload.installGuide).toBeTruthy();
    });
  });

  // ── main.tsx service worker registration ──
  describe("main.tsx service worker registration", () => {
    let mainTsx: string;

    beforeAll(() => {
      mainTsx = fs.readFileSync(
        path.join(CLIENT_DIR, "src/main.tsx"),
        "utf-8"
      );
    });

    it("should import registerSW from virtual:pwa-register", () => {
      expect(mainTsx).toContain('import { registerSW } from "virtual:pwa-register"');
    });

    it("should call registerSW with autoUpdate handler", () => {
      expect(mainTsx).toContain("registerSW");
      expect(mainTsx).toContain("onNeedRefresh");
      expect(mainTsx).toContain("onOfflineReady");
    });
  });
});
