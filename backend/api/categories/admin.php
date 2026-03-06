<?php
/**
 * GET /api/categories/admin — List categories with tender count (admin only).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

requireAuth();
requireAdmin();

$pdo = $GLOBALS['pdo'];
$stmt = $pdo->query("
    SELECT tc.id, tc.name, tc.description, tc.color,
           (SELECT COUNT(*) FROM tenders t WHERE t.category_id = tc.id) AS tender_count
    FROM tender_categories tc
    ORDER BY tc.name ASC
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['tender_count'] = (int) $r['tender_count'];
}

jsonSuccess($rows);
