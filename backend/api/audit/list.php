<?php
require_once '../../config/cors.php';
require_once '../../config/auth-middleware.php';
require_once '../../helpers/response.php';

requireRole(['admin']);

$page     = max(1, (int)($_GET['page'] ?? 1));
$limit    = min(50, max(10, (int)($_GET['limit'] ?? 20)));
$offset   = ($page - 1) * $limit;
$search   = trim($_GET['search'] ?? '');
$action   = trim($_GET['action'] ?? '');
$entity   = trim($_GET['entity_type'] ?? '');
$dateFrom = trim($_GET['date_from'] ?? '');
$dateTo   = trim($_GET['date_to'] ?? '');

$conditions = ['1=1'];
$params     = [];

if ($search) {
    $conditions[] = '(u.name LIKE ? OR u.email LIKE ? OR al.details LIKE ?)';
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%"]);
}
if ($action) {
    $conditions[] = 'al.action = ?';
    $params[] = $action;
}
if ($entity) {
    $conditions[] = 'al.entity_type = ?';
    $params[] = $entity;
}
if ($dateFrom) {
    $conditions[] = 'DATE(al.created_at) >= ?';
    $params[] = $dateFrom;
}
if ($dateTo) {
    $conditions[] = 'DATE(al.created_at) <= ?';
    $params[] = $dateTo;
}

$where = implode(' AND ', $conditions);

$total = $db->queryOne(
    "SELECT COUNT(*) as cnt FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE $where",
    $params
)['cnt'];

$logs = $db->query(
    "SELECT al.*, u.name as user_name, u.email as user_email, u.role as user_role
     FROM audit_log al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE $where
     ORDER BY al.created_at DESC
     LIMIT $limit OFFSET $offset",
    $params
);

$actions  = $db->query("SELECT DISTINCT action FROM audit_log ORDER BY action");
$entities = $db->query("SELECT DISTINCT entity_type FROM audit_log WHERE entity_type IS NOT NULL ORDER BY entity_type");

jsonSuccess([
    'logs'     => $logs,
    'total'    => (int)$total,
    'page'     => $page,
    'limit'    => $limit,
    'pages'    => (int)ceil($total / $limit),
    'actions'  => array_column($actions, 'action'),
    'entities' => array_column($entities, 'entity_type'),
]);
