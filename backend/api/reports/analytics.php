<?php
/**
 * GET /api/reports/analytics — Dashboard chart data (admin only).
 * Returns tenders by status, bids per tender, supplier registrations, evaluation completion, summary.
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

// Tenders by status
$stmt = $pdo->query("SELECT status, COUNT(*) AS count FROM tenders GROUP BY status");
$tendersByStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($tendersByStatus as &$r) {
    $r['count'] = (int) $r['count'];
}
// Ensure all statuses exist (even if 0)
$allStatuses = ['draft', 'published', 'closed', 'evaluated', 'awarded'];
$byStatus = [];
foreach ($tendersByStatus as $r) {
    $byStatus[$r['status']] = $r['count'];
}
$tendersByStatus = [];
foreach ($allStatuses as $s) {
    $tendersByStatus[] = ['status' => $s, 'count' => $byStatus[$s] ?? 0];
}

// Bids per tender (top 8)
$stmt = $pdo->query("
    SELECT t.title AS tender_title, COUNT(b.id) AS bid_count
    FROM tenders t
    LEFT JOIN bids b ON b.tender_id = t.id
    GROUP BY t.id
    ORDER BY bid_count DESC
    LIMIT 8
");
$bidsPerTender = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($bidsPerTender as &$r) {
    $r['bid_count'] = (int) $r['bid_count'];
}

// Supplier registrations per month (last 6 months)
$stmt = $pdo->query("
    SELECT DATE_FORMAT(created_at, '%b %Y') AS month, COUNT(*) AS count
    FROM users
    WHERE role = 'supplier' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY YEAR(created_at), MONTH(created_at)
    ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
");
$supplierRegistrations = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($supplierRegistrations as &$r) {
    $r['count'] = (int) $r['count'];
}

// Evaluation completion: completed = evaluated or awarded, pending = closed
$stmt = $pdo->query("
    SELECT
        SUM(CASE WHEN status IN ('evaluated', 'awarded') THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) AS pending
    FROM tenders
");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$evaluationCompletion = [
    'completed' => (int) ($row['completed'] ?? 0),
    'pending' => (int) ($row['pending'] ?? 0),
];

// Summary
$stmt = $pdo->query("SELECT COUNT(*) FROM tenders");
$totalTenders = (int) $stmt->fetchColumn();
$stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'supplier'");
$totalSuppliers = (int) $stmt->fetchColumn();
$stmt = $pdo->query("SELECT COUNT(*) FROM bids");
$totalBids = (int) $stmt->fetchColumn();
$stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'supplier' AND status = 'pending'");
$pendingApprovals = (int) $stmt->fetchColumn();

$summary = [
    'total_tenders' => $totalTenders,
    'total_suppliers' => $totalSuppliers,
    'total_bids' => $totalBids,
    'pending_approvals' => $pendingApprovals,
];

jsonSuccess([
    'tenders_by_status' => $tendersByStatus,
    'bids_per_tender' => $bidsPerTender,
    'supplier_registrations' => $supplierRegistrations,
    'evaluation_completion' => $evaluationCompletion,
    'summary' => $summary,
]);
