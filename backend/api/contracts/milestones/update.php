<?php
/**
 * PUT /api/contracts/milestones/update — Admin update milestone. Auto-set overdue if due_date < today and not completed.
 */

declare(strict_types=1);

require_once dirname(dirname(__DIR__)) . '/bootstrap.php';
require_once dirname(dirname(dirname(__DIR__))) . '/config/auth-middleware.php';
require_once dirname(dirname(dirname(__DIR__))) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$id = isset($body['id']) ? (int) $body['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid milestone ID', 400);
}

$stmt = $pdo->prepare("SELECT * FROM contract_milestones WHERE id = ?");
$stmt->execute([$id]);
$m = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$m) {
    jsonError('Milestone not found', 404);
}

$updates = [];
$params = [];

if (array_key_exists('title', $body)) {
    $v = sanitizeString($body['title'], 255);
    if ($v !== '') { $updates[] = 'title = ?'; $params[] = $v; }
}
if (array_key_exists('description', $body)) {
    $updates[] = 'description = ?';
    $params[] = sanitizeString($body['description'], 2000) ?: null;
}
if (array_key_exists('due_date', $body)) {
    $v = trim((string) $body['due_date']);
    if ($v !== '') { $updates[] = 'due_date = ?'; $params[] = $v; }
}
if (array_key_exists('status', $body)) {
    $v = trim((string) $body['status']);
    if (in_array($v, ['pending', 'in_progress', 'completed', 'overdue'], true)) {
        $updates[] = 'status = ?';
        $params[] = $v;
        if ($v === 'completed') {
            $updates[] = 'completion_date = CURDATE()';
        }
    }
}
if (array_key_exists('notes', $body)) {
    $updates[] = 'notes = ?';
    $params[] = sanitizeString($body['notes'], 2000) ?: null;
}
if (array_key_exists('completion_date', $body)) {
    $updates[] = 'completion_date = ?';
    $params[] = trim((string) $body['completion_date']) ?: null;
}

if (count($updates) === 0) {
    jsonSuccess([]);
    return;
}

$params[] = $id;
$pdo->prepare("UPDATE contract_milestones SET " . implode(', ', $updates) . " WHERE id = ?")->execute($params);

// Auto-overdue: if due_date < today and status != completed
$stmt = $pdo->prepare("SELECT id, due_date, status FROM contract_milestones WHERE id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if ($row && $row['status'] !== 'completed' && strtotime($row['due_date']) < time()) {
    $pdo->prepare("UPDATE contract_milestones SET status = 'overdue' WHERE id = ?")->execute([$id]);
}

jsonSuccess([]);
