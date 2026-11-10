const DEFAULT_MAX_JSON_BYTES = 256 * 1024;

export function validateSameOrigin(request: Request): Response | null {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (fetchSite === 'cross-site') {
    return Response.json({ error: 'Cross-site requests are not allowed' }, { status: 403 });
  }

  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ error: 'Invalid request origin' }, { status: 403 });
      }
    } catch {
      return Response.json({ error: 'Invalid request origin' }, { status: 403 });
    }
  } else if (fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
    return Response.json({ error: 'Request origin could not be verified' }, { status: 403 });
  }

  return null;
}

export function validateJsonContent(request: Request, maxBytes = DEFAULT_MAX_JSON_BYTES): Response | null {
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

export async function readJsonBody(request: Request, maxBytes = DEFAULT_MAX_JSON_BYTES): Promise<
  { data: unknown; error: null } | { data: null; error: Response }
> {
  if (!request.body) return { data: null, error: Response.json({ error: 'Request body is required' }, { status: 400 }) };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { data: null, error: Response.json({ error: 'Request body is too large' }, { status: 413 }) };
      }
      chunks.push(value);
    }
  } catch {
    return { data: null, error: Response.json({ error: 'Unable to read request body' }, { status: 400 }) };
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { data: JSON.parse(new TextDecoder().decode(bytes)) as unknown, error: null };
  } catch {
    return { data: null, error: Response.json({ error: 'Malformed JSON body' }, { status: 400 }) };
  }
}
