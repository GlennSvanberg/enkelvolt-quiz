import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexProvider } from 'convex/react'
import { ClerkProvider, useAuth } from '@clerk/tanstack-start'
import {  useEffect } from 'react'
import { routeTree } from './routeTree.gen'
import type {ReactNode} from 'react';

function ConvexClerkProvider({
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
      const template = ((import.meta as any).env.VITE_CLERK_JWT_TEMPLATE as
        | string
        | undefined) ?? 'convex'

      client.setAuth(async () => {
        const token = await getToken({ template })
        return token ?? null
      })
    }
  }, [client, getToken, isSignedIn])

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}

export function getRouter() {
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  const convexQueryClient = new ConvexQueryClient(CONVEX_URL)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        gcTime: 5000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0, // Let React Query handle all caching
      defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
      defaultNotFoundComponent: () => <p>not found</p>,
      Wrap: ({ children }) => (
        <ClerkProvider
          publishableKey={(import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY}
          afterSignOutUrl="/"
        >
          <ConvexClerkProvider client={convexQueryClient.convexClient}>
            {children}
          </ConvexClerkProvider>
        </ClerkProvider>
      ),
    }) as any,
    queryClient,
  )

  return router
}
