<?php
/**
 * POST /api/blacklist/add — Blacklist a supplier (admin only).
 * Body: { "supplier_id": 5, "reason": "..." }
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

$supplierId = isset($body['supplier_id']) ? (int) $body['supplier_id'] : 0;
$reason = sanitizeString($body['reason'] ?? null, 2000);

if ($supplierId <= 0) {
    jsonError('Invalid supplier ID', 400);
}
$err = validateRequired($reason, 'Reason');
if ($err !== '') {
    jsonError($err, 400);
}
if (mb_strlen($reason) < 10) {
    jsonError('Reason must be at least 10 characters', 400);
}

$stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$supplier || $supplier['role'] !== 'supplier') {
    jsonError('Supplier not found', 404);
}

$stmt = $pdo->prepare("SELECT id FROM supplier_blacklist WHERE supplier_id = ? AND is_active = 1");
$stmt->execute([$supplierId]);
if ($stmt->fetch()) {
    jsonError('Supplier is already blacklisted', 409);
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("INSERT INTO supplier_blacklist (supplier_id, reason, blacklisted_by) VALUES (?, ?, ?)");
    $stmt->execute([$supplierId, $reason, $user['user_id']]);
    $blacklistId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare("UPDATE users SET status = 'suspended' WHERE id = ?");
    $stmt->execute([$supplierId]);

    auditLog($pdo, $user['user_id'], 'supplier_blacklisted', 'users', $supplierId, $reason);

    $adminEmail = $_ENV['ADMIN_EMAIL'] ?? null;
    if (!$adminEmail && $pdo) {
        $stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $adminEmail = $row['email'] ?? null;
    }
    $contactMsg = $adminEmail ? " Please contact the administrator at $adminEmail." : '';

    $subject = 'Your account has been suspended';
    $body = "Your supplier account has been suspended. You will not be able to log in or submit bids." . $contactMsg;
    sendMail($supplier['email'], $subject, nl2br(htmlspecialchars($body)), $body);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

$stmt = $pdo->prepare("SELECT sb.id, sb.supplier_id, sb.reason, sb.blacklisted_at, sb.is_active,
    u.name AS supplier_name, u.email AS supplier_email,
    admin.name AS blacklisted_by_name
    FROM supplier_blacklist sb
    JOIN users u ON u.id = sb.supplier_id
    JOIN users admin ON admin.id = sb.blacklisted_by
    WHERE sb.id = ?");
$stmt->execute([$blacklistId]);
$record = $stmt->fetch(PDO::FETCH_ASSOC);
$record['id'] = (int) $record['id'];
$record['supplier_id'] = (int) $record['supplier_id'];
$record['is_active'] = (bool) (int) $record['is_active'];

jsonSuccess(['blacklist' => $record], 201);
