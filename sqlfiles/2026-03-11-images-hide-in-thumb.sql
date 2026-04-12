-- Add image visibility + card-thumbnail flags.
-- hide: exclude image everywhere (landing + cards + hover)
-- in_thumb: include image in card thumbnail system (primary + hover)

ALTER TABLE images
  ADD COLUMN IF NOT EXISTS hide BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS in_thumb BOOLEAN NOT NULL DEFAULT TRUE;

-- If an image is hidden, it should not participate in thumbs/primary.
UPDATE images
SET in_thumb = FALSE,
    is_primary = FALSE
WHERE hide = TRUE;

