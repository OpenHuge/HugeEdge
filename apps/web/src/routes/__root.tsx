import "@mantine/core/styles.css";
import "../styles.css";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { queryClient } from "../lib/query-client";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <MantineProvider defaultColorScheme="light">
          <QueryClientProvider client={queryClient}>
            <Outlet />
          </QueryClientProvider>
        </MantineProvider>
        <Scripts />
      </body>
    </html>
  );
}
