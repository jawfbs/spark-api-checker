"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Utilities ──────────────────────────────────────────────
function formatPrice(price) {
  if (price == null) return "N/A";
  return "$" + Number(price).toLocaleString();
}

function formatNum(n) {
  if (n == null) return null;
  return Number(n).toLocaleString();
}

// ── Stats Dashboard ────────────────────────────────────────
function StatsDashboard({ stats }) {
  if (!stats) return null;
  const { totalListings, avgPrice, medianPrice, minPrice, maxPrice, statusCounts, topCities, typeCounts } = stats;

  return (
    <div className="stats-dashboard">
      <h2 className="section-title">MLS Stats Dashboard</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Listings</span>
          <span className="stat-value">{Number(totalListings).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Avg Price</span>
          <span className="stat-value">{formatPrice(avgPrice)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Median Price</span>
          <span className="stat-value">{formatPrice(medianPrice)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Min Price</span>
          <span className="stat-value">{formatPrice(minPrice)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Max Price</span>
          <span className="stat-value">{formatPrice(maxPrice)}</span>
        </div>
        {statusCounts && Object.entries(statusCounts).map(([s, c]) => (
          <div className="stat-card" key={s}>
            <span className="stat-label">{s}</span>
            <span className="stat-value">{c}</span>
          </div>
        ))}
      </div>

      {topCities && topCities.length > 0 && (
        <>
          <h3 className="section-subtitle">Top Cities</h3>
          <div className="top-cities">
            {topCities.map(({ city, count }) => (
              <div className="city-bar-row" key={city}>
                <span className="city-name">{city}</span>
                <div className="city-bar-track">
                  <div
                    className="city-bar-fill"
                    style={{
                      width: `${Math.round((count / topCities[0].count) * 100)}%`,
                    }}
                  />
                </div>
                <span className="city-count">{count}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {typeCounts && Object.keys(typeCounts).length > 0 && (
        <>
          <h3 className="section-subtitle">By Property Type</h3>
          <div className="type-chips">
            {Object.entries(typeCounts).map(([t, c]) => (
              <div className="type-chip" key={t}>
                <span>{t}</span>
                <span className="type-chip-count">{c}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Filter Panel ───────────────────────────────────────────
function FilterPanel({ filters, setFilters, onApply, loading }) {
  const [local, setLocal] = useState(filters);

  function set(key, val) {
    setLocal((prev) => ({ ...prev, [key]: val }));
  }

  function apply() {
    setFilters(local);
    onApply(local);
  }

  function reset() {
    const blank = {
      city: "",
      status: "all",
      minPrice: "",
      maxPrice: "",
      minBeds: "",
      propertyType: "all",
      sort: "ListPrice",
      dir: "desc",
      onlyWithInfo: false,
    };
    setLocal(blank);
    setFilters(blank);
    onApply(blank);
  }

  return (
    <div className="filter-panel">
      <h2 className="section-title">Filter &amp; Sort</h2>
      <div className="filter-grid">
        <div className="filter-group">
          <label>City</label>
          <input
            className="filter-input"
            type="text"
            placeholder="Any city…"
            value={local.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            className="filter-input"
            value={local.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Closed">Closed</option>
            <option value="Active Under Contract">Active Under Contract</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Min Price</label>
          <input
            className="filter-input"
            type="number"
            placeholder="No min"
            value={local.minPrice}
            onChange={(e) => set("minPrice", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Max Price</label>
          <input
            className="filter-input"
            type="number"
            placeholder="No max"
            value={local.maxPrice}
            onChange={(e) => set("maxPrice", e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Min Beds</label>
          <select
            className="filter-input"
            value={local.minBeds}
            onChange={(e) => set("minBeds", e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Property Type</label>
          <select
            className="filter-input"
            value={local.propertyType}
            onChange={(e) => set("propertyType", e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Residential">Residential</option>
            <option value="Condominium">Condominium</option>
            <option value="Commercial">Commercial</option>
            <option value="Land">Land</option>
            <option value="Multi-Family">Multi-Family</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By</label>
          <select
            className="filter-input"
            value={local.sort}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="ListPrice">Price</option>
            <option value="BedsTotal">Beds</option>
            <option value="BathsTotal">Baths</option>
            <option value="BuildingAreaTotal">Sq Ft</option>
            <option value="ListingContractDate">List Date</option>
            <option value="DaysOnMarket">Days on Market</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Direction</label>
          <select
            className="filter-input"
            value={local.dir}
            onChange={(e) => set("dir", e.target.value)}
          >
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </select>
        </div>
      </div>

      <div className="filter-row-bottom">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={local.onlyWithInfo}
            onChange={(e) => set("onlyWithInfo", e.target.checked)}
          />
          <span>Only show listings with complete info</span>
        </label>

        <div className="filter-actions">
          <button className="nav-btn" onClick={reset} disabled={loading}>
            Reset
          </button>
          <button className="run-btn small" onClick={apply} disabled={loading}>
            {loading ? <><span className="spinner" />Applying…</> : "Apply Filters"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Listing Card ───────────────────────────────────────────
function ListingCard({ l, onClick }) {
  const thumb = l.photos?.[0] ?? null;
  return (
    <div className="listing-card" onClick={onClick} style={{ cursor: "pointer" }}>
      {thumb ? (
        <img src={thumb} alt="listing" className="card-photo" />
      ) : (
        <div className="card-no-photo">No Photo</div>
      )}

      <div className="listing-body">
        <div className="listing-header">
          {l.status && (
            <span className={`status-badge ${l.status.toLowerCase().replace(/\s/g, "-")}`}>
              {l.status}
            </span>
          )}
          <span className="listing-id">#{l.listingId}</span>
        </div>

        <div className="listing-price">{formatPrice(l.price)}</div>

        <div className="listing-address">
          {l.address || "Address not available"}
          {(l.city || l.state || l.zip) && (
            <span className="listing-city">
              {[l.city, l.state].filter(Boolean).join(", ")} {l.zip}
            </span>
          )}
        </div>

        <div className="listing-details">
          {l.beds != null && <span className="detail-chip">🛏 {l.beds}</span>}
          {l.baths != null && <span className="detail-chip">🛁 {l.baths}</span>}
          {l.sqft != null && <span className="detail-chip">📐 {formatNum(l.sqft)} sqft</span>}
          {l.propertyType && <span className="detail-chip">🏠 {l.propertyType}</span>}
          {l.daysOnMarket != null && <span className="detail-chip">📅 {l.daysOnMarket} DOM</span>}
        </div>

        {l.remarks && <p className="listing-remarks">{l.remarks.substring(0, 120)}…</p>}
      </div>
    </div>
  );
}

// ── Auto-refresh control ────────────────────────────────────
function AutoRefreshControl({ interval, setInterval: setInt, onTick }) {
  const options = [
    { label: "Off", value: 0 },
    { label: "30s", value: 30 },
    { label: "1 min", value: 60 },
    { label: "5 min", value: 300 },
  ];

  const timerRef = useRef(null);
  const [countdown, setCountdown] = useState(interval);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (interval === 0) { setCountdown(0); return; }
    setCountdown(interval);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { onTick(); return interval; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [interval]);

  return (
    <div className="autorefresh-row">
      <span className="autorefresh-label">Auto-refresh:</span>
      {options.map((o) => (
        <button
          key={o.value}
          className={`chip-btn ${interval === o.value ? "active" : ""}`}
          onClick={() => setInt(o.value)}
        >
          {o.label}
        </button>
      ))}
      {interval > 0 && (
        <span className="countdown">next in {countdown}s</span>
      )}
    </div>
  );
}

// ── Export to CSV ────────────────────────────────────────────
function exportCSV(listings) {
  const headers = [
    "ListingId", "Status", "Price", "Address", "City", "State", "Zip",
    "Beds", "Baths", "SqFt", "PropertyType", "YearBuilt", "DaysOnMarket",
    "HOAFee", "AnnualTaxes", "Agent", "Office", "ListDate",
  ];
  const rows = listings.map((l) => [
    l.listingId ?? "",
    l.status ?? "",
    l.price ?? "",
    l.address ?? "",
    l.city ?? "",
    l.state ?? "",
    l.zip ?? "",
    l.beds ?? "",
    l.baths ?? "",
    l.sqft ?? "",
    l.propertyType ?? "",
    l.yearBuilt ?? "",
    l.daysOnMarket ?? "",
    l.hoaFee ?? "",
    l.taxes ?? "",
    l.agentName ?? "",
    l.officeName ?? "",
    l.listDate ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spark-listings-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Map View ──────────────────────────────────────────────────
function MapView({ listings }) {
  const withCoords = listings.filter((l) => l.lat && l.lng);
  if (withCoords.length === 0) {
    return (
      <div className="map-placeholder">
        No listings in this set have GPS coordinates.
      </div>
    );
  }

  // Center on first listing with coords
  const center = withCoords[0];
  const markers = withCoords
    .map((l) => `${l.lat},${l.lng}`)
    .join("|");

  const src = `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=12&output=embed`;

  return (
    <div className="map-container full">
      <div className="map-note">
        Showing {withCoords.length} of {listings.length} listings with location data.
      </div>
      <iframe
        title="Listings Map"
        className="map-iframe"
        src={src}
        allowFullScreen
      />
    </div>
  );
}

// ── Default filters ────────────────────────────────────────────
const DEFAULT_FILTERS = {
  city: "",
  status: "all",
  minPrice: "",
  maxPrice: "",
  minBeds: "",
  propertyType: "all",
  sort: "ListPrice",
  dir: "desc",
  onlyWithInfo: false,
};

// ── Main Page ──────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();

  const [runStatus, setRunStatus] = useState(null); // null|loading|success|fail
  const [runDetail, setRunDetail] = useState("");

  const [listings, setListings] = useState([]);
  const [history, setHistory] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingListings, setLoadingListings] = useState(false);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [view, setView] = useState("grid"); // grid | map

  const [refreshInterval, setRefreshInterval] = useState(0);

  // ── Fetch listings ─────────────────────────────────────────
  const fetchListings = useCallback(async (page = 1, f = filters, isRandom = false) => {
    setLoadingListings(true);
    const params = new URLSearchParams();
    params.set("page", page);
    if (isRandom) params.set("random", "true");
    if (f.city && f.city !== "all") params.set("city", f.city);
    if (f.status && f.status !== "all") params.set("status", f.status);
    if (f.minPrice) params.set("minPrice", f.minPrice);
    if (f.maxPrice) params.set("maxPrice", f.maxPrice);
    if (f.minBeds) params.set("minBeds", f.minBeds);
    if (f.propertyType && f.propertyType !== "all") params.set("propertyType", f.propertyType);
    if (f.sort) params.set("sort", f.sort);
    if (f.dir) params.set("dir", f.dir);
    if (f.onlyWithInfo) params.set("onlyWithInfo", "true");

    const res = await fetch(`/api/spark-listings?${params}`, { cache: "no-store" });
    const data = await res.json();
    setLoadingListings(false);
    if (data.error) throw new Error(data.error);
    return data;
  }, [filters]);

  // ── Fetch stats ─────────────────────────────────────────────
  async function loadStats() {
    setStatsLoading(true);
    const res = await fetch("/api/spark-stats", { cache: "no-store" });
    const data = await res.json();
    setStats(data);
    setStatsLoading(false);
  }

  // ── Run ─────────────────────────────────────────────────────
  async function handleRun() {
    setRunStatus("loading");
    setRunDetail("");
    setListings([]);
    setHistory([]);
    setStats(null);
    setCurrentPage(1);

    try {
      const testRes = await fetch("/api/spark-test", { cache: "no-store" });
      const testData = await testRes.json();

      if (!testData.connected) {
        setRunStatus("fail");
        setRunDetail(
          testData.error +
          (testData.detail ? `\n${testData.detail}` : "") +
          (testData.httpStatus ? `\nHTTP ${testData.httpStatus}` : "")
        );
        return;
      }

      setRunDetail(`Connected — ${testData.totalListings} total listings in MLS`);

      const listData = await fetchListings(1, filters, true);
      setListings(listData.listings || []);
      setTotalRows(listData.totalRows || 0);
      setCurrentPage(listData.page || 1);
      setRunStatus("success");

      // Auto-load stats
      loadStats();
    } catch (err) {
      setRunStatus("fail");
      setRunDetail("Error: " + err.message);
    }
  }

  // ── Next ────────────────────────────────────────────────────
  async function handleNext() {
    try {
      setHistory((h) => [...h, { listings, page: currentPage }]);
      const data = await fetchListings(currentPage, filters, true);
      setListings(data.listings || []);
      setCurrentPage(data.page || 1);
    } catch (err) {
      console.error(err);
    }
  }

  // ── Back ────────────────────────────────────────────────────
  function handleBack() {
    if (!history.length) return;
    const prev = [...history];
    const last = prev.pop();
    setHistory(prev);
    setListings(last.listings);
    setCurrentPage(last.page);
  }

  // ── Apply filters ───────────────────────────────────────────
  async function applyFilters(f) {
    setHistory([]);
    setCurrentPage(1);
    try {
      const data = await fetchListings(1, f, true);
      setListings(data.listings || []);
      setTotalRows(data.totalRows || 0);
      setCurrentPage(data.page || 1);
    } catch (err) {
      console.error(err);
    }
  }

  // ── Auto-refresh tick ────────────────────────────────────────
  async function handleRefreshTick() {
    if (runStatus !== "success") return;
    try {
      const data = await fetchListings(1, filters, true);
      setListings(data.listings || []);
      setCurrentPage(data.page || 1);
    } catch (err) {
      console.error(err);
    }
  }

  const hasListings = runStatus === "success" && listings.length > 0;

  return (
    <div className="page-wrapper">
      {/* ── Header Card ── */}
      <div className="card">
        <h1>Spark API Checker</h1>
        <p className="subtitle">
          Press <strong>Run</strong> to connect and browse live MLS data from
          the Spark API by FBS.
        </p>

        <button
          className="run-btn"
          onClick={handleRun}
          disabled={runStatus === "loading"}
        >
          {runStatus === "loading" ? (
            <><span className="spinner" />Testing…</>
          ) : "Run"}
        </button>

        {runStatus === "success" && (
          <>
            <div className="result success">✅ Success</div>
            {runDetail && <p className="detail">{runDetail}</p>}
          </>
        )}
        {runStatus === "fail" && (
          <>
            <div className="result fail">❌ Run Failed</div>
            {runDetail && <p className="detail">{runDetail}</p>}
          </>
        )}
      </div>

      {/* ── Everything below only shows after success ── */}
      {hasListings && (
        <div className="listings-section">

          {/* ── Toolbar ── */}
          <div className="toolbar">
            <div className="toolbar-left">
              <button
                className={`chip-btn ${showFilters ? "active" : ""}`}
                onClick={() => setShowFilters((v) => !v)}
              >
                🔍 Filters
              </button>
              <button
                className={`chip-btn ${showStats ? "active" : ""}`}
                onClick={() => {
                  setShowStats((v) => !v);
                  if (!stats) loadStats();
                }}
              >
                📊 Stats
              </button>
              <button
                className={`chip-btn ${view === "map" ? "active" : ""}`}
                onClick={() => setView((v) => v === "map" ? "grid" : "map")}
              >
                🗺 Map
              </button>
              <button
                className="chip-btn"
                onClick={() => exportCSV(listings)}
              >
                📥 Export CSV
              </button>
            </div>

            <div className="toolbar-right">
              <span className="nav-info">
                {totalRows.toLocaleString()} listings
              </span>
            </div>
          </div>

          {/* ── Auto-refresh ── */}
          <AutoRefreshControl
            interval={refreshInterval}
            setInterval={setRefreshInterval}
            onTick={handleRefreshTick}
          />

          {/* ── Filter Panel ── */}
          {showFilters && (
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              onApply={applyFilters}
              loading={loadingListings}
            />
          )}

          {/* ── Stats Dashboard ── */}
          {showStats && (
            statsLoading
              ? <div className="stats-loading"><span className="spinner" /> Loading stats…</div>
              : <StatsDashboard stats={stats} />
          )}

          {/* ── Nav top ── */}
          <div className="nav-row">
            <button
              className="nav-btn"
              onClick={handleBack}
              disabled={history.length === 0 || loadingListings}
            >
              ← Back
            </button>
            <span className="nav-info">
              {history.length > 0 ? `Page ${history.length + 1}` : "Page 1"} —{" "}
              {listings.length} listings
            </span>
            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={loadingListings}
            >
              {loadingListings
                ? <><span className="spinner dark" />Loading…</>
                : "Next →"}
            </button>
          </div>

          {/* ── Map View ── */}
          {view === "map" && <MapView listings={listings} />}

          {/* ── Grid View ── */}
          {view === "grid" && (
            <div className="listings-grid">
              {listings.map((l, i) => (
                <ListingCard
                  key={`${l.listingId}-${i}`}
                  l={l}
                  onClick={() => router.push(`/listing/${l.listingKey}`)}
                />
              ))}
            </div>
          )}

          {/* ── Nav bottom ── */}
          <div className="nav-row">
            <button
              className="nav-btn"
              onClick={handleBack}
              disabled={history.length === 0 || loadingListings}
            >
              ← Back
            </button>
            <span className="nav-info">
              {history.length > 0 ? `Page ${history.length + 1}` : "Page 1"}
            </span>
            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={loadingListings}
            >
              {loadingListings
                ? <><span className="spinner dark" />Loading…</>
                : "Next →"}
            </button>
          </div>
        </div>
      )}

      <p className="footer">
        Powered by{" "}
        <a href="http://sparkplatform.com/docs/api_services/read_first" target="_blank" rel="noopener noreferrer">
          Spark API
        </a>{" "}
        &amp; deployed on{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          Vercel
        </a>
      </p>
    </div>
  );
}
