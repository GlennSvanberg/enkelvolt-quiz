import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import appCssUrl from '../styles/app.css?url';
import type { ReactNode } from 'react';

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
      <Outlet />
    </RootDocument>
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
