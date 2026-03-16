export const runtime = "edge";

async function runTest(name: string, fn: () => Promise<{ pass: boolean; status: number | null; detail: string }>) {
  try { const r = await fn(); return { name, ...r }; }
  catch (err: any) { return { name, pass: false, status: null, detail: `Error: ${err.message}` }; }
}

export async function GET() {
  const baseUrl = process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "SparkFieldExplorer/1.0" };

  const tests = await Promise.all([
    runTest("1. Environment Variables", async () => {
      const hasToken = !!token;
      return { pass: hasToken, status: null, detail: `SPARK_ACCESS_TOKEN: ${hasToken ? "SET ✓" : "MISSING ✗"}\nSPARK_API_BASE_URL: ${baseUrl}\nToken preview: ${hasToken ? token.substring(0, 8) + "…" : "N/A"}` };
    }),
    runTest("2. DNS & Connectivity", async () => {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/v1/listings?_limit=1`, { headers, cache: "no-store" });
      return { pass: res.status < 500, status: res.status, detail: `HTTP ${res.status} in ${Date.now() - start}ms` };
    }),
    runTest("3. Authentication", async () => {
      const res = await fetch(`${baseUrl}/v1/listings?_limit=1`, { headers, cache: "no-store" });
      const body = await res.text();
      return { pass: res.status === 200, status: res.status, detail: res.status === 200 ? "Token accepted." : `Auth failed: HTTP ${res.status}\n${body.substring(0, 300)}` };
    }),
    runTest("4. Listing Access", async () => {
      const res = await fetch(`${baseUrl}/v1/listings?_limit=1&_select=ListingId,StandardStatus,ListPrice`, { headers, cache: "no-store" });
      if (!res.ok) return { pass: false, status: res.status, detail: `HTTP ${res.status}` };
      const data = await res.json();
      const results = data?.D?.Results ?? data?.value ?? [];
      const total = data?.D?.Pagination?.TotalRows ?? results.length;
      return { pass: results.length > 0, status: 200, detail: `Total listings: ${total}\nSample: ${JSON.stringify(results[0] ?? {}, null, 2).substring(0, 300)}` };
    }),
    runTest("5. Expansion Support (Photos)", async () => {
      const res = await fetch(`${baseUrl}/v1/listings?_limit=1&_expand=Photos`, { headers, cache: "no-store" });
      if (!res.ok) return { pass: false, status: res.status, detail: `HTTP ${res.status}` };
      const data = await res.json();
      const results = data?.D?.Results ?? data?.value ?? [];
      const photos = (results[0] ?? {}).Photos ?? [];
      return { pass: true, status: 200, detail: `Photos: ${photos.length > 0 ? photos.length + " found" : "None (endpoint responded)"}` };
    }),
  ]);

  return Response.json({ tests });
}
