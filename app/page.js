"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/* ══════════════════════════════════════════
   THEME
   ══════════════════════════════════════════ */
function useTheme() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const saved = localStorage.getItem("spark-theme");
    if (saved && ["dark", "mellow", "light"].includes(saved)) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  const changeTheme = useCallback((t) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("spark-theme", t);
  }, []);

  return { theme, changeTheme };
}

/* ══════════════════════════════════════════
   ANIMATED COUNTER
   ══════════════════════════════════════════ */
function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (value == null) return;
    const num = typeof value === "number" ? value : parseInt(value, 10);
    if (isNaN(num)) { setDisplay(value); return; }

    let start = 0;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * num));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  return <>{typeof display === "number" ? display.toLocaleString() : display}</>;
}

/* ══════════════════════════════════════════
   HELPER: Check if field has no data
   ══════════════════════════════════════════ */
function isFieldEmpty(data) {
  if (data.type === "null") return true;
  if (!data.sample || data.sample === "—" || data.sample === "[]" || data.sample === "{}") return true;
  if (/^\*+$/.test(data.sample)) return true;
  if (data.sample === "[]" || data.sample === "empty") return true;
  return false;
}

/* ══════════════════════════════════════════
   TREE NODE
   ══════════════════════════════════════════ */
function TreeNode({ name, data, depth = 0, searchTerm = "", dataFilter = "all" }) {
  const [expanded, setExpanded] = useState(depth < 1);

  const hasChildren = data.children && Object.keys(data.children).length > 0;
  const isCategory = !data.type;

  /* Auto-expand when searching */
  useEffect(() => {
    if (searchTerm.length > 0) setExpanded(true);
  }, [searchTerm]);

  /* Category node */
  if (isCategory) {
    let entries = Object.entries(data);

    /* Apply search filter */
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      entries = entries.filter(([k]) => k.toLowerCase().includes(lower));
    }

    /* Apply data presence filter */
    if (dataFilter === "with-data") {
      entries = entries.filter(([k, v]) => !isFieldEmpty(v));
    } else if (dataFilter === "without-data") {
      entries = entries.filter(([k, v]) => isFieldEmpty(v));
    }

    if (searchTerm && entries.length === 0) return null;
    if (dataFilter !== "all" && entries.length === 0) return null;

    const fieldCount = entries.length;

    return (
      <div className="tree-category">
        <button
          className={`tree-cat-btn ${expanded ? "tree-cat-open" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="tree-cat-chevron">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points={expanded ? "6 9 12 15 18 9" : "9 6 15 12 9 18"} />
            </svg>
          </span>
          <span className="tree-cat-icon">{getCategoryIcon(name)}</span>
          <span className="tree-cat-name">{name}</span>
          <span className="tree-cat-count">{fieldCount}</span>
        </button>
        {expanded && (
          <div className="tree-cat-children">
            {entries.map(([key, val]) => (
              <TreeNode key={key} name={key} data={val} depth={depth + 1} searchTerm={searchTerm} dataFilter={dataFilter} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* Field with children */
  if (hasChildren) {
    return (
      <div className="tree-field tree-field-parent">
        <button
          className={`tree-field-btn ${expanded ? "tree-field-open" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="tree-expand-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points={expanded ? "6 9 12 15 18 9" : "9 6 15 12 9 18"} />
            </svg>
          </span>
          <span className="tree-field-name"><FieldName name={name} /></span>
          <span className={`tree-type-badge tree-type-${getTypeClass(data.type)}`}>{data.type}</span>
          <span className="tree-field-sample">{data.sample}</span>
        </button>
        {expanded && (
          <div className="tree-field-children">
            {Object.entries(data.children).map(([ck, cv]) => (
              <TreeNode key={ck} name={ck} data={cv} depth={depth + 1} searchTerm={searchTerm} dataFilter={dataFilter} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* Leaf */
  return (
    <div className="tree-field tree-field-leaf">
      <span className="tree-leaf-dot" />
      <span className="tree-field-name"><FieldName name={name} /></span>
      <span className={`tree-type-badge tree-type-${getTypeClass(data.type)}`}>{data.type}</span>
      <span className="tree-field-sample">{data.sample || "—"}</span>
    </div>
  );
}

/* Clickable field name — copies to clipboard */
function FieldName({ name }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(name).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }

  return (
    <span onClick={handleCopy} className={`tree-field-name ${copied ? "tree-field-copied" : ""}`} title="Click to copy field name">
      {name}
      {copied && <span className="copied-toast">Copied!</span>}
    </span>
  );
}

function getTypeClass(type) {
  if (!type) return "null";
  if (type.includes("array")) return "array";
  if (type.includes("object")) return "object";
  if (type === "boolean") return "bool";
  if (type === "integer" || type === "decimal") return "number";
  if (type === "datetime") return "date";
  if (type === "url") return "url";
  if (type.includes("text")) return "text";
  if (type === "null") return "null";
  return "string";
}

function getCategoryIcon(name) {
  const icons = {
    "Listing Identity": "⬡",
    "Price & Financial": "◈",
    "Location & Address": "◎",
    "Property Characteristics": "⬢",
    "Interior Features": "▣",
    "Exterior & Lot": "◧",
    "Room Details": "▤",
    "School Information": "◉",
    "Tax & Assessment": "◆",
    "HOA & Community": "◇",
    "Agent & Office": "◍",
    "Dates & Timestamps": "◔",
    "Media & Photos": "◐",
    "Marketing & Descriptions": "◑",
    "Status & Compliance": "◒",
    "Geographic & Map": "◓",
    "Utility & Systems": "◕",
    "Other Fields": "◖",
  };
  return icons[name] || "◌";
}

/* ══════════════════════════════════════════
   SCAN LOG
   ══════════════════════════════════════════ */
function ScanLog({ logs }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs]);

  if (logs.length === 0) return null;
  return (
    <div className="scan-log" ref={ref}>
      {logs.map((log, i) => (
        <div key={i} className={`scan-log-line scan-log-${log.type}`}>
          <span className="scan-log-time">{log.time}</span>
          <span className="scan-log-msg">{log.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   TYPE DISTRIBUTION
   ══════════════════════════════════════════ */
function TypeDistribution({ fieldTree }) {
  if (!fieldTree) return null;

  const counts = {};
  function walk(node) {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (v && v.type) {
        const base = v.type.includes("array") ? "array" : v.type.includes("object") ? "object" : v.type.includes("text") ? "string" : v.type;
        counts[base] = (counts[base] || 0) + 1;
        if (v.children) walk(v.children);
      } else if (typeof v === "object" && v !== null) {
        walk(v);
      }
    }
  }
  walk(fieldTree);

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="type-dist">
      <div className="type-dist-title">Field Type Distribution</div>
      {sorted.map(([type, count]) => (
        <div key={type} className="type-dist-row">
          <span className={`tree-type-badge tree-type-${getTypeClass(type)} type-dist-label`}>{type}</span>
          <div className="type-dist-bar-track">
            <div className={`type-dist-bar-fill type-fill-${getTypeClass(type)}`} style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="type-dist-count">{count}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════ */
export default function Home() {
  const { theme, changeTheme } = useTheme();

  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scanLogs, setScanLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dataFilter, setDataFilter] = useState("all");
  const [scanTime, setScanTime] = useState(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  function addLog(type, msg) {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setScanLogs((prev) => [...prev, { type, msg, time }]);
  }

  const handleRun = useCallback(async () => {
    setStatus("loading");
    setData(null);
    setError("");
    setScanLogs([]);
    setScanTime(null);

    const t0 = performance.now();
    addLog("info", "Initializing Spark API connection…");

    try {
      addLog("info", "Sending request to /api/spark-fields");
      addLog("info", "Expanding: Photos, Videos, VirtualTours, OpenHouses, Rooms, Units, Documents");

      const res = await fetch("/api/spark-fields", { cache: "no-store" });
      addLog("info", `Response received — HTTP ${res.status}`);

      const json = await res.json();
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setScanTime(elapsed);

      if (json.success && json.fieldTree) {
        addLog("success", `Connection verified — ${json.totalListings.toLocaleString()} listings accessible`);
        addLog("success", `Sample listing: MLS# ${json.sampleListingId}`);
        addLog("success", `${json.rawFieldCount} fields discovered across ${Object.keys(json.fieldTree).length} categories`);
        addLog("success", `Scan completed in ${elapsed}s`);
        setStatus("success");
        setData(json);
      } else {
        addLog("error", json.error || "No data returned");
        addLog("error", `Scan failed after ${elapsed}s`);
        setStatus("fail");
        setError(json.error || "No data returned from API.");
      }
    } catch (err) {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
      setScanTime(elapsed);
      addLog("error", `Network error: ${err.message}`);
      setStatus("fail");
      setError("Network error: " + err.message);
    }
  }, []);

  /* Keyboard shortcut */
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleRun]);

  /* Close theme menu on click outside */
  useEffect(() => {
    if (!showThemeMenu) return;
    function handleClick() { setShowThemeMenu(false); }
    setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => document.removeEventListener("click", handleClick);
  }, [showThemeMenu]);

  function handleExportJSON() {
    if (!data?.fieldTree) return;
    const blob = new Blob([JSON.stringify(data.fieldTree, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spark-fields-${data.sampleListingId || "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const categoryCount = data?.fieldTree ? Object.keys(data.fieldTree).length : 0;

  const themeIcons = { dark: "🌙", mellow: "🌤", light: "☀️" };
  const themeLabels = { dark: "Dark", mellow: "Mellow", light: "Light" };

  return (
    <div className={theme}>
      {/* ── Ambient ── */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />

      {/* ── Top Bar ── */}
      <header className="top-bar">
        <div className="top-bar-left">
          <span className="brand-mark">⬡</span>
          <span className="brand-text">SPARK</span>
          <span className="brand-divider" />
          <span className="brand-sub">FIELD EXPLORER</span>
        </div>

        <div className="top-bar-right">
          {data && (
            <div className="conn-indicator">
              <span className="conn-dot" />
              <span className="conn-text">LIVE</span>
            </div>
          )}

          {/* Theme switcher */}
          <div className="theme-switcher-wrap">
            <button
              className="theme-toggle-btn"
              onClick={(e) => { e.stopPropagation(); setShowThemeMenu(!showThemeMenu); }}
              title="Switch theme"
              aria-label="Switch theme"
            >
              <span className="theme-toggle-icon">{themeIcons[theme]}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showThemeMenu && (
              <div className="theme-dropdown" onClick={(e) => e.stopPropagation()}>
                {["light", "mellow", "dark"].map((t) => (
                  <button
                    key={t}
                    className={`theme-option ${theme === t ? "theme-option-active" : ""}`}
                    onClick={() => { changeTheme(t); setShowThemeMenu(false); }}
                  >
                    <span className="theme-option-icon">{themeIcons[t]}</span>
                    <span className="theme-option-label">{themeLabels[t]}</span>
                    {theme === t && <span className="theme-option-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout: Two Panels ── */}
      <div className="main-layout">
        {/* ── LEFT PANEL ── */}
        <aside className="left-panel">
          <div className="left-panel-inner">
            <h1 className="hero-title">
              Spark API
              <span className="hero-title-accent">Field Explorer</span>
            </h1>
            <p className="hero-desc">
              Connect to the Spark API and discover every publicly available MLS
              listing field in an interactive categorized tree.
            </p>

            <button
              className={`run-button ${status === "loading" ? "run-button-loading" : ""}`}
              onClick={handleRun}
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="run-inner">
                  <span className="run-spinner" />
                  <span>Scanning…</span>
                </span>
              ) : (
                <span className="run-inner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Run Explorer</span>
                </span>
              )}
            </button>
            <span className="run-hint">or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>

            {/* Scan log */}
            <ScanLog logs={scanLogs} />

            {/* Error */}
            {status === "fail" && (
              <div className="error-card">
                <span className="error-icon">✕</span>
                <div>
                  <div className="error-title">Connection Failed</div>
                  <div className="error-detail">{error}</div>
                </div>
              </div>
            )}

            {/* Stats */}
            {data && (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value"><AnimatedNumber value={data.totalListings} /></span>
                  <span className="stat-label">Listings</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value"><AnimatedNumber value={data.rawFieldCount} /></span>
                  <span className="stat-label">Fields</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value"><AnimatedNumber value={categoryCount} /></span>
                  <span className="stat-label">Categories</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value stat-value-sm">{scanTime}s</span>
                  <span className="stat-label">Scan Time</span>
                </div>
              </div>
            )}

            {/* Type distribution */}
            {data && <TypeDistribution fieldTree={data.fieldTree} />}

            {/* Footer */}
            <div className="left-footer">
              Powered by{" "}
              <a href="http://sparkplatform.com/docs/api_services/read_first" target="_blank" rel="noopener noreferrer">Spark API</a>
              {" "}&amp;{" "}
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a>
            </div>
          </div>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="right-panel">
          {/* Empty state */}
          {!data && status !== "loading" && (
            <div className="empty-state">
              <div className="empty-grid">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="empty-cell" />
                ))}
              </div>
              <div className="empty-text">
                <span className="empty-icon">⬡</span>
                <span>Click <strong>Run Explorer</strong> to scan API fields</span>
              </div>
            </div>
          )}

          {/* Loading state */}
          {status === "loading" && !data && (
            <div className="empty-state">
              <div className="loading-pulse">
                <div className="pulse-ring" />
                <div className="pulse-ring pulse-ring-2" />
                <div className="pulse-ring pulse-ring-3" />
                <span className="pulse-icon">⬡</span>
              </div>
              <div className="empty-text">
                <span>Scanning Spark API…</span>
              </div>
            </div>
          )}

          {/* Results */}
          {data && (
            <div className="results-panel" key={data._key || "results"}>
              {/* Toolbar */}
              <div className="results-toolbar">
                <div className="search-box">
                  <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Filter fields…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button className="search-clear" onClick={() => setSearchTerm("")}>✕</button>
                  )}
                </div>

{/* Data Presence Filter */}
<div className="data-filter-group">
  <button
    className={`data-filter-btn ${dataFilter === "all" ? "data-filter-active" : ""}`}
    onClick={() => setDataFilter("all")}
    title="Show all fields"
  >
    All
  </button>
  <button
    className={`data-filter-btn ${dataFilter === "with-data" ? "data-filter-active" : ""}`}
    onClick={() => setDataFilter("with-data")}
    title="Show fields with data"
  >
       }
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    With Data
  </button>
  <button
    className={`data-filter-btn ${dataFilter === "without-data" ? "data-filter-active" : ""}`}
    onClick={() => setDataFilter("without-data")}
    title="Show fields without data (null, empty, or asterisks)"
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
    Without Data
  </button>
</div>

                <div className="toolbar-actions">
                  <button className="toolbar-btn" onClick={handleRun} title="Rescan">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Rescan
                  </button>
                  <button className="toolbar-btn" onClick={handleExportJSON} title="Export as JSON">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export JSON
                  </button>
                </div>
              </div>

              {/* Sample listing ID */}
              <div className="results-meta">
                <span>Sample: MLS# <strong>{data.sampleListingId}</strong></span>
                <span>{data.rawFieldCount} fields · {categoryCount} categories</span>
              </div>

              {/* Tree */}
              <div className="tree-container">
                {Object.entries(data.fieldTree).map(([catName, catData]) => (
                  <TreeNode key={catName} name={catName} data={catData} depth={0} searchTerm={searchTerm} dataFilter={dataFilter} />
                ))}
              </div>

              <div className="results-footer-bar">
                Scanned at {new Date(data.timestamp).toLocaleString()} · {scanTime}s
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
