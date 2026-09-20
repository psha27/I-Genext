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
