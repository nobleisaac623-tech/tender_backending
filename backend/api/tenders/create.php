<?php
/**
 * POST /api/tenders/create — Admin create tender.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$title = sanitizeString($body['title'] ?? null, 255);
$ref = sanitizeString($body['reference_number'] ?? null, 100);
$description = sanitizeString($body['description'] ?? null, 10000);
$categoryId = isset($body['category_id']) ? (int) $body['category_id'] : 0;
$tagsInput = $body['tags'] ?? null;
$budget = isset($body['budget']) ? (is_numeric($body['budget']) ? (float) $body['budget'] : null) : null;
$submissionDeadline = trim((string) ($body['submission_deadline'] ?? ''));
$openingDate = trim((string) ($body['opening_date'] ?? ''));

$err = validateRequired($title, 'Title');
if ($err === '') $err = validateRequired($ref, 'Reference number');
if ($err === '') $err = validateRequired($description, 'Description');
if ($err === '') $err = validateRequired($submissionDeadline, 'Submission deadline');
if ($err === '') {
    if ($categoryId <= 0) {
        $err = 'Category is required';
    } else {
        $stmt = $pdo->prepare("SELECT id FROM tender_categories WHERE id = ?");
        $stmt->execute([$categoryId]);
        if (!$stmt->fetch()) {
            $err = 'Invalid category';
        }
    }
}
if ($err !== '') {
    jsonError($err, 400);
}

$tagsJson = null;
if ($tagsInput !== null && $tagsInput !== '') {
    if (is_array($tagsInput)) {
        $tagsArr = array_values(array_unique(array_filter(array_map('trim', array_map('strval', $tagsInput)))));
        $tagsArr = array_slice($tagsArr, 0, 20);
        $tagsJson = json_encode($tagsArr);
    } else {
        $tagsStr = trim((string) $tagsInput);
        if ($tagsStr !== '') {
            $tagsArr = array_values(array_unique(array_filter(array_map('trim', explode(',', $tagsStr)))));
            $tagsArr = array_slice($tagsArr, 0, 20);
            $tagsJson = json_encode($tagsArr);
        }
    }
}
if ($tagsJson !== null && strlen($tagsJson) > 500) {
    $tagsJson = null;
}

if (strtotime($submissionDeadline) === false) {
    jsonError('Invalid submission deadline', 400);
}
$openingTs = $openingDate !== '' ? strtotime($openingDate) : false;

$stmt = $pdo->prepare("SELECT 1 FROM tenders WHERE reference_number = ?");
$stmt->execute([$ref]);
if ($stmt->fetch()) {
    jsonError('Reference number already exists', 409);
}

$stmt = $pdo->prepare("
    INSERT INTO tenders (title, reference_number, description, category_id, tags, budget, submission_deadline, opening_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
");
$stmt->execute([
    $title,
    $ref,
    $description,
    $categoryId,
    $tagsJson,
    $budget,
    $submissionDeadline,
    $openingTs ? date('Y-m-d H:i:s', $openingTs) : null,
    $user['user_id'],
]);
$tenderId = (int) $pdo->lastInsertId();

$criteria = $body['criteria'] ?? [];
if (is_array($criteria)) {
    $ins = $pdo->prepare("INSERT INTO evaluation_criteria (tender_id, name, description, max_score, weight) VALUES (?, ?, ?, ?, ?)");
    foreach ($criteria as $c) {
        $name = sanitizeString($c['name'] ?? null, 255);
        $desc = sanitizeString($c['description'] ?? null, 500);
        $max = (int) ($c['max_score'] ?? 100);
        $weight = (float) ($c['weight'] ?? 1.0);
        if ($name !== '') {
            $ins->execute([$tenderId, $name, $desc ?: null, $max, $weight]);
        }
    }
}

auditLog($pdo, $user['user_id'], 'tender_created', 'tenders', $tenderId, $title);
jsonSuccess(['id' => $tenderId, 'message' => 'Tender created'], 201);