package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"revista/models"
	"revista/repository"
	"strings"

	"github.com/go-chi/chi/v5"
)

type PageHandler struct {
	repo *repository.Repo
}

func NewPageHandler(repo *repository.Repo) *PageHandler {
	return &PageHandler{repo: repo}
}

type pageRequest struct {
	Name              *string `json:"name"`
	Width             *int    `json:"width"`
	Height            *int    `json:"height"`
	BackgroundColor   *string `json:"background_color"`
	BackgroundImageID *string `json:"background_image_id"`
}

type reorderRequest struct {
	PageIDs []string `json:"page_ids"`
}

func (h *PageHandler) List(w http.ResponseWriter, r *http.Request) {
	magazineID := chi.URLParam(r, "id")
	pages, err := h.repo.GetPagesByMagazine(r.Context(), magazineID)
	if err != nil {
		jsonError(w, "error fetching pages", http.StatusInternalServerError)
		return
	}
	if pages == nil {
		pages = []models.Page{}
	}
	jsonResponse(w, pages, http.StatusOK)
}

func (h *PageHandler) Create(w http.ResponseWriter, r *http.Request) {
	magazineID := chi.URLParam(r, "id")
	nextNum, err := h.repo.GetNextPageNumber(r.Context(), magazineID)
	if err != nil {
		jsonError(w, "error getting page number", http.StatusInternalServerError)
		return
	}

	name := fmt.Sprintf("Página %d", nextNum)
	var req pageRequest
	if r.Body != nil && r.ContentLength != 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err == nil && req.Name != nil && strings.TrimSpace(*req.Name) != "" {
			name = *req.Name
		}
	}

	page, err := h.repo.CreatePage(r.Context(), magazineID, nextNum, name)
	if err != nil {
		jsonError(w, "error creating page", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, page, http.StatusCreated)
}

func (h *PageHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "pageId")
	page, err := h.repo.GetPageByID(r.Context(), id)
	if err != nil {
		jsonError(w, "page not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, page, http.StatusOK)
}

func (h *PageHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "pageId")
	var req pageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	page, err := h.repo.UpdatePage(r.Context(), id, req.Name, derefInt(req.Width), derefInt(req.Height), req.BackgroundColor, req.BackgroundImageID)
	if err != nil {
		jsonError(w, "error updating page", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, page, http.StatusOK)
}

func (h *PageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "pageId")
	if err := h.repo.DeletePage(r.Context(), id); err != nil {
		jsonError(w, "error deleting page", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "deleted"}, http.StatusOK)
}

func (h *PageHandler) Reorder(w http.ResponseWriter, r *http.Request) {
	magazineID := chi.URLParam(r, "id")
	var req reorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.repo.ReorderPages(r.Context(), magazineID, req.PageIDs); err != nil {
		jsonError(w, "error reordering pages", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "reordered"}, http.StatusOK)
}

func derefInt(p *int) int {
	if p != nil {
		return *p
	}
	return 0
}
