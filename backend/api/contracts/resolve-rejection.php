<?php
/**
 * POST /api/contracts/resolve-rejection — Admin resolves supplier rejection.
 * Moves contract back to draft and clears rejection markers.
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

$contractId = isset($body['contract_id']) ? (int) $body['contract_id'] : 0;
$note = sanitizeString($body['note'] ?? null, 2000);

if ($contractId <= 0) {
    jsonError('contract_id required', 400);
}

$stmt = $pdo->prepare("SELECT id, supplier_id, title, status, supplier_rejected FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}
if ((int) ($contract['supplier_rejected'] ?? 0) !== 1) {
    jsonError('Contract is not currently rejected by supplier', 400);
}

$pdo->prepare("
    UPDATE contracts
    SET supplier_rejected = 0,
        supplier_rejected_at = NULL,
        supplier_rejection_reason = NULL,
        status = 'draft'
    WHERE id = ?
")->execute([$contractId]);

$message = 'Your rejected contract "' . $contract['title'] . '" has been reviewed and reopened for signing.';
if ($note !== '') {
    $message .= ' Admin note: ' . $note;
}

$supplierId = (int) $contract['supplier_id'];
$pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")
    ->execute([$supplierId, 'Contract rejection resolved', $message]);

$stmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
$stmt->execute([$supplierId]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);
if ($supplier && !empty($supplier['email'])) {
    sendMail((string) $supplier['email'], 'Contract rejection resolved', '<p>' . nl2br(htmlspecialchars($message)) . '</p>', $message);
}

auditLog($pdo, (int) $user['user_id'], 'contract_rejection_resolved', 'contracts', $contractId, $note);
jsonSuccess(['message' => 'Rejection resolved; contract moved back to draft']);

