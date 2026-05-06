import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { languages } from "@/lib/i18n";
import { Globe, ChevronDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

/**
 * TranslateButton - 사용자 입력 콘텐츠에 번역 버튼을 추가하는 컴포넌트
 * 클릭하면 언어 선택 드롭다운이 표시되고, 선택한 언어로 번역됨
 */
export function TranslateButton({
  text,
  sourceLang,
  variant = "compact",
  className = "",
  onTranslated,
}: TranslateButtonProps) {
  const { i18n, t } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const translateMutation = trpc.chatMessage.translateText.useMutation();

  const handleTranslate = useCallback(
    async (langCode: string) => {
      if (!text || text.trim().length === 0) return;
      if (langCode === sourceLang) return;

      setIsTranslating(true);
      setTargetLang(langCode);

      try {
        const result = await translateMutation.mutateAsync({
          text: text.trim(),
          targetLang: langCode,
          sourceLang: sourceLang,
        });
        const translatedStr = String(result.translated || "");
        setTranslatedText(translatedStr);
        onTranslated?.(translatedStr, langCode);
      } catch (err) {
        console.error("Translation failed:", err);
        setTranslatedText(null);
      } finally {
        setIsTranslating(false);
      }
    },
    [text, sourceLang, translateMutation, onTranslated]
  );

  const handleQuickTranslate = useCallback(() => {
    // Quick translate to current UI language
    const currentLang = i18n.language;
    handleTranslate(currentLang);
  }, [i18n.language, handleTranslate]);

  const clearTranslation = useCallback(() => {
    setTranslatedText(null);
    setTargetLang(null);
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
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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

      {/* Translation result */}
      {translatedText && (
        <div className="mt-1 p-2 rounded-md bg-muted/50 border border-border/50 text-sm">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Globe className="w-3 h-3" />
            <span>
              {languages.find((l) => l.code === targetLang)?.flag}{" "}
              {languages.find((l) => l.code === targetLang)?.name}
            </span>
          </div>
          <p className="whitespace-pre-wrap">{translatedText}</p>
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
