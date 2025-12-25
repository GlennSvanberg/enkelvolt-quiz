import { ConvexProvider } from 'convex/react'
import { useAuth } from '@clerk/tanstack-start'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ConvexQueryClient } from '@convex-dev/react-query'

export function ConvexClerkProvider({
  client,
  children,
}: {
  client: ConvexQueryClient['convexClient']
  children: ReactNode
}) {
  const { isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (isSignedIn === false) {
      client.clearAuth()
      return
    }

    if (isSignedIn === true) {
      const template =
        ((import.meta as any).env.VITE_CLERK_JWT_TEMPLATE as string | undefined) ??
        'convex'

      client.setAuth(async () => {
        const token = await getToken({ template })
        return token ?? null
      })
    }
  }, [client, getToken, isSignedIn])

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
