<?php
/**
 * GET /api/tenders/show?id=1 — Single tender. Public for published; auth for draft/etc.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid tender ID', 400);
}

$pdo = $GLOBALS['pdo'];
$stmt = $pdo->prepare("
    SELECT t.*, tc.name AS category_name, tc.color AS category_color
    FROM tenders t
    LEFT JOIN tender_categories tc ON tc.id = t.category_id
    WHERE t.id = ?
");
$stmt->execute([$id]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}

$tender['id'] = (int) $tender['id'];
$tender['created_by'] = (int) $tender['created_by'];
$tender['category_id'] = $tender['category_id'] !== null ? (int) $tender['category_id'] : null;
if ($tender['budget'] !== null) $tender['budget'] = (float) $tender['budget'];
if (!empty($tender['tags'])) {
    $dec = json_decode($tender['tags'], true);
    $tender['tags'] = is_array($dec) ? $dec : [];
} else {
    $tender['tags'] = [];
}

if ($tender['status'] !== 'published') {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        if ($user['role'] === 'evaluator') {
            $stmt = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
            $stmt->execute([$id, $user['user_id']]);
            if (!$stmt->fetch()) {
                jsonError('Forbidden', 403);
            }
        } else {
            jsonError('Forbidden', 403);
        }
    }
}

$stmt = $pdo->prepare("SELECT id, filename, original_name, file_size, uploaded_at FROM tender_documents WHERE tender_id = ?");
$stmt->execute([$id]);
$tender['documents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("SELECT id, name, description, max_score, weight FROM evaluation_criteria WHERE tender_id = ?");
$stmt->execute([$id]);
$tender['criteria'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonSuccess($tender);