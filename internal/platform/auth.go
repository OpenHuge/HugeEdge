package platform

import (
	"context"

	"github.com/golang-jwt/jwt/v5"
)

type AuthTokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"`
}

type HugeEdgeClaims struct {
	TenantID  string   `json:"tenant_id"`
	RoleIDs   []string `json:"role_ids"`
	SessionID string   `json:"session_id"`
	TokenType string   `json:"token_type"`
	jwt.RegisteredClaims
}

type claimsKey struct{}

func contextWithClaims(ctx context.Context, claims *HugeEdgeClaims) context.Context {
	return context.WithValue(ctx, claimsKey{}, claims)
}

func claimsFromContext(ctx context.Context) *HugeEdgeClaims {
	claims, _ := ctx.Value(claimsKey{}).(*HugeEdgeClaims)
	if claims == nil {
		return &HugeEdgeClaims{}
	}
	return claims
}
