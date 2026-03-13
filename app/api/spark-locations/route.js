export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json({ success: false, locations: [] }, { status: 200 });
  }

  try {
    const url = `${baseUrl}/v1/listings?_limit=200&_select=City,StateOrProvince,PostalCode&_orderby=City`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkAPIChecker/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json({ success: false, locations: [] }, { status: 200 });
    }

    const data = await res.json();
    const results = data?.D?.Results ?? [];

    const seen = new Set();
    const locations = [];

    results.forEach((item) => {
      const sf = item.StandardFields || item;
      const city = sf.City || "";
      const state = sf.StateOrProvince || "";
      const zip = sf.PostalCode || "";

      if (city || zip) {
        const cityKey = `${city}|${state}`;
        const zipKey = zip;

        if (city && state && !seen.has(cityKey)) {
          seen.add(cityKey);
          locations.push({
            label: `${city}, ${state}`,
            city,
            state,
            zip: "",
            type: "city",
          });
        }

        if (zip && !seen.has(zipKey)) {
          seen.add(zipKey);
          locations.push({
            label: `${zip} — ${city}, ${state}`,
            city,
            state,
            zip,
            type: "zip",
          });
        }
      }
    });

    locations.sort((a, b) => a.label.localeCompare(b.label));

    return Response.json(
      { success: true, count: locations.length, locations },
      { status: 200 }
    );
  } catch (err) {
    return Response.json({ success: false, locations: [] }, { status: 200 });
  }
}
