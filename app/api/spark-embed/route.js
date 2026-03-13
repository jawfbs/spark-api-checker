export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      { success: false, error: "API token not configured." },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const countUrl = `${baseUrl}/v1/listings?_limit=1&_pagination=count`;
    const countRes = await fetch(countUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!countRes.ok) {
      return Response.json(
        { success: false, error: `HTTP ${countRes.status}` },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const countData = await countRes.json();
    const total = countData?.D?.Pagination?.TotalRows ?? 0;

    const fullUrl = `${baseUrl}/v1/listings?_limit=1&_expand=Photos,VirtualTours,OpenHouses,Rooms`;
    const fullRes = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!fullRes.ok) {
      return Response.json(
        { success: false, error: "Could not fetch listing data." },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const fullData = await fullRes.json();
    const records = fullData?.D?.Results ?? [];

    if (records.length === 0) {
      return Response.json(
        { success: false, error: "No listings returned." },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    const sf = records[0].StandardFields || records[0];
    const fieldNames = Object.keys(sf).sort();

    const fields = fieldNames.map((key) => {
      const val = sf[key];
      let type = "null";
      let sample = "—";

      if (val === null || val === undefined) {
        type = "null";
      } else if (Array.isArray(val)) {
        type = `array[${val.length}]`;
        sample = `${val.length} items`;
      } else if (typeof val === "object") {
        type = "object";
        sample = `${Object.keys(val).length} fields`;
      } else if (typeof val === "boolean") {
        type = "boolean";
        sample = val.toString();
      } else if (typeof val === "number") {
        type = Number.isInteger(val) ? "integer" : "decimal";
        sample = val.toLocaleString();
      } else {
        const str = String(val);
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) type = "datetime";
        else if (/^https?:\/\//.test(str)) type = "url";
        else type = "string";
        sample = str.length > 80 ? str.substring(0, 80) + "…" : str;
      }

      return { name: key, type, sample };
    });

    return Response.json(
      {
        success: true,
        totalListings: total,
        sampleId: sf.ListingId || sf.ListingKey || "Unknown",
        fieldCount: fields.length,
        fields,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}
