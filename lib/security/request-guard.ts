const MAX_JSON_BYTES = 256 * 1024;

export function validateSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite === 'cross-site') {
    return Response.json({ error: 'Cross-site requests are not allowed' }, { status: 403 });
  }

  if (origin) {
    try {
      const requestOrigin = new URL(request.url).origin;
      if (new URL(origin).origin !== requestOrigin) {
        return Response.json({ error: 'Invalid request origin' }, { status: 403 });
      }
    } catch {
      return Response.json({ error: 'Invalid request origin' }, { status: 403 });
    }
  } else if (fetchSite === 'same-origin' || fetchSite === 'same-site') {
    // Modern browsers can omit Origin for some same-origin requests.
  } else {
    return Response.json({ error: 'Request origin could not be verified' }, { status: 403 });
  }

  return null;
}

export function validateJsonContent(request: Request, maxBytes = MAX_JSON_BYTES): Response | null {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return Response.json({ error: 'Content-Type must be application/json' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return Response.json({ error: 'Request body is too large' }, { status: 413 });
  }
  return null;
}

export function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}
