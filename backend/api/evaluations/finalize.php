<?php
/**
 * POST /api/evaluations/finalize — Admin finalize evaluation, compute rankings.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();
$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : (isset($_GET['tender_id']) ? (int) $_GET['tender_id'] : 0);
if ($tenderId <= 0) {
    jsonError('Invalid tender ID', 400);
}

$stmt = $pdo->prepare("SELECT id, title, status FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if (!in_array($tender['status'], ['published', 'closed'], true)) {
    jsonError('Tender must be published or closed to finalize', 400);
}

$stmt = $pdo->prepare("UPDATE tenders SET status = 'evaluated' WHERE id = ?");
$stmt->execute([$tenderId]);

$stmt = $pdo->prepare("
    SELECT e.bid_id, ec.id AS criteria_id, ec.weight, AVG(e.score) AS avg_score
    FROM evaluations e
    JOIN evaluation_criteria ec ON ec.id = e.criteria_id
    WHERE ec.tender_id = ?
    GROUP BY e.bid_id, ec.id, ec.weight
");
$stmt->execute([$tenderId]);
$scores = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $bidId = (int) $row['bid_id'];
    if (!isset($scores[$bidId])) $scores[$bidId] = ['weighted' => 0, 'total_weight' => 0];
    $scores[$bidId]['weighted'] += (float) $row['avg_score'] * (float) $row['weight'];
    $scores[$bidId]['total_weight'] += (float) $row['weight'];
}

$rankings = [];
foreach ($scores as $bidId => $data) {
    $totalWeight = $data['total_weight'];
    $rankings[] = [
        'bid_id' => $bidId,
        'weighted_score' => $totalWeight > 0 ? round($data['weighted'] / $totalWeight, 2) : 0,
    ];
}
usort($rankings, fn($a, $b) => $b['weighted_score'] <=> $a['weighted_score']);
$rank = 1;
foreach ($rankings as &$r) {
    $r['rank'] = $rank++;
}

$stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) SELECT b.supplier_id, ?, ? FROM bids b WHERE b.tender_id = ? AND b.status = 'submitted'");
$stmt->execute(['Evaluation complete', 'Tender "' . $tender['title'] . '" evaluation has been finalized. Check your bid status.', $tenderId]);

auditLog($pdo, $user['user_id'], 'evaluation_finalized', 'tenders', $tenderId, $tender['title']);
jsonSuccess(['message' => 'Evaluation finalized', 'rankings' => $rankings]);