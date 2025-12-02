// Netlify Function: YouTube Search Proxy
// Reads API key from environment variable youtube_API (set in Netlify dashboard)

exports.handler = async (event) => {
  const { queryStringParameters } = event;
  const q = (queryStringParameters?.q || "").toString().trim();
  const max = Math.min(parseInt(queryStringParameters?.max || "6", 10) || 6, 12);

  if (!process.env.youtube_API) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Server missing youtube_API' }),
    };
  }
  if (!q) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Missing query parameter q' }),
    };
  }

  const params = new URLSearchParams({
    key: process.env.youtube_API,
    part: 'snippet',
    q,
    type: 'video',
    maxResults: String(max),
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    order: 'relevance',
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;

  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Upstream error', status: res.status, body: text }),
      };
    }
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=60',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Request failed', message: String(err && err.message || err) }),
    };
  }
};
