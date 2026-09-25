async function readResponse(response) {
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.success) {
    throw new Error(body?.mensaje || 'No fue posible completar la solicitud.')
  }

  return {
    ...body.data,
    mensaje: body.mensaje || body.data?.mensaje,
  }
}

export async function validarTicketFacturacion(folio, codigoFacturacion) {
  const response = await fetch('/api/autofacturacion/validar-ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ folio: Number(folio), codigoFacturacion }),
  })

  return readResponse(response)
}

export async function generarFactura(payload) {
  const response = await fetch('/api/autofacturacion/generar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return readResponse(response)
}

async function obtenerCatalogo(url) {
  const response = await fetch(url, { cache: 'no-store' })
  const body = await response.json().catch(() => null)

  if (!response.ok || !body?.success || !Array.isArray(body?.data)) {
    throw new Error(body?.mensaje || 'No fue posible consultar el catálogo.')
  }

  return body.data
}

export function obtenerRegimenesFiscales() {
  return obtenerCatalogo('/api/catalogos/sat/regimen-fiscal')
}

export function obtenerUsosCfdi() {
  return obtenerCatalogo('/api/catalogos/sat/usos-cfdi')
}

export async function consultarEntidadFiscal(rfc, signal) {
  const response = await fetch(
    `/api/clientes/entidad-fiscal/consultar/${encodeURIComponent(rfc)}`,
    { cache: 'no-store', signal },
  )
  const body = await response.json().catch(() => null)

  if (response.status === 404 || (!body?.success && !body?.data && response.ok)) {
    return null
  }

  if (!response.ok || !body?.success) {
    throw new Error(body?.mensaje || 'No fue posible consultar la entidad fiscal.')
  }

  return body.data || null
}
