package handlers

import (
	"encoding/json"
	"net/http"
	"revista/config"
	"revista/middleware"
	"revista/models"
	"revista/repository"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	repo *repository.Repo
	cfg  *config.Config
}

func NewAuthHandler(repo *repository.Repo, cfg *config.Config) *AuthHandler {
	return &AuthHandler{repo: repo, cfg: cfg}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		jsonError(w, "email, password and name are required", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	user, err := h.repo.CreateUser(r.Context(), req.Email, string(hash), req.Name)
	if err != nil {
		jsonError(w, "email already exists", http.StatusConflict)
		return
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, models.AuthResponse{Token: token, User: *user}, http.StatusCreated)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	user, err := h.repo.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		jsonError(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	token, err := h.generateToken(user.ID)
	if err != nil {
		jsonError(w, "internal error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, models.AuthResponse{Token: token, User: *user}, http.StatusOK)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	user, err := h.repo.GetUserByID(r.Context(), userID)
	if err != nil {
		jsonError(w, "user not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, user, http.StatusOK)
}

func (h *AuthHandler) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}

func jsonResponse(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, status int) {
	jsonResponse(w, models.ErrorResponse{Error: msg}, status)
}
