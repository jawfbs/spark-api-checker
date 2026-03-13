"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext();

function darkenHex(hex, amount) {
  const r = Math.max(0, Math.floor(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState("dark");
  const [accentColor, setAccentColor] = useState("#0070f3");

  const applyTheme = useCallback((m, c) => {
    document.documentElement.setAttribute("data-theme", m);
    document.documentElement.style.setProperty("--accent", c);
    document.documentElement.style.setProperty("--accent-hover", darkenHex(c, 0.2));
  }, []);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("spark-theme-mode") || "dark";
      const savedColor = localStorage.getItem("spark-theme-accent") || "#0070f3";
      setMode(savedMode);
      setAccentColor(savedColor);
      applyTheme(savedMode, savedColor);
    } catch (e) {
      applyTheme("dark", "#0070f3");
    }
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(mode, accentColor);
    try {
      localStorage.setItem("spark-theme-mode", mode);
      localStorage.setItem("spark-theme-accent", accentColor);
    } catch (e) {}
  }, [mode, accentColor, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
