"use client";

import { useState, useCallback } from "react";

interface FieldInfo {
  type: string;
  value: any;
  sample: string;
  children?: Record<string, FieldInfo>;
}

interface FieldsResponse {
  success: boolean;
  connection: string;
  totalListings: number;
  sampleListingId: string;
  rawFieldCount: number;
  timestamp: string;
  fieldTree: Record<string, Record<string, FieldInfo>>;
  error?: string;
}

interface DebugTest {
  name: string;
  pass: boolean;
  status: number | null;
  detail: string;
}

interface DebugResponse {
  tests: DebugTest[];
}

const CATEGORY_ICONS: Record<string, string> = {
  "Listing Identity": "🏷️",
  "Price & Financial": "💰",
  "Location & Address": "📍",
  "Property Characteristics": "🏠",
  "Interior Features": "🛋️",
  "Exterior & Lot": "🌳",
  "Room Details": "🚪",
  "School Information": "🎓",
  "Tax & Assessment": "🏛️",
  "HOA & Community": "🏘️",
  "Agent & Office": "👤",
  "Dates & Timestamps": "📅",
  "Media & Photos": "📸",
  "Marketing & Descriptions": "📝",
  "Status & Compliance": "✅",
  "Geographic & Map": "🗺️",
  "Utility & Systems": "⚡",
  "Other Fields": "📦",
};

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light" | "mellow">("dark");
  const [loading, setLoading] = useState<string | null>(null);
  const [fieldsData, setFieldsData] = useState<FieldsResponse | null>(null);
  const [debugData, setDebugData] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [openChildren, setOpenChildren] = useState<Set<string>>(new Set());

  const applyTheme = useCallback((t: "dark" | "light" | "mellow") => {
    setTheme(t);
    document.body.className = t === "dark" ? "" : `theme-${t}`;
  }, []);

  const runExplorer = useCallback(async () => {
    setLoading("explore");
    setError(null);
    setDebugData(null);
    try {
      const res = await fetch("/api/spark-fields");
      const data: FieldsResponse = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to connect to Spark API.");
        setFieldsData(null);
      } else {
        setFieldsData(data);
        const cats = Object.keys(data.fieldTree);
        if (cats.length > 0) setOpenCategories(new Set([cats[0]]));
      }
    } catch (e: any) {
      setError(e.message || "Network error");
      setFieldsData(null);
    } finally {
      setLoading(null);
    }
  }, []);

  const runDebug = useCallback(async () => {
    setLoading("debug");
    setError(null);
    setFieldsData(null);
    try {
      const res = await fetch("/api/spark-debug");
      const data: DebugResponse = await res.json();
      setDebugData(data);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(null);
    }
  }, []);

  const reset = useCallback(() => {
    setFieldsData(null);
    setDebugData(null);
    setError(null);
    setOpenCategories(new Set());
    setOpenChildren(new Set());
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const toggleChild = useCallback((key: string) => {
    setOpenChildren((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const badgeClass = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("array")) return "type-array";
    if (t.includes("object")) return "type-object";
    if (t.includes("url")) return "type-url";
    if (t.includes("datetime") || t.includes("date")) return "type-datetime";
    if (t.includes("bool")) return "type-boolean";
    if (t.includes("int") || t.includes("decimal") || t.includes("number"))
      return "type-integer";
    if (t.includes("null")) return "type-null";
    if (t.includes("text")) return "type-text";
    return "type-string";
  };

  const totalFields = fieldsData
    ? Object.values(fieldsData.fieldTree).reduce(
        (sum, cat) => sum + Object.keys(cat).length,
        0
      )
    : 0;

  const totalCategories = fieldsData
    ? Object.keys(fieldsData.fieldTree).length
    : 0;

  return (
    <div className="main-container">
      <header className="header">
        <div className="header-icon">⬡</div>
        <h1>Spark Field Explorer</h1>
        <p>Interactive field discovery for the Spark API by FBS</p>
      </header>

      <div className="theme-bar">
        {(["dark", "light", "mellow"] as const).map((t) => (
          <button
            key={t}
            className={`theme-btn ${theme === t ? "active" : ""}`}
            onClick={() => applyTheme(t)}
          >
            {t === "dark" ? "🌙" : t === "light" ? "☀️" : "🍂"}{" "}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={runExplorer}
          disabled={loading !== null}
        >
          {loading === "explore" ? (
            <>
              <span className="spinner" /> Scanning…
            </>
          ) : (
            <>⬡ Run Explorer</>
          )}
        </button>
        <button
          className="btn btn-secondary"
          onClick={runDebug}
          disabled={loading !== null}
        >
          {loading === "debug" ? (
            <>
              <span className="spinner" /> Testing…
            </>
          ) : (
            <>🔧 Run Diagnostics</>
          )}
        </button>
        {(fieldsData || debugData || error) && (
          <button className="btn btn-danger" onClick={reset}>
            ✕ Clear
          </button>
        )}
      </div>

      {error && (
        <div className="error-box">
          <h3>⚠ Connection Error</h3>
          <p>{error}</p>
        </div>
      )}

      {fieldsData && (
        <div className="status-bar">
          <div className="status-badge status-connected">
            <span className="status-dot green" />
            Connected to Spark API
          </div>
        </div>
      )}

      {fieldsData && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">
              {fieldsData.totalListings.toLocaleString()}
            </div>
            <div className="stat-label">Total Listings</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalFields}</div>
            <div className="stat-label">Fields Found</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalCategories}</div>
            <div className="stat-label">Categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: "1.1rem" }}>
              {fieldsData.sampleListingId || "—"}
            </div>
            <div className="stat-label">Sample MLS#</div>
          </div>
        </div>
      )}

      {fieldsData && (
        <div className="tree-section">
          <h2>🌳 Field Tree</h2>
          {Object.entries(fieldsData.fieldTree).map(([category, fields]) => {
            const isOpen = openCategories.has(category);
            const fieldEntries = Object.entries(fields);
            const icon = CATEGORY_ICONS[category] || "📦";

            return (
              <div className="category-card" key={category}>
                <div
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="category-left">
                    <span className="category-icon">{icon}</span>
                    <span className="category-name">{category}</span>
                    <span className="category-count">
                      {fieldEntries.length}
                    </span>
                  </div>
                  <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
                </div>

                {isOpen && (
                  <div className="category-fields">
                    {fieldEntries.map(([fieldName, info]) => {
                      const childKey = `${category}.${fieldName}`;
                      const hasChildren =
                        info.children &&
                        Object.keys(info.children).length > 0;
                      const childOpen = openChildren.has(childKey);

                      return (
                        <div key={fieldName}>
                          <div className="field-row">
                            <span className="field-name">{fieldName}</span>
                            <div className="field-right">
                              <span className="field-sample">
                                {info.sample ?? "—"}
                              </span>
                              <span
                                className={`type-badge ${badgeClass(info.type)}`}
                              >
                                {info.type}
                              </span>
                            </div>
                          </div>

                          {hasChildren && (
                            <>
                              <div
                                className="nested-toggle"
                                onClick={() => toggleChild(childKey)}
                              >
                                <span
                                  className={`chevron ${childOpen ? "open" : ""}`}
                                >
                                  ▶
                                </span>
                                {childOpen ? "Hide" : "Show"}{" "}
                                {Object.keys(info.children!).length} child
                                fields
                              </div>

                              {childOpen &&
                                Object.entries(info.children!).map(
                                  ([cn, ci]) => (
                                    <div
                                      className="field-row child-row"
                                      key={cn}
                                    >
                                      <span className="field-name">
                                        ↳ {cn}
                                      </span>
                                      <div className="field-right">
                                        <span className="field-sample">
                                          {ci.sample ?? "—"}
                                        </span>
                                        <span
                                          className={`type-badge ${badgeClass(ci.type)}`}
                                        >
                                          {ci.type}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {debugData && (
        <div className="debug-section">
          <h2 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            🔧 Diagnostic Results
          </h2>
          {debugData.tests.map((test, i) => (
            <div className="debug-card" key={i}>
              <div className="debug-header">
                <span className="debug-test-name">{test.name}</span>
                <span
                  className={`debug-status ${test.pass ? "debug-pass" : "debug-fail"}`}
                >
                  {test.pass ? "PASS" : "FAIL"}
                </span>
              </div>
              <div className="debug-body">{test.detail}</div>
            </div>
          ))}
        </div>
      )}

      <footer className="footer">
        Built with Next.js 14 on Vercel Edge Runtime
        <br />
        <a
          href="https://github.com/jawfbs/spark-api-checker"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
