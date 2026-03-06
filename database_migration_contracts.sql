-- Contracts: run on existing database after tenders can be awarded

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  contract_value DECIMAL(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft', 'active', 'completed', 'terminated', 'disputed') DEFAULT 'draft',
  signed_by_admin TINYINT(1) DEFAULT 0,
  signed_by_supplier TINYINT(1) DEFAULT 0,
  admin_signed_at TIMESTAMP NULL,
  supplier_signed_at TIMESTAMP NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tender_id) REFERENCES tenders(id),
  FOREIGN KEY (supplier_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_contracts_supplier (supplier_id),
  INDEX idx_contracts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contract documents
CREATE TABLE IF NOT EXISTS contract_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  document_type ENUM('contract', 'amendment', 'correspondence', 'other') DEFAULT 'contract',
  uploaded_by INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  INDEX idx_contract_docs (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contract milestones
CREATE TABLE IF NOT EXISTS contract_milestones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending',
  completion_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  INDEX idx_milestones_contract (contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
