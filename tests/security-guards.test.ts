import { describe, expect, it } from 'vitest';
import { validateJsonContent, validateSameOrigin } from '@/lib/security/request-guard';

function request(headers: Record<string, string>, url = 'https://nexa.example/api/chat') {
  return new Request(url, { method: 'POST', headers });
}

describe('request security guards', () => {
  it('rejects cross-site fetch metadata', () => {
    const response = validateSameOrigin(request({ 'sec-fetch-site': 'cross-site' }));
    expect(response?.status).toBe(403);
  });

  it('rejects a mismatched Origin header', () => {
    const response = validateSameOrigin(request({
      origin: 'https://attacker.example',
      'content-type': 'application/json',
    }));
    expect(response?.status).toBe(403);
  });

  it('accepts a matching Origin header', () => {
    const response = validateSameOrigin(request({
      origin: 'https://nexa.example',
      'content-type': 'application/json',
    }));
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
});
