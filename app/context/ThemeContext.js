"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const ThemeContext = createContext();

/* ── Cookie helpers ── */
function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(
    value
  )};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const v = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return v ? decodeURIComponent(v.pop()) : null;
}

function darkenHex(hex, amount) {
  const r = Math.max(
    0,
    Math.floor(parseInt(hex.slice(1, 3), 16) * (1 - amount))
  );
  const g = Math.max(
    0,
    Math.floor(parseInt(hex.slice(3, 5), 16) * (1 - amount))
  );
  const b = Math.max(
    0,
    Math.floor(parseInt(hex.slice(5, 7), 16) * (1 - amount))
  );
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
  const [gamification, setGamification] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [disliked, setDisliked] = useState([]);

  const applyTheme = useCallback((m, c) => {
    document.documentElement.setAttribute("data-theme", m);
    document.documentElement.style.setProperty("--accent", c);
    document.documentElement.style.setProperty(
      "--accent-hover",
      darkenHex(c, 0.2)
    );
    document.documentElement.style.setProperty(
      "--accent-glow",
      c + "33"
    );
  }, []);

  /* ── Load from cookies on mount ── */
  useEffect(() => {
    try {
      const savedMode = getCookie("spark-mode") || "dark";
      const savedColor = getCookie("spark-accent") || "#0070f3";
      const savedGamification = getCookie("spark-gamification") === "true";
      const savedFavorites = JSON.parse(getCookie("spark-favorites") || "[]");
      const savedDisliked = JSON.parse(getCookie("spark-disliked") || "[]");

      setMode(savedMode);
      setAccentColor(savedColor);
      setGamification(savedGamification);
      setFavorites(savedFavorites);
      setDisliked(savedDisliked);
      applyTheme(savedMode, savedColor);
    } catch (e) {
      applyTheme("dark", "#0070f3");
    }
  }, [applyTheme]);

  /* ── Save mode + color ── */
  useEffect(() => {
    applyTheme(mode, accentColor);
    setCookie("spark-mode", mode);
    setCookie("spark-accent", accentColor);
  }, [mode, accentColor, applyTheme]);

  /* ── Save gamification ── */
  useEffect(() => {
    setCookie("spark-gamification", gamification.toString());
  }, [gamification]);

  /* ── Save favorites ── */
  useEffect(() => {
    try {
      setCookie("spark-favorites", JSON.stringify(favorites));
    } catch (e) {}
  }, [favorites]);

  /* ── Save disliked ── */
  useEffect(() => {
    try {
      setCookie("spark-disliked", JSON.stringify(disliked));
    } catch (e) {}
  }, [disliked]);

  /* ── Favorite helpers ── */
  function addFavorite(listing) {
    setFavorites((prev) => {
      if (prev.find((l) => l.listingId === listing.listingId)) return prev;
      return [...prev, listing];
    });
  }

  function removeFavorite(listingId) {
    setFavorites((prev) => prev.filter((l) => l.listingId !== listingId));
  }

  function isFavorite(listingId) {
    return favorites.some((l) => l.listingId === listingId);
  }

  /* ── Dislike helpers ── */
  function addDisliked(listingId) {
    setDisliked((prev) => {
      if (prev.includes(listingId)) return prev;
      return [...prev, listingId];
    });
  }

  function isDisliked(listingId) {
    return disliked.includes(listingId);
  }

  function clearDisliked() {
    setDisliked([]);
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        accentColor,
        setAccentColor,
        gamification,
        setGamification,
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        disliked,
        addDisliked,
        isDisliked,
        clearDisliked,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
