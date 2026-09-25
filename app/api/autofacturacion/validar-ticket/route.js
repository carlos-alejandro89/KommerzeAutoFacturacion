import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatedApiFetch, readJson } from '../../../../src/server/kommerzeApi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function validateTicket(body) {
  return authenticatedApiFetch('/autofacturacion/validar-ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const folio = Number(body?.folio)
    const codigoFacturacion = String(body?.codigoFacturacion || '').trim()

    if (!Number.isInteger(folio) || folio <= 0 || !codigoFacturacion) {
      return NextResponse.json(
        { success: false, mensaje: 'El folio y el código de facturación son obligatorios.' },
        { status: 400 },
      )
    }

    const response = await validateTicket({ folio, codigoFacturacion })

    const payload = await readJson(response)
    return NextResponse.json(
      payload || { success: false, mensaje: 'El servicio de autofacturación no devolvió una respuesta válida.' },
      { status: response.status },
    )
  } catch (error) {
    console.error('Error al validar el ticket de autofacturación:', error)
    return NextResponse.json(
      { success: false, mensaje: 'No fue posible validar el ticket en este momento.' },
      { status: 500 },
    )
  }
}
