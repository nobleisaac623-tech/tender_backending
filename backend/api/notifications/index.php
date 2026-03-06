<?php
/**
 * GET /api/notifications — List current user's notifications. Mark read optional.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$page = max(1, (int) ($_GET['page'] ?? 1));
$perPage = min(50, max(1, (int) ($_GET['per_page'] ?? 20)));
$offset = ($page - 1) * $perPage;
$unreadOnly = isset($_GET['unread_only']) && $_GET['unread_only'] !== 'false' && $_GET['unread_only'] !== '0';

$where = 'user_id = ?';
$params = [$user['user_id']];
if ($unreadOnly) {
    $where .= ' AND is_read = 0';
}

$stmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE $where");
$stmt->execute($params);
$total = (int) $stmt->fetchColumn();

$params[] = $perPage;
$params[] = $offset;
$stmt = $pdo->prepare("SELECT id, title, message, is_read, created_at FROM notifications WHERE $where ORDER BY created_at DESC LIMIT ? OFFSET ?");
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['is_read'] = (bool) $r['is_read'];
}

jsonSuccess(['items' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage]);