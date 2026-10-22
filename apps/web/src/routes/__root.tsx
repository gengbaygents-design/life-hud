/// <reference types="vite/client" />
import { QueryClientProvider } from '@tanstack/react-query';

import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router';

import type { ReactNode } from 'react';

import '@/globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import queryClient from '@/query-client';
import { LimProvider } from '@/components/shell/lim-state';
import { LimOverlay } from '@/components/shell/lim-overlay';
import { RouteLoadError } from '@/components/route-load-error';
import '@/components/shell/tokens.css';

export const Route = createRootRoute({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'LIFE HUD' },
    ],
    links: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  errorComponent: RouteLoadError,
});

function RootLayout() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <LimProvider>
            <Outlet />
            <LimOverlay />
          </LimProvider>
        </TooltipProvider>

        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
