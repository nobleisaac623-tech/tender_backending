<?php
/**
 * GET /api/tenders/public — List published tenders (no auth).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$pdo = $GLOBALS['pdo'];
$categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;
$tag = sanitizeString($_GET['tag'] ?? null, 100);
$search = sanitizeString($_GET['search'] ?? null, 100);

$where = "t.status = 'published' AND t.submission_deadline > NOW()";
$params = [];

if ($categoryId > 0) {
    $where .= ' AND t.category_id = ?';
    $params[] = $categoryId;
}

if ($tag !== '') {
    $where .= ' AND t.tags LIKE ?';
    $params[] = '%"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $tag) . '"%';
}

if ($search !== '') {
    $where .= ' AND (t.title LIKE ? OR t.reference_number LIKE ? OR tc.name LIKE ? OR t.tags LIKE ?)';
    $q = '%' . $search . '%';
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
}

$sql = "SELECT t.id, t.title, t.reference_number, t.category_id, t.tags, t.budget, t.submission_deadline, t.created_at,
        tc.name AS category_name, tc.color AS category_color
        FROM tenders t
        LEFT JOIN tender_categories tc ON tc.id = t.category_id
        WHERE $where
        ORDER BY t.submission_deadline ASC";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['category_id'] = $r['category_id'] !== null ? (int) $r['category_id'] : null;
    if ($r['budget'] !== null) $r['budget'] = (float) $r['budget'];
    if (!empty($r['tags'])) {
        $dec = json_decode($r['tags'], true);
        $r['tags'] = is_array($dec) ? $dec : [];
    } else {
        $r['tags'] = [];
    }
}
jsonSuccess($rows);