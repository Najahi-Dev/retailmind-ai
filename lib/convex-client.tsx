'use client'

import { ReactNode } from 'react'
import { ConvexReactClient, ConvexProvider } from 'convex/react'
import { AuthProvider } from '@/lib/auth-context'
import { OrgProvider } from '@/lib/org-context'

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error('Missing NEXT_PUBLIC_CONVEX_URL in your .env file')
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        <OrgProvider>
          {children}
        </OrgProvider>
      </AuthProvider>
    </ConvexProvider>
  )
}