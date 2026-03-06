-- Supplier Evaluation & Tender Management System
-- MySQL 8 Database Schema + Seed Data

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Users (all roles in one table)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'evaluator', 'supplier') NOT NULL,
  status ENUM('pending', 'active', 'suspended') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role_status (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier Profiles (extended info for supplier role)
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100),
  address TEXT,
  phone VARCHAR(50),
  website VARCHAR(255),
  category VARCHAR(100),
  tax_id VARCHAR(100),
  is_approved TINYINT(1) DEFAULT 0,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_approved (is_approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tenders
CREATE TABLE IF NOT EXISTS tenders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100),
  category_id INT NULL,
  tags VARCHAR(500) DEFAULT NULL,
  budget DECIMAL(15,2),
  submission_deadline DATETIME NOT NULL,
  opening_date DATETIME,
  status ENUM('draft', 'published', 'closed', 'evaluated', 'awarded') DEFAULT 'draft',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_status (status),
  INDEX idx_deadline (submission_deadline),
  INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tender categories (predefined)
CREATE TABLE IF NOT EXISTS tender_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  color VARCHAR(7) DEFAULT '#1e3a5f',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default categories
INSERT INTO tender_categories (name, description, color) VALUES
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

-- Tender Documents (files attached to a tender by admin)
CREATE TABLE IF NOT EXISTS tender_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
  INDEX idx_tender (tender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tender Evaluators (assign evaluators to tenders)
CREATE TABLE IF NOT EXISTS tender_evaluators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL,
  evaluator_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_tender_evaluator (tender_id, evaluator_id),
  FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bids (submitted by suppliers)
CREATE TABLE IF NOT EXISTS bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL,
  supplier_id INT NOT NULL,
  bid_amount DECIMAL(15,2),
  technical_proposal TEXT,
  status ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected') DEFAULT 'draft',
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_bid (tender_id, supplier_id),
  FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tender_status (tender_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bid Documents (files uploaded by supplier with their bid)
CREATE TABLE IF NOT EXISTS bid_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bid_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_size INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
  INDEX idx_bid (bid_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evaluation Criteria (defined per tender)
CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tender_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_score INT NOT NULL DEFAULT 100,
  weight DECIMAL(5,2) DEFAULT 1.00,
  FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
  INDEX idx_tender (tender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Evaluations (scores given by evaluators)
CREATE TABLE IF NOT EXISTS evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bid_id INT NOT NULL,
  evaluator_id INT NOT NULL,
  criteria_id INT NOT NULL,
  score INT NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_eval (bid_id, evaluator_id, criteria_id),
  FOREIGN KEY (bid_id) REFERENCES bids(id) ON DELETE CASCADE,
  FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (criteria_id) REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  INDEX idx_bid (bid_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INT,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invalidated JWT tokens (for logout)
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_hash (token_hash),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login rate limiting
CREATE TABLE IF NOT EXISTS login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_time (ip_address, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Supplier blacklist (admins can blacklist suppliers; blacklisted cannot login or bid)
CREATE TABLE IF NOT EXISTS supplier_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blacklisted_by INT NOT NULL,
  blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lifted_by INT NULL,
  lifted_at TIMESTAMP NULL,
  lift_reason TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blacklisted_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lifted_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_supplier_active (supplier_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contracts (after tender is awarded)
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

SET FOREIGN_KEY_CHECKS = 1;

-- ============ SEED DATA ============

-- Seed users. Password for all: "password" (bcrypt). Change after first login in production.
INSERT INTO users (name, email, password, role, status) VALUES
('System Admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active'),
('Jane Evaluator', 'evaluator@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'evaluator', 'active'),
('Acme Supplies Ltd', 'supplier@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'supplier', 'pending');

-- Get IDs for seed (admin=1, evaluator=2, supplier=3 typically)
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1);
SET @evaluator_id = (SELECT id FROM users WHERE email = 'evaluator@example.com' LIMIT 1);
SET @supplier_id = (SELECT id FROM users WHERE email = 'supplier@example.com' LIMIT 1);

-- Supplier profile for sample supplier
INSERT INTO supplier_profiles (user_id, company_name, registration_number, address, phone, category, is_approved)
SELECT id, 'Acme Supplies Ltd', 'REG-001', '123 Business St', '+1234567890', 'General', 0 FROM users WHERE email = 'supplier@example.com' LIMIT 1;

-- Sample tender (draft)
INSERT INTO tenders (title, reference_number, description, category, category_id, budget, submission_deadline, opening_date, status, created_by)
SELECT 'Office Supplies Framework', 'TND-2024-001', 'Annual framework agreement for office supplies including stationery, printing paper, and consumables.', 'Office Supplies', (SELECT id FROM tender_categories WHERE name = 'Office Supplies' LIMIT 1), 50000.00, DATE_ADD(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 31 DAY), 'draft', id FROM users WHERE email = 'admin@example.com' LIMIT 1;

-- Sample published tender
INSERT INTO tenders (title, reference_number, description, category, category_id, budget, submission_deadline, opening_date, status, created_by)
SELECT 'IT Hardware Procurement', 'TND-2024-002', 'Procurement of laptops, monitors, and peripherals for company-wide refresh.', 'IT Equipment', (SELECT id FROM tender_categories WHERE name = 'IT & Technology' LIMIT 1), 120000.00, DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 15 DAY), 'published', id FROM users WHERE email = 'admin@example.com' LIMIT 1;

-- Evaluation criteria for sample published tender
INSERT INTO evaluation_criteria (tender_id, name, description, max_score, weight)
SELECT id, 'Price', 'Competitiveness of bid amount', 100, 0.4 FROM tenders WHERE reference_number = 'TND-2024-002' LIMIT 1;
INSERT INTO evaluation_criteria (tender_id, name, description, max_score, weight)
SELECT id, 'Technical Capability', 'Ability to deliver and support', 100, 0.35 FROM tenders WHERE reference_number = 'TND-2024-002' LIMIT 1;
INSERT INTO evaluation_criteria (tender_id, name, description, max_score, weight)
SELECT id, 'Delivery Timeline', 'Proposed delivery schedule', 100, 0.25 FROM tenders WHERE reference_number = 'TND-2024-002' LIMIT 1;

-- Assign evaluator to published tender
INSERT INTO tender_evaluators (tender_id, evaluator_id)
SELECT t.id, u.id FROM tenders t, users u WHERE t.reference_number = 'TND-2024-002' AND u.email = 'evaluator@example.com' LIMIT 1;
