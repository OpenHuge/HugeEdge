import { ErrorState, LoadingState } from "@hugeedge/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { AppLayout } from "../components/AppLayout";
import { isApiError, tokenStore } from "../lib/api";
import { actorQueryOptions } from "../lib/session";

export const Route = createFileRoute("/app")({
  component: AppRoute,
});

function AppRoute() {
  const hasToken = Boolean(tokenStore.getAccessToken());
  const actor = useQuery({
    ...actorQueryOptions(),
    enabled: hasToken,
    retry: false,
  });

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (actor.isLoading) {
    return <LoadingState />;
  }

  if (actor.error) {
    if (
      isApiError(actor.error) &&
      (actor.error.status === 401 || actor.error.status === 404)
    ) {
      return <Navigate to="/login" replace />;
    }

    return (
      <ErrorState
        message={
          actor.error instanceof Error
            ? actor.error.message
            : "Unable to load session"
        }
      />
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
