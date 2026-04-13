import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const languages = [
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "sv", name: "Svenska", flag: "🇸🇪" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
];

const supportedLngs = languages.map((l) => l.code);

// Dynamic locale loader map - each language is a separate chunk
const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  ko: () => import("../locales/ko.json"),
  en: () => import("../locales/en.json"),
  zh: () => import("../locales/zh.json"),
  ja: () => import("../locales/ja.json"),
  vi: () => import("../locales/vi.json"),
  th: () => import("../locales/th.json"),
  id: () => import("../locales/id.json"),
  ms: () => import("../locales/ms.json"),
  ru: () => import("../locales/ru.json"),
  fr: () => import("../locales/fr.json"),
  de: () => import("../locales/de.json"),
  es: () => import("../locales/es.json"),
  pt: () => import("../locales/pt.json"),
  it: () => import("../locales/it.json"),
  ar: () => import("../locales/ar.json"),
  hi: () => import("../locales/hi.json"),
  tr: () => import("../locales/tr.json"),
  pl: () => import("../locales/pl.json"),
  nl: () => import("../locales/nl.json"),
  sv: () => import("../locales/sv.json"),
  uk: () => import("../locales/uk.json"),
  tl: () => import("../locales/tl.json"),
  mn: () => import("../locales/mn.json"),
};

// Cache loaded locales to avoid re-fetching
const loadedLocales = new Set<string>();

/**
 * Load a locale bundle dynamically and add it to i18n.
 * Returns immediately if already loaded.
 */
export async function loadLocale(lng: string): Promise<void> {
  if (loadedLocales.has(lng)) return;
  const loader = localeLoaders[lng];
  if (!loader) return;
  try {
    const mod = await loader();
    i18n.addResourceBundle(lng, "translation", mod.default, true, true);
    loadedLocales.add(lng);
  } catch (err) {
    console.warn(`[i18n] Failed to load locale "${lng}":`, err);
  }
}

/**
 * Change language with dynamic loading.
 * Loads the locale bundle first, then switches.
 */
export async function changeLanguage(lng: string): Promise<void> {
  await loadLocale(lng);
  await i18n.changeLanguage(lng);
}

// Detect initial language from localStorage / navigator
function detectInitialLanguage(): string {
  try {
    const stored = localStorage.getItem("i18nextLng");
    if (stored && supportedLngs.includes(stored)) return stored;
    const nav = navigator.language?.split("-")[0];
    if (nav && supportedLngs.includes(nav)) return nav;
  } catch {
    // ignore
  }
  return "ko";
}

const initialLng = detectInitialLanguage();

// Initialize i18n with empty resources - locales loaded on demand
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {},
    lng: initialLng,
    fallbackLng: "ko",
    supportedLngs,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    // Don't wait for resources to be loaded before rendering
    // We'll handle loading state in the app
    react: {
      useSuspense: false,
    },
  });

/**
 * Bootstrap: load initial language + fallback.
 * Call this once at app startup.
 */
export async function initLocales(): Promise<void> {
  const promises: Promise<void>[] = [loadLocale(initialLng)];
  if (initialLng !== "ko") {
    promises.push(loadLocale("ko")); // always load fallback
  }
  await Promise.all(promises);
}

// Listen for language change events to lazy-load new locales
i18n.on("languageChanged", (lng) => {
  loadLocale(lng);
});

export default i18n;
