package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"revista/config"
	"revista/middleware"
	"revista/models"
	"revista/repository"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type ImageHandler struct {
	repo *repository.Repo
	cfg  *config.Config
}

func NewImageHandler(repo *repository.Repo, cfg *config.Config) *ImageHandler {
	return &ImageHandler{repo: repo, cfg: cfg}
}

func (h *ImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	r.ParseMultipartForm(10 << 20)

	file, header, err := r.FormFile("image")
	if err != nil {
		jsonError(w, "no image provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowed[ext] {
		jsonError(w, "invalid file type. Allowed: jpg, jpeg, png, gif, webp", http.StatusBadRequest)
		return
	}

	os.MkdirAll(h.cfg.UploadDir, 0755)

	filename := fmt.Sprintf("%s_%d%s", userID, time.Now().UnixNano(), ext)
	filePath := filepath.Join(h.cfg.UploadDir, filename)

	dst, err := os.Create(filePath)
	if err != nil {
		jsonError(w, "error saving file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		jsonError(w, "error saving file", http.StatusInternalServerError)
		return
	}

	mimeType := header.Header.Get("Content-Type")
	size := int(header.Size)

	img, err := h.repo.CreateImage(r.Context(), userID, filename, header.Filename, mimeType, size, nil, nil)
	if err != nil {
		jsonError(w, "error saving image record", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, img, http.StatusCreated)
}

func (h *ImageHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	images, err := h.repo.GetImagesByUser(r.Context(), userID)
	if err != nil {
		jsonError(w, "error fetching images", http.StatusInternalServerError)
		return
	}
	if images == nil {
		images = []models.Image{}
	}
	jsonResponse(w, images, http.StatusOK)
}

func (h *ImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	img, err := h.repo.GetImageByID(r.Context(), id)
	if err != nil {
		jsonError(w, "image not found", http.StatusNotFound)
		return
	}

	if img.UserID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	os.Remove(filepath.Join(h.cfg.UploadDir, img.Filename))

	if err := h.repo.DeleteImage(r.Context(), img.ID); err != nil {
		jsonError(w, "error deleting image", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"message": "deleted"}, http.StatusOK)
}
