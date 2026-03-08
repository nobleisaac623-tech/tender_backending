<?php
/**
 * GET /api/appeals — List all appeals (admin only).
 * Query params: status (pending|reviewed|resolved), page, limit
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

$status = isset($_GET['status']) ? trim($_GET['status']) : '';
$page = isset($_GET['page']) ? max(1, (int) $_GET['page']) : 1;
$limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 20;
$offset = ($page - 1) * $limit;

$where = '1=1';
$params = [];

if ($status !== '' && in_array($status, ['pending', 'reviewed', 'resolved'], true)) {
    $where .= ' AND status = ?';
    $params[] = $status;
}

// Get total count
$stmt = $pdo->prepare("SELECT COUNT(*) FROM account_appeals WHERE $where");
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();

// Get appeals
$query = "
    SELECT 
        a.id,
        a.supplier_id,
        a.supplier_email,
        a.supplier_name,
        a.message,
        a.status,
        a.admin_notes,
        a.created_at,
        a.reviewed_at,
        u.name as reviewed_by_name
    FROM account_appeals a
    LEFT JOIN users u ON a.reviewed_by = u.id
    WHERE $where
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
";
$params[] = $limit;
$params[] = $offset;

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$appeals = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonSuccess([
    'appeals' => $appeals,
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total,
        'pages' => ceil($total / $limit)
    ]
]);
