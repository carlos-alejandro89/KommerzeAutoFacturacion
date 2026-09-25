import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatedApiFetch, readJson } from '../../../../../../src/server/kommerzeApi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { rfc: rawRfc } = await params
    const rfc = decodeURIComponent(rawRfc || '')
      .trim()
      .replace(/[\s-]/g, '')
      .toUpperCase()

    if (![12, 13].includes(rfc.length)) {
      return NextResponse.json(
        { success: false, mensaje: 'El RFC debe contener 12 o 13 caracteres.' },
        { status: 400 },
      )
    }

    const response = await authenticatedApiFetch(
      `/clientes/entidad-fiscal/consultar/${encodeURIComponent(rfc)}`,
    )
    const payload = await readJson(response)

    return NextResponse.json(
      payload || { success: false, mensaje: 'La consulta de la entidad fiscal no devolvió una respuesta válida.' },
      { status: response.status },
    )
  } catch (error) {
    console.error('Error al consultar la entidad fiscal:', error)
    return NextResponse.json(
      { success: false, mensaje: 'No fue posible consultar la entidad fiscal.' },
      { status: 500 },
    )
  }
}
