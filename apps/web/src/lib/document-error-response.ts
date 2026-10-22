const errorDocument = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIFE HUD · 暂时无法载入</title></head><body style="margin:0;background:#090f19;color:#e8eef6;font-family:system-ui,'Microsoft YaHei',sans-serif;line-height:1.8"><main style="padding:24px;max-width:640px;margin:15vh auto"><p>LIFE HUD</p><h1 style="font-size:24px">暂时没能载入这里。</h1><p>本地服务未能完成请求。请确认服务恢复后重试。</p><p><a href="" style="display:inline-block;padding:12px;color:#a2ccee">重试</a> <a href="/" style="display:inline-block;padding:12px;color:#a2ccee">返回入口</a></p></main></body></html>`;

// This is presentation of a failed HTML document, never conversion to success.
// API/server-function requests keep their original response and authorization.
export async function presentDocumentError(
  request: Request,
  response: Response,
): Promise<Response> {
  const documentRequest =
    request.method === 'GET' &&
    (request.headers.get('sec-fetch-dest') === 'document' ||
      request.headers.get('accept')?.includes('text/html'));
  if (
    !documentRequest ||
    response.status < 500 ||
    !response.headers.get('content-type')?.includes('application/json')
  )
    return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  headers.delete('Content-Length');
  // The framework has logged the exception; record the document route/status too.
  console.error('[LIFE HUD] Document load failed', {
    path: new URL(request.url).pathname,
    status: response.status,
  });
  await response.body?.cancel();
  return new Response(errorDocument, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
