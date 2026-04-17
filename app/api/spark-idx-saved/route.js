// app/api/spark-idx-saved/route.js
import { NextResponse } from 'next/server';

const SPARK_API_URL = 'https://sparkapi.com';
const VERSION = 'v1';   // Use 'v2' only if your Spark account requires v2

export async function GET() {
  const token = process.env.SPARK_ACCESS_TOKEN;

  if (!token) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing SPARK_ACCESS_TOKEN in .env.local' 
    }, { status: 500 });
  }

  try {
    // Fetch all IDX Links
    const idxRes = await fetch(`${SPARK_API_URL}/${VERSION}/idxlinks`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    // Fetch Saved Searches (current user)
    const savedRes = await fetch(`${SPARK_API_URL}/${VERSION}/savedsearches`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    let idxData = null;
    let savedData = null;

    if (idxRes.ok) {
      idxData = await idxRes.json();
    } else {
      console.error('IDX Links failed:', idxRes.status);
    }

    if (savedRes.ok) {
      savedData = await savedRes.json();
    } else {
      console.error('Saved Searches failed:', savedRes.status);
    }

    return NextResponse.json({
      success: true,
      idxLinks: idxData || [],
      savedSearches: savedData || [],
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Spark IDX/Saved error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch from Spark API. Check token and network.' 
    }, { status: 500 });
  }
}
