export const runtime = "edge";

// Utility — mask check
function isMasked(val) {
  if (val == null) return true;
  const s = String(val).trim();
  return s === "" || /^\*+$/.test(s);
}

function safeNum(val) {
  if (isMasked(val)) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json({ error: "SPARK_ACCESS_TOKEN is not set." }, { status: 500 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent": "SparkAPIChecker/1.0",
  };

  try {
    // Fetch a broad set to compute stats — 200 listings max
    const fields = "ListPrice,StandardStatus,BedsTotal,BathsTotal,City,PropertyType,ListingContractDate";
    const res = await fetch(
      `${baseUrl}/v1/listings?_limit=200&_select=${fields}`,
      { headers, cache: "no-store" }
    );

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}` });
    }

    const data = await res.json();
    const results = data?.D?.Results ?? [];
    const total = data?.D?.Pagination?.TotalRows ?? results.length;

    // Aggregate stats
    const prices = [];
    const statusCounts = {};
    const cityCounts = {};
    const typeCounts = {};
    const bedCounts = {};
    let priceSum = 0;

    for (const item of results) {
      const s = item.StandardFields || item;

      const price = safeNum(s.ListPrice);
      const status = isMasked(s.StandardStatus) ? null : String(s.StandardStatus).trim();
      const city = isMasked(s.City) ? null : String(s.City).trim();
      const type = isMasked(s.PropertyType) ? null : String(s.PropertyType).trim();
      const beds = safeNum(s.BedsTotal);

      if (price != null) {
        prices.push(price);
        priceSum += price;
      }
      if (status) statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (city) cityCounts[city] = (cityCounts[city] || 0) + 1;
      if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
      if (beds != null) {
        const key = `${beds}`;
        bedCounts[key] = (bedCounts[key] || 0) + 1;
      }
    }

    prices.sort((a, b) => a - b);
    const avgPrice = prices.length ? Math.round(priceSum / prices.length) : null;
    const medianPrice = prices.length
      ? prices[Math.floor(prices.length / 2)]
      : null;
    const minPrice = prices.length ? prices[0] : null;
    const maxPrice = prices.length ? prices[prices.length - 1] : null;

    // Top 5 cities
    const topCities = Object.entries(cityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    return Response.json({
      totalListings: total,
      sampledCount: results.length,
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      statusCounts,
      typeCounts,
      bedCounts,
      topCities,
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
