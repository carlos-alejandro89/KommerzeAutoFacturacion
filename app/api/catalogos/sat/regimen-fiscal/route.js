import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatedApiFetch, readJson } from '../../../../../src/server/kommerzeApi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await authenticatedApiFetch('/catalogos/sat/regimen-fiscal/get')
    const payload = await readJson(response)

    return NextResponse.json(
      payload || { success: false, mensaje: 'El catálogo de regímenes fiscales no devolvió una respuesta válida.' },
      { status: response.status },
    )
  } catch (error) {
    console.error('Error al consultar regímenes fiscales:', error)
    return NextResponse.json(
      { success: false, mensaje: 'No fue posible consultar los regímenes fiscales.' },
      { status: 500 },
    )
  }
}
