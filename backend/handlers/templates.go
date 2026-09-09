package handlers

import (
	"encoding/json"
	"net/http"
	"revista/middleware"
	"revista/models"
	"revista/repository"

	"github.com/go-chi/chi/v5"
)

type TemplateHandler struct {
	repo *repository.Repo
}

func NewTemplateHandler(repo *repository.Repo) *TemplateHandler {
	return &TemplateHandler{repo: repo}
}

type templateRequest struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Data        json.RawMessage `json:"data"`
	IsPublic    bool            `json:"is_public"`
}

func (h *TemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	templates, err := h.repo.GetTemplates(r.Context(), userID)
	if err != nil {
		jsonError(w, "error fetching templates", http.StatusInternalServerError)
		return
	}
	if templates == nil {
		templates = []models.Template{}
	}
	jsonResponse(w, templates, http.StatusOK)
}

func (h *TemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	var req templateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Name == "" {
		jsonError(w, "name is required", http.StatusBadRequest)
		return
	}
	if req.Data == nil {
		req.Data = json.RawMessage(`{}`)
	}

	template, err := h.repo.CreateTemplate(r.Context(), userID, req.Name, req.Description, req.Data, req.IsPublic)
	if err != nil {
		jsonError(w, "error creating template", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, template, http.StatusCreated)
}

func (h *TemplateHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	template, err := h.repo.GetTemplateByID(r.Context(), id)
	if err != nil {
		jsonError(w, "template not found", http.StatusNotFound)
		return
	}
	jsonResponse(w, template, http.StatusOK)
}

func (h *TemplateHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.repo.DeleteTemplate(r.Context(), id); err != nil {
		jsonError(w, "error deleting template", http.StatusInternalServerError)
		return
	}
	jsonResponse(w, map[string]string{"message": "deleted"}, http.StatusOK)
}
