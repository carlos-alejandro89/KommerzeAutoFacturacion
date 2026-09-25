import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatedApiFetch, readJson } from '../../../../../src/server/kommerzeApi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await authenticatedApiFetch('/catalogos/sat/usos-cfdi/get')
    const payload = await readJson(response)

    return NextResponse.json(
      payload || { success: false, mensaje: 'El catálogo de usos CFDI no devolvió una respuesta válida.' },
      { status: response.status },
    )
  } catch (error) {
    console.error('Error al consultar usos CFDI:', error)
    return NextResponse.json(
      { success: false, mensaje: 'No fue posible consultar los usos CFDI.' },
      { status: 500 },
    )
  }
}
