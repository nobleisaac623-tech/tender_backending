<?php
/**
 * GET /api/contracts — List contracts. Admin: all; Supplier: own only.
 * Query: ?status=active&supplier_id=5
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
$supplierId = isset($_GET['supplier_id']) ? (int) $_GET['supplier_id'] : 0;
$search = sanitizeString($_GET['search'] ?? null, 100);

$where = ['1=1'];
$params = [];

if ($user['role'] === 'supplier') {
    $where[] = 'c.supplier_id = ?';
    $params[] = $user['user_id'];
} else {
    if ($supplierId > 0) {
        $where[] = 'c.supplier_id = ?';
        $params[] = $supplierId;
    }
}

if ($status !== '' && in_array($status, ['draft', 'active', 'completed', 'terminated', 'disputed'], true)) {
    $where[] = 'c.status = ?';
    $params[] = $status;
}

if ($search !== '') {
    $where[] = '(c.contract_number LIKE ? OR c.title LIKE ? OR u.name LIKE ? OR t.title LIKE ?)';
    $q = '%' . $search . '%';
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
}

$sql = "SELECT c.id, c.contract_number, c.title, c.contract_value, c.start_date, c.end_date, c.status,
        c.tender_id, t.title AS tender_title, c.supplier_id, u.name AS supplier_name,
        COALESCE(sp.company_name, u.name) AS company_name
        FROM contracts c
        JOIN tenders t ON t.id = c.tender_id
        JOIN users u ON u.id = c.supplier_id
        LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY c.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['tender_id'] = (int) $r['tender_id'];
    $r['supplier_id'] = (int) $r['supplier_id'];
    $r['contract_value'] = (float) $r['contract_value'];
}

jsonSuccess($rows);
