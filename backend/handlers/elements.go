package handlers

import (
	"encoding/json"
	"net/http"
	"revista/models"
	"revista/repository"

	"github.com/go-chi/chi/v5"
)

type ElementHandler struct {
	repo *repository.Repo
}

func NewElementHandler(repo *repository.Repo) *ElementHandler {
	return &ElementHandler{repo: repo}
}

type elementRequest struct {
	Type     string          `json:"type"`
	X        float64         `json:"x"`
	Y        float64         `json:"y"`
	Width    float64         `json:"width"`
	Height   float64         `json:"height"`
	Rotation float64         `json:"rotation"`
	ZIndex   int             `json:"z_index"`
	Content  string          `json:"content"`
	Style    json.RawMessage `json:"style"`
}

func (h *ElementHandler) List(w http.ResponseWriter, r *http.Request) {
	pageID := chi.URLParam(r, "id")
	elements, err := h.repo.GetElementsByPage(r.Context(), pageID)
	if err != nil {
		jsonError(w, "error fetching elements", http.StatusInternalServerError)
		return
	}
	if elements == nil {
		elements = []models.PageElement{}
	}
	jsonResponse(w, elements, http.StatusOK)
}

func (h *ElementHandler) Create(w http.ResponseWriter, r *http.Request) {
	pageID := chi.URLParam(r, "id")
	var req elementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Type == "" {
		req.Type = "text"
	}
	if req.Style == nil {
		req.Style = json.RawMessage(`{}`)
	}

	element, err := h.repo.CreateElement(r.Context(), pageID, req.Type, req.Content,
		req.X, req.Y, req.Width, req.Height, req.Rotation, req.ZIndex, req.Style)
	if err != nil {
		jsonError(w, "error creating element", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, element, http.StatusCreated)
}

func (h *ElementHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "elementId")
	element, err := h.repo.GetElementByID(r.Context(), id)
	if err != nil {
		jsonError(w, "element not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, element, http.StatusOK)
}

func (h *ElementHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "elementId")
	var req elementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Style == nil {
		req.Style = json.RawMessage(`{}`)
	}

	element, err := h.repo.UpdateElement(r.Context(), id,
		req.X, req.Y, req.Width, req.Height, req.Rotation, req.ZIndex, req.Content, req.Style)
	if err != nil {
		jsonError(w, "error updating element", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, element, http.StatusOK)
}

func (h *ElementHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "elementId")
	if err := h.repo.DeleteElement(r.Context(), id); err != nil {
		jsonError(w, "error deleting element", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "deleted"}, http.StatusOK)
}
