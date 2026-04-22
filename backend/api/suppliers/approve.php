<?php
/**
 * POST /api/suppliers/approve — Admin manage supplier status.
 * Body: { "supplier_id": 1, "action": "approve"|"suspend"|"reinstate"|"reject", "reason"?: string }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';
require_once dirname(dirname(__DIR__)) . '/helpers/email.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$supplierId = isset($body['supplier_id']) ? (int) $body['supplier_id'] : 0;
$action = trim((string) ($body['action'] ?? ''));
$reason = isset($body['reason']) ? trim((string) $body['reason']) : '';
if ($supplierId <= 0 || !in_array($action, ['approve', 'suspend', 'reinstate', 'reject'], true)) {
    jsonError('Invalid supplier_id or action', 400);
}

if (in_array($action, ['suspend', 'reject'], true)) {
    if ($reason === '' || mb_strlen($reason) < 10) {
        jsonError('Reason must be at least 10 characters', 400);
    }
}

$stmt = $pdo->prepare("SELECT id, name, email, status FROM users WHERE id = ? AND role = 'supplier'");
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$supplier) {
    jsonError('Supplier not found', 404);
}

if ($action === 'approve') {
    // Approve new or previously rejected supplier
    $stmt = $pdo->prepare("UPDATE users SET status = 'active' WHERE id = ?");
    $stmt->execute([$supplierId]);
    $stmt = $pdo->prepare("UPDATE supplier_profiles SET is_approved = 1, approved_by = ?, approved_at = NOW(), rejection_reason = NULL, suspension_reason = NULL WHERE user_id = ?");
    $stmt->execute([$user['user_id'], $supplierId]);
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->execute([$supplierId, 'Account approved', 'Your supplier account has been approved. You can now submit bids.']);
    try {
        brevoSendEmail(
            $supplier['email'],
            'Supplier account approved',
            '<p>Dear ' . htmlspecialchars($supplier['name']) . ',</p><p>Your supplier account has been approved. You can now log in and submit bids for open tenders.</p>',
            'Your supplier account has been approved.'
        );
    } catch (Throwable $e) {
        // Never block approval on email failures
        error_log('Supplier approval email failed: ' . $e->getMessage());
    }
    auditLog($pdo, $user['user_id'], 'supplier_approved', 'users', $supplierId, $supplier['email']);
    jsonSuccess(['message' => 'Supplier approved']);
} elseif ($action === 'reinstate') {
    // Reinstate a suspended supplier
    $stmt = $pdo->prepare("UPDATE users SET status = 'active' WHERE id = ?");
    $stmt->execute([$supplierId]);
    $stmt = $pdo->prepare("UPDATE supplier_profiles SET is_approved = 1, suspension_reason = NULL WHERE user_id = ?");
    $stmt->execute([$supplierId]);
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->execute([$supplierId, 'Account reinstated', 'Your supplier account has been reinstated. You can now submit bids again.']);
    try {
        brevoSendEmail(
            $supplier['email'],
            'Supplier account reinstated',
            '<p>Dear ' . htmlspecialchars($supplier['name']) . ',</p><p>Your supplier account has been reinstated. You can now log in and continue participating in tenders.</p>',
            'Your supplier account has been reinstated.'
        );
    } catch (Throwable $e) {
        error_log('Supplier reinstatement email failed: ' . $e->getMessage());
    }
    auditLog($pdo, $user['user_id'], 'supplier_reinstated', 'users', $supplierId, $supplier['email']);
    jsonSuccess(['message' => 'Supplier reinstated']);
} elseif ($action === 'reject') {
    // Mark supplier as rejected (keep status=pending but store reason)
    $stmt = $pdo->prepare("UPDATE supplier_profiles SET rejection_reason = ? WHERE user_id = ?");
    $stmt->execute([$reason, $supplierId]);
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->execute([$supplierId, 'Registration rejected', 'Your supplier registration was rejected. Reason: ' . $reason]);
    try {
        brevoSendEmail(
            $supplier['email'],
            'Supplier registration rejected',
            '<p>Dear ' . htmlspecialchars($supplier['name']) . ',</p><p>Your supplier registration was reviewed and unfortunately rejected.</p><p><strong>Reason:</strong> ' . htmlspecialchars($reason) . '</p><p>You may contact the administrator for clarification or submit a new registration in the future.</p>',
            'Your supplier registration was rejected. Reason: ' . $reason
        );
    } catch (Throwable $e) {
        error_log('Supplier rejection email failed: ' . $e->getMessage());
    }
    auditLog($pdo, $user['user_id'], 'supplier_rejected', 'users', $supplierId, $reason);
    jsonSuccess(['message' => 'Supplier rejected']);
} else {
    // Suspend supplier - reason required and stored
    $stmt = $pdo->prepare("UPDATE users SET status = 'suspended' WHERE id = ?");
    $stmt->execute([$supplierId]);
    $stmt = $pdo->prepare("UPDATE supplier_profiles SET suspension_reason = ? WHERE user_id = ?");
    $stmt->execute([$reason, $supplierId]);
    
    // Send suspension email
    $stmt = $pdo->prepare("SELECT email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    $adminEmail = $admin['email'] ?? ($_ENV['ADMIN_EMAIL'] ?? '');
    $contactMsg = $adminEmail ? " Please contact the administrator at $adminEmail." : " Please contact the administrator.";
    
    try {
        brevoSendEmail(
            $supplier['email'],
            'Your account has been suspended',
            '<p>Dear ' . htmlspecialchars($supplier['name']) . ',</p><p>Your supplier account has been suspended.</p><p>Reason: ' . htmlspecialchars($reason ?: 'No reason provided.') . '</p><p>' . $contactMsg . '</p>',
            'Your account has been suspended. Reason: ' . ($reason ?: 'No reason provided.') . $contactMsg
        );
    } catch (Throwable $e) {
        error_log('Supplier suspension email failed: ' . $e->getMessage());
    }
    
    $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
    $stmt->execute([$supplierId, 'Account suspended', 'Your account has been suspended. Reason: ' . ($reason ?: 'No reason provided.')]);
    
    auditLog($pdo, $user['user_id'], 'supplier_suspended', 'users', $supplierId, $supplier['email'] . ' Reason: ' . $reason);
    jsonSuccess(['message' => 'Supplier suspended']);
}