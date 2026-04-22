<?php
/**
 * GET /api/contracts/by-tender — Get contract by tender_id (if any). Admin or contract's supplier.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$tenderId = isset($_GET['tender_id']) ? (int) $_GET['tender_id'] : 0;
if ($tenderId <= 0) {
    jsonError('Invalid tender_id', 400);
}

$stmt = $pdo->prepare("SELECT id FROM contracts WHERE tender_id = ?");
$stmt->execute([$tenderId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonSuccess(null);
    return;
}

$contractId = (int) $row['id'];
$stmt = $pdo->prepare("SELECT supplier_id FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$c = $stmt->fetch(PDO::FETCH_ASSOC);
if ($user['role'] === 'supplier' && $c && (int) $c['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}

jsonSuccess(['contract_id' => $contractId]);
