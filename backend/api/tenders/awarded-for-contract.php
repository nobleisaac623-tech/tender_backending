<?php
/**
 * GET /api/tenders/awarded-for-contract — List awarded tenders that don't have a contract yet (admin). For contract creation dropdown.
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

$stmt = $pdo->query("
    SELECT t.id AS tender_id, t.title AS tender_title, t.reference_number,
           b.supplier_id, u.name AS supplier_name, COALESCE(sp.company_name, u.name) AS company_name
    FROM tenders t
    JOIN bids b ON b.tender_id = t.id AND b.status = 'accepted'
    JOIN users u ON u.id = b.supplier_id
    LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
    LEFT JOIN contracts c ON c.tender_id = t.id
    WHERE t.status = 'awarded' AND c.id IS NULL
    ORDER BY t.id DESC
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as &$r) {
    $r['tender_id'] = (int) $r['tender_id'];
    $r['supplier_id'] = (int) $r['supplier_id'];
}

jsonSuccess($rows);
