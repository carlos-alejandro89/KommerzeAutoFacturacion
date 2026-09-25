import '../src/index.css'

export const metadata = {
  title: 'Autofacturación | Sayer',
  description: 'Genera tu factura Sayer de forma rápida, sencilla y segura.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
