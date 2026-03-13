export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      { success: false, error: "SPARK_ACCESS_TOKEN is not configured." },
      { status: 500 }
    );
  }

  const results = {
    success: false,
    connection: null,
    totalListings: 0,
    sampleListingId: null,
    fieldTree: null,
    rawFieldCount: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    /* ── Step 1: Test connection + get count ── */
    const countUrl = `${baseUrl}/v1/listings?_limit=1&_pagination=count`;
    const countRes = await fetch(countUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkFieldExplorer/1.0",
      },
      cache: "no-store",
    });

    if (!countRes.ok) {
      results.connection = "failed";
      results.error = `HTTP ${countRes.status} — ${countRes.statusText}`;
      return Response.json(results, { status: 200 });
    }

    results.connection = "connected";
    const countData = await countRes.json();
    results.totalListings = countData?.D?.Pagination?.TotalRows ?? 0;

    /* ── Step 2: Fetch one full listing with all expansions ── */
    const fullUrl = `${baseUrl}/v1/listings?_limit=1&_expand=Photos,Videos,VirtualTours,OpenHouses,Rooms,Units,Documents`;
    const fullRes = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkFieldExplorer/1.0",
      },
      cache: "no-store",
    });

    let sampleRecord = null;
    if (fullRes.ok) {
      const fullData = await fullRes.json();
      const recs = fullData?.D?.Results ?? [];
      if (recs.length > 0) sampleRecord = recs[0];
    }

    /* ── Fallback: fetch without expansions ── */
    if (!sampleRecord) {
      const fallbackUrl = `${baseUrl}/v1/listings?_limit=1`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "SparkFieldExplorer/1.0",
        },
        cache: "no-store",
      });
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const fbRecs = fbData?.D?.Results ?? [];
        if (fbRecs.length > 0) sampleRecord = fbRecs[0];
      }
    }

    if (!sampleRecord) {
      results.error = "Connected but no listings returned.";
      return Response.json(results, { status: 200 });
    }

    /* ── Step 3: Build the field tree ── */
    const sf = sampleRecord.StandardFields || sampleRecord;
    results.sampleListingId =
      sf.ListingId || sf.ListingKey || sampleRecord.Id || "Unknown";

    function categorize(obj) {
      const categories = {
        "Listing Identity": {},
        "Price & Financial": {},
        "Location & Address": {},
        "Property Characteristics": {},
        "Interior Features": {},
        "Exterior & Lot": {},
        "Room Details": {},
        "School Information": {},
        "Tax & Assessment": {},
        "HOA & Community": {},
        "Agent & Office": {},
        "Dates & Timestamps": {},
        "Media & Photos": {},
        "Marketing & Descriptions": {},
        "Status & Compliance": {},
        "Geographic & Map": {},
        "Utility & Systems": {},
        "Other Fields": {},
      };

      const rules = [
        {
          cat: "Listing Identity",
          keys: [
            "ListingId", "ListingKey", "ListingKeyNumeric", "Id", "ResourceUri",
            "MlsId", "OriginatingSystemKey", "OriginatingSystemName", "MlsStatus",
            "StandardStatus", "PropertyType", "PropertySubType",
          ],
        },
        {
          cat: "Price & Financial",
          match: /(price|cost|fee|tax|assess|financ|value|amount|deposit|commission|concession)/i,
        },
        {
          cat: "Location & Address",
          match: /(address|city|state|province|postal|zip|county|country|parish|street|unit|apt|direct|unparsed.*line|cross.*street|subdivision|neighborhood|area|community.*name)/i,
        },
        {
          cat: "Property Characteristics",
          match: /(bedroom|bathroom|bath|room|area|sqft|square|footage|size|year.*built|stories|story|level|floor|garage|carport|parking|building|living|lot(?!.*name)|foundation|construction|architectural|style|type(?!.*name)|structure|dwelling|residence)/i,
        },
        {
          cat: "Interior Features",
          match: /(interior|flooring|fireplace|appliance|laundry|kitchen|basement|attic|den|dining|family.*room|cooling|heating|hvac|window|door|closet|ceiling|wall|paint|fixture)/i,
        },
        {
          cat: "Exterior & Lot",
          match: /(exterior|roof|pool|spa|fence|patio|deck|porch|view|water|sewer|landscape|garden|lot|topography|soil|easement|encumbrance|flood)/i,
        },
        {
          cat: "Room Details",
          match: /^(Rooms|rooms)/,
        },
        {
          cat: "School Information",
          match: /(school|education|district)/i,
        },
        {
          cat: "Tax & Assessment",
          match: /(tax|parcel|assessment|apn|zoning)/i,
        },
        {
          cat: "HOA & Community",
          match: /(hoa|association|community|amenity|amenities|club|gate|guard|maint)/i,
        },
        {
          cat: "Agent & Office",
          match: /(agent|office|broker|list.*name|co.*agent|buyer|sell|mls.*board|member|showing|lockbox)/i,
        },
        {
          cat: "Dates & Timestamps",
          match: /(date|time|day|expir|modif|created|updated|pending|close|contract|dom|cdom|cumul)/i,
        },
        {
          cat: "Media & Photos",
          match: /(photo|image|video|virtual|tour|media|document|supplement|uri|url|link(?!.*age))/i,
        },
        {
          cat: "Marketing & Descriptions",
          match: /(remark|description|comment|narrat|feature|highlight|syndic|marketing|direction|showing.*inst)/i,
        },
        {
          cat: "Status & Compliance",
          match: /(status|compliance|disclosure|condition|contingenc|warranty|inspection|permit|restriction|regulation|legal|copyright|idxopt|vow|internet|permission)/i,
        },
        {
          cat: "Geographic & Map",
          match: /(latitude|longitude|geo|coord|map|boundar|direction(?!.*prefix))/i,
        },
        {
          cat: "Utility & Systems",
          match: /(utilit|electric|gas|water|solar|energy|green|internet|cable|phone|security|alarm|system)/i,
        },
      ];

      const keys = Object.keys(obj).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );

      for (const key of keys) {
        const val = obj[key];

        /* Determine category */
        let placed = false;

        /* Check exact key lists first */
        for (const rule of rules) {
          if (rule.keys && rule.keys.includes(key)) {
            categories[rule.cat][key] = describeValue(key, val);
            placed = true;
            break;
          }
        }

        if (!placed) {
          for (const rule of rules) {
            if (rule.match && rule.match.test(key)) {
              categories[rule.cat][key] = describeValue(key, val);
              placed = true;
              break;
            }
          }
        }

        if (!placed) {
          categories["Other Fields"][key] = describeValue(key, val);
        }
      }

      /* Remove empty categories */
      for (const cat of Object.keys(categories)) {
        if (Object.keys(categories[cat]).length === 0) {
          delete categories[cat];
        }
      }

      return categories;
    }

    function describeValue(key, val) {
      if (val === null || val === undefined) {
        return { type: "null", value: null, sample: "—" };
      }

      if (Array.isArray(val)) {
        if (val.length === 0) {
          return { type: "array (empty)", value: [], sample: "[]" };
        }

        if (typeof val[0] === "object" && val[0] !== null) {
          const childKeys = Object.keys(val[0]).sort();
          return {
            type: `array[${val.length}] of objects`,
            value: `${val.length} items`,
            children: childKeys.reduce((acc, ck) => {
              acc[ck] = describeValue(ck, val[0][ck]);
              return acc;
            }, {}),
            sample: `${val.length} items — ${childKeys.length} fields each`,
          };
        }

        return {
          type: `array[${val.length}]`,
          value: val.slice(0, 3),
          sample: val.slice(0, 3).join(", ") + (val.length > 3 ? "…" : ""),
        };
      }

      if (typeof val === "object") {
        const childKeys = Object.keys(val).sort();
        return {
          type: "object",
          value: `${childKeys.length} fields`,
          children: childKeys.reduce((acc, ck) => {
            acc[ck] = describeValue(ck, val[ck]);
            return acc;
          }, {}),
          sample: `{${childKeys.length} fields}`,
        };
      }

      if (typeof val === "boolean") {
        return { type: "boolean", value: val, sample: val.toString() };
      }

      if (typeof val === "number") {
        return {
          type: Number.isInteger(val) ? "integer" : "decimal",
          value: val,
          sample: val.toLocaleString(),
        };
      }

      const str = String(val);
      if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return { type: "datetime", value: str, sample: str };
      }

      if (/^https?:\/\//.test(str)) {
        return {
          type: "url",
          value: str,
          sample: str.length > 60 ? str.substring(0, 60) + "…" : str,
        };
      }

      return {
        type: str.length > 200 ? "text (long)" : "string",
        value: str,
        sample:
          str.length > 80 ? str.substring(0, 80) + "…" : str,
      };
    }

    const fieldTree = categorize(sf);

    /* Count total fields */
    let totalFields = 0;
    function countFields(node) {
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (v && v.type) {
          totalFields++;
          if (v.children) countFields(v.children);
        } else if (typeof v === "object") {
          countFields(v);
        }
      }
    }
    countFields(fieldTree);

    results.success = true;
    results.fieldTree = fieldTree;
    results.rawFieldCount = totalFields;

    return Response.json(results, { status: 200 });
  } catch (err) {
    results.error = err.message;
    return Response.json(results, { status: 200 });
  }
}
