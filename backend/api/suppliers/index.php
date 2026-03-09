<?php
/**
 * GET /api/suppliers — List suppliers (admin only). Pagination + search.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(1, (int) ($_GET['per_page'] ?? 10)));
$offset = ($page - 1) * $perPage;
$search = sanitizeString($_GET['search'] ?? null, 100);
$status = isset($_GET['status']) ? trim((string) $_GET['status']) : '';
$blacklistedOnly = isset($_GET['blacklisted_only']) && ($_GET['blacklisted_only'] === '1' || $_GET['blacklisted_only'] === 'true');

$where = "u.role = 'supplier'";
$params = [];
if ($status !== '' && in_array($status, ['pending', 'active', 'suspended'], true)) {
    $where .= ' AND u.status = ?';
    $params[] = $status;
}
if ($search !== '') {
    $where .= ' AND (u.name LIKE ? OR u.email LIKE ? OR sp.company_name LIKE ?)';
    $q = '%' . $search . '%';
    $params[] = $q;
    $params[] = $q;
    $params[] = $q;
}
if ($blacklistedOnly) {
    $where .= " AND EXISTS (SELECT 1 FROM supplier_blacklist sb WHERE sb.supplier_id = u.id AND sb.is_active = 1)";
}

$countSql = "SELECT COUNT(*) FROM users u LEFT JOIN supplier_profiles sp ON sp.user_id = u.id WHERE $where";
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();

$params[] = $perPage;
$params[] = $offset;
$sql = "SELECT u.id, u.name, u.email, u.status, u.created_at, sp.company_name, sp.registration_number, sp.category, sp.phone, sp.is_approved,
        sp.rejection_reason, sp.suspension_reason,
        (SELECT 1 FROM supplier_blacklist sb WHERE sb.supplier_id = u.id AND sb.is_active = 1 LIMIT 1) AS is_blacklisted,
        (SELECT AVG(overall_score) FROM supplier_ratings WHERE supplier_id = u.id) AS rating_avg,
        (SELECT COUNT(*) FROM supplier_ratings WHERE supplier_id = u.id) AS rating_count
        FROM users u
        LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
        WHERE $where
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['is_approved'] = (bool) ($r['is_approved'] ?? 0);
    $r['is_blacklisted'] = (bool) ($r['is_blacklisted'] ?? 0);
    $count = (int) ($r['rating_count'] ?? 0);
    $r['rating_summary'] = [
        'average_overall' => $count > 0 ? round((float) $r['rating_avg'], 2) : null,
        'total_contracts_rated' => $count,
    ];
    unset($r['rating_avg'], $r['rating_count']);

    // If profile has been approved, ensure status is treated as active
    if ($r['status'] === 'pending' && $r['is_approved']) {
        $r['status'] = 'active';
    }
}

jsonSuccess(['items' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);