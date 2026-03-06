<?php
/**
 * GET /api/blacklist/check?supplier_id=5 — Check if supplier is blacklisted (admin only).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/blacklist.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

$supplierId = isset($_GET['supplier_id']) ? (int) $_GET['supplier_id'] : 0;
if ($supplierId <= 0) {
    jsonError('Invalid supplier ID', 400);
}

$blacklist = getActiveBlacklist($pdo, $supplierId);
if ($blacklist) {
    $stmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
    $stmt->execute([$supplierId]);
    $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
    jsonSuccess([
        'blacklisted' => true,
        'blacklist_id' => $blacklist['id'],
        'reason' => $blacklist['reason'],
        'supplier_name' => $supplier['name'] ?? '',
        'supplier_email' => $supplier['email'] ?? '',
    ]);
}

jsonSuccess(['blacklisted' => false]);
