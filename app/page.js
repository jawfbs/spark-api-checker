"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "./context/ThemeContext";
import ListingOverlay from "./components/ListingOverlay";
import Gamification from "./components/Gamification";
import PhotoSlider from "./components/PhotoSlider";

export default function Home() {
  const { disliked, isDisliked } = useTheme();

  const [allLocations, setAllLocations] = useState([]);
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const suggestRef = useRef(null);

  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [poolOnly, setPoolOnly] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);

  const currentPage = historyIndex >= 0 ? history[historyIndex] : null;
  const canGoBack = historyIndex > 0;
  const visibleListings = currentPage
    ? currentPage.filter((l) => !isDisliked(l.listingId))
    : [];

  useEffect(() => {
    fetch("/api/spark-locations", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAllLocations(d.locations); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (firstLoad) { setFirstLoad(false); fetchListings(true, {}); }
  }, [firstLoad]);

  useEffect(() => {
    function h(e) {
      if (suggestRef.current && !suggestRef.current.contains(e.target))
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function handleLocationInput(val) {
    setLocationQuery(val);
    setSelectedLocation(null);
    if (val.length < 1) { setSuggestions([]); setShowSuggestions(false); return; }
    const lower = val.toLowerCase();
    const matches = allLocations.filter((l) => l.label.toLowerCase().includes(lower));
    setSuggestions(matches.slice(0, 10));
    setShowSuggestions(matches.length > 0);
  }

  function selectLocation(loc) {
    setSelectedLocation(loc);
    setLocationQuery(loc.label);
    setShowSuggestions(false);
    const params = buildParams(loc);
    setHistory([]); setHistoryIndex(-1);
    fetchListings(true, params);
  }

  function buildParams(locOverride) {
    const loc = locOverride || selectedLocation;
    const params = {};
    if (loc) {
      if (loc.city) params.city = loc.city;
      if (loc.state) params.state = loc.state;
      if (loc.zip) params.zip = loc.zip;
    }
    if (beds) params.beds = beds;
    if (baths) params.baths = baths;
    if (poolOnly) params.pool = "true";
    if (disliked.length > 0) params.exclude = disliked.join(",");
    return params;
  }

  const fetchListings = useCallback(async (isInitial, filterOverride) => {
    setLoading(true);
    try {
      const params = filterOverride || {};
      if (disliked.length > 0 && !params.exclude) params.exclude = disliked.join(",");
      const qs = new URLSearchParams(params).toString();
      const url = "/api/spark-listings" + (qs ? "?" + qs : "");
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.listings && data.listings.length > 0) {
        setTotal(data.total);
        setHistory((prev) => {
          const nh = isInitial ? [data.listings] : [...prev, data.listings];
          setHistoryIndex(nh.length - 1);
          return nh;
        });
      } else {
        setTotal(data.total ?? 0);
        if (isInitial) { setHistory([[]]); setHistoryIndex(0); }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [disliked]);

  function handleSearch(e) {
    if (e) e.preventDefault();
    setHistory([]); setHistoryIndex(-1);
    fetchListings(true, buildParams());
  }

  function handleBack() { if (canGoBack) setHistoryIndex((i) => i - 1); }
  async function handleNext() {
    if (historyIndex < history.length - 1) setHistoryIndex((i) => i + 1);
    else await fetchListings(false, buildParams());
  }

  function fmtPrice(val) {
    if (val == null) return "Price N/A";
    return "$" + Number(val).toLocaleString();
  }

  return (
    <div className="page-wrapper">
      <Gamification />

      {/* ── Search ── */}
      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-field search-field-location" ref={suggestRef}>
          <label className="search-label" htmlFor="loc">Location</label>
          <input id="loc" type="text" className="search-input"
            placeholder="City, State, or Zip"
            value={locationQuery}
            onChange={(e) => handleLocationInput(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            autoComplete="off" />
          {showSuggestions && (
            <ul className="suggestions-list">
              {suggestions.map((loc, i) => (
                <li key={i} className="suggestion-item" onMouseDown={() => selectLocation(loc)}>
                  <span className="suggestion-icon">{loc.type === "zip" ? "⌖" : "◎"}</span>
                  {loc.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="search-field">
          <label className="search-label" htmlFor="bs">Beds</label>
          <select id="bs" className="search-select" value={beds} onChange={(e) => setBeds(e.target.value)}>
            <option value="">Any</option>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (<option key={n} value={n}>{n}+</option>))}
          </select>
        </div>

        <div className="search-field">
          <label className="search-label" htmlFor="ba">Baths</label>
          <select id="ba" className="search-select" value={baths} onChange={(e) => setBaths(e.target.value)}>
            <option value="">Any</option>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (<option key={n} value={n}>{n}+</option>))}
          </select>
        </div>

        <div className="search-field search-field-pool">
          <label className="search-label pool-label">
            <input type="checkbox" checked={poolOnly} onChange={(e) => setPoolOnly(e.target.checked)} className="pool-checkbox" />
            Pool
          </label>
        </div>

        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? (<><span className="spinner spinner-sm" /> Searching…</>) : "Search"}
        </button>
      </form>

      {total !== null && (
        <div className="results-summary">
          {total === 0 ? "No listings match your criteria." : `${total.toLocaleString()} listing${total !== 1 ? "s" : ""} found`}
        </div>
      )}

      {visibleListings.length > 0 && (
        <div className="listings-section">
          <div className="listings-nav">
            <button className="nav-btn" onClick={handleBack} disabled={!canGoBack || loading}>← Back</button>
            <span className="nav-info">
              {loading ? (<><span className="spinner spinner-sm" /> Loading…</>) : `Set ${historyIndex + 1} of ${history.length}`}
            </span>
            <button className="nav-btn" onClick={handleNext} disabled={loading}>Next →</button>
          </div>

          <div className="listings-grid">
            {visibleListings.map((listing, i) => (
              <div className="listing-card" key={listing.listingId + "-" + i}>
                <div className="listing-photo-wrap">
                  <PhotoSlider
                    photos={listing.photos && listing.photos.length > 0 ? listing.photos : [listing.photoUrl]}
                    alt={listing.address}
                    height="100%"
                    onClickPhoto={() => setSelectedListing(listing)}
                  />
                  {listing.status && <span className="listing-badge">{listing.status}</span>}
                  {listing.pool && <span className="listing-badge listing-badge-pool">Pool</span>}
                </div>
                <div className="listing-info">
                  <div className="listing-price">{fmtPrice(listing.price)}</div>
                  <div className="listing-meta">
                    {listing.bedrooms != null && <span>{listing.bedrooms} bd</span>}
                    {listing.bathrooms != null && <span>{listing.bathrooms} ba</span>}
                    {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                    {listing.propertyType && <span>{listing.propertyType}</span>}
                  </div>
                  {listing.address && (
                    <div className="listing-address">
                      {listing.address}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}
                    </div>
                  )}
                  <div className="listing-id">MLS# {listing.listingId}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="listings-nav">
            <button className="nav-btn" onClick={handleBack} disabled={!canGoBack || loading}>← Back</button>
            <span className="nav-info">Set {historyIndex + 1} of {history.length}</span>
            <button className="nav-btn" onClick={handleNext} disabled={loading}>Next →</button>
          </div>
        </div>
      )}

      {selectedListing && (
        <ListingOverlay listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}

      <p className="footer">
        Powered by <a href="http://sparkplatform.com/docs/api_services/read_first" target="_blank" rel="noopener noreferrer">Spark API</a>{" "}
        &amp; <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">Vercel</a>
      </p>
    </div>
  );
}
