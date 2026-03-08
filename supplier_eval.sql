-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 06, 2026 at 10:46 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `supplier_eval`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_log`
--

INSERT INTO `audit_log` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:32:41'),
(2, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:37:26'),
(3, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:38:27'),
(4, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:52:16'),
(5, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:52:31'),
(6, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:53:06'),
(7, 2, 'login', 'users', 2, NULL, '::1', '2026-03-06 18:53:26'),
(8, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:55:02'),
(9, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:55:33'),
(10, NULL, 'supplier_registered', 'users', 4, 'Email: test@company.com', '::1', '2026-03-06 18:55:46'),
(11, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 18:56:07'),
(12, 1, 'logout', 'users', 1, NULL, '::1', '2026-03-06 19:45:23'),
(13, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 19:45:29'),
(14, 1, 'logout', 'users', 1, NULL, '::1', '2026-03-06 20:28:28'),
(15, 1, 'login', 'users', 1, NULL, '::1', '2026-03-06 21:36:45');

-- --------------------------------------------------------

--
-- Table structure for table `bids`
--

CREATE TABLE `bids` (
  `id` int(11) NOT NULL,
  `tender_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `bid_amount` decimal(15,2) DEFAULT NULL,
  `technical_proposal` text DEFAULT NULL,
  `status` enum('draft','submitted','under_review','accepted','rejected') DEFAULT 'draft',
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bid_documents`
--

CREATE TABLE `bid_documents` (
  `id` int(11) NOT NULL,
  `bid_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contracts`
--

CREATE TABLE `contracts` (
  `id` int(11) NOT NULL,
  `tender_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `contract_number` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `contract_value` decimal(15,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('draft','active','completed','terminated','disputed') DEFAULT 'draft',
  `signed_by_admin` tinyint(1) DEFAULT 0,
  `signed_by_supplier` tinyint(1) DEFAULT 0,
  `admin_signed_at` timestamp NULL DEFAULT NULL,
  `supplier_signed_at` timestamp NULL DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contract_documents`
--

CREATE TABLE `contract_documents` (
  `id` int(11) NOT NULL,
  `contract_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `document_type` enum('contract','amendment','correspondence','other') DEFAULT 'contract',
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contract_milestones`
--

CREATE TABLE `contract_milestones` (
  `id` int(11) NOT NULL,
  `contract_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `due_date` date NOT NULL,
  `status` enum('pending','in_progress','completed','overdue') DEFAULT 'pending',
  `completion_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluations`
--

CREATE TABLE `evaluations` (
  `id` int(11) NOT NULL,
  `bid_id` int(11) NOT NULL,
  `evaluator_id` int(11) NOT NULL,
  `criteria_id` int(11) NOT NULL,
  `score` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `evaluation_criteria`
--

CREATE TABLE `evaluation_criteria` (
  `id` int(11) NOT NULL,
  `tender_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `max_score` int(11) NOT NULL DEFAULT 100,
  `weight` decimal(5,2) DEFAULT 1.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `evaluation_criteria`
--

INSERT INTO `evaluation_criteria` (`id`, `tender_id`, `name`, `description`, `max_score`, `weight`) VALUES
(1, 2, 'Price', 'Competitiveness of bid amount', 100, 0.40),
(2, 2, 'Technical Capability', 'Ability to deliver and support', 100, 0.35),
(3, 2, 'Delivery Timeline', 'Proposed delivery schedule', 100, 0.25);

-- --------------------------------------------------------

--
-- Table structure for table `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_blacklist`
--

CREATE TABLE `supplier_blacklist` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `reason` text NOT NULL,
  `blacklisted_by` int(11) NOT NULL,
  `blacklisted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `lifted_by` int(11) DEFAULT NULL,
  `lifted_at` timestamp NULL DEFAULT NULL,
  `lift_reason` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supplier_profiles`
--

CREATE TABLE `supplier_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `is_approved` tinyint(1) DEFAULT 0,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `supplier_profiles`
--

INSERT INTO `supplier_profiles` (`id`, `user_id`, `company_name`, `registration_number`, `address`, `phone`, `website`, `category`, `tax_id`, `is_approved`, `approved_by`, `approved_at`) VALUES
(1, 3, 'Acme Supplies Ltd', 'REG-001', '123 Business St', '+1234567890', NULL, 'General', NULL, 0, NULL, NULL),
(2, 4, 'Test Company Ltd', 'TEST-001', '', '', '', '', '', 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `supplier_ratings`
--

CREATE TABLE `supplier_ratings` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `contract_id` int(11) NOT NULL,
  `tender_id` int(11) NOT NULL,
  `rated_by` int(11) NOT NULL,
  `quality_score` int(11) NOT NULL COMMENT '1-5',
  `delivery_score` int(11) NOT NULL COMMENT '1-5',
  `communication_score` int(11) NOT NULL COMMENT '1-5',
  `compliance_score` int(11) NOT NULL COMMENT '1-5',
  `overall_score` decimal(3,2) GENERATED ALWAYS AS ((`quality_score` + `delivery_score` + `communication_score` + `compliance_score`) / 4.0) STORED,
  `comments` text DEFAULT NULL,
  `rated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenders`
--

CREATE TABLE `tenders` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `reference_number` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `tags` varchar(500) DEFAULT NULL,
  `budget` decimal(15,2) DEFAULT NULL,
  `submission_deadline` datetime NOT NULL,
  `opening_date` datetime DEFAULT NULL,
  `status` enum('draft','published','closed','evaluated','awarded') DEFAULT 'draft',
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tenders`
--

INSERT INTO `tenders` (`id`, `title`, `reference_number`, `description`, `category`, `category_id`, `tags`, `budget`, `submission_deadline`, `opening_date`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Office Supplies Framework', 'TND-2024-001', 'Annual framework agreement for office supplies including stationery, printing paper, and consumables.', 'Office Supplies', 4, NULL, 50000.00, '2026-04-05 18:32:05', '2026-04-06 18:32:05', 'draft', 1, '2026-03-06 18:32:05', '2026-03-06 18:32:05'),
(2, 'IT Hardware Procurement', 'TND-2024-002', 'Procurement of laptops, monitors, and peripherals for company-wide refresh.', 'IT Equipment', 1, NULL, 120000.00, '2026-03-20 18:32:06', '2026-03-21 18:32:06', 'published', 1, '2026-03-06 18:32:06', '2026-03-06 18:32:06');

-- --------------------------------------------------------

--
-- Table structure for table `tender_categories`
--

CREATE TABLE `tender_categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `color` varchar(7) DEFAULT '#1e3a5f',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tender_categories`
--

INSERT INTO `tender_categories` (`id`, `name`, `description`, `color`, `created_at`) VALUES
(1, 'IT & Technology', 'Software, hardware, IT services', '#3b82f6', '2026-03-06 18:32:05'),
(2, 'Construction', 'Buildings, roads, infrastructure', '#f59e0b', '2026-03-06 18:32:05'),
(3, 'Health & Medical', 'Medical supplies, equipment, services', '#10b981', '2026-03-06 18:32:05'),
(4, 'Office Supplies', 'Stationery, furniture, equipment', '#8b5cf6', '2026-03-06 18:32:05'),
(5, 'Consultancy', 'Professional and advisory services', '#ec4899', '2026-03-06 18:32:05'),
(6, 'Transport & Logistics', 'Vehicles, shipping, delivery', '#f97316', '2026-03-06 18:32:05'),
(7, 'Food & Catering', 'Food supplies and catering services', '#14b8a6', '2026-03-06 18:32:05'),
(8, 'Security Services', 'Guards, CCTV, access control', '#6b7280', '2026-03-06 18:32:05'),
(9, 'Cleaning Services', 'Janitorial and cleaning contracts', '#84cc16', '2026-03-06 18:32:05'),
(10, 'Other', 'Miscellaneous tenders', '#94a3b8', '2026-03-06 18:32:05');

-- --------------------------------------------------------

--
-- Table structure for table `tender_documents`
--

CREATE TABLE `tender_documents` (
  `id` int(11) NOT NULL,
  `tender_id` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tender_evaluators`
--

CREATE TABLE `tender_evaluators` (
  `id` int(11) NOT NULL,
  `tender_id` int(11) NOT NULL,
  `evaluator_id` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tender_evaluators`
--

INSERT INTO `tender_evaluators` (`id`, `tender_id`, `evaluator_id`, `assigned_at`) VALUES
(1, 2, 2, '2026-03-06 18:32:06');

-- --------------------------------------------------------

--
-- Table structure for table `token_blacklist`
--

CREATE TABLE `token_blacklist` (
  `id` int(11) NOT NULL,
  `token_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `token_blacklist`
--

INSERT INTO `token_blacklist` (`id`, `token_hash`, `expires_at`) VALUES
(1, '0cf8c9deeaaeb7e0ae05a19f8eb69b8293756e4aac1730e34d14556022b731c7', '2026-03-07 02:32:41'),
(2, '617497ac4ea428397b67fc63ff76606d63281c6e9aebe71bd5ba48b6aa412390', '2026-03-07 03:45:29');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','evaluator','supplier') NOT NULL,
  `status` enum('pending','active','suspended') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`, `created_at`, `updated_at`) VALUES
(1, 'System Admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active', '2026-03-06 18:32:05', '2026-03-06 18:32:05'),
(2, 'Jane Evaluator', 'evaluator@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'evaluator', 'active', '2026-03-06 18:32:05', '2026-03-06 18:32:05'),
(3, 'Acme Supplies Ltd', 'supplier@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'supplier', 'pending', '2026-03-06 18:32:05', '2026-03-06 18:32:05'),
(4, 'Test Company', 'test@company.com', '$2y$10$78boiVfYa.pXwNvjCglpveg4hadwN0gwLnfnW2LZLJ58LQ4j3Fl8u', 'supplier', 'pending', '2026-03-06 18:55:46', '2026-03-06 18:55:46');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`user_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `bids`
--
ALTER TABLE `bids`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_bid` (`tender_id`,`supplier_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `idx_tender_status` (`tender_id`,`status`);

--
-- Indexes for table `bid_documents`
--
ALTER TABLE `bid_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bid` (`bid_id`);

--
-- Indexes for table `contracts`
--
ALTER TABLE `contracts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `tender_id` (`tender_id`),
  ADD UNIQUE KEY `contract_number` (`contract_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_contracts_supplier` (`supplier_id`),
  ADD KEY `idx_contracts_status` (`status`);

--
-- Indexes for table `contract_documents`
--
ALTER TABLE `contract_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `idx_contract_docs` (`contract_id`);

--
-- Indexes for table `contract_milestones`
--
ALTER TABLE `contract_milestones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_milestones_contract` (`contract_id`);

--
-- Indexes for table `evaluations`
--
ALTER TABLE `evaluations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_eval` (`bid_id`,`evaluator_id`,`criteria_id`),
  ADD KEY `evaluator_id` (`evaluator_id`),
  ADD KEY `criteria_id` (`criteria_id`),
  ADD KEY `idx_bid` (`bid_id`);

--
-- Indexes for table `evaluation_criteria`
--
ALTER TABLE `evaluation_criteria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tender` (`tender_id`);

--
-- Indexes for table `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ip_time` (`ip_address`,`attempted_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_read` (`user_id`,`is_read`);

--
-- Indexes for table `supplier_blacklist`
--
ALTER TABLE `supplier_blacklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `supplier_id` (`supplier_id`),
  ADD KEY `blacklisted_by` (`blacklisted_by`),
  ADD KEY `lifted_by` (`lifted_by`),
  ADD KEY `idx_supplier_active` (`supplier_id`,`is_active`);

--
-- Indexes for table `supplier_profiles`
--
ALTER TABLE `supplier_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_approved` (`is_approved`);

--
-- Indexes for table `supplier_ratings`
--
ALTER TABLE `supplier_ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `contract_id` (`contract_id`),
  ADD KEY `tender_id` (`tender_id`),
  ADD KEY `rated_by` (`rated_by`),
  ADD KEY `idx_ratings_supplier` (`supplier_id`);

--
-- Indexes for table `tenders`
--
ALTER TABLE `tenders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_deadline` (`submission_deadline`),
  ADD KEY `idx_category_id` (`category_id`);

--
-- Indexes for table `tender_categories`
--
ALTER TABLE `tender_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `tender_documents`
--
ALTER TABLE `tender_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tender` (`tender_id`);

--
-- Indexes for table `tender_evaluators`
--
ALTER TABLE `tender_evaluators`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tender_evaluator` (`tender_id`,`evaluator_id`),
  ADD KEY `evaluator_id` (`evaluator_id`);

--
-- Indexes for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_hash` (`token_hash`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role_status` (`role`,`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `bids`
--
ALTER TABLE `bids`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bid_documents`
--
ALTER TABLE `bid_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contracts`
--
ALTER TABLE `contracts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contract_documents`
--
ALTER TABLE `contract_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contract_milestones`
--
ALTER TABLE `contract_milestones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `evaluations`
--
ALTER TABLE `evaluations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `evaluation_criteria`
--
ALTER TABLE `evaluation_criteria`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_blacklist`
--
ALTER TABLE `supplier_blacklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `supplier_profiles`
--
ALTER TABLE `supplier_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `supplier_ratings`
--
ALTER TABLE `supplier_ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tenders`
--
ALTER TABLE `tenders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tender_categories`
--
ALTER TABLE `tender_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `tender_documents`
--
ALTER TABLE `tender_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tender_evaluators`
--
ALTER TABLE `tender_evaluators`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `token_blacklist`
--
ALTER TABLE `token_blacklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bids`
--
ALTER TABLE `bids`
  ADD CONSTRAINT `bids_ibfk_1` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bids_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `bid_documents`
--
ALTER TABLE `bid_documents`
  ADD CONSTRAINT `bid_documents_ibfk_1` FOREIGN KEY (`bid_id`) REFERENCES `bids` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `contracts`
--
ALTER TABLE `contracts`
  ADD CONSTRAINT `contracts_ibfk_1` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`),
  ADD CONSTRAINT `contracts_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `contracts_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `contract_documents`
--
ALTER TABLE `contract_documents`
  ADD CONSTRAINT `contract_documents_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `contract_documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `contract_milestones`
--
ALTER TABLE `contract_milestones`
  ADD CONSTRAINT `contract_milestones_ibfk_1` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `evaluations`
--
ALTER TABLE `evaluations`
  ADD CONSTRAINT `evaluations_ibfk_1` FOREIGN KEY (`bid_id`) REFERENCES `bids` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `evaluations_ibfk_2` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `evaluations_ibfk_3` FOREIGN KEY (`criteria_id`) REFERENCES `evaluation_criteria` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `evaluation_criteria`
--
ALTER TABLE `evaluation_criteria`
  ADD CONSTRAINT `evaluation_criteria_ibfk_1` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `supplier_blacklist`
--
ALTER TABLE `supplier_blacklist`
  ADD CONSTRAINT `supplier_blacklist_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_blacklist_ibfk_2` FOREIGN KEY (`blacklisted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_blacklist_ibfk_3` FOREIGN KEY (`lifted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `supplier_profiles`
--
ALTER TABLE `supplier_profiles`
  ADD CONSTRAINT `supplier_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `supplier_profiles_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `supplier_ratings`
--
ALTER TABLE `supplier_ratings`
  ADD CONSTRAINT `supplier_ratings_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `supplier_ratings_ibfk_2` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`),
  ADD CONSTRAINT `supplier_ratings_ibfk_3` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`),
  ADD CONSTRAINT `supplier_ratings_ibfk_4` FOREIGN KEY (`rated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `tenders`
--
ALTER TABLE `tenders`
  ADD CONSTRAINT `tenders_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `tender_documents`
--
ALTER TABLE `tender_documents`
  ADD CONSTRAINT `tender_documents_ibfk_1` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tender_evaluators`
--
ALTER TABLE `tender_evaluators`
  ADD CONSTRAINT `tender_evaluators_ibfk_1` FOREIGN KEY (`tender_id`) REFERENCES `tenders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tender_evaluators_ibfk_2` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
