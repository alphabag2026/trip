import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ko from "../locales/ko.json";
import en from "../locales/en.json";
import zh from "../locales/zh.json";
import ja from "../locales/ja.json";
import vi from "../locales/vi.json";
import th from "../locales/th.json";
import id from "../locales/id.json";
import ms from "../locales/ms.json";
import ru from "../locales/ru.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import es from "../locales/es.json";
import pt from "../locales/pt.json";
import it from "../locales/it.json";
import ar from "../locales/ar.json";
import hi from "../locales/hi.json";
import tr from "../locales/tr.json";
import pl from "../locales/pl.json";
import nl from "../locales/nl.json";
import sv from "../locales/sv.json";
import uk from "../locales/uk.json";
import tl from "../locales/tl.json";
import mn from "../locales/mn.json";

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      zh: { translation: zh },
      ja: { translation: ja },
      vi: { translation: vi },
      th: { translation: th },
      id: { translation: id },
      ms: { translation: ms },
      ru: { translation: ru },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
      pt: { translation: pt },
      it: { translation: it },
      ar: { translation: ar },
      hi: { translation: hi },
      tr: { translation: tr },
      pl: { translation: pl },
      nl: { translation: nl },
      sv: { translation: sv },
      uk: { translation: uk },
      tl: { translation: tl },
      mn: { translation: mn },
    },
    fallbackLng: "ko",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
