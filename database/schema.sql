CREATE DATABASE IF NOT EXISTS igenext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE igenext;

CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(160) NULL,
  company VARCHAR(180) NULL,
  email_verified_at DATETIME NULL,
  status ENUM('active','blocked') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user_activity (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  activity_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id BIGINT UNSIGNED NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user_date (user_id, created_at),
  INDEX idx_activity_type_date (activity_type, created_at),
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE contact_leads (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  company VARCHAR(180) NOT NULL,
  designation VARCHAR(160) NULL,
  area_of_interest VARCHAR(180) NULL,
  message TEXT NOT NULL,
  status ENUM('new','contacted','qualified','closed') NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_created (created_at),
  INDEX idx_contact_status (status)
);

CREATE TABLE insights (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(220) NOT NULL UNIQUE,
  title VARCHAR(280) NOT NULL,
  summary TEXT NULL,
  body LONGTEXT NULL,
  topic VARCHAR(120) NULL,
  pdf_storage_key VARCHAR(500) NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE insight_downloads (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  insight_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_download_insight FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE,
  CONSTRAINT fk_download_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_download_insight_date (insight_id, downloaded_at)
);

CREATE TABLE jobs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(220) NOT NULL UNIQUE,
  title VARCHAR(220) NOT NULL,
  location VARCHAR(180) NULL,
  department VARCHAR(160) NULL,
  experience_label VARCHAR(120) NULL,
  employment_type VARCHAR(80) NULL,
  description LONGTEXT NOT NULL,
  status ENUM('draft','open','closed') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE job_applications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  job_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  linkedin_url VARCHAR(500) NULL,
  resume_storage_key VARCHAR(500) NULL,
  message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_application_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  INDEX idx_job_application_date (job_id, created_at)
);

-- Run once on an existing I-Genext database before starting the updated API.
-- contact_leads already contains phone and designation in the original schema.
CREATE TABLE IF NOT EXISTS contact_acknowledgements (
  lead_id BIGINT UNSIGNED PRIMARY KEY,
  reference VARCHAR(100) NOT NULL UNIQUE,
  status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  CONSTRAINT fk_acknowledgement_lead FOREIGN KEY (lead_id) REFERENCES contact_leads(id) ON DELETE CASCADE,
  INDEX idx_acknowledgement_queue (status, next_attempt_at)
);


-- Careers workflow (MySQL 8+). Run once against existing databases.
-- Separate tables preserve the original placeholder jobs/job_applications data.
CREATE TABLE IF NOT EXISTS career_openings (
  id CHAR(36) PRIMARY KEY,
  status ENUM('draft','open','closed') NOT NULL DEFAULT 'draft',
  data JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_career_openings_status (status)
);
CREATE TABLE IF NOT EXISTS career_applications (
  reference VARCHAR(50) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  data JSON NOT NULL,
  resume_content LONGBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_career_application_opening FOREIGN KEY (job_id) REFERENCES career_openings(id),
  INDEX idx_career_applications_created (created_at)
);
CREATE TABLE IF NOT EXISTS career_notifications (
  reference CHAR(36) PRIMARY KEY,
  application_reference VARCHAR(50) NOT NULL,
  kind ENUM('candidate','company') NOT NULL,
  status ENUM('pending','sending','sent','failed') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_career_notification_application FOREIGN KEY (application_reference) REFERENCES career_applications(reference) ON DELETE CASCADE,
  UNIQUE KEY idx_career_notification_kind (application_reference,kind),
  INDEX idx_career_notification_queue (status,next_attempt_at)
);


-- Insights CMS and encrypted social configuration, MySQL 8+.
-- Documents are separate rows: insights, settings, publication receipts and seed metadata.
CREATE TABLE IF NOT EXISTS cms_documents (
  collection VARCHAR(32) NOT NULL,
  id VARCHAR(160) NOT NULL,
  data JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (collection,id)
);
CREATE TABLE IF NOT EXISTS cms_mutex (
  id VARCHAR(32) PRIMARY KEY
);

