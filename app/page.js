"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export default function Home() {
  /* ── Location autocomplete ── */
  const [allLocations, setAllLocations] = useState([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const suggestRef = useRef(null);

  /* ── Filters ── */
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [poolOnly, setPoolOnly] = useState(false);

  /* ── Listings ── */
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(null);
  const [firstLoad, setFirstLoad] = useState(true);

  const currentPage = historyIndex >= 0 ? history[historyIndex] : null;
  const canGoBack = historyIndex > 0;

  /* ── Load locations on mount ── */
  useEffect(() => {
    fetch("/api/spark-locations", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAllLocations(d.locations);
      })
      .catch(() => {});
  }, []);

  /* ── Auto-load listings on mount ── */
  useEffect(() => {
    if (firstLoad) {
      setFirstLoad(false);
      fetchListings(true, {});
    }
  }, [firstLoad]);

  /* ── Close suggestions on outside click ── */
  useEffect(() => {
    function handleClick(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Location search ── */
  function handleLocationInput(val) {
    setLocationQuery(val);
    setSelectedLocation(null);

    if (val.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lower = val.toLowerCase();
    const matches = allLocations.filter(
      (loc) =>
        loc.city.toLowerCase().includes(lower) ||
        loc.state.toLowerCase().includes(lower) ||
        loc.zip.includes(val)
    );
    setSuggestions(matches.slice(0, 8));
    setShowSuggestions(matches.length > 0);
  }

  function selectLocation(loc) {
    setSelectedLocation(loc);
    setLocationQuery(`${loc.city}, ${loc.state} ${loc.zip}`);
    setShowSuggestions(false);
  }

  /* ── Build filter params ── */
  function getFilterParams() {
    const params = {};
    if (selectedLocation) {
      if (selectedLocation.city) params.city = selectedLocation.city;
      if (selectedLocation.state) params.state = selectedLocation.state;
      if (selectedLocation.zip) params.zip = selectedLocation.zip;
    }
    if (beds) params.beds = beds;
    if (baths) params.baths = baths;
    if (poolOnly) params.pool = "true";
    return params;
  }

  /* ── Fetch listings ── */
  const fetchListings = useCallback(async (isInitial, filterOverride) => {
    setLoading(true);
    try {
      const params = filterOverride !== undefined ? filterOverride : {};
      const qs = new URLSearchParams(params).toString();
      const url = "/api/spark-listings" + (qs ? "?" + qs : "");
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (data.success && data.listings && data.listings.length > 0) {
        setTotal(data.total);
        setHistory((prev) => {
          const newHistory = isInitial
            ? [data.listings]
            : [...prev, data.listings];
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        });
      } else if (data.success && data.total === 0) {
        setTotal(0);
        setHistory(isInitial ? [[]] : (prev) => [...prev, []]);
        setHistoryIndex(isInitial ? 0 : (prev) => prev);
      }
    } catch (err) {
      console.error("Listing fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Search handler ── */
  function handleSearch(e) {
    if (e) e.preventDefault();
    const params = getFilterParams();
    setHistory([]);
    setHistoryIndex(-1);
    fetchListings(true, params);
  }

  /* ── Navigation ── */
  function handleBack() {
    if (canGoBack) setHistoryIndex((i) => i - 1);
  }

  async function handleNext() {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((i) => i + 1);
    } else {
      const params = getFilterParams();
      await fetchListings(false, params);
    }
  }

  /* ── Format price ── */
  function fmtPrice(val) {
    if (val == null) return "Price N/A";
    return "$" + Number(val).toLocaleString();
  }

  return (
    <div className="page-wrapper">
      {/* ═══ Search Widget ═══ */}
      <form className="search-bar" onSubmit={handleSearch}>
        {/* Location */}
        <div className="search-field search-field-location" ref={suggestRef}>
          <label className="search-label" htmlFor="location-input">
            Location
          </label>
          <input
            id="location-input"
            type="text"
            className="search-input"
            placeholder="City, State, or Zip"
            value={locationQuery}
            onChange={(e) => handleLocationInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul className="suggestions-list">
              {suggestions.map((loc, i) => (
                <li
                  key={i}
                  className="suggestion-item"
                  onMouseDown={() => selectLocation(loc)}
                >
                  {loc.city}, {loc.state} {loc.zip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bedrooms */}
        <div className="search-field">
          <label className="search-label" htmlFor="beds-select">
            Bedrooms
          </label>
          <select
            id="beds-select"
            className="search-select"
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>

        {/* Bathrooms */}
        <div className="search-field">
          <label className="search-label" htmlFor="baths-select">
            Bathrooms
          </label>
          <select
            id="baths-select"
            className="search-select"
            value={baths}
            onChange={(e) => setBaths(e.target.value)}
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>

        {/* Pool */}
        <div className="search-field search-field-pool">
          <label className="search-label pool-label">
            <input
              type="checkbox"
              checked={poolOnly}
              onChange={(e) => setPoolOnly(e.target.checked)}
              className="pool-checkbox"
            />
            Pool
          </label>
        </div>

        {/* Search button */}
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner spinner-sm" /> Searching…
            </>
          ) : (
            "Search"
          )}
        </button>
      </form>

      {/* ═══ Results Count ═══ */}
      {total !== null && (
        <div className="results-summary">
          {total === 0
            ? "No listings found. Try adjusting your filters."
            : `${total.toLocaleString()} listing${total !== 1 ? "s" : ""} found`}
        </div>
      )}

      {/* ═══ Listings ═══ */}
      {currentPage && currentPage.length > 0 && (
        <div className="listings-section">
          <div className="listings-nav">
            <button
              className="nav-btn"
              onClick={handleBack}
              disabled={!canGoBack || loading}
            >
              ← Back
            </button>
            <span className="nav-info">
              {loading ? (
                <>
                  <span className="spinner spinner-sm" /> Loading…
                </>
              ) : (
                `Set ${historyIndex + 1} of ${history.length}`
              )}
            </span>
            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={loading}
            >
              Next →
            </button>
          </div>

          <div className="listings-grid">
            {currentPage.map((listing, i) => (
              <div className="listing-card" key={listing.listingId + "-" + i}>
                <div className="listing-photo-wrap">
                  {listing.photoUrl ? (
                    <img
                      className="listing-photo"
                      src={listing.photoUrl}
                      alt={listing.address || "Listing photo"}
                      loading="lazy"
                    />
                  ) : (
                    <div className="listing-photo-placeholder">No Photo</div>
                  )}
                  {listing.status && (
                    <span className="listing-badge">{listing.status}</span>
                  )}
                  {listing.pool && (
                    <span className="listing-badge listing-badge-pool">Pool</span>
                  )}
                </div>

                <div className="listing-info">
                  <div className="listing-price">{fmtPrice(listing.price)}</div>
                  <div className="listing-meta">
                    {listing.bedrooms != null && (
                      <span>{listing.bedrooms} bd</span>
                    )}
                    {listing.bathrooms != null && (
                      <span>{listing.bathrooms} ba</span>
                    )}
                    {listing.propertyType && (
                      <span>{listing.propertyType}</span>
                    )}
                  </div>
                  {listing.address && (
                    <div className="listing-address">
                      {listing.address}
                      {listing.city ? `, ${listing.city}` : ""}
                      {listing.state ? `, ${listing.state}` : ""}
                      {listing.postalCode ? ` ${listing.postalCode}` : ""}
                    </div>
                  )}
                  <p className="listing-desc">
                    {listing.description.length > 200
                      ? listing.description.substring(0, 200) + "…"
                      : listing.description}
                  </p>
                  <div className="listing-id">
                    MLS# {listing.listingId}
                    {listing.office ? ` — ${listing.office}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="listings-nav">
            <button
              className="nav-btn"
              onClick={handleBack}
              disabled={!canGoBack || loading}
            >
              ← Back
            </button>
            <span className="nav-info">
              Set {historyIndex + 1} of {history.length}
            </span>
            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={loading}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <p className="footer">
        Powered by{" "}
        <a
          href="http://sparkplatform.com/docs/api_services/read_first"
          target="_blank"
          rel="noopener noreferrer"
        >
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
