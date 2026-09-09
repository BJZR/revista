package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"revista/config"
	"revista/middleware"
	"revista/models"
	"revista/repository"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type FontHandler struct {
	repo *repository.Repo
	cfg  *config.Config
}

func NewFontHandler(repo *repository.Repo, cfg *config.Config) *FontHandler {
	return &FontHandler{repo: repo, cfg: cfg}
}

var fontExtRe = regexp.MustCompile(`[^a-zA-Z0-9-_ ]`)

func sanitizeFontName(name string) string {
	s := strings.TrimSuffix(name, filepath.Ext(name))
	s = fontExtRe.ReplaceAllString(s, " ")
	s = strings.Join(strings.Fields(s), " ")
	if s == "" {
		s = "fuente"
	}
	return s
}

func (h *FontHandler) Upload(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)

	r.ParseMultipartForm(20 << 20)

	files := r.MultipartForm.File["fontFiles"]
	if len(files) == 0 {
		jsonError(w, "no font files provided", http.StatusBadRequest)
		return
	}

	allowed := map[string]bool{".ttf": true, ".otf": true, ".woff": true, ".woff2": true}
	uploaded := []models.Font{}

	for _, header := range files {
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if !allowed[ext] {
			jsonError(w, "invalid font type for "+header.Filename+". Allowed: ttf, otf, woff, woff2", http.StatusBadRequest)
			return
		}

		file, err := header.Open()
		if err != nil {
			jsonError(w, "error reading font file", http.StatusInternalServerError)
			return
		}

		fontsDir := filepath.Join(h.cfg.UploadDir, "fonts")
		os.MkdirAll(fontsDir, 0755)

		filename := fmt.Sprintf("%s_%d%s", userID, time.Now().UnixNano(), ext)
		filePath := filepath.Join(fontsDir, filename)

		dst, err := os.Create(filePath)
		if err != nil {
			file.Close()
			jsonError(w, "error saving font file", http.StatusInternalServerError)
			return
		}
		_, err = io.Copy(dst, file)
		dst.Close()
		file.Close()
		if err != nil {
			jsonError(w, "error saving font file", http.StatusInternalServerError)
			return
		}

		name := sanitizeFontName(header.Filename)
		f, err := h.repo.CreateFont(r.Context(), userID, name, filename, header.Filename, header.Header.Get("Content-Type"), int(header.Size))
		if err != nil {
			jsonError(w, "error saving font record", http.StatusInternalServerError)
			return
		}
		uploaded = append(uploaded, *f)
	}

	jsonResponse(w, uploaded, http.StatusCreated)
}

func (h *FontHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	fonts, err := h.repo.GetFontsByUser(r.Context(), userID)
	if err != nil {
		jsonError(w, "error fetching fonts", http.StatusInternalServerError)
		return
	}
	if fonts == nil {
		fonts = []models.Font{}
	}
	jsonResponse(w, fonts, http.StatusOK)
}

func (h *FontHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r)
	id := chi.URLParam(r, "id")

	f, err := h.repo.GetFontByID(r.Context(), id)
	if err != nil {
		jsonError(w, "font not found", http.StatusNotFound)
		return
	}

	if f.UserID != userID {
		jsonError(w, "forbidden", http.StatusForbidden)
		return
	}

	os.Remove(filepath.Join(h.cfg.UploadDir, "fonts", f.Filename))

	if err := h.repo.DeleteFont(r.Context(), f.ID); err != nil {
		jsonError(w, "error deleting font", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, map[string]string{"message": "deleted"}, http.StatusOK)
}
