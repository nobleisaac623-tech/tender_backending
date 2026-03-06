<?php
/**
 * POST /api/evaluations/score — Evaluator submit/update scores for a bid.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireEvaluator();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$bidId = isset($body['bid_id']) ? (int) $body['bid_id'] : 0;
if ($bidId <= 0) {
    jsonError('Invalid bid ID', 400);
}

$stmt = $pdo->prepare("SELECT b.tender_id FROM bids b WHERE b.id = ?");
$stmt->execute([$bidId]);
$bid = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bid) {
    jsonError('Bid not found', 404);
}
$tenderId = (int) $bid['tender_id'];

$stmt = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
$stmt->execute([$tenderId, $user['user_id']]);
if (!$stmt->fetch()) {
    jsonError('You are not assigned to evaluate this tender', 403);
}

$scores = $body['scores'] ?? [];
if (!is_array($scores)) {
    jsonError('scores must be an array', 400);
}

$stmt = $pdo->prepare("SELECT id, max_score FROM evaluation_criteria WHERE tender_id = ?");
$stmt->execute([$tenderId]);
$criteria = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $criteria[(int) $row['id']] = (int) $row['max_score'];
}

$ins = $pdo->prepare("INSERT INTO evaluations (bid_id, evaluator_id, criteria_id, score, comment) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score), comment = VALUES(comment), updated_at = NOW()");

foreach ($scores as $item) {
    $criteriaId = isset($item['criteria_id']) ? (int) $item['criteria_id'] : 0;
    if (!isset($criteria[$criteriaId])) continue;
    $maxScore = $criteria[$criteriaId];
    $score = isset($item['score']) ? (int) $item['score'] : 0;
    if ($score < 0 || $score > $maxScore) {
        jsonError("Score for criteria $criteriaId must be between 0 and $maxScore", 400);
    }
    $comment = sanitizeString($item['comment'] ?? null, 2000);
    $ins->execute([$bidId, $user['user_id'], $criteriaId, $score, $comment ?: null]);
}

auditLog($pdo, $user['user_id'], 'evaluation_scored', 'evaluations', $bidId, "Bid $bidId");
jsonSuccess(['message' => 'Scores saved']);