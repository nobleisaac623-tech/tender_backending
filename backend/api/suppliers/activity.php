<?php
/**
 * GET /api/suppliers/activity?supplier_id=1 — Supplier activity timeline from audit_log.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
if ($user['role'] !== 'admin') {
    jsonError('Forbidden', 403);
}

$pdo = $GLOBALS['pdo'];
$id = isset($_GET['supplier_id']) ? (int) $_GET['supplier_id'] : 0;
if ($id <= 0) {
    jsonError('Invalid supplier_id', 400);
}

$stmt = $pdo->prepare("
    SELECT al.action, al.entity_type, al.entity_id, al.details, al.created_at,
           u.name AS actor_name, u.role AS actor_role
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.user_id = ? OR (al.entity_type = 'supplier' AND al.entity_id = ?)
    ORDER BY al.created_at DESC
    LIMIT 50
");
$stmt->execute([$id, $id]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonSuccess(['items' => $rows]);
