import { NextResponse } from 'next/server';

const SPARK_API_URL = 'https://sparkapi.com';
const VERSION = 'v1';   // change to 'v2' only if your account requires it

export async function GET() {
  const token = process.env.SPARK_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'Missing SPARK_ACCESS_TOKEN in environment variables' }, { status: 500 });
  }

  try {
    // Fetch IDX Links
    const idxRes = await fetch(`${SPARK_API_URL}/${VERSION}/idxlinks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    // Fetch Saved Searches
    const savedRes = await fetch(`${SPARK_API_URL}/${VERSION}/savedsearches`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const idxData = idxRes.ok ? await idxRes.json() : null;
    const savedData = savedRes.ok ? await savedRes.json() : null;

    return NextResponse.json({
      success: true,
      idxLinks: idxData || { error: 'Failed to load IDX Links' },
      savedSearches: savedData || { error: 'Failed to load Saved Searches' },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch from Spark API' 
    }, { status: 500 });
  }
}
