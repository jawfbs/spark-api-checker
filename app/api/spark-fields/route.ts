export const runtime = "edge";

const CATEGORY_MAP: [string, RegExp[]][] = [
  [
    "Listing Identity",
    [/ListingId/i, /ListingKey/i, /^StandardStatus/i, /PropertyType/i, /PropertySubType/i, /MlsStatus/i],
  ],
  [
    "Price & Financial",
    [/price/i, /fee/i, /tax(?!onomy)/i, /assess/i, /financial/i, /cost/i, /deposit/i, /income/i, /rent/i],
  ],
  [
    "Location & Address",
    [/city/i, /state/i, /zip/i, /postal/i, /street/i, /address/i, /county/i, /country/i, /direction/i, /^Un(parsed|it)/i],
  ],
  [
    "Property Characteristics",
    [/bed/i, /bath/i, /sqft/i, /squarefeet/i, /area(?!s)/i, /year\s?built/i, /stories/i, /garage/i, /parking/i, /living\s?area/i, /^Lot/i, /rooms?\s?total/i, /levels/i],
  ],
  [
    "Interior Features",
    [/interior/i, /flooring/i, /fireplace/i, /appliance/i, /hvac/i, /heating/i, /cooling/i, /laundry/i, /basement/i, /kitchen/i],
  ],
  [
    "Exterior & Lot",
    [/exterior/i, /pool/i, /roof/i, /fence/i, /lot/i, /view/i, /patio/i, /deck/i, /porch/i, /landscap/i, /topography/i, /waterfront/i],
  ],
  ["Room Details", [/^Rooms/i, /RoomType/i]],
  ["School Information", [/school/i, /district/i]],
  [
    "Tax & Assessment",
    [/parcel/i, /zoning/i, /^Tax/i, /assessment/i, /^Legal/i],
  ],
  [
    "HOA & Community",
    [/assoc/i, /hoa/i, /community/i, /subdivision/i, /complex/i],
  ],
  [
    "Agent & Office",
    [/agent/i, /broker/i, /office/i, /^List\s?Agent/i, /^BuyerAgent/i, /^CoList/i, /^CoBuyer/i, /member/i],
  ],
  [
    "Dates & Timestamps",
    [/date/i, /timestamp/i, /^DOM$/i, /DaysOn/i, /modified/i, /^On\s?Market/i, /expir/i, /close/i, /contract/i, /pending/i],
  ],
  [
    "Media & Photos",
    [/photo/i, /image/i, /media/i, /picture/i, /video/i, /virtual\s?tour/i, /tour/i],
  ],
  [
    "Marketing & Descriptions",
    [/remark/i, /description/i, /comment/i, /showing/i, /supplement/i, /syndication/i, /directions/i],
  ],
  [
    "Status & Compliance",
    [/idx/i, /vow/i, /internet/i, /permission/i, /compliance/i, /copyright/i, /disclaimer/i, /privacy/i],
  ],
  [
    "Geographic & Map",
    [/latitude/i, /longitude/i, /coordinates/i, /geo/i, /^Map/i],
  ],
  [
    "Utility & Systems",
    [/electric/i, /water/i, /sewer/i, /solar/i, /utility/i, /power/i, /gas/i, /internet(?!.*display)/i, /telecom/i],
  ],
];

function categorize(fieldName: string): string {
  for (const [cat, patterns] of CATEGORY_MAP) {
    for (const re of patterns) {
      if (re.test(fieldName)) return cat;
    }
  }
  return "Other Fields";
}

function detectType(value: any): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) {
    const len = value.length;
    if (len > 0 && typeof value[0] === "object") return `array[${len}] of objects`;
    return `array[${len}]`;
  }
  if (typeof value === "object") return "object";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "decimal";
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(value)) return "datetime";
    if (/^https?:\/\//i.test(value)) return "url";
    if (value.length > 300) return "text (long)";
    return "string";
  }
  return "unknown";
}

function sampleValue(value: any, type: string): string {
  if (value === null || value === undefined) return "null";
  if (type.startsWith("array")) {
    const len = Array.isArray(value) ? value.length : 0;
    const childFields =
      len > 0 && typeof value[0] === "object"
        ? Object.keys(value[0]).length
        : 0;
    return childFields > 0
      ? `${len} items — ${childFields} fields each`
      : `${len} items`;
  }
  if (type === "object") {
    const keys = Object.keys(value);
    return `{${keys.length} keys}`;
  }
  if (type === "text (long)") return String(value).substring(0, 80) + "…";
  if (type === "integer" || type === "decimal") {
    return Number(value).toLocaleString();
  }
  return String(value).substring(0, 120);
}

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json({
      success: false,
      error: "SPARK_ACCESS_TOKEN is not set.",
    });
  }

  const expansions = [
    "Photos",
    "Videos",
    "VirtualTours",
    "OpenHouses",
    "Rooms",
    "Units",
    "Documents",
  ];
  const url = `${baseUrl}/v1/listings?_limit=1&_expand=${expansions.join(",")}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkFieldExplorer/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({
        success: false,
        error: `Spark API returned HTTP ${res.status}: ${text.substring(0, 300)}`,
      });
    }

    const data = await res.json();
    const results = data?.D?.Results ?? data?.value ?? data?.results ?? [];
    const totalRows = data?.D?.Pagination?.TotalRows ?? results.length ?? 0;

    if (results.length === 0) {
      return Response.json({
        success: false,
        error: "No listings returned. Your API key may not have access to any listings.",
      });
    }

    const sample = results[0];
    const listingId =
      sample.ListingId || sample.ListingKey || sample.Id || "Unknown";

    const fieldTree: Record<
      string,
      Record<string, { type: string; value: any; sample: string; children?: Record<string, any> }>
    > = {};

    let rawFieldCount = 0;

    for (const [key, value] of Object.entries(sample)) {
      if (key.startsWith("@") || key === "Id" || key === "ResourceUri")
        continue;

      rawFieldCount++;
      const type = detectType(value);
      const category = categorize(key);

      if (!fieldTree[category]) fieldTree[category] = {};

      const entry: any = {
        type,
        value,
        sample: sampleValue(value, type),
      };

      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
        const childObj = value[0];
        entry.children = {};
        for (const [ck, cv] of Object.entries(childObj)) {
          if (ck.startsWith("@") || ck === "Id" || ck === "ResourceUri")
            continue;
          const ct = detectType(cv);
          entry.children[ck] = {
            type: ct,
            value: cv,
            sample: sampleValue(cv, ct),
          };
          rawFieldCount++;
        }
      }

      fieldTree[category][key] = entry;
    }

    const sortedTree: typeof fieldTree = {};
    const sortedKeys = Object.keys(fieldTree).sort((a, b) => {
      if (a === "Other Fields") return 1;
      if (b === "Other Fields") return -1;
      return (
        Object.keys(fieldTree[b]).length - Object.keys(fieldTree[a]).length
      );
    });
    for (const k of sortedKeys) sortedTree[k] = fieldTree[k];

    return Response.json({
      success: true,
      connection: "connected",
      totalListings: totalRows,
      sampleListingId: listingId,
      rawFieldCount,
      timestamp: new Date().toISOString(),
      fieldTree: sortedTree,
    });
  } catch (err: any) {
    return Response.json({
      success: false,
      error: `Fetch error: ${err.message}`,
    });
  }
}
