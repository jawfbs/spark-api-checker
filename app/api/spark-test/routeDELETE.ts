export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      { connected: false, error: "SPARK_ACCESS_TOKEN environment variable is not set." },
      { status: 500 }
    );
  }

  const url = `${baseUrl}/v1/listings?_limit=1&_select=ListingId,StandardStatus,ListPrice`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkAPIChecker/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        {
          connected: false,
          httpStatus: res.status,
          error: `Spark API returned HTTP ${res.status}`,
          detail: text.substring(0, 500),
        },
        { status: 200 }
      );
    }

    const data = await res.json();
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
  } catch (err: any) {
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
