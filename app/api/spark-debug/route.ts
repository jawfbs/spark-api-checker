export const runtime = "edge";

interface TestResult {
  name: string;
  pass: boolean;
  status: number | null;
  detail: string;
}

async function runTest(
  name: string,
  fn: () => Promise<{ pass: boolean; status: number | null; detail: string }>
): Promise<TestResult> {
  try {
    const result = await fn();
    return { name, ...result };
  } catch (err: any) {
    return { name, pass: false, status: null, detail: `Error: ${err.message}` };
  }
}

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "User-Agent": "SparkFieldExplorer/1.0",
  };

  const tests = await Promise.all([
    runTest("1. Environment Variables", async () => {
      const hasToken = !!token;
      const hasUrl = !!process.env.SPARK_API_BASE_URL;
      return {
        pass: hasToken,
        status: null,
        detail: [
          `SPARK_ACCESS_TOKEN: ${hasToken ? "SET ✓" : "MISSING ✗"}`,
          `SPARK_API_BASE_URL: ${hasUrl ? baseUrl : "(using default) " + baseUrl}`,
          `Token preview: ${hasToken ? token.substring(0, 8) + "…" : "N/A"}`,
        ].join("\n"),
      };
    }),

    runTest("2. DNS & Connectivity", async () => {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/v1/listings?_limit=1`, {
        headers,
        cache: "no-store",
      });
      const elapsed = Date.now() - start;
      return {
        pass: res.status < 500,
        status: res.status,
        detail: `Response: HTTP ${res.status} in ${elapsed}ms\nURL: ${baseUrl}/v1/listings?_limit=1`,
      };
    }),

    runTest("3. Authentication", async () => {
      const res = await fetch(`${baseUrl}/v1/listings?_limit=1`, {
        headers,
        cache: "no-store",
      });
      const body = await res.text();
      return {
        pass: res.status === 200,
        status: res.status,
        detail:
          res.status === 200
            ? "Token accepted. Authenticated successfully."
            : `Auth failed: HTTP ${res.status}\n${body.substring(0, 300)}`,
      };
    }),

    runTest("4. Listing Access", async () => {
      const res = await fetch(
        `${baseUrl}/v1/listings?_limit=1&_select=ListingId,StandardStatus,ListPrice`,
        { headers, cache: "no-store" }
      );
      if (!res.ok) {
        return {
          pass: false,
          status: res.status,
          detail: `Could not fetch listings: HTTP ${res.status}`,
        };
      }
      const data = await res.json();
      const results = data?.D?.Results ?? data?.value ?? [];
      const total = data?.D?.Pagination?.TotalRows ?? results.length;
      return {
        pass: results.length > 0,
        status: 200,
        detail: `Total listings available: ${total}\nSample: ${JSON.stringify(results[0] ?? {}, null, 2).substring(0, 300)}`,
      };
    }),

    runTest("5. Expansion Support (Photos)", async () => {
      const res = await fetch(
        `${baseUrl}/v1/listings?_limit=1&_expand=Photos`,
        { headers, cache: "no-store" }
      );
      if (!res.ok) {
        return {
          pass: false,
          status: res.status,
          detail: `Expansion request failed: HTTP ${res.status}`,
        };
      }
      const data = await res.json();
      const results = data?.D?.Results ?? data?.value ?? [];
      const listing = results[0] ?? {};
      const photos = listing.Photos ?? [];
      return {
        pass: true,
        status: 200,
        detail: `Photos expansion: ${photos.length > 0 ? `${photos.length} photos found` : "No photos (but endpoint responded)"}\nFirst photo: ${photos[0]?.Uri640 ?? photos[0]?.MediaURL ?? "N/A"}`,
      };
    }),
  ]);

  return Response.json({ tests });
}
