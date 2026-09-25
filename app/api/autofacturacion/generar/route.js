import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatedApiFetch, readJson } from '../../../../src/server/kommerzeApi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cleanText = (value) => String(value || '').trim()

export async function POST(request) {
  try {
    const body = await request.json()
    const folio = Number(body?.folio)
    const usoCfdiId = Number(body?.usoCfdiId)
    const entidadFiscalId = body?.entidadFiscalId == null ? null : Number(body.entidadFiscalId)
    const entidadFiscal = body?.entidadFiscal
      ? {
          regimenId: Number(body.entidadFiscal.regimenId),
          razonSocial: cleanText(body.entidadFiscal.razonSocial),
          rfc: cleanText(body.entidadFiscal.rfc).replace(/[\s-]/g, '').toUpperCase(),
          codigoPostal: cleanText(body.entidadFiscal.codigoPostal),
          correo: cleanText(body.entidadFiscal.correo),
          telefono: cleanText(body.entidadFiscal.telefono) || null,
          whatsapp: cleanText(body.entidadFiscal.whatsapp) || null,
        }
      : null

    const invalidExistingEntity = entidadFiscalId != null && (!Number.isInteger(entidadFiscalId) || entidadFiscalId <= 0)
    const correo = cleanText(body?.correo)
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    const invalidNewEntity = entidadFiscal && (
      !Number.isInteger(entidadFiscal.regimenId) || entidadFiscal.regimenId <= 0 ||
      !entidadFiscal.razonSocial || ![12, 13].includes(entidadFiscal.rfc.length) ||
      !entidadFiscal.codigoPostal || entidadFiscal.razonSocial.length > 250 ||
      entidadFiscal.codigoPostal.length > 10
    )

    if (
      !Number.isInteger(folio) || folio <= 0 ||
      !cleanText(body?.codigoFacturacion) ||
      !Number.isInteger(usoCfdiId) || usoCfdiId <= 0 ||
      !validEmail || correo.length > 254 ||
      invalidExistingEntity || invalidNewEntity ||
      ((entidadFiscalId != null) === Boolean(entidadFiscal))
    ) {
      return NextResponse.json(
        { success: false, mensaje: 'Los datos requeridos para generar la factura están incompletos.' },
        { status: 400 },
      )
    }

    const response = await authenticatedApiFetch('/autofacturacion/generar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folio,
        codigoFacturacion: cleanText(body.codigoFacturacion),
        usoCfdiId,
        entidadFiscalId,
        entidadFiscal,
        correo,
      }),
    })
    const payload = await readJson(response)

    return NextResponse.json(
      payload || { success: false, mensaje: 'El servicio de facturación no devolvió una respuesta válida.' },
      { status: response.status },
    )
  } catch (error) {
    console.error('Error al generar la factura:', error)
    return NextResponse.json(
      { success: false, mensaje: 'No fue posible generar la factura en este momento.' },
      { status: 500 },
    )
  }
}
