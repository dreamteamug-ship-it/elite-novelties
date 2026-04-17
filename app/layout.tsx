import type { Metadata } from 'next'
import { Montserrat, Lato, Cormorant_Garamond } from 'next/font/google'
import './globals.css'

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' })
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '400', '600'], style: ['italic'], variable: '--font-cormorant' })

export const metadata: Metadata = {
  title: 'Elite Novelties | Luxury CashCloud Platform',
  description: 'Ultra-luxury wellness and mirror payment settlement.',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#0B1426',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${lato.variable} ${cormorant.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
