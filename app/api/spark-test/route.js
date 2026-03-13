// app/api/spark-test/route.js

export const runtime = "edge"; // runs on Vercel Edge — fast & global

export async function GET() {
  /* ── Pull secrets from environment ── */
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      {
        connected: false,
        error: "SPARK_ACCESS_TOKEN environment variable is not set.",
      },
      { status: 500 }
    );
  }

  /* ── Try the /v1/listings endpoint (lightweight call) ── */
  // We request just 1 listing with minimal fields to keep the payload tiny.
  const url = `${baseUrl}/v1/listings?_limit=1&_select=ListingId,StandardStatus,ListPrice`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkAPIChecker/1.0",
      },
      // Don't cache — we always want a live check
      cache: "no-store",
    });

    /* ── Parse response ── */
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        {
          connected: false,
          httpStatus: res.status,
          error: `Spark API returned HTTP ${res.status}`,
          detail: text.substring(0, 500),
        },
        { status: 200 } // Our API is fine; Spark rejected us
      );
    }

    const data = await res.json();

    // Spark wraps results in a "D" object → D.Results
    const results = data?.D?.Results ?? data?.value ?? data?.results ?? [];
    const totalRows = data?.D?.Pagination?.TotalRows ?? results.length ?? 0;

    return Response.json(
      {
        connected: true,
        message: "Success",
        totalActiveListings: totalRows,
        sampleRecord: results[0] ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      {
        connected: false,
        error: "Network or fetch error when calling Spark API.",
        detail: err.message,
      },
      { status: 200 }
    );
  }
}
