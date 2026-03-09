<?php
/**
 * GET /api/suppliers/pending-count — Count of suppliers awaiting approval (admin only).
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

// Count suppliers with status=pending, not blacklisted, and not yet approved
$sql = "
    SELECT COUNT(*) AS c
    FROM users u
    LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
    WHERE u.role = 'supplier'
      AND u.status = 'pending'
      AND (sp.is_approved = 0 OR sp.is_approved IS NULL)
      AND NOT EXISTS (
        SELECT 1
        FROM supplier_blacklist sb
        WHERE sb.supplier_id = u.id
          AND sb.is_active = 1
      )
";
$stmt = $pdo->query($sql);
$row = $stmt ? $stmt->fetch(PDO::FETCH_ASSOC) : ['c' => 0];
$count = (int) ($row['c'] ?? 0);

jsonSuccess(['pending' => $count]);

