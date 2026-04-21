<?php
/**
 * /api/tenders/evaluators
 * - GET  (admin|evaluator): list assigned evaluators for a tender. Query: ?tender_id=1
 * - POST (admin): assign evaluators to tender.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $tenderId = isset($_GET['tender_id']) ? (int) $_GET['tender_id'] : 0;
    if ($tenderId <= 0) {
        jsonError('tender_id required', 400);
    }
    if ($user['role'] !== 'admin' && $user['role'] !== 'evaluator') {
        jsonError('Forbidden', 403);
    }
    if ($user['role'] === 'evaluator') {
        $chk = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
        $chk->execute([$tenderId, (int) $user['user_id']]);
        if (!$chk->fetch()) {
            jsonError('Forbidden', 403);
        }
    }

    $stmt = $pdo->prepare("
        SELECT te.evaluator_id, u.name, u.email
        FROM tender_evaluators te
        JOIN users u ON u.id = te.evaluator_id
        WHERE te.tender_id = ?
        ORDER BY u.name ASC
    ");
    $stmt->execute([$tenderId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['evaluator_id'] = (int) $r['evaluator_id'];
    }
    jsonSuccess($rows);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    requireAdmin();
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
}

jsonError('Method not allowed', 405);