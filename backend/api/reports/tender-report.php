<?php
/**
 * GET /api/reports/tender-report?tender_id=1 — Full tender evaluation report with rankings.
 * Returns summary (per-supplier scores, weighted, rank) and detailed (per-evaluator per-criteria).
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

$tenderId = isset($_GET['tender_id']) ? (int) $_GET['tender_id'] : 0;
if ($tenderId <= 0) {
    jsonError('Invalid tender_id', 400);
}

$stmt = $pdo->prepare("SELECT * FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}

// Aggregated scores per bid (for ranking)
$stmt = $pdo->prepare("
    SELECT e.bid_id, ec.id AS criteria_id, ec.name AS criteria_name, ec.weight, AVG(e.score) AS avg_score
    FROM evaluations e
    JOIN evaluation_criteria ec ON ec.id = e.criteria_id
    WHERE ec.tender_id = ?
    GROUP BY e.bid_id, ec.id, ec.name, ec.weight
");
$stmt->execute([$tenderId]);
$scores = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $bidId = (int) $row['bid_id'];
    if (!isset($scores[$bidId])) $scores[$bidId] = ['weighted' => 0, 'total_weight' => 0, 'criteria' => []];
    $scores[$bidId]['weighted'] += (float) $row['avg_score'] * (float) $row['weight'];
    $scores[$bidId]['total_weight'] += (float) $row['weight'];
    $scores[$bidId]['criteria'][$row['criteria_name']] = round((float) $row['avg_score'], 2);
}

// Detailed: per-evaluator per-criteria scores
$stmt = $pdo->prepare("
    SELECT e.bid_id, e.evaluator_id, e.score, e.comment, ec.name AS criteria_name, ec.max_score,
           u.name AS evaluator_name, b.supplier_id
    FROM evaluations e
    JOIN evaluation_criteria ec ON ec.id = e.criteria_id
    JOIN users u ON u.id = e.evaluator_id
    JOIN bids b ON b.id = e.bid_id
    WHERE ec.tender_id = ?
    ORDER BY e.bid_id, e.evaluator_id, ec.id
");
$stmt->execute([$tenderId]);
$detailedRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get supplier names for detailed
$supplierNames = [];
$stmt = $pdo->prepare("SELECT b.id, u.name AS supplier_name, sp.company_name FROM bids b JOIN users u ON u.id = b.supplier_id LEFT JOIN supplier_profiles sp ON sp.user_id = b.supplier_id WHERE b.tender_id = ?");
$stmt->execute([$tenderId]);
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $supplierNames[(int) $row['id']] = ['supplier_name' => $row['supplier_name'], 'company_name' => $row['company_name'] ?? ''];
}

$detailed = [];
foreach ($detailedRows as $r) {
    $bidId = (int) $r['bid_id'];
    $info = $supplierNames[$bidId] ?? ['supplier_name' => 'Unknown', 'company_name' => ''];
    $detailed[] = [
        'supplier_name' => $info['supplier_name'],
        'company_name' => $info['company_name'],
        'evaluator_name' => $r['evaluator_name'],
        'criteria_name' => $r['criteria_name'],
        'score' => (int) $r['score'],
        'max_score' => (int) $r['max_score'],
        'comment' => $r['comment'] ?? '',
    ];
}

// Build summary with rank
$rankings = [];
foreach ($scores as $bidId => $data) {
    $totalWeight = $data['total_weight'];
    $rankings[] = [
        'bid_id' => $bidId,
        'weighted_score' => $totalWeight > 0 ? round($data['weighted'] / $totalWeight, 2) : 0,
        'criteria_scores' => $data['criteria'] ?? [],
    ];
}
usort($rankings, fn($a, $b) => $b['weighted_score'] <=> $a['weighted_score']);
$rank = 1;
$summary = [];
foreach ($rankings as $r) {
    $stmt = $pdo->prepare("SELECT b.id, b.bid_amount, u.name AS supplier_name, sp.company_name FROM bids b JOIN users u ON u.id = b.supplier_id LEFT JOIN supplier_profiles sp ON sp.user_id = b.supplier_id WHERE b.id = ?");
    $stmt->execute([$r['bid_id']]);
    $bid = $stmt->fetch(PDO::FETCH_ASSOC);
    $totalScore = array_sum($r['criteria_scores']);
    $summary[] = [
        'supplier_name' => $bid['supplier_name'] ?? 'Unknown',
        'company_name' => $bid['company_name'] ?? '',
        'criteria_scores' => $r['criteria_scores'],
        'total_score' => $totalScore,
        'weighted_score' => $r['weighted_score'],
        'rank' => $rank++,
    ];
}

$tender['id'] = (int) $tender['id'];
$tender['created_by'] = (int) $tender['created_by'];
if ($tender['budget'] !== null) $tender['budget'] = (float) $tender['budget'];

jsonSuccess([
    'tender' => $tender,
    'rankings' => $rankings,
    'summary' => $summary,
    'detailed' => $detailed,
]);