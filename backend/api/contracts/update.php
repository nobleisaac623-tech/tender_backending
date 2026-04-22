<?php
/**
 * PUT /api/contracts/update — Admin update contract. Cannot edit if completed or terminated.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$id = isset($body['id']) ? (int) $body['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid contract ID', 400);
}

$stmt = $pdo->prepare("SELECT id, status, supplier_id FROM contracts WHERE id = ?");
$stmt->execute([$id]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}
if (in_array($contract['status'], ['completed', 'terminated'], true)) {
    jsonError('Cannot edit contract that is completed or terminated', 400);
}

$updates = [];
$params = [];

$fields = [
    'title' => 'string', 'description' => 'string', 'contract_value' => 'float',
    'start_date' => 'string', 'end_date' => 'string', 'contract_date' => 'string', 'effective_date' => 'string',
    'buyer_name_address' => 'string', 'supplier_name_address' => 'string', 'specification_of_goods' => 'string',
    'payment_terms_methods' => 'string', 'warranty_terms' => 'string', 'breach_and_remedies' => 'string',
    'delivery_terms' => 'string', 'price_terms' => 'string', 'price_adjustment_terms' => 'string',
    'termination_terms' => 'string', 'status' => 'string',
];
$allowedStatuses = ['draft', 'active', 'completed', 'terminated', 'disputed'];
foreach ($fields as $field => $type) {
    if (!array_key_exists($field, $body)) continue;
    if ($field === 'status') {
        $v = trim((string) $body['status']);
        if (!in_array($v, $allowedStatuses, true)) continue;
        $updates[] = "status = ?";
        $params[] = $v;
    } elseif ($field === 'contract_value') {
        $v = is_numeric($body['contract_value']) ? (float) $body['contract_value'] : null;
        if ($v === null || $v <= 0) continue;
        $updates[] = "contract_value = ?";
        $params[] = $v;
    } else {
        $v = $type === 'float' ? (float) $body[$field] : trim((string) $body[$field]);
        if ($field === 'end_date' && isset($body['start_date']) && strtotime($v) <= strtotime(trim((string) $body['start_date']))) continue;
        $updates[] = $field . ' = ?';
        $params[] = $v;
    }
}

if (count($updates) === 0) {
    jsonSuccess([]);
    return;
}

$params[] = $id;
$sql = "UPDATE contracts SET " . implode(', ', $updates) . " WHERE id = ?";
$pdo->prepare($sql)->execute($params);

auditLog($pdo, $user['user_id'], 'contract_updated', 'contracts', $id, null);

// Notify supplier of status change
if (isset($body['status'])) {
    $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")->execute([
        $contract['supplier_id'],
        'Contract status updated',
        'Contract status has been updated to: ' . $body['status'] . '.',
    ]);
}

jsonSuccess([]);
