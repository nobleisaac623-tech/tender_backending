<?php
/**
 * POST /api/ratings/create — Admin rate supplier after completed contract.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$contractId = isset($body['contract_id']) ? (int) $body['contract_id'] : 0;
$qualityScore = isset($body['quality_score']) ? (int) $body['quality_score'] : 0;
$deliveryScore = isset($body['delivery_score']) ? (int) $body['delivery_score'] : 0;
$communicationScore = isset($body['communication_score']) ? (int) $body['communication_score'] : 0;
$complianceScore = isset($body['compliance_score']) ? (int) $body['compliance_score'] : 0;
$comments = sanitizeString($body['comments'] ?? null, 2000);

if ($contractId <= 0) {
    jsonError('contract_id required', 400);
}

$scores = ['quality' => $qualityScore, 'delivery' => $deliveryScore, 'communication' => $communicationScore, 'compliance' => $complianceScore];
foreach ($scores as $name => $val) {
    if ($val < 1 || $val > 5) {
        jsonError("$name score must be between 1 and 5", 400);
    }
}

$stmt = $pdo->prepare("SELECT id, supplier_id, tender_id, status, title FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}
if ($contract['status'] !== 'completed') {
    jsonError('Contract must be completed before rating', 400);
}

$stmt = $pdo->prepare("SELECT 1 FROM supplier_ratings WHERE contract_id = ?");
$stmt->execute([$contractId]);
if ($stmt->fetch()) {
    jsonError('This contract has already been rated', 400);
}

$supplierId = (int) $contract['supplier_id'];
$tenderId = (int) $contract['tender_id'];

$stmt = $pdo->prepare("
    INSERT INTO supplier_ratings (supplier_id, contract_id, tender_id, rated_by, quality_score, delivery_score, communication_score, compliance_score, comments)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $supplierId,
    $contractId,
    $tenderId,
    $user['user_id'],
    $qualityScore,
    $deliveryScore,
    $communicationScore,
    $complianceScore,
    $comments ?: null,
]);
$ratingId = (int) $pdo->lastInsertId();

auditLog($pdo, $user['user_id'], 'supplier_rated', 'supplier_ratings', $ratingId, 'Contract #' . $contractId);

$stmt = $pdo->prepare("SELECT title FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tenderTitle = $stmt->fetchColumn() ?: 'Contract';

$stmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
$stmt->execute([$supplierId]);
$supp = $stmt->fetch(PDO::FETCH_ASSOC);
if ($supp && !empty($supp['email'])) {
    sendMail(
        $supp['email'],
        'Performance rating received',
        '<p>Hello ' . htmlspecialchars($supp['name']) . ',</p><p>You have received a performance rating for <strong>' . htmlspecialchars($tenderTitle) . '</strong>.</p><p>Log in to view your ratings.</p>',
        'You have received a performance rating for ' . $tenderTitle . '. Log in to view your ratings.'
    );
}

$pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")->execute([
    $supplierId,
    'Performance rating received',
    'You have received a performance rating for ' . $tenderTitle . '.',
]);

jsonSuccess(['id' => $ratingId], 201);
