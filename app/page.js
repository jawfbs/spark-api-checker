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
