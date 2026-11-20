USE foundit;
-- Demo accounts use password Password@123. The hash is set by: npm run seed:users
INSERT INTO user_account (name, email, password_hash, role) VALUES
('Admin User',   'admin@foundit.edu',   'PLACEHOLDER_RUN_npm_run_seed_users', 'Admin'),
('Security Desk','staff@foundit.edu',   'PLACEHOLDER_RUN_npm_run_seed_users', 'Staff'),
('Harshith',     'harshith@foundit.edu','PLACEHOLDER_RUN_npm_run_seed_users', 'Student'),
('Ananya Rao',   'ananya@foundit.edu',  'PLACEHOLDER_RUN_npm_run_seed_users', 'Student'),
('Rahul Kumar',  'rahul@foundit.edu',   'PLACEHOLDER_RUN_npm_run_seed_users', 'Student');

INSERT INTO category (name) VALUES ('Wallet'),('Electronics'),('ID Card'),('Bag'),('Keys'),('Books'),('Clothing');

INSERT INTO location (name, block) VALUES
('Main Library','Academic'),('Canteen','Central'),('Hostel A Block','RR Campus'),
('CS Department','Academic'),('Sports Ground','Central'),('Parking Lot','Main Gate');

-- type, title, description, category, location, reporter ids: 3=Harshith 4=Ananya 5=Rahul
INSERT INTO item_report (reported_by, category_id, location_id, type, title, description, report_date, status) VALUES
(3, 1, 1, 'LOST',  'Black leather wallet', 'Black leather wallet with student ID and some cash, lost near library reading hall', '2025-10-20', 'OPEN'),
(4, 1, 1, 'FOUND', 'Black wallet found',   'Found a black leather wallet with cards near the library reading hall', '2025-10-21', 'OPEN'),
(5, 2, 4, 'LOST',  'Silver laptop charger','Silver 65W laptop charger left in CS department lab 2', '2025-10-22', 'OPEN'),
(4, 2, 4, 'FOUND', 'Laptop charger',       'Silver laptop charger found in CS lab, 65W adapter', '2025-10-23', 'OPEN'),
(5, 5, 2, 'FOUND', 'Bunch of keys',        'Three keys on a blue keychain found in the canteen', '2025-10-24', 'OPEN'),
(3, 3, 3, 'FOUND', 'Student ID card',      'ID card found outside Hostel A block gate', '2025-10-18', 'CLOSED'),
(4, 4, 6, 'LOST',  'Grey backpack',        'Grey backpack with notebooks lost at parking lot', '2025-10-25', 'OPEN'),
(3, 6, 1, 'FOUND', 'Database textbook',    'Database Management Systems textbook found in the library', '2025-10-26', 'OPEN');

INSERT INTO claim (report_id, claimant_id, proof_text) VALUES
(2, 3, 'Wallet has my student ID PES1UG24AM370 and a 500 rupee note'),
(5, 3, 'Blue keychain with a small football charm');
CALL suggest_matches(1);
CALL suggest_matches(3);
