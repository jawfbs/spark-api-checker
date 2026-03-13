"use client";

import { useState, useCallback } from "react";

/* ═══ Tree Node Component ═══ */
function TreeNode({ name, data, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 1);

  const hasChildren = data.children && Object.keys(data.children).length > 0;
  const isCategory = !data.type;

  /* Category node (top level group) */
  if (isCategory) {
    const entries = Object.entries(data);
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
          <span className="tree-cat-icon">
            {getCategoryIcon(name)}
          </span>
          <span className="tree-cat-name">{name}</span>
          <span className="tree-cat-count">{fieldCount}</span>
        </button>

        {expanded && (
          <div className="tree-cat-children">
            {entries.map(([key, val]) => (
              <TreeNode key={key} name={key} data={val} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* Field node with children (array of objects / nested object) */
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
          <span className="tree-field-name">{name}</span>
          <span className="tree-type-badge tree-type-nested">{data.type}</span>
          <span className="tree-field-sample">{data.sample}</span>
        </button>

        {expanded && (
          <div className="tree-field-children">
            {Object.entries(data.children).map(([ck, cv]) => (
              <TreeNode key={ck} name={ck} data={cv} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* Leaf field node */
  return (
    <div className="tree-field tree-field-leaf">
      <span className="tree-leaf-dot" />
      <span className="tree-field-name">{name}</span>
      <span className={`tree-type-badge tree-type-${getTypeClass(data.type)}`}>
        {data.type}
      </span>
      <span className="tree-field-sample" title={String(data.value)}>
        {data.sample || "—"}
      </span>
    </div>
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

/* ═══ Main Page ═══ */
export default function Home() {
  const [status, setStatus] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  const handleRun = useCallback(async () => {
    setStatus("loading");
    setData(null);
    setError("");

    try {
      const res = await fetch("/api/spark-fields", { cache: "no-store" });
      const json = await res.json();

      if (json.success && json.fieldTree) {
        setStatus("success");
        setData(json);
      } else {
        setStatus("fail");
        setError(json.error || "No data returned from API.");
      }
    } catch (err) {
      setStatus("fail");
      setError("Network error: " + err.message);
    }
  }, []);

  const categoryCount = data?.fieldTree ? Object.keys(data.fieldTree).length : 0;

  return (
    <div className="app-container">
      {/* ── Ambient background ── */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-mark">⬡</span>
          <span className="brand-text">SPARK</span>
          <span className="brand-sub">FIELD EXPLORER</span>
        </div>
        <div className="header-status">
          {data && (
            <>
              <span className="status-dot status-dot-live" />
              <span className="status-text">CONNECTED</span>
            </>
          )}
        </div>
      </header>

      {/* ── Hero Section ── */}
      {!data && (
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-title">
              Spark API<br />
              <span className="hero-title-accent">Field Explorer</span>
            </h1>
            <p className="hero-desc">
              Connect to the Spark API by FBS and discover every publicly
              available field organized in a navigable tree structure.
            </p>

            <button
              className="run-button"
              onClick={handleRun}
              disabled={status === "loading"}
            >
              {status === "loading" ? (
                <span className="run-loading">
                  <span className="run-spinner" />
                  <span>Scanning API…</span>
                </span>
              ) : (
                <span className="run-ready">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Run Explorer</span>
                </span>
              )}
            </button>

            {status === "fail" && (
              <div className="error-card">
                <span className="error-icon">✕</span>
                <div>
                  <div className="error-title">Connection Failed</div>
                  <div className="error-detail">{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* Decorative grid */}
          <div className="hero-grid">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="hero-grid-cell" />
            ))}
          </div>
        </section>
      )}

      {/* ── Results Section ── */}
      {data && (
        <section className="results-section">
          {/* Stats bar */}
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-value">{data.totalListings?.toLocaleString()}</span>
              <span className="stat-label">Total Listings</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{data.rawFieldCount}</span>
              <span className="stat-label">Fields Found</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{categoryCount}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="stat-card">
              <span className="stat-value stat-value-mono">{data.sampleListingId}</span>
              <span className="stat-label">Sample MLS#</span>
            </div>
          </div>

          {/* Controls */}
          <div className="tree-controls">
            <button className="control-btn" onClick={handleRun}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Rescan
            </button>
            <span className="control-divider" />
            <span className="control-hint">Click categories to expand · Fields show type and sample value</span>
          </div>

          {/* Field Tree */}
          <div className="tree-container">
            {Object.entries(data.fieldTree).map(([catName, catData]) => (
              <TreeNode key={catName} name={catName} data={catData} depth={0} />
            ))}
          </div>

          {/* Timestamp */}
          <div className="results-footer">
            <span>Scanned at {new Date(data.timestamp).toLocaleString()}</span>
            <span>
              Powered by{" "}
              <a href="http://sparkplatform.com/docs/api_services/read_first" target="_blank" rel="noopener noreferrer">
                Spark API
              </a>
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
