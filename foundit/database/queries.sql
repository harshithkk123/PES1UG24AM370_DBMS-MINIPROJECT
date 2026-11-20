USE foundit;
-- Q1 JOIN: open items with category, location, reporter (view)
SELECT * FROM v_open_items ORDER BY report_date DESC;

-- Q2 GROUP BY + HAVING: locations with 2 or more reports
SELECT l.name AS location, COUNT(*) AS reports
FROM item_report r JOIN location l ON l.location_id = r.location_id
GROUP BY l.name HAVING COUNT(*) >= 2 ORDER BY reports DESC;

-- Q3 Aggregate + view: recovery rate per category
SELECT * FROM v_recovery_by_category ORDER BY recovery_pct DESC;

-- Q4 Subquery: students who reported something but never made a claim
SELECT u.name FROM user_account u
WHERE u.role = 'Student'
  AND u.user_id IN (SELECT reported_by FROM item_report)
  AND u.user_id NOT IN (SELECT claimant_id FROM claim);

-- Q5 Full-text search ranked by relevance
SELECT report_id, title, MATCH(title, description) AGAINST ('black wallet' IN NATURAL LANGUAGE MODE) AS score
FROM item_report
WHERE MATCH(title, description) AGAINST ('black wallet' IN NATURAL LANGUAGE MODE)
ORDER BY score DESC;

-- Q6 Average days between report and closure (uses audit log)
SELECT c.name AS category,
       ROUND(AVG(DATEDIFF(lg.changed_at, r.created_at)), 1) AS avg_days_to_close
FROM report_log lg
JOIN item_report r ON r.report_id = lg.report_id
JOIN category c    ON c.category_id = r.category_id
WHERE lg.new_status = 'CLOSED'
GROUP BY c.name;

-- Q7 DML demo
UPDATE item_report SET description = CONCAT(description, ' (verified)') WHERE report_id = 1;
DELETE FROM match_suggestion WHERE score < 0.5;

-- Q8 Stored procedures
CALL suggest_matches(1);
SELECT * FROM match_suggestion;
