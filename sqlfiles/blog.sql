-- =========================================================
-- BLOG AUTHORS
-- =========================================================


-- =========================================================
-- BLOG CATEGORIES
-- =========================================================
CREATE TABLE IF NOT EXISTS blog_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- BLOG POSTS
-- =========================================================
CREATE TABLE IF NOT EXISTS blog_posts (
    id BIGSERIAL PRIMARY KEY,

    title VARCHAR(250) NOT NULL,
    slug VARCHAR(300) NOT NULL UNIQUE,

    excerpt TEXT,
    content_html TEXT NOT NULL,

    cover_image_url TEXT,

    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    is_featured BOOLEAN DEFAULT FALSE,

    reading_time INTEGER,
    view_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,

    meta_title VARCHAR(255),
    meta_description VARCHAR(320),
    canonical_url TEXT,

    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- BLOG POST <-> CATEGORY
-- one post can have multiple categories
-- =========================================================
CREATE TABLE IF NOT EXISTS blog_post_categories (
    post_id BIGINT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES blog_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

-- =========================================================
-- BLOG COMMENTS
-- nested comments via parent_comment_id
-- =========================================================
CREATE TABLE IF NOT EXISTS blog_comments (
    id BIGSERIAL PRIMARY KEY,

    post_id BIGINT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES blog_comments(id) ON DELETE CASCADE,

    user_id BIGINT,
    guest_name VARCHAR(120),
    guest_email VARCHAR(200),

    content TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),

    ip_address INET,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- RELATED PRODUCTS
-- connect blog posts with products from your shop
-- product_id references your existing products table logically
-- add FK later if needed according to your schema
-- =========================================================
CREATE TABLE IF NOT EXISTS blog_post_related_products (
    post_id BIGINT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL,
    PRIMARY KEY (post_id, product_id)
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_blog_posts_status
    ON blog_posts(status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
    ON blog_posts(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_blog_posts_is_featured
    ON blog_posts(is_featured);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id
    ON blog_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_blog_post_categories_category_id
    ON blog_post_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id
    ON blog_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_comment_id
    ON blog_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_blog_comments_status
    ON blog_comments(status);

CREATE INDEX IF NOT EXISTS idx_blog_related_products_product_id
    ON blog_post_related_products(product_id);