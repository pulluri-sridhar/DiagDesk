package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

const (
	TenantIDKey  = "tenant_id"
	BranchIDKey  = "branch_id"
	UserIDKey    = "user_id"
	UserEmailKey = "user_email"
)

// TenantAuth parses the Keycloak JWT and sets tenant context in gin.
// Kong Gateway validates the signature upstream; we only extract claims here.
func TenantAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
			return
		}
		tokenStr := strings.TrimPrefix(auth, "Bearer ")

		parser := jwt.NewParser()
		token, _, err := parser.ParseUnverified(tokenStr, jwt.MapClaims{})
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}

		c.Set(TenantIDKey, strClaim(claims, "tenant_id"))
		c.Set(BranchIDKey, strClaim(claims, "branch_id"))
		c.Set(UserIDKey, strClaim(claims, "sub"))
		c.Set(UserEmailKey, strClaim(claims, "email"))

		c.Next()
	}
}

func strClaim(claims jwt.MapClaims, key string) string {
	if v, ok := claims[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
