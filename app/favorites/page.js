"use client";

import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import ListingOverlay from "../components/ListingOverlay";
import PhotoSlider from "../components/PhotoSlider";

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useTheme();
  const [selectedListing, setSelectedListing] = useState(null);

  function fmtPrice(val) {
    if (val == null) return "Price N/A";
    return "$" + Number(val).toLocaleString();
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Favorites</h1>
        <p className="page-subtitle">
          {favorites.length === 0
            ? "No favorites yet. Like listings to save them here."
            : `${favorites.length} saved listing${favorites.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {favorites.length > 0 && (
        <div className="listings-grid">
          {favorites.map((listing, i) => (
            <div className="listing-card" key={listing.listingId + "-" + i}>
              <div className="listing-photo-wrap">
                <PhotoSlider
                  photos={listing.photos && listing.photos.length > 0 ? listing.photos : [listing.photoUrl]}
                  alt={listing.address}
                  height="100%"
                  onClickPhoto={() => setSelectedListing(listing)}
                />
                {listing.status && <span className="listing-badge">{listing.status}</span>}
              </div>
              <div className="listing-info">
                <div className="listing-price">{fmtPrice(listing.price)}</div>
                <div className="listing-meta">
                  {listing.bedrooms != null && <span>{listing.bedrooms} bd</span>}
                  {listing.bathrooms != null && <span>{listing.bathrooms} ba</span>}
                  {listing.propertyType && <span>{listing.propertyType}</span>}
                </div>
                {listing.address && (
                  <div className="listing-address">
                    {listing.address}{listing.city ? `, ${listing.city}` : ""}{listing.state ? `, ${listing.state}` : ""}
                  </div>
                )}
                <button className="remove-fav-btn" onClick={() => removeFavorite(listing.listingId)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedListing && (
        <ListingOverlay listing={selectedListing} onClose={() => setSelectedListing(null)} />
      )}
    </div>
  );
}
