export const runtime = "edge";

const CATEGORY_MAP: [string, RegExp[]][] = [
  ["Listing Identity", [/ListingId/i, /ListingKey/i, /^StandardStatus/i, /PropertyType/i, /PropertySubType/i, /MlsStatus/i]],
  ["Price & Financial", [/price/i, /fee/i, /tax(?!onomy)/i, /assess/i, /financial/i, /cost/i, /deposit/i, /income/i, /rent/i]],
  ["Location & Address", [/city/i, /state/i, /zip/i, /postal/i, /street/i, /address/i, /county/i, /country/i, /direction/i]],
  ["Property Characteristics", [/bed/i, /bath/i, /sqft/i, /squarefeet/i, /area(?!s)/i, /year\s?built/i, /stories/i, /garage/i, /parking/i, /living\s?area/i, /rooms?\s?total/i, /levels/i]],
  ["Interior Features", [/interior/i, /flooring/i, /fireplace/i, /appliance/i, /hvac/i, /heating/i, /cooling/i, /laundry/i, /basement/i, /kitchen/i]],
  ["Exterior & Lot", [/exterior/i, /pool/i, /roof/i, /fence/i, /^lot/i, /view/i, /patio/i, /deck/i, /porch/i, /waterfront/i]],
  ["Room Details", [/^Rooms/i, /RoomType/i]],
  ["School Information", [/school/i, /district/i]],
  ["Tax & Assessment", [/parcel/i, /zoning/i, /^Tax/i, /assessment/i, /^Legal/i]],
  ["HOA & Community", [/assoc/i, /hoa/i, /community/i, /subdivision/i]],
  ["Agent & Office", [/agent/i, /broker/i, /office/i, /member/i]],
  ["Dates & Timestamps", [/date/i, /timestamp/i, /^DOM$/i, /DaysOn/i, /modified/i, /expir/i]],
  ["Media & Photos", [/photo/i, /image/i, /media/i, /video/i, /virtual\s?tour/i, /tour/i]],
  ["Marketing & Descriptions", [/remark/i, /description/i, /comment/i, /showing/i, /syndication/i]],
  ["Status & Compliance", [/idx/i, /vow/i, /internet/i, /permission/i, /compliance/i, /copyright/i]],
  ["Geographic & Map", [/latitude/i, /longitude/i, /coordinates/i, /geo/i, /^Map/i]],
  ["Utility & Systems", [/electric/i, /water/i, /sewer/i, /solar/i, /utility/i, /power/i, /gas/i]],
];

function categorize(name: string): string {
  for (const [cat, patterns] of CATEGORY_MAP) {
    for (const re of patterns) { if (re.test(name)) return cat; }
  }
  return "Other Fields";
}

function detectType(v: any): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return v.length > 0 && typeof v[0] === "object" ? `array[${v.length}] of objects` : `array[${v.length}]`;
  if (typeof v === "object") return "object";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "decimal";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T|\s)/.test(v)) return "datetime";
    if (/^https?:\/\//i.test(v)) return "url";
    if (v.length > 300) return "text (long)";
    return "string";
  }
  return "unknown";
}

function sampleVal(v: any, t: string): string {
  if (v === null || v === undefined) return "null";
  if (t.startsWith("array")) { const l = Array.isArray(v) ? v.length : 0; const c = l > 0 && typeof v[0] === "object" ? Object.keys(v[0]).length : 0; return c > 0 ? `${l} items — ${c} fields each` : `${l} items`; }
  if (t === "object") return `{${Object.keys(v).length} keys}`;
  if (t === "text (long)") return String(v).substring(0, 80) + "…";
  if (t === "integer" || t === "decimal") return Number(v).toLocaleString();
  return String(v).substring(0, 120);
}

export async function GET() {
  const baseUrl = process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";
  if (!token) return Response.json({ success: false, error: "SPARK_ACCESS_TOKEN is not set." });

  const url = `${baseUrl}/v1/listings?_limit=1&_expand=Photos,Videos,VirtualTours,OpenHouses,Rooms,Units,Documents`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "SparkFieldExplorer/1.0" },
      cache: "no-store",
    });

    if (!res.ok) { const text = await res.text(); return Response.json({ success: false, error: `HTTP ${res.status}: ${text.substring(0, 300)}` }); }

    const data = await res.json();
    const results = data?.D?.Results ?? data?.value ?? data?.results ?? [];
    const totalRows = data?.D?.Pagination?.TotalRows ?? results.length ?? 0;
    if (results.length === 0) return Response.json({ success: false, error: "No listings returned." });

    const sample = results[0];
    const listingId = sample.ListingId || sample.ListingKey || sample.Id || "Unknown";

    const fieldTree: Record<string, Record<string, any>> = {};
    let rawFieldCount = 0;

    for (const [key, value] of Object.entries(sample)) {
      if (key.startsWith("@") || key === "Id" || key === "ResourceUri") continue;
      rawFieldCount++;
      const type = detectType(value);
      const category = categorize(key);
      if (!fieldTree[category]) fieldTree[category] = {};

      const entry: any = { type, value, sample: sampleVal(value, type) };

      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
        entry.children = {};
        for (const [ck, cv] of Object.entries(value[0])) {
          if (ck.startsWith("@") || ck === "Id" || ck === "ResourceUri") continue;
          const ct = detectType(cv);
          entry.children[ck] = { type: ct, value: cv, sample: sampleVal(cv, ct) };
          rawFieldCount++;
        }
      }

      fieldTree[category][key] = entry;
    }

    const sortedTree: typeof fieldTree = {};
    Object.keys(fieldTree).sort((a, b) => {
      if (a === "Other Fields") return 1;
      if (b === "Other Fields") return -1;
      return Object.keys(fieldTree[b]).length - Object.keys(fieldTree[a]).length;
    }).forEach(k => sortedTree[k] = fieldTree[k]);

    return Response.json({
      success: true, connection: "connected", totalListings: totalRows,
      sampleListingId: listingId, rawFieldCount, timestamp: new Date().toISOString(), fieldTree: sortedTree,
    });
  } catch (err: any) {
    return Response.json({ success: false, error: `Fetch error: ${err.message}` });
  }
}
