package middleware

import (
	"github.com/rs/cors"
	"net/http"
)

func CORS() func(http.Handler) http.Handler {
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})
	return c.Handler
}
