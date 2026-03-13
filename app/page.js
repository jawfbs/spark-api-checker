"use client";

import { useState, useCallback } from "react";

export default function Home() {
  const [connStatus, setConnStatus] = useState(null);
  const [connDetail, setConnDetail] = useState("");

  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(null);

  const currentPage = historyIndex >= 0 ? history[historyIndex] : null;
  const canGoBack = historyIndex > 0;

  async function handleRun() {
    setConnStatus("loading");
    setConnDetail("");
    setHistory([]);
    setHistoryIndex(-1);

    try {
      const res = await fetch("/api/spark-test", { cache: "no-store" });
      const data = await res.json();

      if (data.connected) {
        setConnStatus("success");
        setConnDetail(
          `Pulling live data — ${data.totalActiveListings} total listings available.`
        );
        await fetchListings(true);
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
      setConnDetail("Could not reach API route. " + err.message);
    }
  }

  const fetchListings = useCallback(async (isInitial) => {
    setLoading(true);
    try {
      const res = await fetch("/api/spark-listings", { cache: "no-store" });
      const data = await res.json();

      if (data.success && data.listings.length > 0) {
        setTotal(data.total);
        setHistory((prev) => {
          const newHistory = isInitial
            ? [data.listings]
            : [...prev, data.listings];
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        });
      }
    } catch (err) {
      console.error("Listing fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleBack() {
    if (canGoBack) {
      setHistoryIndex((i) => i - 1);
    }
  }

  async function handleNext() {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((i) => i + 1);
    } else {
      await fetchListings(false);
    }
  }

  function fmtPrice(val) {
    if (val == null) return "Price N/A";
    return "$" + Number(val).toLocaleString();
  }

  return (
    <div className="page-wrapper">
      <div className="card">
        <h1>Spark API Checker</h1>
        <p className="subtitle">
          Press <strong>Run</strong> to test your live connection and load
          random listings from the Spark API.
        </p>

        <button
          className="run-btn"
          onClick={handleRun}
          disabled={connStatus === "loading" || loading}
        >
          {connStatus === "loading" ? (
            <>
              <span className="spinner" />
              Connecting…
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

      {currentPage && (
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
                `Set ${historyIndex + 1} of ${history.length}` +
                (total
                  ? ` — ${total.toLocaleString()} total listings`
                  : "")
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
              <div
                className="listing-card"
                key={listing.listingId + "-" + i}
              >
                <div className="listing-photo-wrap">
                  {listing.photoUrl ? (
                    <img
                      className="listing-photo"
                      src={listing.photoUrl}
                      alt={listing.address || "Listing photo"}
                      loading="lazy"
                    />
                  ) : (
                    <div className="listing-photo-placeholder">
                      No Photo
                    </div>
                  )}
                  {listing.status && (
                    <span className="listing-badge">{listing.status}</span>
                  )}
                </div>

                <div className="listing-info">
                  <div className="listing-price">
                    {fmtPrice(listing.price)}
                  </div>

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
                      {listing.postalCode
                        ? ` ${listing.postalCode}`
                        : ""}
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
              {`Set ${historyIndex + 1} of ${history.length}`}
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
        <a
          href="https://vercel.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Vercel
        </a>
      </p>
    </div>
  );
}
