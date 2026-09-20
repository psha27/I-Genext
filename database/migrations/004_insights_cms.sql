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
