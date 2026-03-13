"use client";

import { useTheme } from "../context/ThemeContext";

export default function Gamification() {
  const { favorites, disliked, gamification } = useTheme();

  if (!gamification) return null;

  const viewed = favorites.length + disliked.length;
  const level =
    viewed >= 50
      ? { name: "Platinum Agent", icon: "💎", next: null, progress: 100 }
      : viewed >= 25
      ? { name: "Gold Buyer", icon: "🥇", next: 50, progress: ((viewed - 25) / 25) * 100 }
      : viewed >= 10
      ? { name: "Silver Scout", icon: "🥈", next: 25, progress: ((viewed - 10) / 15) * 100 }
      : viewed >= 3
      ? { name: "Bronze Browser", icon: "🥉", next: 10, progress: ((viewed - 3) / 7) * 100 }
      : { name: "Newcomer", icon: "🏠", next: 3, progress: (viewed / 3) * 100 };

  const badges = [];
  if (favorites.length >= 1) badges.push({ icon: "❤️", label: "First Favorite" });
  if (favorites.length >= 5) badges.push({ icon: "⭐", label: "Top 5 Picks" });
  if (favorites.length >= 10) badges.push({ icon: "🏆", label: "Super Collector" });
  if (disliked.length >= 5) badges.push({ icon: "🎯", label: "Selective Eye" });
  if (viewed >= 10) badges.push({ icon: "🔍", label: "Keen Observer" });
  if (viewed >= 25) badges.push({ icon: "🗺️", label: "Market Explorer" });

  return (
    <div className="gamification-panel">
      <div className="gam-header">
        <span className="gam-level-icon">{level.icon}</span>
        <div className="gam-level-info">
          <span className="gam-level-name">{level.name}</span>
          <span className="gam-level-sub">
            {viewed} listings reviewed
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {level.next && (
        <div className="gam-progress-wrap">
          <div className="gam-progress-track">
            <div
              className="gam-progress-fill"
              style={{ width: `${Math.min(100, level.progress)}%` }}
            />
          </div>
          <span className="gam-progress-label">
            {viewed} / {level.next} to next level
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="gam-stats">
        <div className="gam-stat">
          <span className="gam-stat-val">{favorites.length}</span>
          <span className="gam-stat-label">Liked</span>
        </div>
        <div className="gam-stat">
          <span className="gam-stat-val">{disliked.length}</span>
          <span className="gam-stat-label">Passed</span>
        </div>
        <div className="gam-stat">
          <span className="gam-stat-val">{badges.length}</span>
          <span className="gam-stat-label">Badges</span>
        </div>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="gam-badges">
          {badges.map((b, i) => (
            <div className="gam-badge" key={i} title={b.label}>
              <span className="gam-badge-icon">{b.icon}</span>
              <span className="gam-badge-label">{b.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
