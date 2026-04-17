import { NextResponse } from 'next/server';

const SPARK_API_URL = 'https://sparkapi.com';
const VERSION = 'v1'; // or v2 if your account uses v2

export async function GET(request: Request) {
  const token = process.env.SPARK_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'Missing SPARK_ACCESS_TOKEN' }, { status: 500 });
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

    const idxData = idxRes.ok ? await idxRes.json() : { error: 'Failed to load IDX Links' };
    const savedData = savedRes.ok ? await savedRes.json() : { error: 'Failed to load Saved Searches' };

    return NextResponse.json({
      success: true,
      idxLinks: idxData,
      savedSearches: savedData,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch IDX Links or Saved Searches' 
    }, { status: 500 });
  }
}
