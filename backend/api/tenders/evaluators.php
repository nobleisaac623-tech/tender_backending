<?php
/**
 * POST /api/tenders/evaluators — Admin: assign evaluators to tender.
 * Body: { "tender_id": 1, "evaluator_ids": [2, 3] }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : 0;
$evaluatorIds = $body['evaluator_ids'] ?? [];
if ($tenderId <= 0 || !is_array($evaluatorIds)) {
    jsonError('tender_id and evaluator_ids required', 400);
}

$stmt = $pdo->prepare("SELECT 1 FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
if (!$stmt->fetch()) {
    jsonError('Tender not found', 404);
}

$stmt = $pdo->prepare("INSERT IGNORE INTO tender_evaluators (tender_id, evaluator_id) SELECT ?, id FROM users WHERE id = ? AND role = 'evaluator' AND status = 'active'");
foreach ($evaluatorIds as $eid) {
    $eid = (int) $eid;
    if ($eid > 0) {
        $stmt->execute([$tenderId, $eid]);
    }
}
jsonSuccess(['message' => 'Evaluators assigned']);