// app/api/spark-test/route.js

export const runtime = "edge";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "test"; // "test" or "listings"

  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json(
      {
        connected: false,
        error: "SPARK_ACCESS_TOKEN environment variable is not set.",
      },
      { status: 500 }
    );
  }

  /* ── MODE: test — quick connectivity check ── */
  if (mode === "test") {
    try {
      const url = `${baseUrl}/v1/listings?_limit=1&_select=ListingId`;
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
      const totalRows = data?.D?.Pagination?.TotalRows ?? 0;

      return Response.json(
        { connected: true, message: "Success", totalListings: totalRows },
        { status: 200 }
      );
    } catch (err) {
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

  /* ── MODE: listings — fetch 10 random listings ── */
  if (mode === "listings") {
    try {
      // Step 1: Get total count
      const countUrl = `${baseUrl}/v1/listings?_limit=1&_select=ListingId`;
      const countRes = await fetch(countUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "SparkAPIChecker/1.0",
        },
        cache: "no-store",
      });

      if (!countRes.ok) {
        const text = await countRes.text();
        return Response.json(
          {
            connected: false,
            error: `Spark API returned HTTP ${countRes.status}`,
            detail: text.substring(0, 500),
          },
          { status: 200 }
        );
      }

      const countData = await countRes.json();
      const totalRows = countData?.D?.Pagination?.TotalRows ?? 0;

      if (totalRows === 0) {
        return Response.json(
          { connected: true, listings: [], totalListings: 0 },
          { status: 200 }
        );
      }

      // Step 2: Pick a random page offset
      const perPage = 10;
      const maxPage = Math.max(1, Math.floor(totalRows / perPage));
      const randomPage = Math.floor(Math.random() * maxPage) + 1;

      // Step 3: Fetch 10 listings from that random page
      const fields = [
        "ListingId",
        "StandardStatus",
        "ListPrice",
        "UnparsedAddress",
        "City",
        "StateOrProvince",
        "PostalCode",
        "BedsTotal",
        "BathsTotal",
        "BuildingAreaTotal",
        "ListingKey",
        "PropertyType",
        "PublicRemarks",
      ].join(",");

      const listUrl = `${baseUrl}/v1/listings?_limit=${perPage}&_page=${randomPage}&_select=${fields}`;

      const listRes = await fetch(listUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "User-Agent": "SparkAPIChecker/1.0",
        },
        cache: "no-store",
      });

      if (!listRes.ok) {
        const text = await listRes.text();
        return Response.json(
          {
            connected: false,
            error: `Spark API returned HTTP ${listRes.status}`,
            detail: text.substring(0, 500),
          },
          { status: 200 }
        );
      }

      const listData = await listRes.json();
      const results = listData?.D?.Results ?? [];

      // Normalize the listing objects
      const listings = results.map((item) => {
        const s = item.StandardFields || item;
        return {
          listingId: s.ListingId ?? s.Id ?? "N/A",
          listingKey: s.ListingKey ?? "",
          status: s.StandardStatus ?? s.MlsStatus ?? "Unknown",
          price: s.ListPrice ?? null,
          address: s.UnparsedAddress ?? s.StreetAddress ?? "",
          city: s.City ?? "",
          state: s.StateOrProvince ?? "",
          zip: s.PostalCode ?? "",
          beds: s.BedsTotal ?? s.Bedrooms ?? null,
          baths: s.BathsTotal ?? s.Bathrooms ?? null,
          sqft: s.BuildingAreaTotal ?? s.LivingArea ?? null,
          propertyType: s.PropertyType ?? "",
          remarks:
            (s.PublicRemarks ?? "").substring(0, 200) +
            ((s.PublicRemarks ?? "").length > 200 ? "…" : ""),
        };
      });

      return Response.json(
        {
          connected: true,
          listings,
          totalListings: totalRows,
          page: randomPage,
          maxPage,
        },
        { status: 200 }
      );
    } catch (err) {
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

  return Response.json({ error: "Invalid mode parameter." }, { status: 400 });
}
