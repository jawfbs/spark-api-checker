export const runtime = "edge";

export async function GET(request) {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      { success: false, error: "SPARK_ACCESS_TOKEN not set." },
      { status: 500 }
    );
  }

  /* ── Read query params ── */
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "";
  const state = searchParams.get("state") || "";
  const zip = searchParams.get("zip") || "";
  const beds = searchParams.get("beds") || "";
  const baths = searchParams.get("baths") || "";
  const pool = searchParams.get("pool") === "true";
  const requestedPage = parseInt(searchParams.get("page") || "0", 10);

  try {
    /* ── Build filter ── */
    const filters = [];

    if (city) filters.push(`City Eq '${city}'`);
    if (state) filters.push(`StateOrProvince Eq '${state}'`);
    if (zip) filters.push(`PostalCode Eq '${zip}'`);
    if (beds) filters.push(`BedroomsTotal Ge ${parseInt(beds, 10)}`);
    if (baths) filters.push(`BathroomsTotalInteger Ge ${parseInt(baths, 10)}`);
    if (pool) filters.push(`PoolPrivateYN Eq true`);

    const filterStr = filters.length > 0 ? filters.join(" And ") : "";

    /* ── Determine page ── */
    const page = requestedPage > 0 ? requestedPage : Math.floor(Math.random() * 5) + 1;

    /* ── Attempt 1: Full filter + photos ── */
    let data = null;
    let attempt = "";

    const tryFetch = async (url, label) => {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "SparkAPIChecker/1.0",
        },
        cache: "no-store",
      });
      if (!res.ok) return null;
      attempt = label;
      return res.json();
    };

    /* Try with filter */
    if (filterStr) {
      const url1 =
        `${baseUrl}/v1/listings?_limit=10&_page=${page}` +
        `&_expand=Photos&_orderby=-ListPrice` +
        `&_filter=${encodeURIComponent(filterStr)}`;
      data = await tryFetch(url1, "filtered+photos");

      /* If pool filter broke it, retry without pool */
      if (!data && pool) {
        const filtersNoPool = filters.filter((f) => !f.includes("PoolPrivateYN"));
        if (filtersNoPool.length > 0) {
          const url1b =
            `${baseUrl}/v1/listings?_limit=10&_page=${page}` +
            `&_expand=Photos&_orderby=-ListPrice` +
            `&_filter=${encodeURIComponent(filtersNoPool.join(" And "))}`;
          data = await tryFetch(url1b, "filtered-no-pool+photos");
        }
      }
    }

    /* Try without filter */
    if (!data) {
      const url2 =
        `${baseUrl}/v1/listings?_limit=10&_page=${page}&_expand=Photos&_orderby=-ListPrice`;
      data = await tryFetch(url2, "no-filter+photos");
    }

    /* Try bare minimum */
    if (!data) {
      const url3 = `${baseUrl}/v1/listings?_limit=10&_page=1`;
      data = await tryFetch(url3, "bare-minimum");
    }

    if (!data) {
      return Response.json(
        { success: false, error: "All API attempts failed." },
        { status: 200 }
      );
    }

    /* ── Parse ── */
    const totalRows = data?.D?.Pagination?.TotalRows ?? 0;
    const totalPages = data?.D?.Pagination?.TotalPages ?? 1;
    const rawResults = data?.D?.Results ?? [];

    if (rawResults.length === 0) {
      return Response.json(
        {
          success: true,
          total: 0,
          totalPages: 0,
          page: page,
          count: 0,
          listings: [],
          attempt,
          filtersApplied: filterStr || "none",
        },
        { status: 200 }
      );
    }

    /* ── Map to clean objects ── */
    const listings = rawResults.map((item) => {
      const sf = item.StandardFields || item;

      let photos = [];
      if (sf.Photos && Array.isArray(sf.Photos)) photos = sf.Photos;
      else if (item.Photos && Array.isArray(item.Photos)) photos = item.Photos;

      let photoUrl = null;
      if (photos.length > 0) {
        const primary = photos.find((p) => p.Primary === true) || photos[0];
        photoUrl =
          primary.Uri640 ||
          primary.Uri300 ||
          primary.Uri1024 ||
          primary.UriLarge ||
          primary.Uri800 ||
          primary.UriThumb ||
          primary.Uri ||
          null;
      }

      const address =
        sf.UnparsedFirstLineAddress ||
        sf.StreetAddress ||
        sf.UnparsedAddress ||
        [sf.StreetNumber, sf.StreetDirPrefix, sf.StreetName, sf.StreetSuffix]
          .filter(Boolean)
          .join(" ") ||
        "";

      return {
        listingId: sf.ListingId || sf.ListingKey || "N/A",
        price: sf.ListPrice ?? sf.CurrentPrice ?? null,
        description:
          sf.PublicRemarks || sf.SyndicationRemarks || "No description available.",
        city: sf.City || "",
        state: sf.StateOrProvince || "",
        address,
        postalCode: sf.PostalCode || "",
        bedrooms: sf.BedroomsTotal ?? sf.Bedrooms ?? null,
        bathrooms:
          sf.BathroomsTotalInteger ?? sf.BathroomsFull ?? sf.BathroomsTotalDecimal ?? null,
        propertyType: sf.PropertyType || sf.PropertySubType || "",
        status: sf.StandardStatus || sf.MlsStatus || "",
        office: sf.ListOfficeName || "",
        pool: sf.PoolPrivateYN === true || (sf.PoolFeatures && sf.PoolFeatures.length > 0),
        photoUrl,
      };
    });

    return Response.json(
      {
        success: true,
        total: totalRows,
        totalPages,
        page,
        count: listings.length,
        listings,
        attempt,
        filtersApplied: filterStr || "none",
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: "Fetch error.", detail: err.message },
      { status: 200 }
    );
  }
}
