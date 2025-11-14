import type { Metadata } from 'next'
import '../index.css'
import Providers from '@/app/providers'

export const metadata: Metadata = {
  title: 'Auction Hub',
  description: 'Hub Bid Nation - Auctions platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}


