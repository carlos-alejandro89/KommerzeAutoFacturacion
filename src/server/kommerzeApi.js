import 'server-only'

let tokenCache = null

function getApiConfiguration() {
  const apiUrl = process.env.KOMMERZE_API_URL?.replace(/\/$/, '')
  const clientId = process.env.KOMMERZE_CLIENT_ID
  const clientSecret = process.env.KOMMERZE_CLIENT_SECRET

  if (!apiUrl || !clientId || !clientSecret) {
    throw new Error('El servidor de autofacturación no está configurado correctamente.')
  }

  return { apiUrl, clientId, clientSecret }
}

export async function readJson(response) {
  return response.json().catch(() => null)
}

async function getAccessToken(forceRefresh = false) {
  if (!forceRefresh && tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.value
  }

  const { apiUrl, clientId, clientSecret } = getApiConfiguration()
  const response = await fetch(`${apiUrl}/auth/client-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: 'no-store',
  })
  const payload = await readJson(response)

  if (!response.ok || !payload?.success || !payload?.data?.accessToken) {
    throw new Error(payload?.mensaje || 'No fue posible autenticar el servicio de autofacturación.')
  }

  tokenCache = {
    value: payload.data.accessToken,
    expiresAt: Date.now() + Math.max(0, payload.data.expiresIn - 60) * 1000,
  }

  return tokenCache.value
}

async function request(path, init, forceRefresh = false) {
  const { apiUrl } = getApiConfiguration()
  const token = await getAccessToken(forceRefresh)

  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
}

export async function authenticatedApiFetch(path, init = {}) {
  let response = await request(path, init)

  if (response.status === 401) {
    tokenCache = null
    response = await request(path, init, true)
  }

  return response
}
