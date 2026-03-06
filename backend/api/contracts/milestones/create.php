<?php
/**
 * POST /api/contracts/milestones/create — Admin add milestone.
 */

declare(strict_types=1);

require_once dirname(dirname(__DIR__)) . '/bootstrap.php';
require_once dirname(dirname(dirname(__DIR__))) . '/config/auth-middleware.php';
require_once dirname(dirname(dirname(__DIR__))) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$contractId = isset($body['contract_id']) ? (int) $body['contract_id'] : 0;
$title = sanitizeString($body['title'] ?? null, 255);
$dueDate = trim((string) ($body['due_date'] ?? ''));

if ($contractId <= 0 || $title === '' || $dueDate === '') {
    jsonError('contract_id, title, and due_date required', 400);
}

$stmt = $pdo->prepare("SELECT 1 FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
if (!$stmt->fetch()) {
    jsonError('Contract not found', 404);
}

$stmt = $pdo->prepare("INSERT INTO contract_milestones (contract_id, title, description, due_date, status) VALUES (?, ?, ?, ?, 'pending')");
$stmt->execute([$contractId, $title, sanitizeString($body['description'] ?? null, 2000) ?: null, $dueDate]);
$id = (int) $pdo->lastInsertId();
jsonSuccess(['id' => $id], 201);
