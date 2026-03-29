import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Languages, ArrowLeft, ArrowRightLeft, Copy, Check, Volume2,
  Mic, MicOff, Trash2, History, Sparkles, Radio
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const LANGUAGES = [
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
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
];

// Web Speech API language code mapping
const SPEECH_LANG_MAP: Record<string, string> = {
  ko: "ko-KR", en: "en-US", zh: "zh-CN", ja: "ja-JP",
  vi: "vi-VN", th: "th-TH", id: "id-ID", ms: "ms-MY",
  ru: "ru-RU", fr: "fr-FR", de: "de-DE", es: "es-ES",
  pt: "pt-BR", it: "it-IT", ar: "ar-SA", hi: "hi-IN",
  tr: "tr-TR", tl: "fil-PH", mn: "mn-MN",
};

type TranslationHistory = {
  id: number;
  from: string;
  to: string;
  source: string;
  result: string;
  timestamp: Date;
  isVoice?: boolean;
};

// Check Web Speech API support
function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

function getSpeechRecognition(): any {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
}

export default function Translator() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [sourceLang, setSourceLang] = useState("ko");
  const [targetLang, setTargetLang] = useState("en");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TranslationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyIdRef = useRef(0);

  // Voice state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceSupported] = useState(() => typeof window !== "undefined" && isSpeechRecognitionSupported());
  const recognitionRef = useRef<any>(null);
  const autoTranslateRef = useRef(false);

  const translateMutation = trpc.translator.translate.useMutation({
    onSuccess: (data) => {
      setTranslatedText(data.translatedText);
      setIsTranslating(false);
      historyIdRef.current += 1;
      setHistory(prev => [{
        id: historyIdRef.current,
        from: sourceLang,
        to: targetLang,
        source: sourceText,
        result: data.translatedText,
        timestamp: new Date(),
        isVoice: autoTranslateRef.current,
      }, ...prev].slice(0, 30));
      autoTranslateRef.current = false;

      // TTS for voice mode results
      if (isVoiceMode && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(data.translatedText);
        utterance.lang = SPEECH_LANG_MAP[targetLang] || targetLang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    },
    onError: (err) => {
      setIsTranslating(false);
      autoTranslateRef.current = false;
      toast.error(t("translator.error", "번역 오류"), { description: (err as any).message });
    },
  });

  const handleTranslate = useCallback(() => {
    if (!sourceText.trim()) return;
    setIsTranslating(true);
    setTranslatedText("");
    translateMutation.mutate({
      text: sourceText.trim(),
      sourceLang,
      targetLang,
    });
  }, [sourceText, sourceLang, targetLang, translateMutation]);

  // Start voice recognition
  const startListening = useCallback(() => {
    if (!voiceSupported) {
      toast.error(t("translator.voice_not_supported", "음성 인식이 지원되지 않는 브라우저입니다"));
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.lang = SPEECH_LANG_MAP[sourceLang] || sourceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setSourceText(prev => prev ? prev + " " + final : final);
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        console.error("Speech recognition error:", event.error);
        toast.error(t("translator.voice_error", "음성 인식 오류"), {
          description: event.error,
        });
      }
      setIsListening(false);
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [voiceSupported, sourceLang, t]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  // Auto-translate when voice stops and there's text
  useEffect(() => {
    if (!isListening && isVoiceMode && sourceText.trim() && !isTranslating) {
      const timer = setTimeout(() => {
        autoTranslateRef.current = true;
        setIsTranslating(true);
        setTranslatedText("");
        translateMutation.mutate({
          text: sourceText.trim(),
          sourceLang,
          targetLang,
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isListening, isVoiceMode, sourceText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakText = useCallback((text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG_MAP[lang] || lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  const swapLanguages = useCallback(() => {
    if (isListening) stopListening();
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  }, [sourceLang, targetLang, sourceText, translatedText, isListening, stopListening]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("translator.copyFail", "복사 실패"));
    }
  }, [t]);

  const clearAll = useCallback(() => {
    if (isListening) stopListening();
    setSourceText("");
    setTranslatedText("");
    setInterimText("");
  }, [isListening, stopListening]);

  const getLanguageName = (code: string) => LANGUAGES.find(l => l.code === code)?.name || code;
  const getLanguageFlag = (code: string) => LANGUAGES.find(l => l.code === code)?.flag || "";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/95">
        <div className="container flex items-center h-14 gap-3 max-w-lg mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 flex items-center gap-2">
            <Languages className="h-5 w-5 text-cyan-500" />
            <h1 className="font-bold text-lg">{t("translator.title", "실시간 통역")}</h1>
          </div>
          <div className="flex items-center gap-1">
            {voiceSupported && (
              <Button
                variant={isVoiceMode ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  if (isListening) stopListening();
                  setIsVoiceMode(!isVoiceMode);
                }}
                className={`gap-1 text-xs ${isVoiceMode ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}`}
              >
                <Mic className="h-4 w-4" />
                {t("translator.voice_mode", "음성")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1 text-xs"
            >
              <History className="h-4 w-4" />
              {showHistory ? t("translator.hideHistory", "닫기") : t("translator.showHistory", "기록")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-lg mx-auto px-4 pb-24">
        {/* Language Selector */}
        <div className="flex items-center gap-2 py-4">
          <Select value={sourceLang} onValueChange={(v) => { if (isListening) stopListening(); setSourceLang(v); }}>
            <SelectTrigger className="flex-1 h-11 rounded-xl">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{getLanguageFlag(sourceLang)}</span>
                  <span className="text-sm font-medium">{getLanguageName(sourceLang)}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-xl flex-shrink-0"
            onClick={swapLanguages}
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>

          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="flex-1 h-11 rounded-xl">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{getLanguageFlag(targetLang)}</span>
                  <span className="text-sm font-medium">{getLanguageName(targetLang)}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.code} value={lang.code}>
                  <span className="flex items-center gap-2">
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Mode UI */}
        {isVoiceMode && (
          <div className="mb-4">
            <Card className={`border-2 transition-all duration-300 ${
              isListening
                ? "border-rose-400 dark:border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 shadow-lg shadow-rose-100 dark:shadow-rose-900/20"
                : "border-border"
            }`}>
              <CardContent className="p-6 flex flex-col items-center gap-4">
                {/* Mic Button */}
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening
                      ? "bg-rose-500 text-white scale-110"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isListening && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-30" />
                      <span className="absolute inset-[-8px] rounded-full border-2 border-rose-300 animate-pulse" />
                    </>
                  )}
                  {isListening ? (
                    <MicOff className="h-8 w-8 relative z-10" />
                  ) : (
                    <Mic className="h-8 w-8 relative z-10" />
                  )}
                </button>

                {/* Status */}
                <div className="text-center">
                  {isListening ? (
                    <div className="flex items-center gap-2 text-rose-500">
                      <Radio className="h-4 w-4 animate-pulse" />
                      <span className="text-sm font-medium">
                        {t("translator.listening", "듣는 중...")}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("translator.tap_to_speak", "탭하여 말하기")}
                    </span>
                  )}
                </div>

                {/* Interim text (live preview) */}
                {interimText && (
                  <div className="w-full p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground italic">
                    {interimText}
                  </div>
                )}

                {/* Recognized text */}
                {sourceText && (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {getLanguageFlag(sourceLang)} {t("translator.recognized", "인식된 텍스트")}
                      </Badge>
                      <button onClick={clearAll} className="text-muted-foreground hover:text-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="p-3 rounded-lg bg-background border border-border text-sm">
                      {sourceText}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voice translation result */}
            {translatedText && (
              <Card className="mt-3 border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-3 pt-2">
                    <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700">
                      {getLanguageFlag(targetLang)} {getLanguageName(targetLang)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakText(translatedText, targetLang)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(translatedText)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 text-base whitespace-pre-wrap font-medium">{translatedText}</div>
                </CardContent>
              </Card>
            )}

            {isTranslating && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                {t("translator.translating", "번역 중...")}
              </div>
            )}
          </div>
        )}

        {/* Text Mode UI (original) */}
        {!isVoiceMode && (
          <>
            {/* Source Input */}
            <Card className="mb-3 border-2 border-primary/20 focus-within:border-primary/50 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-3 pt-2">
                  <Badge variant="outline" className="text-[10px]">
                    {getLanguageFlag(sourceLang)} {getLanguageName(sourceLang)}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {voiceSupported && (
                      <button
                        onClick={() => { setIsVoiceMode(true); }}
                        className="text-muted-foreground hover:text-foreground"
                        title={t("translator.voice_mode", "음성 모드")}
                      >
                        <Mic className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {sourceText && (
                      <button onClick={clearAll} className="text-muted-foreground hover:text-foreground">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  placeholder={t("translator.inputPlaceholder", "번역할 텍스트를 입력하세요...")}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  className="w-full min-h-[120px] p-3 bg-transparent text-base resize-none focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleTranslate();
                    }
                  }}
                />
                <div className="flex items-center justify-between px-3 pb-2">
                  <span className="text-[10px] text-muted-foreground">
                    {sourceText.length} {t("translator.chars", "자")}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Ctrl+Enter {t("translator.toTranslate", "번역")}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Translate Button */}
            <Button
              onClick={handleTranslate}
              disabled={!sourceText.trim() || isTranslating}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-base gap-2 mb-3"
            >
              {isTranslating ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("translator.translating", "번역 중...")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {t("translator.translateBtn", "번역하기")}
                </>
              )}
            </Button>

            {/* Translation Result */}
            {translatedText && (
              <Card className="mb-4 border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-3 pt-2">
                    <Badge variant="outline" className="text-[10px] border-emerald-300 dark:border-emerald-700">
                      {getLanguageFlag(targetLang)} {getLanguageName(targetLang)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speakText(translatedText, targetLang)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(translatedText)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? t("translator.copied", "복사됨") : t("translator.copy", "복사")}
                      </button>
                    </div>
                  </div>
                  <div className="p-3 text-base whitespace-pre-wrap">{translatedText}</div>
                </CardContent>
              </Card>
            )}

            {/* Quick Phrases */}
            {!sourceText && !translatedText && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("translator.quickPhrases", "자주 쓰는 표현")}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { text: "안녕하세요, 반갑습니다", label: t("translator.phrase_hello", "인사") },
                    { text: "여기까지 얼마예요?", label: t("translator.phrase_howmuch", "택시 요금") },
                    { text: "이 주소로 가주세요", label: t("translator.phrase_address", "주소 안내") },
                    { text: "체크인 부탁합니다", label: t("translator.phrase_checkin", "호텔 체크인") },
                    { text: "화장실이 어디예요?", label: t("translator.phrase_restroom", "화장실") },
                    { text: "물 한 잔 주세요", label: t("translator.phrase_water", "물 주문") },
                    { text: "WiFi 비밀번호가 뭐예요?", label: t("translator.phrase_wifi", "WiFi") },
                    { text: "영수증 주세요", label: t("translator.phrase_receipt", "영수증") },
                  ].map((phrase, i) => (
                    <button
                      key={i}
                      onClick={() => { setSourceText(phrase.text); setSourceLang("ko"); }}
                      className="text-left p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-[10px] text-muted-foreground">{phrase.label}</span>
                      <p className="text-xs font-medium mt-0.5 line-clamp-1">{phrase.text}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* History */}
        {showHistory && history.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("translator.history", "번역 기록")}
            </h3>
            <div className="space-y-2">
              {history.map(item => (
                <Card key={item.id} className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => {
                    setSourceLang(item.from);
                    setTargetLang(item.to);
                    setSourceText(item.source);
                    setTranslatedText(item.result);
                    setShowHistory(false);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px]">{getLanguageFlag(item.from)}</span>
                      <span className="text-[10px] text-muted-foreground">→</span>
                      <span className="text-[10px]">{getLanguageFlag(item.to)}</span>
                      {item.isVoice && (
                        <Badge variant="secondary" className="text-[8px] h-4 px-1">
                          <Mic className="h-2.5 w-2.5 mr-0.5" />
                          {t("translator.voice_mode", "음성")}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {item.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs truncate text-muted-foreground">{item.source}</p>
                    <p className="text-xs truncate font-medium">{item.result}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-muted-foreground">
            {t("translator.poweredBy", "AI 기반 번역 · 19개 언어 지원")}
            {voiceSupported && ` · ${t("translator.voice_supported", "음성 인식 지원")}`}
          </p>
        </div>
      </main>
    </div>
  );
}
