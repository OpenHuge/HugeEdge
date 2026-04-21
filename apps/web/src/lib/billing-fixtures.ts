export type PriceVersionFixture = {
  id: string;
  label: string;
  channel: string;
  currency: string;
  amount: string;
  interval: string;
  visibility: string;
  effectiveFrom: string;
};

export type CatalogSkuFixture = {
  id: string;
  name: string;
  type: string;
  entitlementSummary: string;
  priceVersions: PriceVersionFixture[];
};

export type CatalogProductFixture = {
  id: string;
  name: string;
  audience: string;
  summary: string;
  skus: CatalogSkuFixture[];
};

export type SubscriptionFixture = {
  id: string;
  accountName: string;
  planName: string;
  status: string;
  renewsAt: string;
  billingInterval: string;
  seatsUsed: number;
  seatsTotal: number;
  trafficUsedGb: number;
  trafficTotalGb: number;
  feedCountUsed: number;
  feedCountTotal: number;
  notice: string;
};

export type OrderFixture = {
  id: string;
  accountName: string;
  summary: string;
  orderStatus: string;
  paymentStatus: string;
  paymentChannel: string;
  total: string;
  createdAt: string;
  approvalNote: string;
};

export type InvoiceFixture = {
  id: string;
  accountName: string;
  status: string;
  total: string;
  dueAt: string;
  artifact: string;
  source: string;
};

export type ResellerFixture = {
  id: string;
  name: string;
  walletBalance: string;
  settlementStatus: string;
  settlementWindow: string;
  customerCount: number;
  rechargeCodeInventory: number;
  note: string;
};

export type StoreProductFixture = {
  id: string;
  name: string;
  summary: string;
  price: string;
  interval: string;
  highlights: string[];
  ctaLabel: string;
};

export type MemberFixture = {
  id: string;
  email: string;
  role: string;
  seatState: string;
  lastActiveAt: string;
};

export type FeedFixture = {
  id: string;
  name: string;
  subscriptionName: string;
  clientHint: string;
  tokenId: string;
  tokenStatus: string;
  usageSummary: string;
  expiresAt: string;
  lastUsedAt: string;
  etag: string;
  deviceBound: boolean;
  headers: Array<{ name: string; value: string }>;
};

export const backendPendingCopy =
  "Action buttons stay disabled until Track A exposes the matching billing APIs.";

export const operatorBillingFixtures = {
  overview: {
    metrics: [
      {
        label: "Monthly Recurring Revenue",
        value: "$184,200",
        detail: "Hybrid B2B + B2C recurring base across 612 effective subscriptions.",
        tone: "green" as const,
      },
      {
        label: "Prepaid Wallet Float",
        value: "$91,480",
        detail: "Combined reseller and direct-account prepaid balance awaiting consumption.",
        tone: "blue" as const,
      },
      {
        label: "Past-Due Exposure",
        value: "$18,920",
        detail: "Invoices in grace, overdue, or chargeback review across manual rails.",
        tone: "yellow" as const,
      },
      {
        label: "Recharge Code Inventory",
        value: "1,248",
        detail: "Unredeemed recharge codes across reseller batches and direct promotions.",
        tone: "gray" as const,
      },
    ],
    highlights: [
      "Base subscription exclusivity is enforced per effective account.",
      "Manual bank transfer orders require operator approval before activation.",
      "Reseller settlement closes on the first UTC day of each calendar month.",
    ],
  },
  products: [
    {
      id: "prod-personal",
      name: "Personal",
      audience: "Individual",
      summary: "Starter self-service plan with one primary subscription feed.",
      skus: [
        {
          id: "sku-personal-base",
          name: "Personal Base",
          type: "base_subscription",
          entitlementSummary: "1 seat · 300 GB traffic · 1 feed · standard support",
          priceVersions: [
            {
              id: "pv-personal-web-usd",
              label: "Web USD",
              channel: "direct_web",
              currency: "USD",
              amount: "$12",
              interval: "monthly",
              visibility: "public",
              effectiveFrom: "2026-04-01",
            },
            {
              id: "pv-personal-annual-usd",
              label: "Annual USD",
              channel: "direct_web",
              currency: "USD",
              amount: "$120",
              interval: "annual",
              visibility: "public",
              effectiveFrom: "2026-04-01",
            },
          ],
        },
        {
          id: "sku-personal-traffic-pack",
          name: "Traffic Pack 500 GB",
          type: "traffic_pack",
          entitlementSummary: "Adds 500 GB to the current billing period",
          priceVersions: [
            {
              id: "pv-personal-traffic-usd",
              label: "Traffic Pack USD",
              channel: "direct_web",
              currency: "USD",
              amount: "$15",
              interval: "one_time",
              visibility: "public",
              effectiveFrom: "2026-04-01",
            },
          ],
        },
      ],
    },
    {
      id: "prod-team",
      name: "Team",
      audience: "Organization",
      summary: "Operator-managed plan with seats, higher feed allowance, and connector packs.",
      skus: [
        {
          id: "sku-team-base",
          name: "Team Base",
          type: "base_subscription",
          entitlementSummary: "10 seats · 4 TB traffic · 3 feeds · SSO-ready controls",
          priceVersions: [
            {
              id: "pv-team-web-usd",
              label: "Direct USD",
              channel: "direct_sales",
              currency: "USD",
              amount: "$149",
              interval: "monthly",
              visibility: "quote_only",
              effectiveFrom: "2026-04-01",
            },
            {
              id: "pv-team-reseller-usd",
              label: "Reseller USD",
              channel: "reseller",
              currency: "USD",
              amount: "$132",
              interval: "monthly",
              visibility: "partner_only",
              effectiveFrom: "2026-04-01",
            },
          ],
        },
        {
          id: "sku-team-seat-pack",
          name: "Seat Pack 5",
          type: "seat_pack",
          entitlementSummary: "Adds 5 billable seats without changing base plan",
          priceVersions: [
            {
              id: "pv-team-seat-usd",
              label: "Seat Pack USD",
              channel: "direct_sales",
              currency: "USD",
              amount: "$35",
              interval: "one_time",
              visibility: "quote_only",
              effectiveFrom: "2026-04-01",
            },
          ],
        },
      ],
    },
    {
      id: "prod-business",
      name: "Business",
      audience: "Organization / reseller-managed",
      summary: "High-traffic plan with reserved capacity and settlement-aware reseller pricing.",
      skus: [
        {
          id: "sku-business-base",
          name: "Business Base",
          type: "base_subscription",
          entitlementSummary: "50 seats · 20 TB traffic · 6 feeds · premium support",
          priceVersions: [
            {
              id: "pv-business-direct-usd",
              label: "Direct USD",
              channel: "direct_sales",
              currency: "USD",
              amount: "$699",
              interval: "monthly",
              visibility: "quote_only",
              effectiveFrom: "2026-04-01",
            },
            {
              id: "pv-business-reseller-usd",
              label: "Partner USD",
              channel: "reseller",
              currency: "USD",
              amount: "$620",
              interval: "monthly",
              visibility: "partner_only",
              effectiveFrom: "2026-04-01",
            },
          ],
        },
      ],
    },
  ] satisfies CatalogProductFixture[],
  subscriptions: [
    {
      id: "sub-org-apollo",
      accountName: "Apollo Labs",
      planName: "Business Base",
      status: "active",
      renewsAt: "2026-05-10",
      billingInterval: "monthly",
      seatsUsed: 38,
      seatsTotal: 50,
      trafficUsedGb: 11_240,
      trafficTotalGb: 20_000,
      feedCountUsed: 4,
      feedCountTotal: 6,
      notice: "Auto-renew enabled; reseller discount inherited from Orbit Channels.",
    },
    {
      id: "sub-team-summit",
      accountName: "Summit Ops",
      planName: "Team Base",
      status: "grace",
      renewsAt: "2026-04-27",
      billingInterval: "monthly",
      seatsUsed: 10,
      seatsTotal: 15,
      trafficUsedGb: 3_500,
      trafficTotalGb: 4_000,
      feedCountUsed: 3,
      feedCountTotal: 3,
      notice: "Payment intent pending manual bank transfer confirmation.",
    },
    {
      id: "sub-personal-li",
      accountName: "Li Wei",
      planName: "Personal Base",
      status: "trialing",
      renewsAt: "2026-04-30",
      billingInterval: "monthly",
      seatsUsed: 1,
      seatsTotal: 1,
      trafficUsedGb: 122,
      trafficTotalGb: 300,
      feedCountUsed: 1,
      feedCountTotal: 1,
      notice: "Trial converts automatically unless wallet or card payment fails.",
    },
  ] satisfies SubscriptionFixture[],
  orders: [
    {
      id: "ord-2041",
      accountName: "Apollo Labs",
      summary: "Business Base renewal + support add-on",
      orderStatus: "active",
      paymentStatus: "settled",
      paymentChannel: "stripe_card",
      total: "$744",
      createdAt: "2026-04-19 10:42 UTC",
      approvalNote: "No manual review required.",
    },
    {
      id: "ord-2038",
      accountName: "Summit Ops",
      summary: "Team Base renewal + seat pack 5",
      orderStatus: "pending_payment",
      paymentStatus: "pending",
      paymentChannel: "bank_transfer",
      total: "$184",
      createdAt: "2026-04-18 08:15 UTC",
      approvalNote: "Waiting for operator approve-payment after settlement trace lands.",
    },
    {
      id: "ord-2031",
      accountName: "Orbit Channels",
      summary: "Recharge code batch x200",
      orderStatus: "paid",
      paymentStatus: "confirmed",
      paymentChannel: "wallet_balance",
      total: "$2,900",
      createdAt: "2026-04-15 02:11 UTC",
      approvalNote: "Inventory issuance batched; export artifact lands after Track A webhook sync.",
    },
  ] satisfies OrderFixture[],
  resellers: [
    {
      id: "res-orbit",
      name: "Orbit Channels",
      walletBalance: "$41,220",
      settlementStatus: "issued",
      settlementWindow: "2026-04 close",
      customerCount: 28,
      rechargeCodeInventory: 620,
      note: "Largest partner by prepaid top-up volume and direct customer transfers.",
    },
    {
      id: "res-northstar",
      name: "Northstar Distribution",
      walletBalance: "$19,880",
      settlementStatus: "paid",
      settlementWindow: "2026-03 close",
      customerCount: 13,
      rechargeCodeInventory: 188,
      note: "Healthy balance with low pending settlement exposure.",
    },
  ] satisfies ResellerFixture[],
  invoices: [
    {
      id: "inv-9901",
      accountName: "Apollo Labs",
      status: "paid",
      total: "$744",
      dueAt: "2026-04-20",
      artifact: "PDF + line items",
      source: "Auto-issued after successful card settlement",
    },
    {
      id: "inv-9894",
      accountName: "Summit Ops",
      status: "overdue",
      total: "$184",
      dueAt: "2026-04-20",
      artifact: "PDF pending bank transfer receipt",
      source: "Manual rail order awaiting approve-payment",
    },
    {
      id: "inv-9887",
      accountName: "Orbit Channels",
      status: "issued",
      total: "$2,900",
      dueAt: "2026-04-25",
      artifact: "Batch recharge-code settlement",
      source: "Partner wallet top-up and inventory refill",
    },
  ] satisfies InvoiceFixture[],
};

export const selfServiceBillingFixtures = {
  storeProducts: [
    {
      id: "store-personal",
      name: "Personal",
      summary: "Primary feed, 300 GB traffic, and one managed seat.",
      price: "$12",
      interval: "monthly",
      highlights: [
        "1 active feed token",
        "300 GB monthly traffic",
        "Recharge-code redemption supported",
      ],
      ctaLabel: "Checkout coming via Track A",
    },
    {
      id: "store-team",
      name: "Team",
      summary: "Seat-based workspace plan for shared members and approvals.",
      price: "$149",
      interval: "monthly",
      highlights: [
        "10 included seats",
        "3 active feed slots",
        "Wallet + manual rail billing",
      ],
      ctaLabel: "Quote + checkout pending backend",
    },
    {
      id: "store-traffic",
      name: "Traffic Pack 500 GB",
      summary: "One-time add-on that stacks into the current billing period.",
      price: "$15",
      interval: "one-time",
      highlights: [
        "Applies immediately after order activation",
        "No base plan change",
        "Usable with wallet or recharge code",
      ],
      ctaLabel: "Preview order pending backend",
    },
  ] satisfies StoreProductFixture[],
  currentSubscription: {
    id: "sub-team-summit",
    accountName: "Summit Ops",
    planName: "Team Base",
    status: "grace",
    renewsAt: "2026-04-27",
    billingInterval: "monthly",
    seatsUsed: 10,
    seatsTotal: 15,
    trafficUsedGb: 3_500,
    trafficTotalGb: 4_000,
    feedCountUsed: 3,
    feedCountTotal: 3,
    notice:
      "Grace period is active because the latest bank transfer is pending operator confirmation.",
  } satisfies SubscriptionFixture,
  orders: [
    {
      id: "ord-2038",
      accountName: "Summit Ops",
      summary: "Team Base renewal + seat pack 5",
      orderStatus: "pending_payment",
      paymentStatus: "pending",
      paymentChannel: "bank_transfer",
      total: "$184",
      createdAt: "2026-04-18 08:15 UTC",
      approvalNote: "Payment will activate after finance confirms the transfer.",
    },
    {
      id: "ord-1972",
      accountName: "Summit Ops",
      summary: "Traffic Pack 500 GB",
      orderStatus: "active",
      paymentStatus: "settled",
      paymentChannel: "wallet_balance",
      total: "$15",
      createdAt: "2026-04-07 13:20 UTC",
      approvalNote: "Applied immediately from wallet credit.",
    },
  ] satisfies OrderFixture[],
  invoices: [
    {
      id: "inv-9894",
      accountName: "Summit Ops",
      status: "overdue",
      total: "$184",
      dueAt: "2026-04-20",
      artifact: "Invoice PDF",
      source: "Renewal invoice tied to bank transfer",
    },
    {
      id: "inv-9810",
      accountName: "Summit Ops",
      status: "paid",
      total: "$149",
      dueAt: "2026-03-20",
      artifact: "Invoice PDF",
      source: "Previous subscription cycle settled from wallet",
    },
  ] satisfies InvoiceFixture[],
  wallet: {
    balance: "$420",
    pendingCredits: "$90",
    nextRecommendedTopUp: "$200",
    ledger: [
      "2026-04-18 · bank transfer pending · +$90",
      "2026-04-07 · traffic pack activation · -$15",
      "2026-03-19 · manual top-up settled · +$200",
    ],
  },
  members: [
    {
      id: "mem-1",
      email: "owner@summitops.example",
      role: "account_owner",
      seatState: "occupied",
      lastActiveAt: "2026-04-20 22:14 UTC",
    },
    {
      id: "mem-2",
      email: "ops@summitops.example",
      role: "billing_admin",
      seatState: "occupied",
      lastActiveAt: "2026-04-20 21:03 UTC",
    },
    {
      id: "mem-3",
      email: "contractor@summitops.example",
      role: "member",
      seatState: "idle_reclaim_candidate",
      lastActiveAt: "2026-04-05 08:45 UTC",
    },
  ] satisfies MemberFixture[],
  feeds: [
    {
      id: "feed-primary",
      name: "Primary Team Feed",
      subscriptionName: "Team Base",
      clientHint: "HugeEdge desktop + Clash-compatible wrapper",
      tokenId: "he_subtok_01JXTEAMPRIMARY",
      tokenStatus: "active",
      usageSummary: "2.8 TB / 4 TB",
      expiresAt: "2026-04-27T00:00:00Z",
      lastUsedAt: "2026-04-21T05:41:00Z",
      etag: "W/\"team-primary-2744\"",
      deviceBound: false,
      headers: [
        { name: "X-HE-Plan", value: "Team Base" },
        { name: "X-HE-Usage", value: "2800GB" },
        { name: "X-HE-Total", value: "4000GB" },
        { name: "X-HE-Expire-At", value: "2026-04-27T00:00:00Z" },
        { name: "X-HE-Status", value: "grace" },
      ],
    },
    {
      id: "feed-branch-office",
      name: "Branch Office Feed",
      subscriptionName: "Team Base",
      clientHint: "Device-bound feed for branch gateway",
      tokenId: "he_subtok_01JXTEAMBRANCH",
      tokenStatus: "rotated",
      usageSummary: "540 GB / 4 TB",
      expiresAt: "2026-04-27T00:00:00Z",
      lastUsedAt: "2026-04-20T16:08:00Z",
      etag: "W/\"team-branch-812\"",
      deviceBound: true,
      headers: [
        { name: "X-HE-Plan", value: "Team Base" },
        { name: "X-HE-Usage", value: "540GB" },
        { name: "X-HE-Total", value: "4000GB" },
        { name: "X-HE-Expire-At", value: "2026-04-27T00:00:00Z" },
        { name: "X-HE-Notice", value: "Device binding enforced" },
      ],
    },
  ] satisfies FeedFixture[],
};
