CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE magazines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_id UUID,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE magazines ADD CONSTRAINT fk_cover_image
    FOREIGN KEY (cover_image_id) REFERENCES images(id) ON DELETE SET NULL;

CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    magazine_id UUID NOT NULL REFERENCES magazines(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    width INTEGER DEFAULT 800,
    height INTEGER DEFAULT 1100,
    background_color VARCHAR(20) DEFAULT '#ffffff',
    background_image_id UUID REFERENCES images(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(magazine_id, page_number)
);

CREATE TABLE page_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    x FLOAT DEFAULT 0,
    y FLOAT DEFAULT 0,
    width FLOAT DEFAULT 100,
    height FLOAT DEFAULT 100,
    rotation FLOAT DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    content TEXT,
    style JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail VARCHAR(255),
    data JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_magazines_user_id ON magazines(user_id);
CREATE INDEX idx_pages_magazine_id ON pages(magazine_id);
CREATE INDEX idx_page_elements_page_id ON page_elements(page_id);
CREATE INDEX idx_images_user_id ON images(user_id);
