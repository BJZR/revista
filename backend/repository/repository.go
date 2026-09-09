package repository

import (
	"context"
	"encoding/json"
	"revista/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repo struct {
	db *pgxpool.Pool
}

func New(db *pgxpool.Pool) *Repo {
	return &Repo{db: db}
}

// --- Users ---

func (r *Repo) CreateUser(ctx context.Context, email, passwordHash, name string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
		 RETURNING id, email, password_hash, name, role, created_at, updated_at`,
		email, passwordHash, name,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *Repo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, name, role, created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (r *Repo) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	u := &models.User{}
	err := r.db.QueryRow(ctx,
		`SELECT id, email, password_hash, name, role, created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

// --- Magazines ---

func (r *Repo) CreateMagazine(ctx context.Context, userID, title, description string) (*models.Magazine, error) {
	m := &models.Magazine{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO magazines (user_id, title, description) VALUES ($1, $2, $3)
		 RETURNING id, user_id, title, description, cover_image_id, status, created_at, updated_at`,
		userID, title, description,
	).Scan(&m.ID, &m.UserID, &m.Title, &m.Description, &m.CoverImageID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *Repo) GetMagazinesByUser(ctx context.Context, userID string) ([]models.Magazine, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, title, description, cover_image_id, status, created_at, updated_at
		 FROM magazines WHERE user_id = $1 ORDER BY updated_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var magazines []models.Magazine
	for rows.Next() {
		var m models.Magazine
		if err := rows.Scan(&m.ID, &m.UserID, &m.Title, &m.Description, &m.CoverImageID, &m.Status, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		magazines = append(magazines, m)
	}
	return magazines, nil
}

func (r *Repo) GetMagazineByID(ctx context.Context, id string) (*models.Magazine, error) {
	m := &models.Magazine{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, title, description, cover_image_id, status, created_at, updated_at
		 FROM magazines WHERE id = $1`, id,
	).Scan(&m.ID, &m.UserID, &m.Title, &m.Description, &m.CoverImageID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *Repo) UpdateMagazine(ctx context.Context, id, title, description, status string) (*models.Magazine, error) {
	m := &models.Magazine{}
	err := r.db.QueryRow(ctx,
		`UPDATE magazines SET title=$2, description=$3, status=$4, updated_at=NOW()
		 WHERE id=$1
		 RETURNING id, user_id, title, description, cover_image_id, status, created_at, updated_at`,
		id, title, description, status,
	).Scan(&m.ID, &m.UserID, &m.Title, &m.Description, &m.CoverImageID, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (r *Repo) UpdateMagazineCover(ctx context.Context, id, imageID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE magazines SET cover_image_id=$2, updated_at=NOW() WHERE id=$1`, id, imageID)
	return err
}

func (r *Repo) DeleteMagazine(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM magazines WHERE id=$1`, id)
	return err
}

// --- Pages ---

func (r *Repo) CreatePage(ctx context.Context, magazineID string, pageNumber int, name string) (*models.Page, error) {
	p := &models.Page{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO pages (magazine_id, page_number, name) VALUES ($1, $2, $3)
		 RETURNING id, magazine_id, page_number, name, width, height, background_color, background_image_id, created_at, updated_at`,
		magazineID, pageNumber, name,
	).Scan(&p.ID, &p.MagazineID, &p.PageNumber, &p.Name, &p.Width, &p.Height, &p.BackgroundColor, &p.BackgroundImageID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *Repo) GetPagesByMagazine(ctx context.Context, magazineID string) ([]models.Page, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, magazine_id, page_number, name, width, height, background_color, background_image_id, created_at, updated_at
		 FROM pages WHERE magazine_id = $1 ORDER BY page_number`, magazineID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pages []models.Page
	for rows.Next() {
		var p models.Page
		if err := rows.Scan(&p.ID, &p.MagazineID, &p.PageNumber, &p.Name, &p.Width, &p.Height, &p.BackgroundColor, &p.BackgroundImageID, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, nil
}

func (r *Repo) GetPageByID(ctx context.Context, id string) (*models.Page, error) {
	p := &models.Page{}
	err := r.db.QueryRow(ctx,
		`SELECT id, magazine_id, page_number, name, width, height, background_color, background_image_id, created_at, updated_at
		 FROM pages WHERE id=$1`, id,
	).Scan(&p.ID, &p.MagazineID, &p.PageNumber, &p.Name, &p.Width, &p.Height, &p.BackgroundColor, &p.BackgroundImageID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *Repo) UpdatePage(ctx context.Context, id string, name *string, width, height int, bgColor, bgImageID *string) (*models.Page, error) {
	p := &models.Page{}
	err := r.db.QueryRow(ctx,
		`UPDATE pages SET
			name = COALESCE($6, name),
			width = COALESCE(NULLIF($2, 0), width),
			height = COALESCE(NULLIF($3, 0), height),
			background_color = COALESCE($4, background_color),
			background_image_id = $5,
			updated_at = NOW()
		 WHERE id=$1
		 RETURNING id, magazine_id, page_number, name, width, height, background_color, background_image_id, created_at, updated_at`,
		id, width, height, bgColor, bgImageID, name,
	).Scan(&p.ID, &p.MagazineID, &p.PageNumber, &p.Name, &p.Width, &p.Height, &p.BackgroundColor, &p.BackgroundImageID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *Repo) DeletePage(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM pages WHERE id=$1`, id)
	return err
}

func (r *Repo) ReorderPages(ctx context.Context, magazineID string, pageIDs []string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, pageID := range pageIDs {
		_, err := tx.Exec(ctx,
			`UPDATE pages SET page_number=$2 WHERE id=$1 AND magazine_id=$3`,
			pageID, i+1, magazineID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repo) GetNextPageNumber(ctx context.Context, magazineID string) (int, error) {
	var maxPage *int
	err := r.db.QueryRow(ctx,
		`SELECT MAX(page_number) FROM pages WHERE magazine_id=$1`, magazineID,
	).Scan(&maxPage)
	if err != nil {
		return 1, err
	}
	if maxPage == nil {
		return 1, nil
	}
	return *maxPage + 1, nil
}

// --- Page Elements ---

func (r *Repo) CreateElement(ctx context.Context, pageID, elemType, content string, x, y, width, height, rotation float64, zIndex int, style json.RawMessage) (*models.PageElement, error) {
	e := &models.PageElement{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO page_elements (page_id, type, x, y, width, height, rotation, z_index, content, style)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, page_id, type, x, y, width, height, rotation, z_index, content, style, created_at, updated_at`,
		pageID, elemType, x, y, width, height, rotation, zIndex, content, style,
	).Scan(&e.ID, &e.PageID, &e.Type, &e.X, &e.Y, &e.Width, &e.Height, &e.Rotation, &e.ZIndex, &e.Content, &e.Style, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *Repo) GetElementsByPage(ctx context.Context, pageID string) ([]models.PageElement, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, page_id, type, x, y, width, height, rotation, z_index, content, style, created_at, updated_at
		 FROM page_elements WHERE page_id = $1 ORDER BY z_index`, pageID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var elements []models.PageElement
	for rows.Next() {
		var e models.PageElement
		if err := rows.Scan(&e.ID, &e.PageID, &e.Type, &e.X, &e.Y, &e.Width, &e.Height, &e.Rotation, &e.ZIndex, &e.Content, &e.Style, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		elements = append(elements, e)
	}
	return elements, nil
}

func (r *Repo) GetElementByID(ctx context.Context, id string) (*models.PageElement, error) {
	e := &models.PageElement{}
	err := r.db.QueryRow(ctx,
		`SELECT id, page_id, type, x, y, width, height, rotation, z_index, content, style, created_at, updated_at
		 FROM page_elements WHERE id=$1`, id,
	).Scan(&e.ID, &e.PageID, &e.Type, &e.X, &e.Y, &e.Width, &e.Height, &e.Rotation, &e.ZIndex, &e.Content, &e.Style, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *Repo) UpdateElement(ctx context.Context, id string, x, y, width, height, rotation float64, zIndex int, content string, style json.RawMessage) (*models.PageElement, error) {
	e := &models.PageElement{}
	err := r.db.QueryRow(ctx,
		`UPDATE page_elements SET x=$2, y=$3, width=$4, height=$5, rotation=$6, z_index=$7, content=$8, style=$9, updated_at=NOW()
		 WHERE id=$1
		 RETURNING id, page_id, type, x, y, width, height, rotation, z_index, content, style, created_at, updated_at`,
		id, x, y, width, height, rotation, zIndex, content, style,
	).Scan(&e.ID, &e.PageID, &e.Type, &e.X, &e.Y, &e.Width, &e.Height, &e.Rotation, &e.ZIndex, &e.Content, &e.Style, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return e, nil
}

func (r *Repo) DeleteElement(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM page_elements WHERE id=$1`, id)
	return err
}

// --- Images ---

func (r *Repo) CreateImage(ctx context.Context, userID, filename, originalName, mimeType string, size int, width, height *int) (*models.Image, error) {
	img := &models.Image{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO images (user_id, filename, original_name, mime_type, size, width, height)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, filename, original_name, mime_type, size, width, height, created_at`,
		userID, filename, originalName, mimeType, size, width, height,
	).Scan(&img.ID, &img.UserID, &img.Filename, &img.OriginalName, &img.MimeType, &img.Size, &img.Width, &img.Height, &img.CreatedAt)
	if err != nil {
		return nil, err
	}
	return img, nil
}

func (r *Repo) GetImagesByUser(ctx context.Context, userID string) ([]models.Image, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, filename, original_name, mime_type, size, width, height, created_at
		 FROM images WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []models.Image
	for rows.Next() {
		var img models.Image
		if err := rows.Scan(&img.ID, &img.UserID, &img.Filename, &img.OriginalName, &img.MimeType, &img.Size, &img.Width, &img.Height, &img.CreatedAt); err != nil {
			return nil, err
		}
		images = append(images, img)
	}
	return images, nil
}

func (r *Repo) GetImageByID(ctx context.Context, id string) (*models.Image, error) {
	img := &models.Image{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, filename, original_name, mime_type, size, width, height, created_at
		 FROM images WHERE id=$1`, id,
	).Scan(&img.ID, &img.UserID, &img.Filename, &img.OriginalName, &img.MimeType, &img.Size, &img.Width, &img.Height, &img.CreatedAt)
	if err != nil {
		return nil, err
	}
	return img, nil
}

func (r *Repo) DeleteImage(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM images WHERE id=$1`, id)
	return err
}

// --- Templates ---

func (r *Repo) CreateTemplate(ctx context.Context, userID, name, description string, data json.RawMessage, isPublic bool) (*models.Template, error) {
	t := &models.Template{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO templates (user_id, name, description, data, is_public)
		 VALUES ($1, $2, $3, $4::jsonb, $5)
		 RETURNING id, user_id::text, name, description, COALESCE(thumbnail, ''), data, is_public, created_at`,
		userID, name, description, data, isPublic,
	).Scan(&t.ID, &t.UserID, &t.Name, &t.Description, &t.Thumbnail, &t.Data, &t.IsPublic, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *Repo) GetTemplates(ctx context.Context, userID string) ([]models.Template, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id::text, name, description, COALESCE(thumbnail, ''), data, is_public, created_at
		 FROM templates WHERE user_id = $1 OR is_public = true ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []models.Template
	for rows.Next() {
		var t models.Template
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Description, &t.Thumbnail, &t.Data, &t.IsPublic, &t.CreatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *Repo) GetTemplateByID(ctx context.Context, id string) (*models.Template, error) {
	t := &models.Template{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id::text, name, description, COALESCE(thumbnail, ''), data, is_public, created_at
		 FROM templates WHERE id=$1`, id,
	).Scan(&t.ID, &t.UserID, &t.Name, &t.Description, &t.Thumbnail, &t.Data, &t.IsPublic, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *Repo) DeleteTemplate(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM templates WHERE id=$1`, id)
	return err
}

// --- Fonts ---

func (r *Repo) CreateFont(ctx context.Context, userID, name, filename, originalName, mimeType string, size int) (*models.Font, error) {
	f := &models.Font{}
	err := r.db.QueryRow(ctx,
		`INSERT INTO fonts (user_id, name, filename, original_name, mime_type, size)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, user_id::text, name, filename, original_name, mime_type, size, created_at`,
		userID, name, filename, originalName, mimeType, size,
	).Scan(&f.ID, &f.UserID, &f.Name, &f.Filename, &f.OriginalName, &f.MimeType, &f.Size, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (r *Repo) GetFontsByUser(ctx context.Context, userID string) ([]models.Font, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id::text, name, filename, original_name, mime_type, size, created_at
		 FROM fonts WHERE user_id = $1 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var fonts []models.Font
	for rows.Next() {
		var f models.Font
		if err := rows.Scan(&f.ID, &f.UserID, &f.Name, &f.Filename, &f.OriginalName, &f.MimeType, &f.Size, &f.CreatedAt); err != nil {
			return nil, err
		}
		fonts = append(fonts, f)
	}
	return fonts, nil
}

func (r *Repo) GetFontByID(ctx context.Context, id string) (*models.Font, error) {
	f := &models.Font{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id::text, name, filename, original_name, mime_type, size, created_at
		 FROM fonts WHERE id=$1`, id,
	).Scan(&f.ID, &f.UserID, &f.Name, &f.Filename, &f.OriginalName, &f.MimeType, &f.Size, &f.CreatedAt)
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (r *Repo) DeleteFont(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM fonts WHERE id=$1`, id)
	return err
}
