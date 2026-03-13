export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      { success: false, error: "SPARK_ACCESS_TOKEN not set." },
      { status: 500 }
    );
  }

  try {
    /* ──────────────────────────────────────
       1. Fetch listings WITH photos
       ────────────────────────────────────── */
    const page = Math.floor(Math.random() * 5) + 1;

    const listingsUrl =
      `${baseUrl}/v1/listings?_limit=10&_page=${page}` +
      `&_expand=Photos` +
      `&_orderby=-ListPrice` +
      `&_filter=MlsStatus Eq 'Active' Or StandardStatus Eq 'Active'`;

    const listingsRes = await fetch(listingsUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "SparkAPIChecker/1.0",
      },
      cache: "no-store",
    });

    /* ── If filter fails, try without filter ── */
    let data;
    if (!listingsRes.ok) {
      const fallbackUrl =
        `${baseUrl}/v1/listings?_limit=10&_page=${page}&_expand=Photos`;

      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "SparkAPIChecker/1.0",
        },
        cache: "no-store",
      });

      if (!fallbackRes.ok) {
        /* ── Last resort: no expand, no filter ── */
        const basicUrl = `${baseUrl}/v1/listings?_limit=10&_page=1`;

        const basicRes = await fetch(basicUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "User-Agent": "SparkAPIChecker/1.0",
          },
          cache: "no-store",
        });

        if (!basicRes.ok) {
          const errText = await basicRes.text();
          return Response.json(
            {
              success: false,
              error: `All attempts failed. HTTP ${basicRes.status}`,
              detail: errText.substring(0, 500),
            },
            { status: 200 }
          );
        }

        data = await basicRes.json();
      } else {
        data = await fallbackRes.json();
      }
    } else {
      data = await listingsRes.json();
    }

    /* ──────────────────────────────────────
       2. Parse the response
       ────────────────────────────────────── */
    const totalRows = data?.D?.Pagination?.TotalRows ?? 0;
    const rawResults = data?.D?.Results ?? [];

    if (rawResults.length === 0) {
      return Response.json(
        {
          success: false,
          error: "Spark returned 0 listings.",
          detail: JSON.stringify(data).substring(0, 500),
        },
        { status: 200 }
      );
    }

    /* ──────────────────────────────────────
       3. Map to clean objects
       ────────────────────────────────────── */
    const listings = rawResults.map((item) => {
      const sf = item.StandardFields || item;

      let photos = [];
      if (sf.Photos && Array.isArray(sf.Photos)) {
        photos = sf.Photos;
      } else if (item.Photos && Array.isArray(item.Photos)) {
        photos = item.Photos;
      }

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
          sf.PublicRemarks ||
          sf.SyndicationRemarks ||
          "No description available.",
        city: sf.City || "",
        state: sf.StateOrProvince || "",
        address: address,
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
        photoUrl: photoUrl,
      };
    });

    return Response.json(
      {
        success: true,
        total: totalRows,
        page: page,
        count: listings.length,
        listings,
      },
      { status: 200 }
    );
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: "Fetch error calling Spark API.",
        detail: err.message,
      },
      { status: 200 }
    );
  }
}
