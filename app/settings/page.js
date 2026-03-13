"use client";

import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const {
    mode,
    setMode,
    accentColor,
    setAccentColor,
    gamification,
    setGamification,
    disliked,
    clearDisliked,
  } = useTheme();

  const [connStatus, setConnStatus] = useState(null);
  const [connDetail, setConnDetail] = useState("");

  async function handleRun() {
    setConnStatus("loading");
    setConnDetail("");
    try {
      const res = await fetch("/api/spark-test", { cache: "no-store" });
      const data = await res.json();
      if (data.connected) {
        setConnStatus("success");
        setConnDetail(
          `Pulling live data.\nTotal listings: ${data.totalActiveListings}` +
            (data.sampleRecord
              ? `\nSample: ${data.sampleRecord.ListingId ?? "N/A"}`
              : "")
        );
      } else {
        setConnStatus("fail");
        setConnDetail(data.error + (data.detail ? "\n" + data.detail : ""));
      }
    } catch (err) {
      setConnStatus("fail");
      setConnDetail("Could not reach API. " + err.message);
    }
  }

  function handleResetTheme() {
    setMode("dark");
    setAccentColor("#0070f3");
  }

  return (
    <div className="settings-wrapper">
      <h1 className="settings-title">Settings</h1>

      {/* ═══ Display Mode ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Display Mode</h2>
        <div className="mode-buttons">
          {[
            { key: "dark", icon: "🌙", label: "Dark" },
            { key: "mellow", icon: "🌤", label: "Mellow" },
            { key: "light", icon: "☀️", label: "Light" },
          ].map((m) => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? "mode-btn-active" : ""}`}
              onClick={() => setMode(m.key)}
            >
              <span className="mode-btn-icon">{m.icon}</span>
              <span className="mode-btn-label">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Theme Color ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Theme</h2>
        <p className="settings-hint">Choose an accent color.</p>
        <div className="color-picker-row">
          <label className="color-picker-label" htmlFor="ap">Accent Color</label>
          <div className="color-picker-group">
            <input
              id="ap"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="color-picker-input"
            />
            <span className="color-picker-value">{accentColor}</span>
          </div>
        </div>
        <div className="color-presets">
          {[
            "#0070f3", "#e63946", "#2a9d8f", "#e9c46a", "#f4a261",
            "#9b5de5", "#f15bb5", "#00bbf9", "#00f5d4", "#6c757d",
          ].map((c) => (
            <button
              key={c}
              className={`color-preset ${accentColor === c ? "color-preset-active" : ""}`}
              style={{ background: c }}
              onClick={() => setAccentColor(c)}
              title={c}
            />
          ))}
        </div>
        <button className="reset-btn" onClick={handleResetTheme}>
          Reset to Defaults
        </button>
      </div>

      {/* ═══ Gamification ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Gamification</h2>
        <p className="settings-hint">
          Earn badges and track your browsing progress.
        </p>
        <div className="toggle-row">
          <span className="toggle-label">
            {gamification ? "Enabled" : "Disabled"}
          </span>
          <button
            className={`toggle-switch ${gamification ? "toggle-on" : ""}`}
            onClick={() => setGamification(!gamification)}
            role="switch"
            aria-checked={gamification}
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      {/* ═══ Hidden Listings ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Hidden Listings</h2>
        <p className="settings-hint">
          {disliked.length === 0
            ? "No hidden listings."
            : `${disliked.length} listing${disliked.length !== 1 ? "s" : ""} hidden from results.`}
        </p>
        {disliked.length > 0 && (
          <button className="reset-btn" onClick={clearDisliked}>
            Clear All Hidden Listings
          </button>
        )}
      </div>

      {/* ═══ API Connection ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Spark API Connection</h2>
        <p className="settings-hint">
          Test your connection to the Spark API by FBS.
        </p>
        <button
          className="run-btn"
          onClick={handleRun}
          disabled={connStatus === "loading"}
        >
          {connStatus === "loading" ? (
            <>
              <span className="spinner" /> Testing…
            </>
          ) : (
            "Run"
          )}
        </button>
        {connStatus === "success" && (
          <>
            <div className="result success">✅ Success</div>
            {connDetail && <p className="detail">{connDetail}</p>}
          </>
        )}
        {connStatus === "fail" && (
          <>
            <div className="result fail">❌ Run Failed</div>
            {connDetail && <p className="detail">{connDetail}</p>}
          </>
        )}
      </div>
    </div>
  );
}
