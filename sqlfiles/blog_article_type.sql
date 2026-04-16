-- Article type enum + column on blog_posts
-- Run after blog.sql (requires blog_posts to exist).
-- Enum labels: öğretici, haber, duyuru (UTF-8; database encoding should be UTF8).

-- 1) Create enum type (idempotent)
DO $$
BEGIN
  CREATE TYPE blog_article_type AS ENUM ('öğretici', 'haber', 'duyuru');
EXCEPTION
  WHEN duplicate_object THEN
    -- type already exists
    NULL;
END
$$;

-- 2) Add column to blog_posts
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS article_type blog_article_type NOT NULL DEFAULT 'haber';

COMMENT ON COLUMN blog_posts.article_type IS 'Makale türü: öğretici | haber | duyuru';

-- Optional: index if you filter by type often
CREATE INDEX IF NOT EXISTS idx_blog_posts_article_type
  ON blog_posts (article_type);
