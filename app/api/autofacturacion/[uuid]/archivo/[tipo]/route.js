import 'server-only'
import { NextResponse } from 'next/server'
import { authenticatedApiFetch, readJson } from '../../../../../../src/server/kommerzeApi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { uuid: rawUuid, tipo: rawTipo } = await params
    const uuid = String(rawUuid || '').trim()
    const tipo = String(rawTipo || '').trim().toLowerCase()
    if (!/^[a-fA-F0-9-]{36}$/.test(uuid) || !['pdf', 'xml'].includes(tipo)) {
      return NextResponse.json(
        { success: false, mensaje: 'El archivo solicitado no es válido.' },
        { status: 400 },
      )
    }

    const response = await authenticatedApiFetch(
      `/autofacturacion/${encodeURIComponent(uuid)}/archivo/${tipo}`,
    )
    if (!response.ok) {
      const payload = await readJson(response)
      return NextResponse.json(
        payload || { success: false, mensaje: 'El archivo solicitado no está disponible.' },
        { status: response.status },
      )
    }

    return new Response(await response.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || (tipo === 'pdf' ? 'application/pdf' : 'application/xml'),
        'Content-Disposition': response.headers.get('content-disposition') || `attachment; filename="CFDI-${uuid}.${tipo}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error al descargar un archivo de autofacturación:', error)
    return NextResponse.json(
      { success: false, mensaje: 'No fue posible descargar el archivo en este momento.' },
      { status: 500 },
    )
  }
}
