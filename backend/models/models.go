package models

import (
	"encoding/json"
	"time"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Magazine struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	CoverImageID *string   `json:"cover_image_id"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Page struct {
	ID                string    `json:"id"`
	MagazineID        string    `json:"magazine_id"`
	PageNumber        int       `json:"page_number"`
	Name              string    `json:"name"`
	Width             int       `json:"width"`
	Height            int       `json:"height"`
	BackgroundColor   string    `json:"background_color"`
	BackgroundImageID *string   `json:"background_image_id"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type PageElement struct {
	ID        string          `json:"id"`
	PageID    string          `json:"page_id"`
	Type      string          `json:"type"`
	X         float64         `json:"x"`
	Y         float64         `json:"y"`
	Width     float64         `json:"width"`
	Height    float64         `json:"height"`
	Rotation  float64         `json:"rotation"`
	ZIndex    int             `json:"z_index"`
	Content   string          `json:"content"`
	Style     json.RawMessage `json:"style"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type Image struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Filename     string    `json:"filename"`
	OriginalName string    `json:"original_name"`
	MimeType     string    `json:"mime_type"`
	Size         int       `json:"size"`
	Width        *int      `json:"width"`
	Height       *int      `json:"height"`
	CreatedAt    time.Time `json:"created_at"`
}

type Template struct {
	ID          string          `json:"id"`
	UserID      *string         `json:"user_id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Thumbnail   string          `json:"thumbnail"`
	Data        json.RawMessage `json:"data"`
	IsPublic    bool            `json:"is_public"`
	CreatedAt   time.Time       `json:"created_at"`
}

type Font struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Name         string    `json:"name"`
	Filename     string    `json:"filename"`
	OriginalName string    `json:"original_name"`
	MimeType     string    `json:"mime_type"`
	Size         int       `json:"size"`
	CreatedAt    time.Time `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
