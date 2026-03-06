<?php
/**
 * GET /api/evaluations — Get evaluations for a tender or bid. Filter by tender_id or bid_id.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$tenderId = isset($_GET['tender_id']) ? (int) $_GET['tender_id'] : 0;
$bidId = isset($_GET['bid_id']) ? (int) $_GET['bid_id'] : 0;

if ($tenderId <= 0 && $bidId <= 0) {
    jsonError('Provide tender_id or bid_id', 400);
}

if ($bidId > 0) {
    $stmt = $pdo->prepare("SELECT b.tender_id FROM bids b WHERE b.id = ?");
    $stmt->execute([$bidId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) jsonError('Bid not found', 404);
    $tenderId = (int) $row['tender_id'];
}

if ($user['role'] === 'evaluator') {
    $stmt = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
    $stmt->execute([$tenderId, $user['user_id']]);
    if (!$stmt->fetch()) {
        jsonError('Forbidden', 403);
    }
} elseif ($user['role'] !== 'admin') {
    jsonError('Forbidden', 403);
}

$sql = "
    SELECT e.id, e.bid_id, e.evaluator_id, e.criteria_id, e.score, e.comment, e.created_at,
           ec.name AS criteria_name, ec.max_score, ec.weight
    FROM evaluations e
    JOIN evaluation_criteria ec ON ec.id = e.criteria_id
    WHERE ec.tender_id = ?
";
$params = [$tenderId];
if ($bidId > 0) {
    $sql .= " AND e.bid_id = ?";
    $params[] = $bidId;
}
$sql .= " ORDER BY e.bid_id, e.criteria_id";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
    $r['bid_id'] = (int) $r['bid_id'];
    $r['evaluator_id'] = (int) $r['evaluator_id'];
    $r['criteria_id'] = (int) $r['criteria_id'];
    $r['score'] = (int) $r['score'];
    $r['max_score'] = (int) $r['max_score'];
    $r['weight'] = (float) $r['weight'];
}

jsonSuccess($rows);