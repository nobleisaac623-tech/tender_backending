<?php
/**
 * GET /api/reports/supplier?supplier_id=1 — Supplier performance history.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

$supplierId = isset($_GET['supplier_id']) ? (int) $_GET['supplier_id'] : 0;
if ($supplierId <= 0) {
    jsonError('Invalid supplier_id', 400);
}

$stmt = $pdo->prepare("SELECT id, name, email, status, created_at FROM users WHERE id = ? AND role = 'supplier'");
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$supplier) {
    jsonError('Supplier not found', 404);
}

$stmt = $pdo->prepare("SELECT * FROM supplier_profiles WHERE user_id = ?");
$stmt->execute([$supplierId]);
$supplier['profile'] = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("
    SELECT b.id, b.tender_id, b.bid_amount, b.status, b.submitted_at, t.title AS tender_title, t.reference_number
    FROM bids b
    JOIN tenders t ON t.id = b.tender_id
    WHERE b.supplier_id = ?
    ORDER BY b.submitted_at DESC
");
$stmt->execute([$supplierId]);
$supplier['bids'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

$supplier['id'] = (int) $supplier['id'];
jsonSuccess($supplier);