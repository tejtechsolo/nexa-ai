import { describe, expect, it } from 'vitest';
import { readJsonBody, validateJsonContent, validateSameOrigin } from '@/lib/security/request-guard';

function request(headers: Record<string, string>, body = '{"ok":true}', url = 'https://nexa.example/api/chat') {
  return new Request(url, { method: 'POST', headers, body });
}

describe('request security guards', () => {
  it('rejects cross-site fetch metadata', () => {
    const response = validateSameOrigin(request({ 'sec-fetch-site': 'cross-site' }));
    expect(response?.status).toBe(403);
  });

  it('rejects a mismatched Origin header', () => {
    const response = validateSameOrigin(request({ origin: 'https://attacker.example' }));
    expect(response?.status).toBe(403);
  });

  it('accepts a matching Origin header', () => {
    const response = validateSameOrigin(request({ origin: 'https://nexa.example' }));
    expect(response).toBeNull();
  });

  it('rejects non-JSON mutation requests', () => {
    const response = validateJsonContent(request({ 'content-type': 'text/plain' }));
    expect(response?.status).toBe(415);
  });

  it('rejects oversized declared bodies', () => {
    const response = validateJsonContent(request({
      'content-type': 'application/json',
      'content-length': '9000',
    }), 4096);
    expect(response?.status).toBe(413);
  });

  it('parses a bounded JSON body', async () => {
    const result = await readJsonBody(request({ 'content-type': 'application/json' }), 4096);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ ok: true });
  });

  it('rejects a body that exceeds the streaming byte limit', async () => {
    const result = await readJsonBody(request({ 'content-type': 'application/json' }, JSON.stringify({ value: 'x'.repeat(100) })), 16);
    expect(result.error?.status).toBe(413);
  });
});
