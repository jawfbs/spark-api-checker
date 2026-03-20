"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ListingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/spark-listings?listingKey=${id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else setListing(data.listing);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function formatPrice(p) {
    if (p == null) return "N/A";
    return "$" + Number(p).toLocaleString();
  }

  function formatDate(d) {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="detail-loading">
        <span className="spinner" /> Loading listing…
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="detail-loading">
        <p style={{ color: "var(--fail)" }}>
          {error || "Listing not found."}
        </p>
        <button className="nav-btn" onClick={() => router.back()}>
          ← Back
        </button>
      </div>
    );
  }

  const l = listing;
  const hasPhotos = l.photos && l.photos.length > 0;

  const fields = [
    { label: "Status", value: l.status },
    { label: "Property Type", value: l.propertyType },
    { label: "Price", value: formatPrice(l.price) },
    { label: "Beds", value: l.beds },
    { label: "Baths", value: l.baths },
    { label: "Sq Ft", value: l.sqft ? Number(l.sqft).toLocaleString() : null },
    { label: "Lot Size", value: l.lotSize ? Number(l.lotSize).toLocaleString() + " sqft" : null },
    { label: "Year Built", value: l.yearBuilt },
    { label: "Garage", value: l.garage ? `${l.garage} spaces` : null },
    { label: "Days on Market", value: l.daysOnMarket },
    { label: "HOA Fee", value: l.hoaFee ? formatPrice(l.hoaFee) + "/mo" : null },
    { label: "Annual Taxes", value: l.taxes ? formatPrice(l.taxes) : null },
    { label: "Subdivision", value: l.subdivision },
    { label: "List Date", value: formatDate(l.listDate) },
    { label: "Last Updated", value: formatDate(l.modDate) },
    { label: "Listing Agent", value: l.agentName },
    { label: "Office", value: l.officeName },
    { label: "MLS ID", value: l.listingId },
  ];

  // Only show fields that have real info
  const activeFields = fields.filter((f) => f.value != null && f.value !== "N/A" && f.value !== "");

  return (
    <div className="detail-page">
      <button className="back-link" onClick={() => router.back()}>
        ← Back to Listings
      </button>

      {/* Photo Gallery */}
      {hasPhotos ? (
        <div className="gallery">
          <img
            src={l.photos[photoIndex]}
            alt={`Listing photo ${photoIndex + 1}`}
            className="gallery-main"
          />
          {l.photos.length > 1 && (
            <div className="gallery-controls">
              <button
                className="gallery-btn"
                onClick={() =>
                  setPhotoIndex((i) =>
                    i === 0 ? l.photos.length - 1 : i - 1
                  )
                }
              >
                ‹
              </button>
              <span className="gallery-count">
                {photoIndex + 1} / {l.photos.length}
              </span>
              <button
                className="gallery-btn"
                onClick={() =>
                  setPhotoIndex((i) =>
                    i === l.photos.length - 1 ? 0 : i + 1
                  )
                }
              >
                ›
              </button>
            </div>
          )}
          {/* Thumbnail strip */}
          {l.photos.length > 1 && (
            <div className="gallery-thumbs">
              {l.photos.slice(0, 8).map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`thumb ${i + 1}`}
                  className={`gallery-thumb ${i === photoIndex ? "active" : ""}`}
                  onClick={() => setPhotoIndex(i)}
                />
              ))}
              {l.photos.length > 8 && (
                <span className="thumb-more">+{l.photos.length - 8} more</span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="no-photo">No photos available</div>
      )}

      {/* Title block */}
      <div className="detail-title-block">
        <div className="detail-price">{formatPrice(l.price)}</div>
        <div className="detail-address">
          {l.address || "Address not available"}
          {(l.city || l.state || l.zip) && (
            <span className="detail-subaddress">
              {[l.city, l.state].filter(Boolean).join(", ")} {l.zip}
            </span>
          )}
        </div>
        {l.status && (
          <span className={`status-badge ${l.status.toLowerCase().replace(/\s/g, "-")}`}>
            {l.status}
          </span>
        )}
      </div>

      {/* Facts grid */}
      <div className="detail-section">
        <h2>Property Details</h2>
        <div className="facts-grid">
          {activeFields.map((f) => (
            <div className="fact-item" key={f.label}>
              <span className="fact-label">{f.label}</span>
              <span className="fact-value">{f.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      {l.remarks && (
        <div className="detail-section">
          <h2>Description</h2>
          <p className="detail-remarks">{l.remarks}</p>
        </div>
      )}

      {/* Map */}
      {l.lat && l.lng && (
        <div className="detail-section">
          <h2>Location</h2>
          <div className="map-container">
            <iframe
              title="Listing Map"
              className="map-iframe"
              src={`https://maps.google.com/maps?q=${l.lat},${l.lng}&z=15&output=embed`}
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
