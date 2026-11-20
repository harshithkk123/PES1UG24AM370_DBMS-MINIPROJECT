-- ============================================================
-- FoundIt : Campus Lost-and-Found Portal   (MySQL 8.0+)
-- Run with:  mysql -u root -p < database/schema.sql
-- (uses DELIMITER, so run with the mysql CLI, not a driver)
-- ============================================================
DROP DATABASE IF EXISTS foundit;
CREATE DATABASE foundit CHARACTER SET utf8mb4;
USE foundit;

-- ---------- 1. TABLES (CREATE) ----------
CREATE TABLE user_account (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(60)  NOT NULL,
  email         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,              -- bcrypt hash, never plain text
  role          VARCHAR(10)  NOT NULL DEFAULT 'Student',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_user_email UNIQUE (email),
  CONSTRAINT chk_user_role CHECK (role IN ('Student','Staff','Admin')),
  CONSTRAINT chk_user_email CHECK (email LIKE '%_@_%._%')
);

CREATE TABLE category (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(40) NOT NULL,
  CONSTRAINT uq_category_name UNIQUE (name)
);

CREATE TABLE location (
  location_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(60) NOT NULL,
  block       VARCHAR(30) NOT NULL DEFAULT 'Main Campus',
  CONSTRAINT uq_location_name UNIQUE (name)
);

CREATE TABLE item_report (
  report_id   INT AUTO_INCREMENT PRIMARY KEY,
  reported_by INT          NOT NULL,
  category_id INT          NOT NULL,
  location_id INT          NOT NULL,
  type        VARCHAR(5)   NOT NULL,
  title       VARCHAR(80)  NOT NULL,
  description TEXT         NOT NULL,
  report_date DATE         NOT NULL,
  status      VARCHAR(10)  NOT NULL DEFAULT 'OPEN',
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_user     FOREIGN KEY (reported_by) REFERENCES user_account(user_id),
  CONSTRAINT fk_item_category FOREIGN KEY (category_id) REFERENCES category(category_id),
  CONSTRAINT fk_item_location FOREIGN KEY (location_id) REFERENCES location(location_id),
  CONSTRAINT chk_item_type    CHECK (type IN ('LOST','FOUND')),
  CONSTRAINT chk_item_status  CHECK (status IN ('OPEN','CLAIMED','CLOSED')),
  CONSTRAINT chk_item_title   CHECK (CHAR_LENGTH(TRIM(title)) >= 3)
);

CREATE TABLE claim (
  claim_id    INT AUTO_INCREMENT PRIMARY KEY,
  report_id   INT         NOT NULL,
  claimant_id INT         NOT NULL,
  proof_text  VARCHAR(500) NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claim_report   FOREIGN KEY (report_id)   REFERENCES item_report(report_id) ON DELETE CASCADE,
  CONSTRAINT fk_claim_claimant FOREIGN KEY (claimant_id) REFERENCES user_account(user_id),
  CONSTRAINT uq_claim_once     UNIQUE (report_id, claimant_id),
  CONSTRAINT chk_claim_status  CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  CONSTRAINT chk_claim_proof   CHECK (CHAR_LENGTH(TRIM(proof_text)) >= 5)
);

CREATE TABLE match_suggestion (
  lost_report_id  INT NOT NULL,
  found_report_id INT NOT NULL,
  score           DECIMAL(6,2) NOT NULL,
  PRIMARY KEY (lost_report_id, found_report_id),
  CONSTRAINT fk_match_lost  FOREIGN KEY (lost_report_id)  REFERENCES item_report(report_id) ON DELETE CASCADE,
  CONSTRAINT fk_match_found FOREIGN KEY (found_report_id) REFERENCES item_report(report_id) ON DELETE CASCADE
);

CREATE TABLE report_log (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  report_id  INT NOT NULL,
  old_status VARCHAR(10) NULL,
  new_status VARCHAR(10) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_report FOREIGN KEY (report_id) REFERENCES item_report(report_id) ON DELETE CASCADE
);

-- ---------- 2. ALTER / DROP demonstrations ----------
ALTER TABLE user_account ADD COLUMN phone VARCHAR(15) NULL AFTER email;
ALTER TABLE item_report  ADD COLUMN image_note VARCHAR(100) NULL;

CREATE TABLE temp_demo (id INT PRIMARY KEY);   -- scratch table to show DROP
DROP TABLE temp_demo;

-- ---------- 3. INDEXES ----------
CREATE INDEX idx_item_status   ON item_report (status);
CREATE INDEX idx_item_category ON item_report (category_id, report_date);
CREATE FULLTEXT INDEX ft_item_text ON item_report (title, description);

-- ---------- 4. VIEWS ----------
CREATE VIEW v_open_items AS
SELECT r.report_id, r.type, r.title, r.report_date,
       c.name AS category, l.name AS location, u.name AS reporter
FROM item_report r
JOIN category c     ON c.category_id = r.category_id
JOIN location l     ON l.location_id = r.location_id
JOIN user_account u ON u.user_id     = r.reported_by
WHERE r.status = 'OPEN';

CREATE VIEW v_recovery_by_category AS
SELECT c.name AS category,
       COUNT(*) AS total_reports,
       SUM(r.status = 'CLOSED') AS recovered,
       ROUND(100 * SUM(r.status = 'CLOSED') / COUNT(*), 1) AS recovery_pct
FROM item_report r JOIN category c ON c.category_id = r.category_id
GROUP BY c.name;

-- ---------- 5. TRIGGERS ----------
DELIMITER $$

-- 5a. Reject future dates (CHECK cannot use CURDATE(), so a trigger does it)
CREATE TRIGGER trg_item_before_insert BEFORE INSERT ON item_report
FOR EACH ROW
BEGIN
  IF NEW.report_date > CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Report date cannot be in the future';
  END IF;
END$$

-- 5b. Audit log: first status
CREATE TRIGGER trg_item_after_insert AFTER INSERT ON item_report
FOR EACH ROW
BEGIN
  INSERT INTO report_log (report_id, old_status, new_status)
  VALUES (NEW.report_id, NULL, NEW.status);
END$$

-- 5c. Audit log: every status change
CREATE TRIGGER trg_item_after_update AFTER UPDATE ON item_report
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO report_log (report_id, old_status, new_status)
    VALUES (NEW.report_id, OLD.status, NEW.status);
  END IF;
END$$

-- 5d. Claims allowed only on FOUND items that are still OPEN, and not on own report
CREATE TRIGGER trg_claim_before_insert BEFORE INSERT ON claim
FOR EACH ROW
BEGIN
  DECLARE v_type VARCHAR(5);
  DECLARE v_status VARCHAR(10);
  DECLARE v_owner INT;
  SELECT type, status, reported_by INTO v_type, v_status, v_owner
  FROM item_report WHERE report_id = NEW.report_id;
  IF v_type <> 'FOUND' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only FOUND items can be claimed';
  END IF;
  IF v_status <> 'OPEN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item is no longer open for claims';
  END IF;
  IF v_owner = NEW.claimant_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You cannot claim an item you reported';
  END IF;
END$$

-- ---------- 6. STORED PROCEDURES ----------

-- 6a. Approve one claim, reject the rest, mark item CLAIMED  (single transaction)
CREATE PROCEDURE approve_claim (IN p_claim_id INT)
BEGIN
  DECLARE v_report INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT report_id INTO v_report
  FROM claim WHERE claim_id = p_claim_id AND status = 'PENDING' FOR UPDATE;

  IF v_report IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Claim not found or not pending';
  END IF;

  UPDATE claim SET status = 'APPROVED' WHERE claim_id = p_claim_id;
  UPDATE claim SET status = 'REJECTED'
   WHERE report_id = v_report AND claim_id <> p_claim_id AND status = 'PENDING';
  UPDATE item_report SET status = 'CLAIMED' WHERE report_id = v_report;
  COMMIT;
END$$

-- 6b. Suggest matches for a report using full-text relevance + category/location bonus
CREATE PROCEDURE suggest_matches (IN p_report_id INT)
BEGIN
  DECLARE v_type VARCHAR(5);
  DECLARE v_cat INT;
  DECLARE v_loc INT;
  DECLARE v_text TEXT;

  SELECT type, category_id, location_id, CONCAT(title, ' ', description)
    INTO v_type, v_cat, v_loc, v_text
  FROM item_report WHERE report_id = p_report_id;

  INSERT INTO match_suggestion (lost_report_id, found_report_id, score)
  SELECT IF(v_type = 'LOST', p_report_id, r.report_id),
         IF(v_type = 'LOST', r.report_id, p_report_id),
         MATCH(r.title, r.description) AGAINST (v_text IN NATURAL LANGUAGE MODE)
           + IF(r.category_id = v_cat, 1.0, 0)
           + IF(r.location_id = v_loc, 0.5, 0)
  FROM item_report r
  WHERE r.type <> v_type
    AND r.status = 'OPEN'
    AND r.report_id <> p_report_id
    AND (r.category_id = v_cat
         OR MATCH(r.title, r.description) AGAINST (v_text IN NATURAL LANGUAGE MODE) > 0)
  ON DUPLICATE KEY UPDATE score = VALUES(score);
END$$

DELIMITER ;
