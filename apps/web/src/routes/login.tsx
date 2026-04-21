import {
  Alert,
  Button,
  Container,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ensureActor, loginWithPassword } from "../lib/session";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const actor = await ensureActor();
    if (actor) {
      throw redirect({ to: "/admin/overview" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@hugeedge.local");
  const [password, setPassword] = useState("hugeedge");
  const login = useMutation({
    mutationFn: () => loginWithPassword(email, password),
    onSuccess: () => navigate({ to: "/admin/overview" }),
  });

  return (
    <Container size={420} py={80}>
      <Stack
        component="form"
        gap="md"
        onSubmit={(event) => {
          event.preventDefault();
          login.mutate();
        }}
      >
        <Title order={1}>HugeEdge</Title>
        <Text c="dimmed">Operator control plane</Text>
        <TextInput
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <PasswordInput
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <Button type="submit" loading={login.isPending}>
          Sign in
        </Button>
        {login.error ? (
          <Alert color="red" variant="light">
            {login.error instanceof Error
              ? login.error.message
              : "Unable to sign in"}
          </Alert>
        ) : null}
      </Stack>
    </Container>
  );
}
