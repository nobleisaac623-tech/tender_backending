<?php
/**
 * PUT /api/tenders/update — Admin update tender (draft only for major changes).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$id = isset($body['id']) ? (int) $body['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid tender ID', 400);
}

$stmt = $pdo->prepare("SELECT id, status, description FROM tenders WHERE id = ?");
$stmt->execute([$id]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}

$title = sanitizeString($body['title'] ?? null, 255);
$ref = sanitizeString($body['reference_number'] ?? null, 100);
$description = sanitizeString($body['description'] ?? null, 10000);
$categoryId = isset($body['category_id']) ? (int) $body['category_id'] : null;
$tagsInput = $body['tags'] ?? null;
$budget = isset($body['budget']) ? (is_numeric($body['budget']) ? (float) $body['budget'] : null) : null;
$submissionDeadline = trim((string) ($body['submission_deadline'] ?? ''));
$openingDate = trim((string) ($body['opening_date'] ?? ''));

$tagsJson = null;
if ($tagsInput !== null) {
    if (is_array($tagsInput)) {
        $tagsArr = array_values(array_unique(array_filter(array_map('trim', array_map('strval', $tagsInput)))));
        $tagsArr = array_slice($tagsArr, 0, 20);
        $tagsJson = json_encode($tagsArr);
    } else {
        $tagsStr = trim((string) $tagsInput);
        $tagsArr = array_values(array_unique(array_filter(array_map('trim', explode(',', $tagsStr)))));
        $tagsArr = array_slice($tagsArr, 0, 20);
        $tagsJson = json_encode($tagsArr);
    }
    if (strlen($tagsJson) > 500) $tagsJson = null;
}

$openingTs = $openingDate !== '' ? strtotime($openingDate) : null;

if ($title !== '') {
    $updates = ["title = ?", "description = ?", "budget = ?", "submission_deadline = ?", "opening_date = ?", "updated_at = NOW()"];
    $params = [$title, $description ?: $tender['description'] ?? '', $budget, $submissionDeadline ?: null, $openingTs ? date('Y-m-d H:i:s', $openingTs) : null];
    if ($categoryId !== null && $categoryId > 0) {
        $stmt = $pdo->prepare("SELECT 1 FROM tender_categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        if ($stmt->fetch()) {
            $updates[] = "category_id = ?";
            $params[] = $categoryId;
        }
    }
    if ($tagsJson !== null) {
        $updates[] = "tags = ?";
        $params[] = $tagsJson;
    }
    $params[] = $id;
    $stmt = $pdo->prepare("UPDATE tenders SET " . implode(', ', $updates) . " WHERE id = ?");
    $stmt->execute($params);
}
if ($ref !== '') {
    $stmt = $pdo->prepare("SELECT 1 FROM tenders WHERE reference_number = ? AND id != ?");
    $stmt->execute([$ref, $id]);
    if ($stmt->fetch()) {
        jsonError('Reference number already exists', 409);
    }
    $stmt = $pdo->prepare("UPDATE tenders SET reference_number = ? WHERE id = ?");
    $stmt->execute([$ref, $id]);
}

auditLog($pdo, $user['user_id'], 'tender_updated', 'tenders', $id, null);
jsonSuccess(['message' => 'Tender updated']);