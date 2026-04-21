import { Button, Card, Container, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { LoadingState } from "@hugeedge/ui";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { isApiError, tokenStore } from "../lib/api";
import { actorQueryOptions, loginWithPassword } from "../lib/session";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const hasToken = Boolean(tokenStore.getAccessToken());
  const actor = useQuery({
    ...actorQueryOptions(),
    enabled: hasToken,
    retry: false,
  });
  const [email, setEmail] = useState("admin@hugeedge.local");
  const [password, setPassword] = useState("hugeedge");
  const login = useMutation({
    mutationFn: () => loginWithPassword(email, password),
    onSuccess: () => navigate({ to: "/admin/overview" }),
  });

  const errorMessage = login.error
    ? isApiError(login.error)
      ? login.error.message
      : "Unable to sign in"
    : null;

  if (hasToken && actor.isLoading) {
    return <LoadingState />;
  }

  if (actor.data) {
    return <Navigate to="/admin/overview" replace />;
  }

  return (
    <Container size={440} py={88}>
      <Card withBorder radius="lg" padding="xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            login.mutate();
          }}
        >
          <Stack gap="md">
            <Stack gap={4}>
              <Title order={1}>Sign in</Title>
              <Text c="dimmed">
                Authenticate with the local HugeEdge operator account.
              </Text>
            </Stack>
            <TextInput
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />
            <PasswordInput
              label="Password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              visibilityToggleButtonProps={{
                "aria-label": "Toggle visibility",
              }}
            />
            <Button type="submit" loading={login.isPending}>
              Sign in
            </Button>
            {errorMessage ? <Text c="red">{errorMessage}</Text> : null}
          </Stack>
        </form>
      </Card>
    </Container>
  );
}
