<?php
/**
 * PUT /api/evaluations/update — Evaluator update a single score.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireEvaluator();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$id = isset($body['id']) ? (int) $body['id'] : 0;
$score = isset($body['score']) ? (int) $body['score'] : null;
$comment = sanitizeString($body['comment'] ?? null, 2000);

if ($id <= 0) {
    jsonError('Invalid evaluation ID', 400);
}

$stmt = $pdo->prepare("
    SELECT e.id, e.bid_id, e.evaluator_id, ec.tender_id, ec.max_score
    FROM evaluations e
    JOIN evaluation_criteria ec ON ec.id = e.criteria_id
    WHERE e.id = ?
");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row || (int) $row['evaluator_id'] !== $user['user_id']) {
    jsonError('Evaluation not found or forbidden', 404);
}

if ($score !== null) {
    if ($score < 0 || $score > (int) $row['max_score']) {
        jsonError('Invalid score', 400);
    }
    $stmt = $pdo->prepare("UPDATE evaluations SET score = ?, comment = COALESCE(?, comment), updated_at = NOW() WHERE id = ?");
    $stmt->execute([$score, $comment, $id]);
} else {
    $stmt = $pdo->prepare("UPDATE evaluations SET comment = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$comment, $id]);
}

jsonSuccess(['message' => 'Evaluation updated']);