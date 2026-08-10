"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/nav/icons";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // document/matchMedia don't exist during SSR, so the resolved theme can
    // only be read after mount — deliberately an effect (not a lazy useState
    // initializer) so the server-rendered icon and the client's first paint
    // stay identical, avoiding a hydration mismatch.
    const current = document.documentElement.getAttribute("data-theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(
      current === "dark" || current === "light"
        ? current
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
    );
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={`flex items-center justify-center rounded-full border border-border bg-surface-2 text-fg-muted hover:text-fg ${className}`}
    >
      {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
