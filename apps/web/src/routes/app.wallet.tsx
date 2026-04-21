import {
  Alert,
  List,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { BillingMetricCard } from "../components/BillingMetricCard";
import { selfServiceBillingFixtures } from "../lib/billing-fixtures";

export const Route = createFileRoute("/app/wallet")({
  component: AppWalletPage,
});

function AppWalletPage() {
  const { wallet } = selfServiceBillingFixtures;

  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Title order={2}>Wallet</Title>
        <Text c="dimmed">
          Prepaid balance, pending credits, and top-up readiness for wallet-first
          flows.
        </Text>
      </Stack>

      <Alert color="blue" variant="light">
        Wallet top-up and recharge-code redemption remain disabled until Track A
        exposes `/v1/app/wallet` mutations and redemption flows.
      </Alert>

      <SimpleGrid cols={{ base: 1, md: 3 }}>
        <BillingMetricCard
          label="Available Balance"
          value={wallet.balance}
          detail="Spendable prepaid credit in the active billing scope."
          tone="green"
        />
        <BillingMetricCard
          label="Pending Credits"
          value={wallet.pendingCredits}
          detail="Bank transfer and manual approvals not yet settled."
          tone="yellow"
        />
        <BillingMetricCard
          label="Suggested Top-Up"
          value={wallet.nextRecommendedTopUp}
          detail="Recommended amount based on current renewal and traffic posture."
          tone="blue"
        />
      </SimpleGrid>

      <Paper withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Ledger Snapshot</Title>
          <List size="sm" spacing="xs">
            {wallet.ledger.map((entry) => (
              <List.Item key={entry}>{entry}</List.Item>
            ))}
          </List>
        </Stack>
      </Paper>
    </Stack>
  );
}
