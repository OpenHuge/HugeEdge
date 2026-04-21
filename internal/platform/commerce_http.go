package platform

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

func (a *App) listAccounts(w http.ResponseWriter, r *http.Request) {
	accounts, err := a.store.ListAccounts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, accounts)
}

func (a *App) createAccount(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type         string `json:"type"`
		Name         string `json:"name"`
		BillingEmail string `json:"billingEmail"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	claims := claimsFromContext(r.Context())
	account, err := a.store.CreateAccount(
		r.Context(),
		claims.Subject,
		strings.TrimSpace(req.Type),
		strings.TrimSpace(req.Name),
		strings.TrimSpace(req.BillingEmail),
	)
	if errors.Is(err, ErrConflict) {
		writeError(w, http.StatusBadRequest, errors.New("invalid or conflicting account request"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "account.create", claims.Subject, account.DefaultTenantID, map[string]any{
		"accountId":       account.ID,
		"accountType":     account.Type,
		"defaultTenantId": account.DefaultTenantID,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusCreated, account)
}

func (a *App) patchAccount(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID           string  `json:"id"`
		Name         string  `json:"name"`
		Status       string  `json:"status"`
		BillingEmail *string `json:"billingEmail"`
	}
	if err := decode(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err)
		return
	}
	if strings.TrimSpace(req.ID) == "" {
		writeError(w, http.StatusBadRequest, errors.New("account id is required"))
		return
	}
	claims := claimsFromContext(r.Context())
	account, err := a.store.UpdateAccount(r.Context(), req.ID, req.Name, req.Status, req.BillingEmail)
	if errors.Is(err, ErrConflict) {
		writeError(w, http.StatusBadRequest, errors.New("invalid account update"))
		return
	}
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("account not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	if err := a.store.Audit(r.Context(), "account.update", claims.Subject, account.DefaultTenantID, map[string]any{
		"accountId":    account.ID,
		"status":       account.Status,
		"billingEmail": account.BillingEmail,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, account)
}

func (a *App) billingOverview(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	if claims.AccountID == "" {
		writeError(w, http.StatusNotFound, errors.New("account not found for current session"))
		return
	}
	overview, err := a.store.BillingOverview(r.Context(), claims.AccountID)
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("billing overview not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, overview)
}

func (a *App) listCatalogProducts(w http.ResponseWriter, r *http.Request) {
	products, err := a.store.ListCatalogProducts(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, products)
}

func (a *App) listAppSubscriptions(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	subscriptions, err := a.store.ListSubscriptions(r.Context(), claims.AccountID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, subscriptions)
}

func (a *App) getAppSubscription(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	subscription, err := a.store.Subscription(r.Context(), claims.AccountID, chi.URLParam(r, "subscriptionId"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("subscription not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, subscription)
}

func (a *App) listAppOrders(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	orders, err := a.store.ListOrders(r.Context(), claims.AccountID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, orders)
}

func (a *App) getAppOrder(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	order, err := a.store.Order(r.Context(), claims.AccountID, chi.URLParam(r, "orderId"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("order not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	writeJSON(w, http.StatusOK, order)
}

func (a *App) listAppSubscriptionFeeds(w http.ResponseWriter, r *http.Request) {
	claims := claimsFromContext(r.Context())
	feeds, err := a.store.ListSubscriptionFeeds(r.Context(), claims.AccountID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}
	for i := range feeds {
		feeds[i].AccessURL = feedAccessURL(r, feeds[i].Token)
	}
	writeJSON(w, http.StatusOK, feeds)
}

func (a *App) getSubscriptionFeed(w http.ResponseWriter, r *http.Request) {
	delivery, err := a.store.FeedDeliveryByToken(r.Context(), chi.URLParam(r, "token"))
	if errors.Is(err, ErrNotFound) {
		writeError(w, http.StatusNotFound, errors.New("subscription feed token not found"))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("ETag", delivery.ETag)
	w.Header().Set("X-HE-Plan", delivery.Plan)
	w.Header().Set("X-HE-Usage", "0")
	w.Header().Set("X-HE-Total", formatInt64(delivery.TotalBytes))
	w.Header().Set("X-HE-Status", delivery.Status)
	w.Header().Set("X-HE-Notice", delivery.Notice)
	w.Header().Set("X-HE-ETag", delivery.ETag)
	if delivery.ExpireAt != nil {
		w.Header().Set("Last-Modified", delivery.ExpireAt.UTC().Format(http.TimeFormat))
		w.Header().Set("X-HE-Expire-At", delivery.ExpireAt.UTC().Format(time.RFC3339))
	}
	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		return
	}
	writeJSON(w, http.StatusOK, delivery)
}

func feedAccessURL(r *http.Request, token string) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if forwarded := r.Header.Get("X-Forwarded-Proto"); forwarded != "" {
		scheme = forwarded
	}
	return scheme + "://" + r.Host + "/v1/sub/" + token
}

func formatInt64(value int64) string {
	return strconv.FormatInt(value, 10)
}
