<?php
/**
 * GET /api/blacklist — List blacklist records (admin only). ?active=1 for active only.
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

$activeOnly = isset($_GET['active']) && ($_GET['active'] === '1' || $_GET['active'] === 'true');

$sql = "SELECT sb.id, sb.supplier_id, sb.reason, sb.blacklisted_by, sb.blacklisted_at,
        sb.is_active, sb.lifted_by, sb.lifted_at, sb.lift_reason,
        u.name AS supplier_name, u.email AS supplier_email,
        admin.name AS blacklisted_by_name,
        lifter.name AS lifted_by_name
        FROM supplier_blacklist sb
        JOIN users u ON u.id = sb.supplier_id
        JOIN users admin ON admin.id = sb.blacklisted_by
        LEFT JOIN users lifter ON lifter.id = sb.lifted_by
        WHERE 1=1";
$params = [];
if ($activeOnly) {
    $sql .= " AND sb.is_active = 1";
}
$sql .= " ORDER BY sb.blacklisted_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['supplier_id'] = (int) $r['supplier_id'];
    $r['blacklisted_by'] = (int) $r['blacklisted_by'];
    $r['is_active'] = (bool) (int) $r['is_active'];
    if (!empty($r['lifted_by'])) {
        $r['lifted_by'] = (int) $r['lifted_by'];
    }
}

jsonSuccess(['items' => $rows]);
