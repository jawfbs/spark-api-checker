"use client";

import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const { mode, setMode, accentColor, setAccentColor } = useTheme();

  /* ── API Connection state ── */
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
          `Pulling live data from Spark API.\nTotal listings available: ${data.totalActiveListings}` +
            (data.sampleRecord
              ? `\nSample ListingId: ${
                  data.sampleRecord.ListingId ?? data.sampleRecord.Id ?? "N/A"
                }`
              : "")
        );
      } else {
        setConnStatus("fail");
        setConnDetail(
          data.error +
            (data.detail ? "\n" + data.detail : "") +
            (data.httpStatus ? "\nHTTP " + data.httpStatus : "")
        );
      }
    } catch (err) {
      setConnStatus("fail");
      setConnDetail("Could not reach the API route. " + err.message);
    }
  }

  function handleResetTheme() {
    setMode("dark");
    setAccentColor("#0070f3");
  }

  return (
    <div className="settings-wrapper">
      <h1 className="settings-title">Settings</h1>

      {/* ═══ Section 1: Display Mode ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Display Mode</h2>
        <div className="mode-buttons">
          {["dark", "mellow", "light"].map((m) => (
            <button
              key={m}
              className={`mode-btn ${mode === m ? "mode-btn-active" : ""}`}
              onClick={() => setMode(m)}
            >
              <span className="mode-btn-icon">
                {m === "dark" && "🌙"}
                {m === "mellow" && "🌤"}
                {m === "light" && "☀️"}
              </span>
              <span className="mode-btn-label">
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Section 2: Theme Color ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Theme</h2>
        <p className="settings-hint">
          Choose an accent color for buttons, links, and highlights.
        </p>
        <div className="color-picker-row">
          <label className="color-picker-label" htmlFor="accent-picker">
            Accent Color
          </label>
          <div className="color-picker-group">
            <input
              id="accent-picker"
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
            "#0070f3",
            "#e63946",
            "#2a9d8f",
            "#e9c46a",
            "#f4a261",
            "#9b5de5",
            "#f15bb5",
            "#00bbf9",
            "#00f5d4",
            "#6c757d",
          ].map((c) => (
            <button
              key={c}
              className={`color-preset ${accentColor === c ? "color-preset-active" : ""}`}
              style={{ background: c }}
              onClick={() => setAccentColor(c)}
              title={c}
              aria-label={`Set accent color to ${c}`}
            />
          ))}
        </div>
        <button className="reset-btn" onClick={handleResetTheme}>
          Reset to Defaults
        </button>
      </div>

      {/* ═══ Section 3: API Connection ═══ */}
      <div className="settings-section">
        <h2 className="settings-section-title">Spark API Connection</h2>
        <p className="settings-hint">
          Test your live connection to the Spark API by FBS (replication
          endpoint).
        </p>

        <button
          className="run-btn"
          onClick={handleRun}
          disabled={connStatus === "loading"}
        >
          {connStatus === "loading" ? (
            <>
              <span className="spinner" />
              Testing…
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
