import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { languages } from "@/lib/i18n";
import { Globe, ChevronDown, Loader2, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STORAGE_KEY = "meetup-travel-auto-translate-lang";

/** localStorage에서 자동 번역 언어 가져오기 */
function getAutoTranslateLang(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** localStorage에 자동 번역 언어 저장 */
function setAutoTranslateLang(langCode: string) {
  try {
    localStorage.setItem(STORAGE_KEY, langCode);
  } catch {
    // ignore
  }
}

interface TranslateButtonProps {
  /** The text content to translate */
  text: string;
  /** Optional: specify source language code (auto-detect if not provided) */
  sourceLang?: string;
  /** Variant: 'icon' shows only globe icon, 'compact' shows small button, 'full' shows text */
  variant?: "icon" | "compact" | "full";
  /** Optional class name */
  className?: string;
  /** Callback when translation is complete */
  onTranslated?: (translatedText: string, targetLang: string) => void;
  /** Enable auto-translate on mount if user has a saved language preference */
  autoTranslate?: boolean;
}

/**
 * TranslateButton - 사용자 입력 콘텐츠에 번역 버튼을 추가하는 컴포넌트
 * - 클릭하면 언어 선택 드롭다운이 표시되고, 선택한 언어로 번역됨
 * - 번역 후 '원문 보기' 토글 가능
 * - 사용자가 선택한 언어를 localStorage에 저장하여 다음 방문 시 자동 번역
 */
export function TranslateButton({
  text,
  sourceLang,
  variant = "compact",
  className = "",
  onTranslated,
  autoTranslate = true,
}: TranslateButtonProps) {
  const { i18n, t } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [hasAutoTranslated, setHasAutoTranslated] = useState(false);

  const translateMutation = trpc.chatMessage.translateText.useMutation();

  const handleTranslate = useCallback(
    async (langCode: string, isAuto = false) => {
      if (!text || text.trim().length === 0) return;
      if (langCode === sourceLang) return;

      setIsTranslating(true);
      setTargetLang(langCode);
      setShowOriginal(false);

      try {
        const result = await translateMutation.mutateAsync({
          text: text.trim(),
          targetLang: langCode,
          sourceLang: sourceLang,
        });
        const translatedStr = String(result.translated || "");
        setTranslatedText(translatedStr);
        onTranslated?.(translatedStr, langCode);

        // 수동 번역 시 언어 선택을 localStorage에 저장
        if (!isAuto) {
          setAutoTranslateLang(langCode);
        }
      } catch (err) {
        console.error("Translation failed:", err);
        setTranslatedText(null);
      } finally {
        setIsTranslating(false);
      }
    },
    [text, sourceLang, translateMutation, onTranslated]
  );

  // 자동 번역: localStorage에 저장된 언어가 있으면 마운트 시 자동 번역
  useEffect(() => {
    if (!autoTranslate || hasAutoTranslated) return;
    const savedLang = getAutoTranslateLang();
    if (savedLang && savedLang !== sourceLang && text && text.trim().length > 0) {
      setHasAutoTranslated(true);
      handleTranslate(savedLang, true);
    }
  }, [autoTranslate, hasAutoTranslated, sourceLang, text]);

  const handleQuickTranslate = useCallback(() => {
    // Quick translate to current UI language
    const currentLang = i18n.language;
    handleTranslate(currentLang);
  }, [i18n.language, handleTranslate]);

  const clearTranslation = useCallback(() => {
    setTranslatedText(null);
    setTargetLang(null);
    setShowOriginal(false);
  }, []);

  const toggleOriginal = useCallback(() => {
    setShowOriginal(prev => !prev);
  }, []);

  // Filter out source language from options
  const availableLanguages = languages.filter(
    (l) => l.code !== sourceLang
  );

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center gap-1 ${className}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title={t("common.translate", "번역")}
            >
              {isTranslating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Globe className="w-3.5 h-3.5" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto min-w-[160px]">
            {availableLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleTranslate(lang.code)}
                className="flex items-center gap-2 text-sm"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                {targetLang === lang.code && translatedText && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* 원문 보기 토글 (icon variant) */}
        {translatedText && (
          <button
            className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title={showOriginal ? t("translate.showTranslation", "번역 보기") : t("translate.showOriginal", "원문 보기")}
            onClick={toggleOriginal}
          >
            {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="inline-flex items-center gap-1">
        {/* Quick translate button (to current UI language) */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={handleQuickTranslate}
          disabled={isTranslating}
        >
          {isTranslating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Globe className="w-3 h-3" />
          )}
          {variant === "full" && (
            <span>{t("common.translate", "번역")}</span>
          )}
        </Button>

        {/* Language selector dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
              disabled={isTranslating}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto min-w-[160px]">
            {availableLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleTranslate(lang.code)}
                className="flex items-center gap-2 text-sm"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
                {targetLang === lang.code && translatedText && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 원문 보기 토글 */}
        {translatedText && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={toggleOriginal}
            title={showOriginal ? t("translate.showTranslation", "번역 보기") : t("translate.showOriginal", "원문 보기")}
          >
            {showOriginal ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showOriginal ? t("translate.showTranslation", "번역 보기") : t("translate.showOriginal", "원문 보기")}</span>
          </Button>
        )}

        {/* Clear translation */}
        {translatedText && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1 text-xs text-muted-foreground hover:text-destructive"
            onClick={clearTranslation}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Translation result or original text */}
      {translatedText && (
        <div className="mt-1 p-2 rounded-md bg-muted/50 border border-border/50 text-sm">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            {showOriginal ? (
              <>
                <Eye className="w-3 h-3" />
                <span>{t("translate.originalText", "원문")}</span>
              </>
            ) : (
              <>
                <Globe className="w-3 h-3" />
                <span>
                  {languages.find((l) => l.code === targetLang)?.flag}{" "}
                  {languages.find((l) => l.code === targetLang)?.name}
                </span>
              </>
            )}
          </div>
          <p className="whitespace-pre-wrap">{showOriginal ? text : translatedText}</p>
        </div>
      )}
    </div>
  );
}

/**
 * InlineTranslateButton - 텍스트 옆에 작은 번역 아이콘만 표시
 * 번역 결과는 콜백으로만 전달 (부모 컴포넌트에서 표시)
 */
export function InlineTranslateButton({
  text,
  sourceLang,
  className = "",
  onTranslated,
}: Omit<TranslateButtonProps, "variant">) {
  return (
    <TranslateButton
      text={text}
      sourceLang={sourceLang}
      variant="icon"
      className={className}
      onTranslated={onTranslated}
    />
  );
}

export default TranslateButton;
