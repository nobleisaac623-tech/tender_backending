<?php
/**
 * GET /api/contracts/show — Single contract with documents and milestones. Admin or contract's supplier.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid contract ID', 400);
}

$stmt = $pdo->prepare("
    SELECT c.*, t.title AS tender_title, u.name AS supplier_name,
           COALESCE(sp.company_name, u.name) AS company_name
    FROM contracts c
    JOIN tenders t ON t.id = c.tender_id
    JOIN users u ON u.id = c.supplier_id
    LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
    WHERE c.id = ?
");
$stmt->execute([$id]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}

if ($user['role'] === 'supplier' && (int) $contract['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}

$contract['id'] = (int) $contract['id'];
$contract['tender_id'] = (int) $contract['tender_id'];
$contract['supplier_id'] = (int) $contract['supplier_id'];
$contract['created_by'] = (int) $contract['created_by'];
$contract['contract_value'] = (float) $contract['contract_value'];
$contract['signed_by_admin'] = (bool) $contract['signed_by_admin'];
$contract['signed_by_supplier'] = (bool) $contract['signed_by_supplier'];
$contract['supplier_rejected'] = isset($contract['supplier_rejected']) ? (bool) $contract['supplier_rejected'] : false;

// Documents
$stmt = $pdo->prepare("
    SELECT cd.id, cd.original_name, cd.document_type, cd.uploaded_at, u.name AS uploaded_by_name
    FROM contract_documents cd
    JOIN users u ON u.id = cd.uploaded_by
    WHERE cd.contract_id = ?
    ORDER BY cd.uploaded_at DESC
");
$stmt->execute([$id]);
$contract['documents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($contract['documents'] as &$d) {
    $d['id'] = (int) $d['id'];
}

// Milestones + auto-update overdue
$stmt = $pdo->prepare("SELECT * FROM contract_milestones WHERE contract_id = ? ORDER BY due_date ASC");
$stmt->execute([$id]);
$milestones = $stmt->fetchAll(PDO::FETCH_ASSOC);
$now = time();
foreach ($milestones as &$m) {
    $m['id'] = (int) $m['id'];
    if ($m['status'] !== 'completed' && strtotime($m['due_date']) < $now) {
        $m['status'] = 'overdue';
        $pdo->prepare("UPDATE contract_milestones SET status = 'overdue' WHERE id = ?")->execute([$m['id']]);
    }
}
$contract['milestones'] = $milestones;

jsonSuccess($contract);
