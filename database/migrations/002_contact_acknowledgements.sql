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
