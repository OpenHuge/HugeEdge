package platform

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

var nonSlugPattern = regexp.MustCompile(`[^a-z0-9]+`)

type Account struct {
	ID              string    `json:"id"`
	Type            string    `json:"type"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	Status          string    `json:"status"`
	BillingEmail    string    `json:"billingEmail"`
	DefaultTenantID string    `json:"defaultTenantId,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
}

type WalletSummary struct {
	Currency     string `json:"currency"`
	BalanceMinor int64  `json:"balanceMinor"`
}

type CatalogPriceVersion struct {
	ID                  string         `json:"id"`
	Currency            string         `json:"currency"`
	UnitAmountMinor     int64          `json:"unitAmountMinor"`
	EntitlementTemplate map[string]any `json:"entitlementTemplate"`
}

type CatalogSKU struct {
	ID              string               `json:"id"`
	Code            string               `json:"code"`
	Name            string               `json:"name"`
	Kind            string               `json:"kind"`
	BillingInterval string               `json:"billingInterval,omitempty"`
	IsActive        bool                 `json:"isActive"`
	CurrentPrice    *CatalogPriceVersion `json:"currentPrice,omitempty"`
}

type CatalogProduct struct {
	ID          string       `json:"id"`
	Code        string       `json:"code"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	IsFeatured  bool         `json:"isFeatured"`
	SKUs        []CatalogSKU `json:"skus"`
}

type Subscription struct {
	ID                  string         `json:"id"`
	AccountID           string         `json:"accountId"`
	TenantID            string         `json:"tenantId,omitempty"`
	ProductCode         string         `json:"productCode"`
	ProductName         string         `json:"productName"`
	SkuID               string         `json:"skuId"`
	SkuCode             string         `json:"skuCode"`
	Status              string         `json:"status"`
	CurrentPeriodStart  time.Time      `json:"currentPeriodStart"`
	CurrentPeriodEnd    time.Time      `json:"currentPeriodEnd"`
	AutoRenew           bool           `json:"autoRenew"`
	FeedCount           int            `json:"feedCount"`
	EntitlementTemplate map[string]any `json:"entitlementTemplate,omitempty"`
}

type Order struct {
	ID             string    `json:"id"`
	AccountID      string    `json:"accountId"`
	SubscriptionID string    `json:"subscriptionId,omitempty"`
	Status         string    `json:"status"`
	Currency       string    `json:"currency"`
	SubtotalMinor  int64     `json:"subtotalMinor"`
	PayableMinor   int64     `json:"payableMinor"`
	CreatedAt      time.Time `json:"createdAt"`
}

type SubscriptionFeed struct {
	ID             string     `json:"id"`
	SubscriptionID string     `json:"subscriptionId"`
	AccountID      string     `json:"accountId"`
	TenantID       string     `json:"tenantId,omitempty"`
	Label          string     `json:"label"`
	Status         string     `json:"status"`
	PlanName       string     `json:"planName"`
	Primary        bool       `json:"primary"`
	Token          string     `json:"token"`
	AccessURL      string     `json:"accessUrl,omitempty"`
	ETag           string     `json:"etag"`
	Notice         string     `json:"notice"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty"`
	ExpiresAt      *time.Time `json:"expiresAt,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
}

type BillingOverview struct {
	Account               Account       `json:"account"`
	Wallet                WalletSummary `json:"wallet"`
	ActiveSubscription    *Subscription `json:"activeSubscription,omitempty"`
	RecentOrders          []Order       `json:"recentOrders"`
	ActiveFeedCount       int           `json:"activeFeedCount"`
	AvailableProductCount int           `json:"availableProductCount"`
}

type FeedDelivery struct {
	AccountID      string         `json:"accountId"`
	SubscriptionID string         `json:"subscriptionId"`
	FeedID         string         `json:"feedId"`
	Plan           string         `json:"plan"`
	Status         string         `json:"status"`
	ExpireAt       *time.Time     `json:"expireAt,omitempty"`
	Notice         string         `json:"notice"`
	UsedBytes      int64          `json:"usedBytes"`
	TotalBytes     int64          `json:"totalBytes"`
	ETag           string         `json:"etag"`
	ProfileBundle  map[string]any `json:"profileBundle"`
}

func (s *Store) accountContextForUser(ctx context.Context, tx pgx.Tx, userID string, tenantID string) (string, []string, string, error) {
	var linkedAccountID string
	_ = tx.QueryRow(ctx, `SELECT COALESCE(account_id::text, '') FROM tenants WHERE id = $1`, tenantID).Scan(&linkedAccountID)

	if linkedAccountID != "" {
		roles, err := s.accountRolesForUser(ctx, tx, userID, linkedAccountID)
		if err != nil {
			return "", nil, "", err
		}
		return linkedAccountID, roles, "account:" + linkedAccountID, nil
	}

	var accountID string
	rows, err := tx.Query(ctx,
		`SELECT am.account_id::text, am.role_name
		 FROM account_memberships am
		 WHERE am.user_id = $1
		 ORDER BY am.created_at ASC`,
		userID,
	)
	if err != nil {
		return "", nil, "", err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var currentAccountID string
		var roleName string
		if err := rows.Scan(&currentAccountID, &roleName); err != nil {
			return "", nil, "", err
		}
		if accountID == "" {
			accountID = currentAccountID
		}
		if currentAccountID == accountID {
			roles = append(roles, roleName)
		}
	}
	if err := rows.Err(); err != nil {
		return "", nil, "", err
	}
	if accountID == "" {
		return "", nil, "tenant:" + tenantID, nil
	}
	return accountID, roles, "account:" + accountID, nil
}

func (s *Store) accountRolesForUser(ctx context.Context, tx pgx.Tx, userID string, accountID string) ([]string, error) {
	rows, err := tx.Query(ctx,
		`SELECT role_name
		 FROM account_memberships
		 WHERE user_id = $1 AND account_id = $2
		 ORDER BY created_at ASC`,
		userID, accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var roleName string
		if err := rows.Scan(&roleName); err != nil {
			return nil, err
		}
		roles = append(roles, roleName)
	}
	return roles, rows.Err()
}

func (s *Store) bootstrapCommerceForAccount(ctx context.Context, tx pgx.Tx, accountID string, tenantID string) error {
	now := time.Now()
	periodEnd := now.Add(14 * 24 * time.Hour)
	subscriptionID := uuid.NewString()
	orderID := uuid.NewString()
	feedID := uuid.NewString()
	tokenID := uuid.NewString()
	tokenValue := "sub_" + uuid.NewString()
	etag := "he-" + feedID[:12]

	if _, err := tx.Exec(ctx,
		`INSERT INTO subscriptions (id, account_id, tenant_id, sku_id, price_version_id, status, current_period_start, current_period_end, auto_renew)
		 VALUES ($1, $2, $3, '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'trialing', $4, $5, true)`,
		subscriptionID, accountID, tenantID, now, periodEnd,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO orders (id, account_id, subscription_id, status, currency, subtotal_minor, payable_minor)
		 VALUES ($1, $2, $3, 'active', 'USD', 0, 0)`,
		orderID, accountID, subscriptionID,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO subscription_feeds (id, subscription_id, account_id, tenant_id, label, status, primary_feed, etag, notice)
		 VALUES ($1, $2, $3, $4, 'Primary Feed', 'active', true, $5, 'Trial feed for the default account')`,
		feedID, subscriptionID, accountID, tenantID, etag,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO subscription_feed_tokens (id, feed_id, token_value, token_hash, status, expires_at)
		 VALUES ($1, $2, $3, $4, 'active', $5)`,
		tokenID, feedID, tokenValue, tokenHash(tokenValue), periodEnd,
	); err != nil {
		return err
	}
	return nil
}

func (s *Store) ListAccounts(ctx context.Context) ([]Account, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id::text, type, name, slug, status, billing_email, COALESCE(default_tenant_id::text, ''), created_at
		 FROM accounts
		 ORDER BY created_at ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accounts []Account
	for rows.Next() {
		var account Account
		if err := rows.Scan(
			&account.ID,
			&account.Type,
			&account.Name,
			&account.Slug,
			&account.Status,
			&account.BillingEmail,
			&account.DefaultTenantID,
			&account.CreatedAt,
		); err != nil {
			return nil, err
		}
		accounts = append(accounts, account)
	}
	return accounts, rows.Err()
}

func (s *Store) CreateAccount(ctx context.Context, actorUserID string, accountType string, name string, billingEmail string) (Account, error) {
	accountType = strings.TrimSpace(accountType)
	switch accountType {
	case "individual", "organization", "reseller":
	default:
		return Account{}, ErrConflict
	}

	name = strings.TrimSpace(name)
	if name == "" {
		return Account{}, ErrConflict
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return Account{}, err
	}
	defer rollback(ctx, tx)

	accountID := uuid.NewString()
	tenantID := uuid.NewString()
	roleID := uuid.NewString()
	membershipID := uuid.NewString()
	accountMembershipID := uuid.NewString()
	accountSlug := uniqueSlugFromParts(name, accountID[:8])
	tenantSlug := uniqueSlugFromParts(name, "workspace", tenantID[:6])
	roleName := "account_owner"
	if accountType == "reseller" {
		roleName = "reseller_owner"
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO accounts (id, type, name, slug, status, billing_email) VALUES ($1, $2, $3, $4, 'active', $5)`,
		accountID, accountType, name, accountSlug, strings.TrimSpace(billingEmail),
	); err != nil {
		if isUniqueViolation(err) {
			return Account{}, ErrConflict
		}
		return Account{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO tenants (id, account_id, name, slug, status) VALUES ($1, $2, $3, $4, 'active')`,
		tenantID, accountID, fmt.Sprintf("%s Workspace", name), tenantSlug,
	); err != nil {
		if isUniqueViolation(err) {
			return Account{}, ErrConflict
		}
		return Account{}, err
	}
	if _, err := tx.Exec(ctx,
		`UPDATE accounts SET default_tenant_id = $2, updated_at = now() WHERE id = $1`,
		accountID, tenantID,
	); err != nil {
		return Account{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO roles (id, tenant_id, name, permissions) VALUES ($1, $2, 'owner', '["*"]'::jsonb)`,
		roleID, tenantID,
	); err != nil {
		return Account{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO memberships (id, tenant_id, user_id, role_id) VALUES ($1, $2, $3, $4)`,
		membershipID, tenantID, actorUserID, roleID,
	); err != nil {
		return Account{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO account_memberships (id, account_id, user_id, role_name) VALUES ($1, $2, $3, $4)`,
		accountMembershipID, accountID, actorUserID, roleName,
	); err != nil {
		return Account{}, err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO wallets (id, account_id, currency, balance_minor) VALUES ($1, $2, 'USD', 0)`,
		uuid.NewString(), accountID,
	); err != nil {
		return Account{}, err
	}
	if accountType != "reseller" {
		if err := s.bootstrapCommerceForAccount(ctx, tx, accountID, tenantID); err != nil {
			return Account{}, err
		}
	}

	var account Account
	if err := tx.QueryRow(ctx,
		`SELECT id::text, type, name, slug, status, billing_email, COALESCE(default_tenant_id::text, ''), created_at
		 FROM accounts
		 WHERE id = $1`,
		accountID,
	).Scan(
		&account.ID,
		&account.Type,
		&account.Name,
		&account.Slug,
		&account.Status,
		&account.BillingEmail,
		&account.DefaultTenantID,
		&account.CreatedAt,
	); err != nil {
		return Account{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Account{}, err
	}
	return account, nil
}

func (s *Store) UpdateAccount(ctx context.Context, id string, name string, status string, billingEmail *string) (Account, error) {
	accountID, err := uuidParam(id)
	if err != nil {
		return Account{}, err
	}
	if status != "" {
		switch status {
		case "active", "suspended":
		default:
			return Account{}, ErrConflict
		}
	}
	emailValue := ""
	if billingEmail != nil {
		emailValue = strings.TrimSpace(*billingEmail)
	}

	var account Account
	err = s.db.QueryRow(ctx,
		`UPDATE accounts
		 SET name = COALESCE(NULLIF($2, ''), name),
		     status = COALESCE(NULLIF($3, ''), status),
		     billing_email = CASE WHEN $4 IS NULL THEN billing_email ELSE $4 END,
		     updated_at = now()
		 WHERE id = $1
		 RETURNING id::text, type, name, slug, status, billing_email, COALESCE(default_tenant_id::text, ''), created_at`,
		accountID,
		strings.TrimSpace(name),
		status,
		nullableTextPointer(billingEmail, emailValue),
	).Scan(
		&account.ID,
		&account.Type,
		&account.Name,
		&account.Slug,
		&account.Status,
		&account.BillingEmail,
		&account.DefaultTenantID,
		&account.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Account{}, ErrNotFound
	}
	return account, err
}

func (s *Store) Account(ctx context.Context, id string) (Account, error) {
	accountID, err := uuidParam(id)
	if err != nil {
		return Account{}, err
	}
	var account Account
	err = s.db.QueryRow(ctx,
		`SELECT id::text, type, name, slug, status, billing_email, COALESCE(default_tenant_id::text, ''), created_at
		 FROM accounts
		 WHERE id = $1`,
		accountID,
	).Scan(
		&account.ID,
		&account.Type,
		&account.Name,
		&account.Slug,
		&account.Status,
		&account.BillingEmail,
		&account.DefaultTenantID,
		&account.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Account{}, ErrNotFound
	}
	return account, err
}

func (s *Store) BillingOverview(ctx context.Context, accountID string) (BillingOverview, error) {
	account, err := s.Account(ctx, accountID)
	if err != nil {
		return BillingOverview{}, err
	}

	var overview BillingOverview
	overview.Account = account
	if err := s.db.QueryRow(ctx,
		`SELECT currency, balance_minor
		 FROM wallets
		 WHERE account_id = $1`,
		accountID,
	).Scan(&overview.Wallet.Currency, &overview.Wallet.BalanceMinor); err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return BillingOverview{}, err
		}
		overview.Wallet = WalletSummary{Currency: "USD", BalanceMinor: 0}
	}

	subscriptions, err := s.ListSubscriptions(ctx, accountID)
	if err != nil {
		return BillingOverview{}, err
	}
	for i := range subscriptions {
		if subscriptions[i].Status == "trialing" || subscriptions[i].Status == "active" || subscriptions[i].Status == "grace" {
			overview.ActiveSubscription = &subscriptions[i]
			break
		}
	}

	orders, err := s.ListOrders(ctx, accountID)
	if err != nil {
		return BillingOverview{}, err
	}
	if len(orders) > 5 {
		overview.RecentOrders = orders[:5]
	} else {
		overview.RecentOrders = orders
	}

	feeds, err := s.ListSubscriptionFeeds(ctx, accountID)
	if err != nil {
		return BillingOverview{}, err
	}
	overview.ActiveFeedCount = len(feeds)

	if err := s.db.QueryRow(ctx, `SELECT count(*) FROM catalog_products`).Scan(&overview.AvailableProductCount); err != nil {
		return BillingOverview{}, err
	}
	return overview, nil
}

func (s *Store) ListCatalogProducts(ctx context.Context) ([]CatalogProduct, error) {
	rows, err := s.db.Query(ctx,
		`SELECT
		   p.id::text,
		   p.code,
		   p.name,
		   p.description,
		   p.is_featured,
		   s.id::text,
		   s.code,
		   s.name,
		   s.kind,
		   COALESCE(s.billing_interval, ''),
		   s.is_active,
		   COALESCE(pv.id::text, ''),
		   COALESCE(pv.currency, ''),
		   COALESCE(pv.unit_amount_minor, 0),
		   COALESCE(pv.entitlement_template, '{}'::jsonb)
		 FROM catalog_products p
		 LEFT JOIN catalog_skus s ON s.product_id = p.id
		 LEFT JOIN price_versions pv ON pv.sku_id = s.id AND pv.is_current = true
		 ORDER BY p.created_at ASC, s.created_at ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productIndex := map[string]int{}
	products := []CatalogProduct{}
	for rows.Next() {
		var productID, productCode, productName, description string
		var isFeatured bool
		var skuID, skuCode, skuName, skuKind, billingInterval string
		var skuActive bool
		var priceID, currency string
		var unitAmountMinor int64
		var entitlementJSON []byte
		if err := rows.Scan(
			&productID,
			&productCode,
			&productName,
			&description,
			&isFeatured,
			&skuID,
			&skuCode,
			&skuName,
			&skuKind,
			&billingInterval,
			&skuActive,
			&priceID,
			&currency,
			&unitAmountMinor,
			&entitlementJSON,
		); err != nil {
			return nil, err
		}

		idx, ok := productIndex[productID]
		if !ok {
			idx = len(products)
			productIndex[productID] = idx
			products = append(products, CatalogProduct{
				ID:          productID,
				Code:        productCode,
				Name:        productName,
				Description: description,
				IsFeatured:  isFeatured,
				SKUs:        []CatalogSKU{},
			})
		}
		if skuID == "" {
			continue
		}
		sku := CatalogSKU{
			ID:              skuID,
			Code:            skuCode,
			Name:            skuName,
			Kind:            skuKind,
			BillingInterval: billingInterval,
			IsActive:        skuActive,
		}
		if priceID != "" {
			sku.CurrentPrice = &CatalogPriceVersion{
				ID:                  priceID,
				Currency:            currency,
				UnitAmountMinor:     unitAmountMinor,
				EntitlementTemplate: decodeJSONMap(entitlementJSON),
			}
		}
		products[idx].SKUs = append(products[idx].SKUs, sku)
	}
	return products, rows.Err()
}

func (s *Store) ListSubscriptions(ctx context.Context, accountID string) ([]Subscription, error) {
	rows, err := s.db.Query(ctx,
		`SELECT
		   sub.id::text,
		   sub.account_id::text,
		   COALESCE(sub.tenant_id::text, ''),
		   p.code,
		   p.name,
		   sku.id::text,
		   sku.code,
		   sub.status,
		   sub.current_period_start,
		   sub.current_period_end,
		   sub.auto_renew,
		   COALESCE((SELECT count(*) FROM subscription_feeds sf WHERE sf.subscription_id = sub.id AND sf.status = 'active'), 0),
		   pv.entitlement_template
		 FROM subscriptions sub
		 JOIN catalog_skus sku ON sku.id = sub.sku_id
		 JOIN catalog_products p ON p.id = sku.product_id
		 JOIN price_versions pv ON pv.id = sub.price_version_id
		 WHERE sub.account_id = $1
		 ORDER BY sub.created_at DESC`,
		accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subscriptions []Subscription
	for rows.Next() {
		subscription, err := scanSubscription(rows)
		if err != nil {
			return nil, err
		}
		subscriptions = append(subscriptions, subscription)
	}
	return subscriptions, rows.Err()
}

func (s *Store) Subscription(ctx context.Context, accountID string, subscriptionID string) (Subscription, error) {
	rows, err := s.db.Query(ctx,
		`SELECT
		   sub.id::text,
		   sub.account_id::text,
		   COALESCE(sub.tenant_id::text, ''),
		   p.code,
		   p.name,
		   sku.id::text,
		   sku.code,
		   sub.status,
		   sub.current_period_start,
		   sub.current_period_end,
		   sub.auto_renew,
		   COALESCE((SELECT count(*) FROM subscription_feeds sf WHERE sf.subscription_id = sub.id AND sf.status = 'active'), 0),
		   pv.entitlement_template
		 FROM subscriptions sub
		 JOIN catalog_skus sku ON sku.id = sub.sku_id
		 JOIN catalog_products p ON p.id = sku.product_id
		 JOIN price_versions pv ON pv.id = sub.price_version_id
		 WHERE sub.account_id = $1 AND sub.id = $2`,
		accountID, subscriptionID,
	)
	if err != nil {
		return Subscription{}, err
	}
	defer rows.Close()
	if !rows.Next() {
		return Subscription{}, ErrNotFound
	}
	subscription, err := scanSubscription(rows)
	if err != nil {
		return Subscription{}, err
	}
	return subscription, rows.Err()
}

func (s *Store) ListOrders(ctx context.Context, accountID string) ([]Order, error) {
	rows, err := s.db.Query(ctx,
		`SELECT id::text, account_id::text, COALESCE(subscription_id::text, ''), status, currency, subtotal_minor, payable_minor, created_at
		 FROM orders
		 WHERE account_id = $1
		 ORDER BY created_at DESC`,
		accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var order Order
		if err := rows.Scan(
			&order.ID,
			&order.AccountID,
			&order.SubscriptionID,
			&order.Status,
			&order.Currency,
			&order.SubtotalMinor,
			&order.PayableMinor,
			&order.CreatedAt,
		); err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}
	return orders, rows.Err()
}

func (s *Store) Order(ctx context.Context, accountID string, orderID string) (Order, error) {
	var order Order
	err := s.db.QueryRow(ctx,
		`SELECT id::text, account_id::text, COALESCE(subscription_id::text, ''), status, currency, subtotal_minor, payable_minor, created_at
		 FROM orders
		 WHERE account_id = $1 AND id = $2`,
		accountID, orderID,
	).Scan(
		&order.ID,
		&order.AccountID,
		&order.SubscriptionID,
		&order.Status,
		&order.Currency,
		&order.SubtotalMinor,
		&order.PayableMinor,
		&order.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Order{}, ErrNotFound
	}
	return order, err
}

func (s *Store) ListSubscriptionFeeds(ctx context.Context, accountID string) ([]SubscriptionFeed, error) {
	rows, err := s.db.Query(ctx,
		`SELECT
		   sf.id::text,
		   sf.subscription_id::text,
		   sf.account_id::text,
		   COALESCE(sf.tenant_id::text, ''),
		   sf.label,
		   sf.status,
		   p.name,
		   sf.primary_feed,
		   tok.token_value,
		   sf.etag,
		   sf.notice,
		   tok.last_used_at,
		   tok.expires_at,
		   sf.created_at
		 FROM subscription_feeds sf
		 JOIN subscriptions sub ON sub.id = sf.subscription_id
		 JOIN catalog_skus sku ON sku.id = sub.sku_id
		 JOIN catalog_products p ON p.id = sku.product_id
		 JOIN subscription_feed_tokens tok ON tok.feed_id = sf.id AND tok.status = 'active'
		 WHERE sf.account_id = $1 AND sf.status = 'active'
		 ORDER BY sf.created_at DESC`,
		accountID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var feeds []SubscriptionFeed
	for rows.Next() {
		feed, err := scanFeed(rows)
		if err != nil {
			return nil, err
		}
		feeds = append(feeds, feed)
	}
	return feeds, rows.Err()
}

func (s *Store) FeedDeliveryByToken(ctx context.Context, token string) (FeedDelivery, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return FeedDelivery{}, err
	}
	defer rollback(ctx, tx)

	var delivery FeedDelivery
	var expireAt pgtype.Timestamptz
	var entitlementJSON []byte
	err = tx.QueryRow(ctx,
		`SELECT
		   sf.account_id::text,
		   sf.subscription_id::text,
		   sf.id::text,
		   p.name,
		   sub.status,
		   tok.expires_at,
		   sf.notice,
		   sf.etag,
		   pv.entitlement_template
		 FROM subscription_feed_tokens tok
		 JOIN subscription_feeds sf ON sf.id = tok.feed_id
		 JOIN subscriptions sub ON sub.id = sf.subscription_id
		 JOIN catalog_skus sku ON sku.id = sub.sku_id
		 JOIN catalog_products p ON p.id = sku.product_id
		 JOIN price_versions pv ON pv.id = sub.price_version_id
		 WHERE tok.token_hash = $1
		   AND tok.status = 'active'
		   AND sf.status = 'active'
		   AND (tok.expires_at IS NULL OR tok.expires_at > now())
		 FOR UPDATE`,
		tokenHash(token),
	).Scan(
		&delivery.AccountID,
		&delivery.SubscriptionID,
		&delivery.FeedID,
		&delivery.Plan,
		&delivery.Status,
		&expireAt,
		&delivery.Notice,
		&delivery.ETag,
		&entitlementJSON,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return FeedDelivery{}, ErrNotFound
	}
	if err != nil {
		return FeedDelivery{}, err
	}

	if _, err := tx.Exec(ctx,
		`UPDATE subscription_feed_tokens SET last_used_at = now() WHERE token_hash = $1`,
		tokenHash(token),
	); err != nil {
		return FeedDelivery{}, err
	}

	entitlements := decodeJSONMap(entitlementJSON)
	delivery.TotalBytes = int64FromAny(entitlements["traffic_bytes_included"])
	delivery.UsedBytes = 0
	if expireAt.Valid {
		delivery.ExpireAt = &expireAt.Time
	}
	delivery.ProfileBundle = map[string]any{
		"format":       "hugeedge-profile-bundle",
		"clientCompat": []string{"hugeedge"},
		"artifacts": []map[string]any{
			{
				"kind":           "config_feed",
				"subscriptionId": delivery.SubscriptionID,
				"feedId":         delivery.FeedID,
			},
		},
	}

	if err := tx.Commit(ctx); err != nil {
		return FeedDelivery{}, err
	}
	return delivery, nil
}

func scanSubscription(rows pgx.Rows) (Subscription, error) {
	var subscription Subscription
	var entitlementJSON []byte
	if err := rows.Scan(
		&subscription.ID,
		&subscription.AccountID,
		&subscription.TenantID,
		&subscription.ProductCode,
		&subscription.ProductName,
		&subscription.SkuID,
		&subscription.SkuCode,
		&subscription.Status,
		&subscription.CurrentPeriodStart,
		&subscription.CurrentPeriodEnd,
		&subscription.AutoRenew,
		&subscription.FeedCount,
		&entitlementJSON,
	); err != nil {
		return Subscription{}, err
	}
	subscription.EntitlementTemplate = decodeJSONMap(entitlementJSON)
	return subscription, nil
}

func scanFeed(rows pgx.Rows) (SubscriptionFeed, error) {
	var feed SubscriptionFeed
	var lastUsedAt pgtype.Timestamptz
	var expiresAt pgtype.Timestamptz
	if err := rows.Scan(
		&feed.ID,
		&feed.SubscriptionID,
		&feed.AccountID,
		&feed.TenantID,
		&feed.Label,
		&feed.Status,
		&feed.PlanName,
		&feed.Primary,
		&feed.Token,
		&feed.ETag,
		&feed.Notice,
		&lastUsedAt,
		&expiresAt,
		&feed.CreatedAt,
	); err != nil {
		return SubscriptionFeed{}, err
	}
	feed.LastUsedAt = timePtrFromTimestamptz(lastUsedAt)
	feed.ExpiresAt = timePtrFromTimestamptz(expiresAt)
	return feed, nil
}

func decodeJSONMap(raw []byte) map[string]any {
	if len(raw) == 0 {
		return map[string]any{}
	}
	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return map[string]any{}
	}
	return out
}

func int64FromAny(value any) int64 {
	switch v := value.(type) {
	case float64:
		return int64(v)
	case int64:
		return v
	case int:
		return int64(v)
	case json.Number:
		n, _ := v.Int64()
		return n
	default:
		return 0
	}
}

func slugify(input string) string {
	normalized := strings.ToLower(strings.TrimSpace(input))
	normalized = nonSlugPattern.ReplaceAllString(normalized, "-")
	normalized = strings.Trim(normalized, "-")
	if normalized == "" {
		return "account"
	}
	return normalized
}

func uniqueSlugFromParts(parts ...string) string {
	filtered := make([]string, 0, len(parts))
	for _, part := range parts {
		part = slugify(part)
		if part != "" {
			filtered = append(filtered, part)
		}
	}
	if len(filtered) == 0 {
		return "account"
	}
	return strings.Join(filtered, "-")
}

func nullableTextPointer(original *string, value string) any {
	if original == nil {
		return nil
	}
	return value
}
