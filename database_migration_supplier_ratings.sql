-- Supplier performance ratings (run on existing DB after contracts exist)

CREATE TABLE IF NOT EXISTS supplier_ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL,
  contract_id INT NOT NULL UNIQUE,
  tender_id INT NOT NULL,
  rated_by INT NOT NULL,
  quality_score INT NOT NULL COMMENT '1-5',
  delivery_score INT NOT NULL COMMENT '1-5',
  communication_score INT NOT NULL COMMENT '1-5',
  compliance_score INT NOT NULL COMMENT '1-5',
  overall_score DECIMAL(3,2) GENERATED ALWAYS AS (
    (quality_score + delivery_score + communication_score + compliance_score) / 4.0
  ) STORED,
  comments TEXT,
  rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES users(id),
  FOREIGN KEY (contract_id) REFERENCES contracts(id),
  FOREIGN KEY (tender_id) REFERENCES tenders(id),
  FOREIGN KEY (rated_by) REFERENCES users(id),
  INDEX idx_ratings_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: allow suppliers to show on landing "top rated" (add column if not exists)
-- ALTER TABLE supplier_profiles ADD COLUMN show_on_landing TINYINT(1) DEFAULT 0;
