package handlers

import (
	"encoding/json"
	"net/http"
	"revista/middleware"
	"revista/models"
	"revista/repository"

	"github.com/go-chi/chi/v5"
)

type MagazineHandler struct {
	repo *repository.Repo
}

func NewMagazineHandler(repo *repository.Repo) *MagazineHandler {
	return &MagazineHandler{repo: repo}
}

type magazineRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

func (h *MagazineHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	magazines, err := h.repo.GetMagazinesByUser(r.Context(), userID)
	if err != nil {
		jsonError(w, "error fetching magazines", http.StatusInternalServerError)
		return
	}
	if magazines == nil {
		magazines = []models.Magazine{}
	}
	jsonResponse(w, magazines, http.StatusOK)
}

func (h *MagazineHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req magazineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Title == "" {
		jsonError(w, "title is required", http.StatusBadRequest)
		return
	}

	magazine, err := h.repo.CreateMagazine(r.Context(), userID, req.Title, req.Description)
	if err != nil {
		jsonError(w, "error creating magazine", http.StatusInternalServerError)
		return
	}

	_, err = h.repo.CreatePage(r.Context(), magazine.ID, 1, "Página 1")
	if err != nil {
		jsonError(w, "error creating first page", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, magazine, http.StatusCreated)
}

func (h *MagazineHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	magazine, err := h.repo.GetMagazineByID(r.Context(), id)
	if err != nil {
		jsonError(w, "magazine not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, magazine, http.StatusOK)
}

func (h *MagazineHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req magazineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Status == "" {
		req.Status = "draft"
	}

	magazine, err := h.repo.UpdateMagazine(r.Context(), id, req.Title, req.Description, req.Status)
	if err != nil {
		jsonError(w, "error updating magazine", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, magazine, http.StatusOK)
}

func (h *MagazineHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.repo.DeleteMagazine(r.Context(), id); err != nil {
		jsonError(w, "error deleting magazine", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "deleted"}, http.StatusOK)
}

func (h *MagazineHandler) SetCover(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		ImageID string `json:"image_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.UpdateMagazineCover(r.Context(), id, req.ImageID); err != nil {
		jsonError(w, "error setting cover", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "cover updated"}, http.StatusOK)
}
