import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url, method, headers, body } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const fetchOptions = {
      method: method || 'GET',
      headers: {
        ...(headers || {}),
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, fetchOptions);
    const elapsed = Date.now() - startTime;

    // Read response
    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Collect response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
      time: elapsed,
      size: JSON.stringify(data).length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 0,
        statusText: 'Error',
        error: error.message,
        data: { error: error.message },
      },
      { status: 500 }
    );
  }
}
