-- AI Cache Table for ProcureAI and Tender Images
-- Stores cached AI responses and tender images to reduce API calls

-- If table doesn't exist, create it
CREATE TABLE IF NOT EXISTS ai_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_value LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- If table exists with old schema (using 'result' column), alter it
-- ALTER TABLE ai_cache ADD COLUMN IF NOT EXISTS cache_key VARCHAR(255) UNIQUE NOT NULL AFTER id;
-- ALTER TABLE ai_cache ADD COLUMN IF NOT EXISTS cache_value LONGTEXT NOT NULL AFTER cache_key;
-- ALTER TABLE ai_cache ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER cache_value;
