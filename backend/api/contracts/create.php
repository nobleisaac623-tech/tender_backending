<?php
/**
 * POST /api/contracts/create — Admin create contract. Tender must be awarded, supplier must be awarded supplier.
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

$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : 0;
$supplierId = isset($body['supplier_id']) ? (int) $body['supplier_id'] : 0;
$title = sanitizeString($body['title'] ?? null, 255);
$description = sanitizeString($body['description'] ?? null, 10000);
$contractValue = isset($body['contract_value']) ? (is_numeric($body['contract_value']) ? (float) $body['contract_value'] : null) : null;
$startDate = trim((string) ($body['start_date'] ?? ''));
$endDate = trim((string) ($body['end_date'] ?? ''));

$err = '';
if ($tenderId <= 0) $err = 'tender_id required';
elseif ($supplierId <= 0) $err = 'supplier_id required';
elseif ($title === '') $err = 'title required';
elseif ($contractValue === null || $contractValue <= 0) $err = 'contract_value must be positive';
elseif ($startDate === '') $err = 'start_date required';
elseif ($endDate === '') $err = 'end_date required';
elseif (strtotime($endDate) <= strtotime($startDate)) $err = 'end_date must be after start_date';

if ($err !== '') {
    jsonError($err, 400);
}

$stmt = $pdo->prepare("SELECT id, title, status FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if ($tender['status'] !== 'awarded') {
    jsonError('Tender must be awarded before creating a contract', 400);
}

$stmt = $pdo->prepare("SELECT 1 FROM contracts WHERE tender_id = ?");
$stmt->execute([$tenderId]);
if ($stmt->fetch()) {
    jsonError('A contract already exists for this tender', 400);
}

$stmt = $pdo->prepare("SELECT b.supplier_id FROM bids b WHERE b.tender_id = ? AND b.status = 'accepted' LIMIT 1");
$stmt->execute([$tenderId]);
$awarded = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$awarded || (int) $awarded['supplier_id'] !== $supplierId) {
    jsonError('Supplier must be the awarded supplier for this tender', 400);
}

$year = date('Y');
$placeholder = 'CON-' . $year . '-' . bin2hex(random_bytes(4));
$stmt = $pdo->prepare("
    INSERT INTO contracts (tender_id, supplier_id, contract_number, title, description, contract_value, start_date, end_date, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
");
$stmt->execute([$tenderId, $supplierId, $placeholder, $title, $description ?: null, $contractValue, $startDate, $endDate, $user['user_id']]);
$contractId = (int) $pdo->lastInsertId();
$contractNumber = 'CON-' . $year . '-' . str_pad((string) $contractId, 4, '0', STR_PAD_LEFT);
$pdo->prepare("UPDATE contracts SET contract_number = ? WHERE id = ?")->execute([$contractNumber, $contractId]);

// Milestones from body
$milestones = $body['milestones'] ?? [];
if (is_array($milestones)) {
    $mStmt = $pdo->prepare("INSERT INTO contract_milestones (contract_id, title, description, due_date, status) VALUES (?, ?, ?, ?, 'pending')");
    foreach ($milestones as $m) {
        $mTitle = sanitizeString($m['title'] ?? null, 255);
        $mDue = trim((string) ($m['due_date'] ?? ''));
        if ($mTitle !== '' && $mDue !== '') {
            $mStmt->execute([$contractId, $mTitle, sanitizeString($m['description'] ?? null, 2000) ?: null, $mDue]);
        }
    }
}

auditLog($pdo, $user['user_id'], 'contract_created', 'contracts', $contractId, $contractNumber);

// Notify supplier (in-app)
$pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")->execute([
    $supplierId,
    'Contract created',
    'A contract has been created for you: ' . $title . ' (' . $contractNumber . '). Please sign when ready.',
]);

// Email supplier
$stmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
$stmt->execute([$supplierId]);
$supp = $stmt->fetch(PDO::FETCH_ASSOC);
if ($supp && !empty($supp['email'])) {
    sendMail(
        $supp['email'],
        'Contract created: ' . $title,
        '<p>Hello ' . htmlspecialchars($supp['name']) . ',</p><p>A contract has been created for you: <strong>' . htmlspecialchars($title) . '</strong> (' . htmlspecialchars($contractNumber) . '). Please log in to view and sign.</p>',
        'A contract has been created for you: ' . $title . ' (' . $contractNumber . '). Please log in to view and sign.'
    );
}

jsonSuccess(['id' => $contractId, 'contract_number' => $contractNumber], 201);
