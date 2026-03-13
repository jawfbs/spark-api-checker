"use client";

import { useState, useCallback } from "react";

export default function Home() {
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "fail"
  const [detail, setDetail] = useState("");
  const [totalListings, setTotalListings] = useState(0);

  // Current listings on screen
  const [listings, setListings] = useState([]);

  // History stack for Back button
  const [history, setHistory] = useState([]);

  // Loading state for Next
  const [loadingMore, setLoadingMore] = useState(false);

  /* ── Fetch 10 random listings from our API ── */
  const fetchListings = useCallback(async () => {
    const res = await fetch("/api/spark-test?mode=listings", {
      cache: "no-store",
    });
    const data = await res.json();
    if (!data.connected) throw new Error(data.error || "Connection failed");
    return data;
  }, []);

  /* ── RUN button ── */
  async function handleRun() {
    setStatus("loading");
    setDetail("");
    setListings([]);
    setHistory([]);

    try {
      // Quick connectivity test first
      const testRes = await fetch("/api/spark-test?mode=test", {
        cache: "no-store",
      });
      const testData = await testRes.json();

      if (!testData.connected) {
        setStatus("fail");
        setDetail(
          testData.error +
            (testData.detail ? `\n${testData.detail}` : "") +
            (testData.httpStatus ? `\nHTTP ${testData.httpStatus}` : "")
        );
        return;
      }

      setTotalListings(testData.totalListings || 0);

      // Now fetch 10 random listings
      const listData = await fetchListings();
      setListings(listData.listings || []);
      setStatus("success");
      setDetail(`Connected — ${testData.totalListings} total listings in MLS`);
    } catch (err) {
      setStatus("fail");
      setDetail("Could not reach the API route. " + err.message);
    }
  }

  /* ── NEXT button ── */
  async function handleNext() {
    setLoadingMore(true);
    try {
      // Push current listings onto history stack
      setHistory((prev) => [...prev, listings]);
      const listData = await fetchListings();
      setListings(listData.listings || []);
    } catch (err) {
      setDetail("Error loading next set: " + err.message);
    }
    setLoadingMore(false);
  }

  /* ── BACK button ── */
  function handleBack() {
    if (history.length === 0) return;
    const prev = [...history];
    const last = prev.pop();
    setHistory(prev);
    setListings(last);
  }

  /* ── Format price ── */
  function formatPrice(price) {
    if (price == null) return "N/A";
    return "$" + Number(price).toLocaleString();
  }

  return (
    <div className="page-wrapper">
      {/* ── Header Card ── */}
      <div className="card">
        <h1>Spark API Checker</h1>
        <p className="subtitle">
          Press <strong>Run</strong> to test your live connection to the Spark
          API by FBS and load 10 random listings.
        </p>

        <button
          className="run-btn"
          onClick={handleRun}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <>
              <span className="spinner" />
              Testing…
            </>
          ) : (
            "Run"
          )}
        </button>

        {status === "success" && (
          <>
            <div className="result success">✅ Success</div>
            {detail && <p className="detail">{detail}</p>}
          </>
        )}

        {status === "fail" && (
          <>
            <div className="result fail">❌ Run Failed</div>
            {detail && <p className="detail">{detail}</p>}
          </>
        )}
      </div>

      {/* ── Listings Grid ── */}
      {status === "success" && listings.length > 0 && (
        <div className="listings-section">
          {/* Nav buttons top */}
          <div className="nav-row">
            <button
              className="nav-btn"
              onClick={handleBack}
              disabled={history.length === 0 || loadingMore}
            >
              ← Back
            </button>
            <span className="nav-info">
              {history.length > 0
                ? `Page ${history.length + 1} — `
                : ""}
              Showing {listings.length} listings
            </span>
            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <span className="spinner dark" />
                  Loading…
                </>
              ) : (
                "Next →"
              )}
            </button>
          </div>

          {/* Listing cards */}
          <div className="listings-grid">
            {listings.map((l, i) => (
              <div className="listing-card" key={`${l.listingId}-${i}`}>
                <div className="listing-header">
                  <span className={`status-badge ${l.status.toLowerCase().replace(/\s/g, "-")}`}>
                    {l.status}
                  </span>
                  <span className="listing-id">#{l.listingId}</span>
                </div>

                <div className="listing-price">{formatPrice(l.price)}</div>

                <div className="listing-address">
                  {l.address
                    ? `${l.address}`
                    : "Address not available"}
                  {(l.city || l.state || l.zip) && (
                    <span className="listing-city">
                      {[l.city, l.state].filter(Boolean).join(", ")}{" "}
                      {l.zip}
                    </span>
                  )}
                </div>

                <div className="listing-details">
                  {l.beds != null && (
                    <span className="detail-chip">🛏 {l.beds} Beds</span>
                  )}
                  {l.baths != null && (
                    <span className="detail-chip">🛁 {l.baths} Baths</span>
                  )}
                  {l.sqft != null && (
                    <span className="detail-chip">
                      📐 {Number(l.sqft).toLocaleString()} sqft
                    </span>
                  )}
                  {l.propertyType && (
                    <span className="detail-chip">🏠 {l.propertyType}</span>
                  )}
                </div>

                {l.remarks && (
                  <p className="listing-remarks">{l.remarks}</p>
                )}
              </div>
            ))}
          </div>

          {/* Nav buttons bottom */}
          <div className="nav-row">
            <button
              className="nav-btn"
              onClick={handleBack}
              disabled={history.length === 0 || loadingMore}
            >
              ← Back
            </button>
            <span className="nav-info">
              {history.length > 0
                ? `Page ${history.length + 1}`
                : "Page 1"}
            </span>
            <button
              className="nav-btn"
              onClick={handleNext}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <span className="spinner dark" />
                  Loading…
                </>
              ) : (
                "Next →"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
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
