"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-orange-600 transition-colors text-lg"
    >
      {dark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
    </button>
  );
}
