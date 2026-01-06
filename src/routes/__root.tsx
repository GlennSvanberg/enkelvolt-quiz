import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router';
import appCssUrl from '../styles/app.css?url';
import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/tanstack-start';
import { ConvexClerkProvider } from '../providers/ConvexClerkProvider';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Enkelvolt - Quiz App',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCssUrl },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    scripts: [
      {
        src: 'https://www.trackaton.com/track.js',
        'data-website-id': 'jd7e3ygp3x5wd1yhjhspqqtj2x7ypkjy',
        'data-endpoint': 'https://resolute-orca-949.convex.site/api/e',
        async: true,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
});

function RootComponent() {
  return (
    <RootDocument>
      <AppProviders>
        <Outlet />
      </AppProviders>
    </RootDocument>
  );
}

function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const publishableKey = (import.meta as any).env
    .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

  // `src/router.tsx` puts this in `router.options.context`.
  // We intentionally read it here so Convex + Clerk use the same client instance.
  const convexClient = (router.options.context as any)?.convexClient as
    | Parameters<typeof ConvexClerkProvider>[0]['client']
    | undefined;

  if (!publishableKey) {
    return (
      <div style={{ padding: 16 }}>
        Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code>. Clerk authentication is
        not configured.
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      {convexClient ? (
        <ConvexClerkProvider client={convexClient}>{children}</ConvexClerkProvider>
      ) : (
        children
      )}
    </ClerkProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const shouldBeDark = stored === 'dark' || (!stored && prefersDark);
                if (shouldBeDark) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
