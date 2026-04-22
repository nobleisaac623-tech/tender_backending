<?php
/**
 * GET /api/bids — List bids (admin: all/filter; supplier: own).
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

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(1, (int) ($_GET['per_page'] ?? 10)));
$offset = ($page - 1) * $perPage;
$tenderId = isset($_GET['tender_id']) ? (int) $_GET['tender_id'] : 0;
$filterSupplierId = isset($_GET['supplier_id']) ? (int) $_GET['supplier_id'] : 0;

if ($user['role'] === 'supplier') {
    $where = 'b.supplier_id = ?';
    $params = [$user['user_id']];
    if ($tenderId > 0) {
        $where .= ' AND b.tender_id = ?';
        $params[] = $tenderId;
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM bids b WHERE $where");
    $stmt->execute($params);
    $total = (int) $stmt->fetchColumn();
    $stmt = $pdo->prepare("
        SELECT b.id, b.tender_id, b.bid_amount, b.delivery_time, b.status, b.submitted_at, b.created_at, t.title AS tender_title, t.reference_number
        FROM bids b
        JOIN tenders t ON t.id = b.tender_id
        WHERE $where
        ORDER BY b.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $params[] = $perPage;
    $params[] = $offset;
    $stmt->execute($params);
} else {
    $where = '1=1';
    $params = [];
    if ($tenderId > 0) {
        $where .= ' AND b.tender_id = ?';
        $params[] = $tenderId;
    }
    if ($filterSupplierId > 0) {
        $where .= ' AND b.supplier_id = ?';
        $params[] = $filterSupplierId;
    }
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM bids b WHERE $where");
    $stmt->execute($params);
    $total = (int) $stmt->fetchColumn();
    $params[] = $perPage;
    $params[] = $offset;
    $stmt = $pdo->prepare("
        SELECT b.id, b.tender_id, b.supplier_id, b.bid_amount, b.technical_proposal, b.delivery_time, b.status, b.submitted_at, b.created_at,
               t.title AS tender_title, t.reference_number, u.name AS supplier_name, u.email AS supplier_email,
               sp.company_name
        FROM bids b
        JOIN tenders t ON t.id = b.tender_id
        JOIN users u ON u.id = b.supplier_id
        LEFT JOIN supplier_profiles sp ON sp.user_id = b.supplier_id
        WHERE $where
        ORDER BY b.submitted_at DESC, b.id DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);
}

$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['tender_id'] = (int) $r['tender_id'];
    if (isset($r['bid_amount']) && $r['bid_amount'] !== null) $r['bid_amount'] = (float) $r['bid_amount'];
    if (isset($r['supplier_id'])) $r['supplier_id'] = (int) $r['supplier_id'];
}

jsonSuccess(['items' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);