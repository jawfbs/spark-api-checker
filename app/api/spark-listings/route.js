export const runtime = "edge";

// Mask check — treats ******* as blank
function isMasked(val) {
  if (val == null) return true;
  const s = String(val).trim();
  return s === "" || /^\*+$/.test(s);
}

function clean(val) {
  return isMasked(val) ? null : val;
}

function cleanNum(val) {
  if (isMasked(val)) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function normalize(item) {
  const s = item.StandardFields || item;
  const Id = clean(s.ListingId) ?? clean(s.Id) ?? "N/A";

  // Photos
  const photos = [];
  const rawPhotos = s.Photos ?? s.Media ?? [];
  if (Array.isArray(rawPhotos)) {
    for (const p of rawPhotos) {
      const uri =
        p?.Uri1280 ?? p?.Uri800 ?? p?.Uri640 ?? p?.Uri ?? p?.MediaURL ?? null;
      if (uri && !isMasked(uri)) photos.push(uri);
    }
  }

  return {
    listingId: Id,
    listingKey: clean(s.ListingKey) ?? Id,
    status: clean(s.StandardStatus) ?? clean(s.MlsStatus),
    price: cleanNum(s.ListPrice),
    address: clean(s.UnparsedAddress) ?? clean(s.StreetAddress),
    city: clean(s.City),
    state: clean(s.StateOrProvince),
    zip: clean(s.PostalCode),
    beds: cleanNum(s.BedsTotal) ?? cleanNum(s.Bedrooms),
    baths: cleanNum(s.BathsTotal) ?? cleanNum(s.Bathrooms),
    sqft: cleanNum(s.BuildingAreaTotal) ?? cleanNum(s.LivingArea),
    lotSize: cleanNum(s.LotSizeArea) ?? cleanNum(s.LotSizeSquareFeet),
    propertyType: clean(s.PropertyType),
    yearBuilt: cleanNum(s.YearBuilt),
    garage: cleanNum(s.GarageSpaces),
    lat: cleanNum(s.Latitude) ?? cleanNum(s.Lat),
    lng: cleanNum(s.Longitude) ?? cleanNum(s.Lng),
    remarks: clean(s.PublicRemarks),
    photos,
    agentName: clean(s.ListAgentFullName) ?? clean(s.ListAgentName),
    officeName: clean(s.ListOfficeName),
    listDate: clean(s.ListingContractDate),
    modDate: clean(s.ModificationTimestamp),
    daysOnMarket: cleanNum(s.DaysOnMarket),
    hoaFee: cleanNum(s.AssociationFee),
    taxes: cleanNum(s.TaxAnnualAmount),
    subdivision: clean(s.SubdivisionName),
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

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

  // --- Single listing detail mode ---
  const detailId = searchParams.get("listingKey");
  if (detailId) {
    try {
      const res = await fetch(
        `${baseUrl}/v1/listings/${detailId}`,
        { headers, cache: "no-store" }
      );
      if (!res.ok) {
        return Response.json({ error: `HTTP ${res.status}` });
      }
      const data = await res.json();
      const result = data?.D?.Results?.[0] ?? data?.D?.Results ?? null;
      if (!result) return Response.json({ error: "Listing not found." });
      return Response.json({ listing: normalize(result) });
    } catch (err) {
      return Response.json({ error: err.message });
    }
  }

  // --- List mode with filter, sort, pagination ---
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;
  const sortField = searchParams.get("sort") || "ListPrice";
  const sortDir = searchParams.get("dir") || "desc";
  const random = searchParams.get("random") === "true";

  // Build Spark filter string
  const filterParts = [];

  const city = searchParams.get("city");
  if (city && city !== "all") filterParts.push(`City Eq '${city}'`);

  const status = searchParams.get("status");
  if (status && status !== "all") filterParts.push(`StandardStatus Eq '${status}'`);

  const minPrice = searchParams.get("minPrice");
  if (minPrice) filterParts.push(`ListPrice Ge ${minPrice}`);

  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) filterParts.push(`ListPrice Le ${maxPrice}`);

  const minBeds = searchParams.get("minBeds");
  if (minBeds) filterParts.push(`BedsTotal Ge ${minBeds}`);

  const propType = searchParams.get("propertyType");
  if (propType && propType !== "all") filterParts.push(`PropertyType Eq '${propType}'`);

  // Fields to select
  const select = [
    "ListingId",
    "ListingKey",
    "StandardStatus",
    "MlsStatus",
    "ListPrice",
    "UnparsedAddress",
    "StreetAddress",
    "City",
    "StateOrProvince",
    "PostalCode",
    "BedsTotal",
    "BathsTotal",
    "BuildingAreaTotal",
    "LivingArea",
    "LotSizeArea",
    "PropertyType",
    "YearBuilt",
    "GarageSpaces",
    "Latitude",
    "Longitude",
    "PublicRemarks",
    "Photos",
    "ListAgentFullName",
    "ListOfficeName",
    "ListingContractDate",
    "ModificationTimestamp",
    "DaysOnMarket",
    "AssociationFee",
    "TaxAnnualAmount",
    "SubdivisionName",
  ].join(",");

  try {
    let actualPage = page;

    if (random) {
      // Fetch total first, pick random page
      const countRes = await fetch(
        `${baseUrl}/v1/listings?_limit=1&_select=ListingId${filterParts.length ? `&_filter=${encodeURIComponent(filterParts.join(" And "))}` : ""}`,
        { headers, cache: "no-store" }
      );
      const countData = await countRes.json();
      const total = countData?.D?.Pagination?.TotalRows ?? 0;
      const maxPage = Math.max(1, Math.floor(total / limit));
      actualPage = Math.floor(Math.random() * maxPage) + 1;
    }

    // Build sort param
    const sparkSort = sortDir === "asc" ? sortField : `-${sortField}`;

    let url = `${baseUrl}/v1/listings?_limit=${limit}&_page=${actualPage}&_select=${select}&_orderby=${sparkSort}`;
    if (filterParts.length) {
      url += `&_filter=${encodeURIComponent(filterParts.join(" And "))}`;
    }

    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `HTTP ${res.status}`, detail: text.substring(0, 300) });
    }

    const data = await res.json();
    const results = data?.D?.Results ?? [];
    const totalRows = data?.D?.Pagination?.TotalRows ?? 0;

    // Filter-by-only-fields-with-info option
    const onlyWithInfo = searchParams.get("onlyWithInfo") === "true";

    const listings = results
      .map(normalize)
      .filter((l) => {
        if (!onlyWithInfo) return true;
        // Must have at least price + address
        return l.price != null && l.address != null;
      });

    return Response.json({
      listings,
      totalRows,
      page: actualPage,
      totalPages: Math.ceil(totalRows / limit),
    });
  } catch (err) {
    return Response.json({ error: err.message });
  }
}
