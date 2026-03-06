<?php
/**
 * GET /api/ratings/by-contract — Get rating for a contract (if any). Admin or contract's supplier.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$contractId = isset($_GET['contract_id']) ? (int) $_GET['contract_id'] : 0;
if ($contractId <= 0) {
    jsonError('Invalid contract_id', 400);
}

$stmt = $pdo->prepare("SELECT supplier_id FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}
if ($user['role'] === 'supplier' && (int) $contract['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}

$stmt = $pdo->prepare("
    SELECT sr.id, sr.contract_id, sr.quality_score, sr.delivery_score, sr.communication_score, sr.compliance_score, sr.overall_score, sr.comments, sr.rated_at,
           c.contract_number, t.title AS tender_title
    FROM supplier_ratings sr
    JOIN contracts c ON c.id = sr.contract_id
    JOIN tenders t ON t.id = sr.tender_id
    WHERE sr.contract_id = ?
");
$stmt->execute([$contractId]);
$rating = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$rating) {
    jsonSuccess(null);
    return;
}

$rating['id'] = (int) $rating['id'];
$rating['contract_id'] = (int) $rating['contract_id'];
$rating['quality_score'] = (int) $rating['quality_score'];
$rating['delivery_score'] = (int) $rating['delivery_score'];
$rating['communication_score'] = (int) $rating['communication_score'];
$rating['compliance_score'] = (int) $rating['compliance_score'];
$rating['overall_score'] = (float) $rating['overall_score'];

jsonSuccess($rating);
