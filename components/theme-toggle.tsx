"use client";

import { useSyncExternalStore, useState } from "react";

function subscribe() {
  return () => {};
}

export default function ThemeToggle() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false,
  );

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage may be unavailable in restricted browser contexts
    }
  };

  if (!mounted) return <div className="w-9 h-9 sm:w-8 sm:h-8" />;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="ml-auto w-9 h-9 flex items-center justify-center rounded-full hover:bg-orange-600 transition-colors text-lg sm:w-8 sm:h-8"
    >
      {dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
