"use client";

import { useState, useCallback } from "react";

export default function PhotoSlider({
  photos = [],
  alt = "Photo",
  height = "100%",
  onClickPhoto,
  showCounter = false,
  size = "normal",
}) {
  const [index, setIndex] = useState(0);

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goPrev = useCallback(
    (e) => {
      e.stopPropagation();
      if (hasPrev) setIndex((i) => i - 1);
    },
    [hasPrev]
  );

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();
      if (hasNext) setIndex((i) => i + 1);
    },
    [hasNext]
  );

  if (!photos || photos.length === 0) return null;

  const arrowClass = size === "large" ? "slider-arrow slider-arrow-lg" : "slider-arrow";

  return (
    <div
      className="slider-wrap"
      style={{ height }}
      onClick={onClickPhoto ? () => onClickPhoto() : undefined}
    >
      <img
        className="slider-img"
        src={photos[index]}
        alt={`${alt} ${index + 1}`}
        loading="lazy"
        draggable={false}
      />

      {/* Left arrow */}
      {photos.length > 1 && (
        <button
          className={`${arrowClass} slider-arrow-left ${!hasPrev ? "slider-arrow-dim" : ""}`}
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Previous photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Right arrow */}
      {photos.length > 1 && (
        <button
          className={`${arrowClass} slider-arrow-right ${!hasNext ? "slider-arrow-dim" : ""}`}
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Next photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Counter */}
      {showCounter && photos.length > 1 && (
        <div className="slider-counter">
          {index + 1} / {photos.length}
        </div>
      )}

      {/* Dots */}
      {photos.length > 1 && photos.length <= 12 && !showCounter && (
        <div className="slider-dots">
          {photos.map((_, i) => (
            <span
              key={i}
              className={`slider-dot ${i === index ? "slider-dot-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
