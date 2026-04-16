-- =========================================================
-- BLOG COMMENT LIKES
-- =========================================================
-- Classic "one like per user per comment" schema.
-- Keeps blog_comments table lean while allowing fast counts.

-- Optional cached counter on blog_comments (for quick reads)
ALTER TABLE blog_comments
  ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS blog_comment_likes (
  comment_id BIGINT NOT NULL REFERENCES blog_comments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_user_id
  ON blog_comment_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_blog_comment_likes_comment_id
  ON blog_comment_likes(comment_id);

