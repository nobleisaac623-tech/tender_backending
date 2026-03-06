<?php
/**
 * GET /api/tenders — List tenders (filtered by role). Auth required.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(1, (int) ($_GET['per_page'] ?? 10)));
$offset = ($page - 1) * $perPage;
$search = sanitizeString($_GET['search'] ?? null, 100);
$status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
$categoryId = isset($_GET['category_id']) ? (int) $_GET['category_id'] : 0;
$tag = sanitizeString($_GET['tag'] ?? null, 100);

$where = ['1=1'];
$params = [];

if ($user['role'] === 'admin') {
    if ($status !== '' && in_array($status, ['draft', 'published', 'closed', 'evaluated', 'awarded'], true)) {
        $where[] = 't.status = ?';
        $params[] = $status;
    }
} elseif ($user['role'] === 'evaluator') {
    $where[] = "t.status IN ('published', 'closed', 'evaluated', 'awarded') AND EXISTS (SELECT 1 FROM tender_evaluators te WHERE te.tender_id = t.id AND te.evaluator_id = ?)";
    $params[] = $user['user_id'];
} else {
    $where[] = "t.status = 'published' AND t.submission_deadline > NOW()";
}

if ($categoryId > 0) {
    $where[] = 't.category_id = ?';
    $params[] = $categoryId;
}

if ($tag !== '') {
    $where[] = 't.tags LIKE ?';
    $params[] = '%"' . str_replace(['\\', '"'], ['\\\\', '\\"'], $tag) . '"%';
}

if ($search !== '') {
    $where[] = '(t.title LIKE ? OR t.reference_number LIKE ? OR t.category LIKE ? OR tc.name LIKE ? OR t.tags LIKE ?)';
    $q = '%' . $search . '%';
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
}

$sql = "SELECT t.id, t.title, t.reference_number, t.category_id, t.category, t.tags, t.budget, t.submission_deadline, t.status, t.created_at,
        tc.name AS category_name, tc.color AS category_color,
        (SELECT COUNT(*) FROM bids WHERE tender_id = t.id) AS bids_count
        FROM tenders t
        LEFT JOIN tender_categories tc ON tc.id = t.category_id
        WHERE " . implode(' AND ', $where);
$countSql = "SELECT COUNT(*) FROM tenders t LEFT JOIN tender_categories tc ON tc.id = t.category_id WHERE " . implode(' AND ', $where);
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();

$params[] = $perPage;
$params[] = $offset;
$stmt = $pdo->prepare($sql . " ORDER BY t.submission_deadline ASC LIMIT ? OFFSET ?");
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

jsonSuccess([
    'items' => $rows,
    'total' => $total,
    'page' => $page,
    'per_page' => $perPage,
]);