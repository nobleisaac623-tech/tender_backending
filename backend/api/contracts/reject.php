<?php
/**
 * POST /api/contracts/reject — Supplier rejects contract before signing.
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
requireSupplier();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$contractId = isset($body['contract_id']) ? (int) $body['contract_id'] : 0;
$reason = sanitizeString($body['reason'] ?? null, 5000);

if ($contractId <= 0) {
    jsonError('contract_id required', 400);
}
if ($reason === '') {
    jsonError('Rejection reason is required', 400);
}

$stmt = $pdo->prepare("SELECT * FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}
if ((int) $contract['supplier_id'] !== (int) $user['user_id']) {
    jsonError('Forbidden', 403);
}
if ((bool) $contract['signed_by_supplier']) {
    jsonError('You already signed this contract and cannot reject it', 400);
}
if ((bool) $contract['signed_by_admin']) {
    // Still allow reject if admin signed but supplier has not.
}
if (in_array((string) $contract['status'], ['completed', 'terminated'], true)) {
    jsonError('This contract cannot be rejected in its current status', 400);
}
if (!empty($contract['supplier_rejected']) && (int) $contract['supplier_rejected'] === 1) {
    jsonError('Contract already rejected', 400);
}

$pdo->prepare("
    UPDATE contracts
    SET supplier_rejected = 1,
        supplier_rejected_at = NOW(),
        supplier_rejection_reason = ?,
        status = 'disputed'
    WHERE id = ?
")->execute([$reason, $contractId]);

// Notify admin
$stmt = $pdo->query("SELECT id, email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
$admin = $stmt->fetch(PDO::FETCH_ASSOC);
if ($admin) {
    $msg = 'Supplier rejected contract "' . $contract['title'] . '". Reason: ' . $reason;
    $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")
        ->execute([(int) $admin['id'], 'Contract rejected by supplier', $msg]);
    if (!empty($admin['email'])) {
        sendMail((string) $admin['email'], 'Contract rejected by supplier', '<p>' . nl2br(htmlspecialchars($msg)) . '</p>', $msg);
    }
}

auditLog($pdo, (int) $user['user_id'], 'contract_rejected', 'contracts', $contractId, $reason);
jsonSuccess(['message' => 'Contract rejected']);

