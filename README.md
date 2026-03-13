# ◆ Spark Listings

A modern, high-tech real estate listing browser powered by the **Spark API by FBS**. Built with **Next.js 14** and deployed on **Vercel**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_GITHUB_USERNAME/spark-api-checker&env=SPARK_ACCESS_TOKEN,SPARK_API_BASE_URL&envDescription=Spark%20API%20credentials%20from%20FBS&envLink=http://sparkplatform.com/docs/authentication/access_token)

---

## ✨ Features

### 🔍 Smart Search
- **Location autocomplete** — type a city, state, or zip code and matching results load as you type. Select from the dropdown or click Search.
- **Bedrooms filter** — dropdown from 1–10 or type a value. Shows listings with that many bedrooms or more.
- **Bathrooms filter** — dropdown from 1–10 or type a value. Shows listings with that many bathrooms or more.
- **Pool filter** — checkbox toggle. When checked, only listings with a pool are shown. When unchecked, all listings load regardless of pool status.
- **Combined filters** — all four fields work together. Search by location + bedrooms + bathrooms + pool simultaneously.

### 🏠 Listing Cards
- **Photo-only display** — listings without photos are automatically excluded from results.
- **Responsive grid layout** — cards adapt from 3 columns on desktop to 1 column on mobile.
- **Hover effects** — cards lift with an accent glow on hover. Photos zoom slightly with a "View Details" overlay.
- **Status badges** — MLS status (Active, Pending, etc.) shown as overlay badges on photos.
- **Pool badges** — listings with pools display a blue "Pool" badge on the photo.
- **Pagination** — Back and Next buttons cycle through sets of listings. History is preserved so you can navigate back to previous sets.

### 📋 Listing Detail Overlay
- **Click any listing photo** to open a full-detail overlay panel.
- **Hero photo** with gradient overlay and large price display.
- **Quick stats bar** — beds, baths, square feet, year built displayed in a clean row.
- **Full address** display.
- **Property description** — complete public remarks from the MLS.
- **Property details grid** — all available fields displayed in a modern two-column grid:
  - MLS number, price, status, property type
  - Bedrooms, bathrooms, square footage, lot size
  - Year built, stories, garage spaces, HOA fee
  - City, state, zip, county, subdivision
  - Listing office, pool status
- **Keyboard support** — press Escape to close the overlay.
- **Click outside** the panel to close.

### 👍👎 Like & Dislike System
- **Thumbs up (Like)** — adds the listing to your Favorites. Click again to remove.
- **Thumbs down (Dislike)** — closes the overlay and permanently hides that listing from all future search results.
- Both actions are **saved in cookies** and persist across sessions.

### ❤️ Favorites Page
- **Heart icon** in the navigation bar with a badge showing the count of saved favorites.
- Dedicated **/favorites** page displaying all liked listings in a card grid.
- Click any favorite's photo to reopen the detail overlay.
- **Remove button** on each card to delete from favorites.

### 🎮 Gamification
- **Toggle on/off** from the Settings page.
- When enabled, a gamification panel appears above the search bar on the home page.
- **Leveling system** based on total listings reviewed (liked + disliked):
  - 🏠 Newcomer (0–2 reviewed)
  - 🥉 Bronze Browser (3–9)
  - 🥈 Silver Scout (10–24)
  - 🥇 Gold Buyer (25–49)
  - 💎 Platinum Agent (50+)
- **Progress bar** showing advancement toward the next level.
- **Stats display** — total liked, total passed, total badges earned.
- **Achievement badges**:
  - ❤️ First Favorite — save your first listing
  - ⭐ Top 5 Picks — save 5 favorites
  - 🏆 Super Collector — save 10 favorites
  - 🎯 Selective Eye — pass on 5 listings
  - 🔍 Keen Observer — review 10 listings
  - 🗺️ Market Explorer — review 25 listings

### ⚙️ Settings Page
- **Gear icon** in the navigation bar opens the settings page.
- **Display Mode** — three modes with instant switching:
  - 🌙 **Dark** — deep dark background with high contrast
  - 🌤 **Mellow** — warm earthy tones, softer contrast
  - ☀️ **Light** — clean white background with subtle shadows
- **Theme / Accent Color**:
  - Full **color picker** to choose any accent color
  - **10 preset color circles** for quick selection
  - Accent color applies to buttons, links, highlights, glows, and badges throughout the app
  - **Reset to Defaults** button restores dark mode + blue accent
- **Gamification toggle** — enable or disable the gamification panel
- **Hidden Listings** — shows count of disliked/hidden listings with a **Clear All** button to restore them
- **Spark API Connection** — Run button to test live connectivity to the Spark API. Displays success/fail status with listing count and sample ID.

### 🍪 Persistent Preferences (Cookies)
All user preferences are saved in browser cookies and persist across page refreshes and sessions:
- Display mode (dark / mellow / light)
- Accent color
- Gamification on/off
- Favorite listings
- Disliked/hidden listing IDs

### 🎨 Modern High-Tech Design
- **Glassmorphism navigation** — sticky nav with blur and transparency
- **Accent glow effects** — subtle colored glows on cards, buttons, and panels
- **Smooth animations** — slide-up overlay, fade-in transitions, hover lifts
- **Custom scrollbar** — thin, themed scrollbar matching the current mode
- **Responsive design** — fully optimized for desktop, tablet, and mobile
- **Anti-aliased typography** — crisp text rendering across all platforms

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Runtime | Edge Runtime (Vercel) |
| API | Spark API by FBS (replication endpoint) |
| Styling | Custom CSS with CSS Variables |
| State | React Context + Cookies |
| Deployment | Vercel (automatic preview + production) |

---

## 📁 Project Structure
