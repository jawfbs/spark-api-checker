"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

export default function ListingOverlay({ listing, onClose }) {
  const overlayRef = useRef(null);
  const { addFavorite, removeFavorite, isFavorite, addDisliked } = useTheme();

  const liked = isFavorite(listing.listingId);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleLike() {
    if (liked) {
      removeFavorite(listing.listingId);
    } else {
      addFavorite(listing);
    }
  }

  function handleDislike() {
    addDisliked(listing.listingId);
    removeFavorite(listing.listingId);
    onClose();
  }

  function fmtPrice(val) {
    if (val == null) return "N/A";
    return "$" + Number(val).toLocaleString();
  }

  const fields = [
    { label: "MLS #", value: listing.listingId },
    { label: "Price", value: fmtPrice(listing.price) },
    { label: "Status", value: listing.status },
    { label: "Property Type", value: listing.propertyType },
    { label: "Bedrooms", value: listing.bedrooms },
    { label: "Bathrooms", value: listing.bathrooms },
    { label: "Address", value: listing.address },
    { label: "City", value: listing.city },
    { label: "State", value: listing.state },
    { label: "Zip Code", value: listing.postalCode },
    { label: "Pool", value: listing.pool ? "Yes" : "No" },
    { label: "Listing Office", value: listing.office },
    { label: "Year Built", value: listing.yearBuilt },
    { label: "Square Feet", value: listing.sqft ? listing.sqft.toLocaleString() : null },
    { label: "Lot Size", value: listing.lotSize },
    { label: "Garage Spaces", value: listing.garageSpaces },
    { label: "HOA Fee", value: listing.hoaFee ? "$" + listing.hoaFee : null },
    { label: "Stories", value: listing.stories },
    { label: "County", value: listing.county },
    { label: "Subdivision", value: listing.subdivision },
  ].filter((f) => f.value != null && f.value !== "" && f.value !== "N/A" && f.value !== null);

  return (
    <div className="overlay-backdrop" ref={overlayRef} onClick={handleBackdrop}>
      <div className="overlay-panel">
        {/* Close button */}
        <button className="overlay-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Like / Dislike bar */}
        <div className="overlay-actions">
          <button
            className={`action-btn action-like ${liked ? "action-active" : ""}`}
            onClick={handleLike}
            title={liked ? "Remove from Favorites" : "Add to Favorites"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span>{liked ? "Favorited" : "Like"}</span>
          </button>

          <button
            className="action-btn action-dislike"
            onClick={handleDislike}
            title="Dislike — hide from results"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
            <span>Dislike</span>
          </button>
        </div>

        {/* Hero photo */}
        <div className="overlay-photo-wrap">
          <img
            className="overlay-photo"
            src={listing.photoUrl}
            alt={listing.address || "Listing"}
          />
          <div className="overlay-photo-gradient" />
          <div className="overlay-photo-price">{fmtPrice(listing.price)}</div>
        </div>

        {/* Quick stats */}
        <div className="overlay-quick-stats">
          {listing.bedrooms != null && (
            <div className="quick-stat">
              <span className="quick-stat-val">{listing.bedrooms}</span>
              <span className="quick-stat-label">Beds</span>
            </div>
          )}
          {listing.bathrooms != null && (
            <div className="quick-stat">
              <span className="quick-stat-val">{listing.bathrooms}</span>
              <span className="quick-stat-label">Baths</span>
            </div>
          )}
          {listing.sqft && (
            <div className="quick-stat">
              <span className="quick-stat-val">{listing.sqft.toLocaleString()}</span>
              <span className="quick-stat-label">Sq Ft</span>
            </div>
          )}
          {listing.yearBuilt && (
            <div className="quick-stat">
              <span className="quick-stat-val">{listing.yearBuilt}</span>
              <span className="quick-stat-label">Built</span>
            </div>
          )}
        </div>

        {/* Address */}
        {listing.address && (
          <div className="overlay-address">
            {listing.address}
            {listing.city ? `, ${listing.city}` : ""}
            {listing.state ? `, ${listing.state}` : ""}
            {listing.postalCode ? ` ${listing.postalCode}` : ""}
          </div>
        )}

        {/* Description */}
        {listing.description && listing.description !== "No description available." && (
          <div className="overlay-section">
            <h3 className="overlay-section-title">Description</h3>
            <p className="overlay-desc">{listing.description}</p>
          </div>
        )}

        {/* All fields */}
        <div className="overlay-section">
          <h3 className="overlay-section-title">Property Details</h3>
          <div className="overlay-fields-grid">
            {fields.map((f, i) => (
              <div className="overlay-field" key={i}>
                <span className="overlay-field-label">{f.label}</span>
                <span className="overlay-field-value">{String(f.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
