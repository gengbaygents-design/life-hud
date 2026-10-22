import { describe, expect, it, vi } from 'vitest';
import { presentDocumentError } from '../src/lib/document-error-response';
describe('failed document presentation', () => {
  it.each([500, 503])('keeps HTTP %i and renders retry HTML without exception details', async status => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const request = new Request('http://localhost/app?context=keep', { headers: { Accept: 'text/html' } });
    const response = await presentDocumentError(request, Response.json({ unhandled: true, message: 'HTTPError', stack: 'PRIVATE_TECHNICAL_DETAIL' }, { status, headers: { 'Retry-After': '2' } }));
    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('2');
    const body = await response.text();
    expect(body).toContain('暂时没能载入这里。');
    expect(body).toContain('重试');
    expect(body).not.toContain('HTTPError');
    expect(body).not.toContain('PRIVATE_TECHNICAL_DETAIL');
  });
  it.each([401, 403, 200])('does not alter status %i or its response', async status => {
    const response = Response.json({ message: 'original' }, { status });
    expect(await presentDocumentError(new Request('http://localhost/app', { headers: { Accept: 'text/html' } }), response)).toBe(response);
  });
  it('leaves failed API/server-function JSON and non-GET requests unchanged', async () => {
    for (const init of [{ headers: { Accept: 'application/json' } }, { method: 'POST', headers: { Accept: 'text/html' } }]) {
      const response = Response.json({ unhandled: true, message: 'HTTPError' }, { status: 500 });
      expect(await presentDocumentError(new Request('http://localhost/_server/example', init), response)).toBe(response);
      expect(await response.json()).toEqual({ unhandled: true, message: 'HTTPError' });
    }
  });
});
