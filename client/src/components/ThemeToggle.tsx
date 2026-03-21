import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme, switchable } = useTheme();

  if (!switchable || !toggleTheme) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`h-9 w-9 rounded-full ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-yellow-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600 transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
}
