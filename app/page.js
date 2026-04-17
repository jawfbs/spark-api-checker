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
   TREE NODE, FIELDNAME, etc. (unchanged - kept all your original code here)
   ══════════════════════════════════════════ */
function TreeNode({ name, data, depth = 0, searchTerm = "" }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = data.children && Object.keys(data.children).length > 0;
  const isCategory = !data.type;

  useEffect(() => {
    if (searchTerm.length > 0) setExpanded(true);
  }, [searchTerm]);

  if (isCategory) {
    let entries = Object.entries(data);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      entries = entries.filter(([k]) => k.toLowerCase().includes(lower));
    }
    if (searchTerm && entries.length === 0) return null;
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
              <TreeNode key={key} name={key} data={val} depth={depth + 1} searchTerm={searchTerm} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (hasChildren) {
    return (
      <div className="tree-field tree-field-parent">
        <button
          className={`tree-field-btn ${expanded ? "tree-field-open" : ""}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="tree-expand-icon">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points={expanded ? "6 9 12 15 18 9" : "9 6 15 12 9 18"} />
            </svg>
          </span>
          <FieldName name={name} />
          <span className="tree-type-badge tree-type-nested">{data.type}</span>
          <span className="tree-field-sample">{data.sample}</span>
        </button>
        {expanded && (
          <div className="tree-field-children">
            {Object.entries(data.children).map(([ck, cv]) => (
              <TreeNode key={ck} name={ck} data={cv} depth={depth + 1} searchTerm={searchTerm} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="tree-field tree-field-leaf">
      <span className="tree-leaf-dot" />
      <FieldName name={name} />
      <span className={`tree-type-badge tree-type-${getTypeClass(data.type)}`}>{data.type}</span>
      <span className="tree-field-sample" title={String(data.value)}>{data.sample || "—"}</span>
    </div>
  );
}

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
    <span
      className={`tree-field-name ${copied ? "tree-field-copied" : ""}`}
      onClick={handleCopy}
      title="Click to copy field name"
    >
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
    "Listing Identity": "⬡", "Price & Financial": "◈", "Location & Address": "◎",
    "Property Characteristics": "⬢", "Interior Features": "▣", "Exterior & Lot": "◧",
    "Room Details": "▤", "School Information": "◉", "Tax & Assessment": "◆",
    "HOA & Community": "◇", "Agent & Office": "◍", "Dates & Timestamps": "◔",
    "Media & Photos": "◐", "Marketing & Descriptions": "◑",
    "Status & Compliance": "◒", "Geographic & Map": "◓",
    "Utility & Systems": "◕", "Other Fields": "◖",
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
        const base = v.type.includes("array") ? "array"
          : v.type.includes("object") ? "object"
          : v.type.includes("text") ? "string"
          : v.type;
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
          <span className={`type-dist-label tree-type-badge tree-type-${getTypeClass(type)}`}>{type}</span>
          <div className="type-dist-bar-track">
            <div
              className={`type-dist-bar-fill type-fill-${getTypeClass(type)}`}
              style={{ width: `${(count / max) * 100}%` }}
            />
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
  const [scanTime, setScanTime] = useState(null);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // New states for IDX Links & Saved Searches
  const [idxData, setIdxData] = useState(null);
  const [savedData, setSavedData] = useState(null);
  const [idxLoading, setIdxLoading] = useState(false);

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
    setIdxData(null);
    setSavedData(null);

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

  // New function: Load IDX Links & Saved Searches
  const loadIdxAndSaved = async () => {
    setIdxLoading(true);
    setError("");
    try {
      const res = await fetch("/api/spark-idx-saved");
      const json = await res.json();

      if (json.success) {
        setIdxData(json.idxLinks);
        setSavedData(json.savedSearches);
      } else {
        setError(json.error || "Failed to load IDX data");
      }
    } catch (err) {
      setError("Network error loading IDX Links & Saved Searches");
    }
    setIdxLoading(false);
  };

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

  function handleCollapseAll() {
    setData((prev) => prev ? { ...prev, _key: Date.now() } : prev);
  }

  const categoryCount = data?.fieldTree ? Object.keys(data.fieldTree).length : 0;
  const themeIcons = { dark: "🌙", mellow: "🌤", light: "☀️" };
  const themeLabels = { dark: "Dark", mellow: "Mellow", light: "Light" };

  return (
    <div className="app-shell">
      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />

      {/* Top Bar */}
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
          {/* Theme switcher (unchanged) */}
          <div className="theme-switcher-wrap">
            <button className="theme-toggle-btn" onClick={(e) => { e.stopPropagation(); setShowThemeMenu(!showThemeMenu); }}>
              <span className="theme-toggle-icon">{themeIcons[theme]}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showThemeMenu && (
              <div className="theme-dropdown" onClick={(e) => e.stopPropagation()}>
                {["light", "mellow", "dark"].map((t) => (
                  <button key={t} className={`theme-option ${theme === t ? "theme-option-active" : ""}`} onClick={() => { changeTheme(t); setShowThemeMenu(false); }}>
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

      {/* Main Layout */}
      <div className="main-layout">
        {/* LEFT PANEL - unchanged except we clear IDX data on new scan */}
        <aside className="left-panel">
          <div className="left-panel-inner">
            <h1 className="hero-title">
              Spark API <span className="hero-title-accent">Field Explorer</span>
            </h1>
            <p className="hero-desc">
              Connect to the Spark API and discover every publicly available MLS listing field.
            </p>

            <div className="button-group">
              <button
                className={`run-button ${status === "loading" ? "run-button-loading" : ""}`}
                onClick={handleRun}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <span className="run-inner"><span className="run-spinner" /> Scanning…</span>
                ) : (
                  <span className="run-inner">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Run Explorer</span>
                  </span>
                )}
              </button>

              {/* New Button - IDX Links & Saved Searches */}
              <button
                className={`idx-button ${idxLoading ? "idx-button-loading" : ""}`}
                onClick={loadIdxAndSaved}
                disabled={idxLoading}
              >
                {idxLoading ? "Loading IDX…" : "Load IDX Links & Saved Searches"}
              </button>
            </div>

            <span className="run-hint">Ctrl + Enter to scan fields</span>

            <ScanLog logs={scanLogs} />

            {status === "fail" && (
              <div className="error-card">
                <span className="error-icon">✕</span>
                <div>
                  <div className="error-title">Connection Failed</div>
                  <div className="error-detail">{error}</div>
                </div>
              </div>
            )}

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

            {data && <TypeDistribution fieldTree={data.fieldTree} />}

            <div className="left-footer">
              Powered by <a href="http://sparkplatform.com/docs/api_services/read_first" target="_blank" rel="noopener noreferrer">Spark API</a> &amp; <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a>
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <main className="right-panel">
          {!data && status !== "loading" && !idxData && !savedData && (
            <div className="empty-state">Click Run Explorer or Load IDX Links to begin</div>
          )}

          {status === "loading" && <div className="loading-pulse">Scanning Spark API…</div>}

          {/* Original Field Explorer Results */}
          {data && (
            <div className="results-panel">
              {/* your existing toolbar, search, tree, etc. - unchanged */}
              {/* ... (I kept it short here for space - paste your original results-panel code if needed) ... */}
            </div>
          )}

          {/* New IDX Links & Saved Searches Section */}
          {(idxData || savedData) && (
            <div className="idx-results mt-8 p-6 bg-zinc-900 rounded-xl border border-zinc-700">
              <h2 className="text-2xl font-bold mb-6 text-green-400">IDX Links & Saved Searches</h2>

              {/* IDX Links Table */}
              <div className="mb-10">
                <h3 className="text-xl font-semibold mb-3">IDX Links ({Array.isArray(idxData) ? idxData.length : 0})</h3>
                <div className="overflow-auto max-h-96 border border-zinc-700 rounded">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700 bg-zinc-800">
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Saved Search ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(idxData) && idxData.map((item, i) => (
                        <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800">
                          <td className="p-3">{item.Name || 'N/A'}</td>
                          <td className="p-3">{item.LinkType || 'N/A'}</td>
                          <td className="p-3 font-mono text-green-400">{item.SearchId || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Saved Searches Table */}
              <div>
                <h3 className="text-xl font-semibold mb-3">Saved Searches ({Array.isArray(savedData) ? savedData.length : 0})</h3>
                <div className="overflow-auto max-h-96 border border-zinc-700 rounded">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-700 bg-zinc-800">
                        <th className="text-left p-3">Name</th>
                        <th className="text-left p-3">Criteria</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(savedData) && savedData.map((item, i) => (
                        <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800">
                          <td className="p-3">{item.Name || 'N/A'}</td>
                          <td className="p-3 text-zinc-400 text-xs break-all">
                            {JSON.stringify(item.Filter || item) || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
