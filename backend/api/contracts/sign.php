<?php
/**
 * POST /api/contracts/sign — Admin or Supplier signs. When both signed, status -> active.
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
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$contractId = isset($body['contract_id']) ? (int) $body['contract_id'] : 0;
$role = isset($body['role']) ? trim((string) $body['role']) : '';

if ($contractId <= 0 || !in_array($role, ['admin', 'supplier'], true)) {
    jsonError('contract_id and role (admin|supplier) required', 400);
}

$stmt = $pdo->prepare("SELECT * FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}

// Signing gate: require key clauses before any party can sign
$required = [
    'contract_date' => 'Contract date',
    'effective_date' => 'Effective date',
    'buyer_name_address' => 'Buyer name & address',
    'supplier_name_address' => 'Supplier name & address',
    'specification_of_goods' => 'Specification of goods/services',
    'payment_terms_methods' => 'Payment terms & methods',
    'delivery_terms' => 'Delivery terms',
    'price_terms' => 'Price terms',
    'termination_terms' => 'Termination terms',
];
$missing = [];
foreach ($required as $field => $label) {
    $v = $contract[$field] ?? null;
    if ($v === null || trim((string) $v) === '') {
        $missing[] = ['field' => $field, 'label' => $label];
    }
}
if (!empty($missing)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Contract is missing required clause fields and cannot be signed yet.',
        'missing_fields' => $missing,
    ]);
    exit;
}

if ($role === 'admin') {
    if ($user['role'] !== 'admin') {
        jsonError('Forbidden', 403);
    }
    if ($contract['signed_by_admin']) {
        jsonError('Already signed by admin', 400);
    }
    $pdo->prepare("UPDATE contracts SET signed_by_admin = 1, admin_signed_at = NOW() WHERE id = ?")->execute([$contractId]);
    $otherUserId = (int) $contract['supplier_id'];
    $notifyTitle = 'Contract signed by Admin';
    $notifyMsg = 'The contract "' . $contract['title'] . '" has been signed by the administrator. Your signature is still pending.';
} else {
    if ($user['role'] !== 'supplier' || (int) $contract['supplier_id'] !== $user['user_id']) {
        jsonError('Forbidden', 403);
    }
    if ($contract['signed_by_supplier']) {
        jsonError('Already signed by supplier', 400);
    }
    $pdo->prepare("UPDATE contracts SET signed_by_supplier = 1, supplier_signed_at = NOW() WHERE id = ?")->execute([$contractId]);
    $stmt = $pdo->query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    $adminRow = $stmt->fetch(PDO::FETCH_ASSOC);
    $otherUserId = $adminRow ? (int) $adminRow['id'] : 0;
    $notifyTitle = 'Contract signed by Supplier';
    $notifyMsg = 'The supplier has signed the contract "' . $contract['title'] . '".';
}

$stmt = $pdo->prepare("SELECT signed_by_admin, signed_by_supplier FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$bothSigned = $row && $row['signed_by_admin'] && $row['signed_by_supplier'];
if ($bothSigned) {
    $pdo->prepare("UPDATE contracts SET status = 'active' WHERE id = ?")->execute([$contractId]);
    $notifyTitle = 'Contract fully executed';
    $notifyMsg = 'The contract "' . $contract['title'] . '" has been signed by both parties and is now active.';
    $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")->execute([$contract['supplier_id'], $notifyTitle, $notifyMsg]);
    $stmt = $pdo->query("SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    $adminRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($adminRow) {
        $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")->execute([$adminRow['id'], $notifyTitle, $notifyMsg]);
    }
}

if ($otherUserId > 0 && !$bothSigned) {
    $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")->execute([$otherUserId, $notifyTitle, $notifyMsg]);
    $stmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
    $stmt->execute([$otherUserId]);
    $other = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($other && !empty($other['email'])) {
        sendMail($other['email'], $notifyTitle, '<p>' . nl2br(htmlspecialchars($notifyMsg)) . '</p>', $notifyMsg);
    }
}

auditLog($pdo, $user['user_id'], 'contract_signed', 'contracts', $contractId, $role);
jsonSuccess(['message' => 'Signed', 'both_signed' => $bothSigned]);
