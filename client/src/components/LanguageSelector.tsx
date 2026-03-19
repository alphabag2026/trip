import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { languages } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-sm transition-colors border border-border/50"
      >
        <Globe className="h-4 w-4" />
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto rounded-xl bg-popover text-popover-foreground border border-border shadow-xl z-50">
          <div className="grid grid-cols-2 gap-0.5 p-2">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-secondary ${
                  i18n.language === lang.code ? "bg-primary/10 text-primary font-medium" : ""
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                <span className="truncate">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
