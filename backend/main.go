package main

import (
	"context"
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"revista/config"
	"revista/handlers"
	"revista/middleware"
	"revista/repository"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	mime.AddExtensionType(".ttf", "font/ttf")
	mime.AddExtensionType(".otf", "font/otf")
	mime.AddExtensionType(".woff", "font/woff")
	mime.AddExtensionType(".woff2", "font/woff2")

	cfg := config.Load()

	// Connect to PostgreSQL
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL())
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Connected to PostgreSQL")

	repo := repository.New(pool)

	// Handlers
	authHandler := handlers.NewAuthHandler(repo, cfg)
	magazineHandler := handlers.NewMagazineHandler(repo)
	pageHandler := handlers.NewPageHandler(repo)
	elementHandler := handlers.NewElementHandler(repo)
	imageHandler := handlers.NewImageHandler(repo, cfg)
	templateHandler := handlers.NewTemplateHandler(repo)
	fontHandler := handlers.NewFontHandler(repo, cfg)

	// Router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.CORS())

	// Resolve paths relative to the executable location
	execDir, _ := filepath.Abs(filepath.Dir(os.Args[0]))
	uploadsDir := cfg.UploadDir
	if !filepath.IsAbs(uploadsDir) {
		uploadsDir = filepath.Join(execDir, uploadsDir)
	}
	os.MkdirAll(uploadsDir, 0755)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir))))

	// Serve frontend (relative to executable too)
	frontendDir := filepath.Join(execDir, "frontend")
	r.Handle("/*", http.FileServer(http.Dir(frontendDir)))

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Auth (public)
		r.Post("/auth/register", authHandler.Register)
		r.Post("/auth/login", authHandler.Login)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWT(cfg.JWTSecret))

			r.Get("/auth/me", authHandler.Me)

			// Magazines
			r.Get("/magazines", magazineHandler.List)
			r.Post("/magazines", magazineHandler.Create)
			r.Get("/magazines/{id}", magazineHandler.Get)
			r.Put("/magazines/{id}", magazineHandler.Update)
			r.Delete("/magazines/{id}", magazineHandler.Delete)
			r.Put("/magazines/{id}/cover", magazineHandler.SetCover)

			// Pages
			r.Get("/magazines/{id}/pages", pageHandler.List)
			r.Post("/magazines/{id}/pages", pageHandler.Create)
			r.Put("/pages/{pageId}", pageHandler.Update)
			r.Delete("/pages/{pageId}", pageHandler.Delete)
			r.Put("/magazines/{id}/pages/reorder", pageHandler.Reorder)

			// Page Elements
			r.Get("/pages/{id}/elements", elementHandler.List)
			r.Post("/pages/{id}/elements", elementHandler.Create)
			r.Put("/elements/{elementId}", elementHandler.Update)
			r.Delete("/elements/{elementId}", elementHandler.Delete)

			// Images
			r.Post("/images/upload", imageHandler.Upload)
			r.Get("/images", imageHandler.List)
			r.Delete("/images/{id}", imageHandler.Delete)

			// Templates
			r.Get("/templates", templateHandler.List)
			r.Post("/templates", templateHandler.Create)
			r.Get("/templates/{id}", templateHandler.Get)
			r.Delete("/templates/{id}", templateHandler.Delete)

			// Fonts
			r.Post("/fonts/upload", fontHandler.Upload)
			r.Get("/fonts", fontHandler.List)
			r.Delete("/fonts/{id}", fontHandler.Delete)
		})
	})

	// Start server
	addr := ":" + cfg.ServerPort
	log.Printf("Server starting on %s", addr)

	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
