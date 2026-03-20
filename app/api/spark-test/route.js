export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      { connected: false, error: "SPARK_ACCESS_TOKEN is not set." },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `${baseUrl}/v1/listings?_limit=1&_select=ListingId`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "SparkAPIChecker/1.0",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return Response.json({
        connected: false,
        httpStatus: res.status,
        error: `Spark API returned HTTP ${res.status}`,
        detail: text.substring(0, 500),
      });
    }

    const data = await res.json();
    const totalRows = data?.D?.Pagination?.TotalRows ?? 0;

    return Response.json({
      connected: true,
      message: "Success",
      totalListings: totalRows,
    });
  } catch (err) {
    return Response.json({
      connected: false,
      error: "Network error when calling Spark API.",
      detail: err.message,
    });
  }
}
