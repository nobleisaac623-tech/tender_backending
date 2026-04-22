<?php
/**
 * GET /api/tenders/public-show?id=1 — Single published tender (no auth). For public landing/tender view.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid tender ID', 400);
}

$pdo = $GLOBALS['pdo'];
$stmt = $pdo->prepare("
    SELECT t.id, t.title, t.reference_number, t.description, t.category_id, t.tags, t.budget, t.submission_deadline, t.opening_date, t.status, t.created_at,
           tc.name AS category_name, tc.color AS category_color
    FROM tenders t
    LEFT JOIN tender_categories tc ON tc.id = t.category_id
    WHERE t.id = ? AND t.status = 'published'
");
$stmt->execute([$id]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}

$tender['id'] = (int) $tender['id'];
$tender['category_id'] = $tender['category_id'] !== null ? (int) $tender['category_id'] : null;
if ($tender['budget'] !== null) $tender['budget'] = (float) $tender['budget'];
if (!empty($tender['tags'])) {
    $dec = json_decode($tender['tags'], true);
    $tender['tags'] = is_array($dec) ? $dec : [];
} else {
    $tender['tags'] = [];
}

$stmt = $pdo->prepare("SELECT id, filename, original_name, file_size, uploaded_at FROM tender_documents WHERE tender_id = ?");
$stmt->execute([$id]);
$tender['documents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonSuccess($tender);