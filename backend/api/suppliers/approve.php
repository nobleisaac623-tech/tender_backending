<?php
/**
 * POST /api/suppliers/approve — Admin approve or suspend supplier.
 * Body: { "supplier_id": 1, "action": "approve"|"suspend" }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$supplierId = isset($body['supplier_id']) ? (int) $body['supplier_id'] : 0;
$action = trim((string) ($body['action'] ?? ''));
if ($supplierId <= 0 || !in_array($action, ['approve', 'suspend'], true)) {
    jsonError('Invalid supplier_id or action', 400);
}

$stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ? AND role = 'supplier'");
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$supplier) {
    jsonError('Supplier not found', 404);
}

if ($action === 'approve') {
    $stmt = $pdo->prepare("UPDATE users SET status = 'active' WHERE id = ?");
    $stmt->execute([$supplierId]);
    $stmt = $pdo->prepare("UPDATE supplier_profiles SET is_approved = 1, approved_by = ?, approved_at = NOW() WHERE user_id = ?");
    $stmt->execute([$user['user_id'], $supplierId]);
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->execute([$supplierId, 'Account approved', 'Your supplier account has been approved. You can now submit bids.']);
    sendMail(
        $supplier['email'],
        'Supplier account approved',
        '<p>Dear ' . htmlspecialchars($supplier['name']) . ',</p><p>Your supplier account has been approved. You can now log in and submit bids for open tenders.</p>',
        'Your supplier account has been approved.'
    );
    auditLog($pdo, $user['user_id'], 'supplier_approved', 'users', $supplierId, $supplier['email']);
    jsonSuccess(['message' => 'Supplier approved']);
} else {
    $stmt = $pdo->prepare("UPDATE users SET status = 'suspended' WHERE id = ?");
    $stmt->execute([$supplierId]);
    auditLog($pdo, $user['user_id'], 'supplier_suspended', 'users', $supplierId, $supplier['email']);
    jsonSuccess(['message' => 'Supplier suspended']);
}