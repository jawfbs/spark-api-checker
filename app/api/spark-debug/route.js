export const runtime = "edge";

export async function GET() {
  const baseUrl =
    process.env.SPARK_API_BASE_URL || "https://replication.sparkapi.com";
  const token = process.env.SPARK_ACCESS_TOKEN || "";

  if (!token) {
    return Response.json({ error: "No token set" }, { status: 500 });
  }

  const results = {};

  /* ── Test 1: Basic listing call ── */
  try {
    const url1 = `${baseUrl}/v1/listings?_limit=1`;
    const res1 = await fetch(url1, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text1 = await res1.text();
    results.test1_basic = {
      status: res1.status,
      url: url1,
      body: text1.substring(0, 2000),
    };
  } catch (e) {
    results.test1_basic = { error: e.message };
  }

  /* ── Test 2: With _expand=Photos ── */
  try {
    const url2 = `${baseUrl}/v1/listings?_limit=1&_expand=Photos`;
    const res2 = await fetch(url2, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text2 = await res2.text();
    results.test2_photos = {
      status: res2.status,
      url: url2,
      body: text2.substring(0, 2000),
    };
  } catch (e) {
    results.test2_photos = { error: e.message };
  }

  /* ── Test 3: With _select fields ── */
  try {
    const url3 = `${baseUrl}/v1/listings?_limit=1&_select=ListingId,ListPrice,PublicRemarks,City,StateOrProvince,StreetAddress`;
    const res3 = await fetch(url3, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text3 = await res3.text();
    results.test3_select = {
      status: res3.status,
      url: url3,
      body: text3.substring(0, 2000),
    };
  } catch (e) {
    results.test3_select = { error: e.message };
  }

  /* ── Test 4: With _page pagination ── */
  try {
    const url4 = `${baseUrl}/v1/listings?_limit=10&_page=1&_expand=Photos`;
    const res4 = await fetch(url4, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text4 = await res4.text();
    results.test4_page = {
      status: res4.status,
      url: url4,
      body: text4.substring(0, 2000),
    };
  } catch (e) {
    results.test4_page = { error: e.message };
  }

  /* ── Test 5: RESO Web API style ── */
  try {
    const url5 = `${baseUrl}/Reso/OData/Property?$top=1`;
    const res5 = await fetch(url5, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text5 = await res5.text();
    results.test5_reso = {
      status: res5.status,
      url: url5,
      body: text5.substring(0, 2000),
    };
  } catch (e) {
    results.test5_reso = { error: e.message };
  }

  return Response.json(results, { status: 200 });
}
