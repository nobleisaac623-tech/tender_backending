-- Add suspend_reason and suspended_at columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS suspend_reason TEXT NULL AFTER status,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP NULL AFTER suspend_reason;

-- Create account_appeals table for handling suspension/blacklist appeals
CREATE TABLE IF NOT EXISTS account_appeals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_id INT NULL,
  supplier_email VARCHAR(255) NOT NULL,
  supplier_name VARCHAR(255),
  message TEXT NOT NULL,
  status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_supplier_email (supplier_email)
);
