-- Migration: Add category_id and tags to tenders (run on existing database)
-- Run this if you already have the tenders table without category_id/tags.

SET NAMES utf8mb4;

ALTER TABLE tenders ADD COLUMN category_id INT NULL AFTER category;
ALTER TABLE tenders ADD COLUMN tags VARCHAR(500) DEFAULT NULL AFTER category_id;
ALTER TABLE tenders ADD INDEX idx_category_id (category_id);

CREATE TABLE IF NOT EXISTS tender_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  color VARCHAR(7) DEFAULT '#1e3a5f',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tender_categories (name, description, color) VALUES
('IT & Technology', 'Software, hardware, IT services', '#3b82f6'),
('Construction', 'Buildings, roads, infrastructure', '#f59e0b'),
('Health & Medical', 'Medical supplies, equipment, services', '#10b981'),
('Office Supplies', 'Stationery, furniture, equipment', '#8b5cf6'),
('Consultancy', 'Professional and advisory services', '#ec4899'),
('Transport & Logistics', 'Vehicles, shipping, delivery', '#f97316'),
('Food & Catering', 'Food supplies and catering services', '#14b8a6'),
('Security Services', 'Guards, CCTV, access control', '#6b7280'),
('Cleaning Services', 'Janitorial and cleaning contracts', '#84cc16'),
('Other', 'Miscellaneous tenders', '#94a3b8');
