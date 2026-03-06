<?php
/**
 * POST /api/blacklist/lift — Lift a blacklist (admin only).
 * Body: { "blacklist_id": 3, "lift_reason": "..." }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$blacklistId = isset($body['blacklist_id']) ? (int) $body['blacklist_id'] : 0;
$liftReason = sanitizeString($body['lift_reason'] ?? null, 2000);

if ($blacklistId <= 0) {
    jsonError('Invalid blacklist ID', 400);
}
$err = validateRequired($liftReason, 'Lift reason');
if ($err !== '') {
    jsonError($err, 400);
}

$stmt = $pdo->prepare("SELECT id, supplier_id, is_active FROM supplier_blacklist WHERE id = ?");
$stmt->execute([$blacklistId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('Blacklist record not found', 404);
}
if (!(int) $row['is_active']) {
    jsonError('Blacklist is already lifted', 400);
}

$supplierId = (int) $row['supplier_id'];

$stmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("UPDATE supplier_blacklist SET is_active = 0, lifted_by = ?, lifted_at = NOW(), lift_reason = ? WHERE id = ?");
    $stmt->execute([$user['user_id'], $liftReason, $blacklistId]);

    $stmt = $pdo->prepare("UPDATE users SET status = 'active' WHERE id = ?");
    $stmt->execute([$supplierId]);

    auditLog($pdo, $user['user_id'], 'blacklist_lifted', 'users', $supplierId, $liftReason);

    if ($supplier) {
        $subject = 'Your account suspension has been lifted';
        $body = 'Your supplier account suspension has been lifted. You can log in and submit bids again.';
        sendMail($supplier['email'], $subject, nl2br(htmlspecialchars($body)), $body);
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

jsonSuccess(['message' => 'Blacklist lifted']);
