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

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "";
  const state = searchParams.get("state") || "";
  const zip = searchParams.get("zip") || "";
  const beds = searchParams.get("beds") || "";
  const baths = searchParams.get("baths") || "";
  const pool = searchParams.get("pool") === "true";
  const requestedPage = parseInt(searchParams.get("page") || "0", 10);
  const excludeIds = searchParams.get("exclude") || "";

  try {
    const filters = [];
    if (city) filters.push(`City Eq '${city}'`);
    if (state) filters.push(`StateOrProvince Eq '${state}'`);
    if (zip) filters.push(`PostalCode Eq '${zip}'`);
    if (beds) filters.push(`BedroomsTotal Ge ${parseInt(beds, 10)}`);
    if (baths) filters.push(`BathroomsTotalInteger Ge ${parseInt(baths, 10)}`);
    if (pool) filters.push(`PoolPrivateYN Eq true`);

    const filterStr = filters.length > 0 ? filters.join(" And ") : "";
    const page =
      requestedPage > 0
        ? requestedPage
        : Math.floor(Math.random() * 5) + 1;

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
      const d = await res.json();
      d._attempt = label;
      return d;
    };

    let data = null;

    if (filterStr) {
      const url1 =
        `${baseUrl}/v1/listings?_limit=24&_page=${page}` +
        `&_expand=Photos&_orderby=-ListPrice` +
        `&_filter=${encodeURIComponent(filterStr)}`;
      data = await tryFetch(url1, "filtered+photos");

      if (!data && pool) {
        const noPools = filters.filter((f) => !f.includes("PoolPrivateYN"));
        if (noPools.length > 0) {
          const url1b =
            `${baseUrl}/v1/listings?_limit=24&_page=${page}` +
            `&_expand=Photos&_orderby=-ListPrice` +
            `&_filter=${encodeURIComponent(noPools.join(" And "))}`;
          data = await tryFetch(url1b, "filtered-no-pool");
        }
      }
    }

    if (!data) {
      const url2 = `${baseUrl}/v1/listings?_limit=24&_page=${page}&_expand=Photos&_orderby=-ListPrice`;
      data = await tryFetch(url2, "no-filter+photos");
    }

    if (!data) {
      const url3 = `${baseUrl}/v1/listings?_limit=24&_page=1`;
      data = await tryFetch(url3, "bare-minimum");
    }

    if (!data) {
      return Response.json(
        { success: false, error: "All API attempts failed." },
        { status: 200 }
      );
    }

    const totalRows = data?.D?.Pagination?.TotalRows ?? 0;
    const totalPages = data?.D?.Pagination?.TotalPages ?? 1;
    const rawResults = data?.D?.Results ?? [];

    const excludeSet = new Set(
      excludeIds.split(",").map((s) => s.trim()).filter(Boolean)
    );

    const listings = rawResults
      .map((item) => {
        const sf = item.StandardFields || item;

        /* ── Collect ALL photo URLs ── */
        let rawPhotos = [];
        if (sf.Photos && Array.isArray(sf.Photos)) rawPhotos = sf.Photos;
        else if (item.Photos && Array.isArray(item.Photos)) rawPhotos = item.Photos;

        const allPhotos = rawPhotos
          .map((p) => ({
            url:
              p.Uri1024 ||
              p.Uri640 ||
              p.UriLarge ||
              p.Uri800 ||
              p.Uri300 ||
              p.UriThumb ||
              p.Uri ||
              null,
            caption: p.Caption || "",
            primary: p.Primary === true,
          }))
          .filter((p) => p.url !== null);

        /* Sort so primary is first */
        allPhotos.sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0));

        const photoUrl = allPhotos.length > 0 ? allPhotos[0].url : null;
        const photos = allPhotos.map((p) => p.url);

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
            sf.BathroomsTotalInteger ??
            sf.BathroomsFull ??
            sf.BathroomsTotalDecimal ??
            null,
          propertyType: sf.PropertyType || sf.PropertySubType || "",
          status: sf.StandardStatus || sf.MlsStatus || "",
          office: sf.ListOfficeName || "",
          pool:
            sf.PoolPrivateYN === true ||
            (sf.PoolFeatures && sf.PoolFeatures.length > 0),
          photoUrl,
          photos,
          yearBuilt: sf.YearBuilt || null,
          sqft: sf.BuildingAreaTotal || sf.LivingArea || null,
          lotSize: sf.LotSizeArea || sf.LotSizeAcres || null,
          garageSpaces: sf.GarageSpaces || null,
          hoaFee: sf.AssociationFee || null,
          stories: sf.StoriesTotal || sf.Stories || null,
          county: sf.CountyOrParish || null,
          subdivision: sf.SubdivisionName || null,
        };
      })
      .filter((l) => l.photoUrl !== null)
      .filter((l) => !excludeSet.has(l.listingId));

    return Response.json(
      {
        success: true,
        total: totalRows,
        totalPages,
        page,
        count: listings.length,
        listings,
        attempt: data._attempt || "",
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
