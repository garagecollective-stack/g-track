const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
]

function getConfiguredOrigins(): string[] {
  const raw = Deno.env.get('APP_ALLOWED_ORIGINS') ?? Deno.env.get('SITE_URL') ?? ''

  const configured = raw
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured])]
}

export function getCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get('Origin') ?? ''
  const allowedOrigins = getConfiguredOrigins()
  const allowOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
