<?php
/**
 * GET /api/ratings/show — Single rating. Admin or the rated supplier.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid rating ID', 400);
}

$stmt = $pdo->prepare("
    SELECT sr.*, c.contract_number, t.title AS tender_title
    FROM supplier_ratings sr
    JOIN contracts c ON c.id = sr.contract_id
    JOIN tenders t ON t.id = sr.tender_id
    WHERE sr.id = ?
");
$stmt->execute([$id]);
$rating = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$rating) {
    jsonError('Rating not found', 404);
}

if ($user['role'] === 'supplier' && (int) $rating['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}

$rating['id'] = (int) $rating['id'];
$rating['supplier_id'] = (int) $rating['supplier_id'];
$rating['contract_id'] = (int) $rating['contract_id'];
$rating['tender_id'] = (int) $rating['tender_id'];
$rating['rated_by'] = (int) $rating['rated_by'];
$rating['quality_score'] = (int) $rating['quality_score'];
$rating['delivery_score'] = (int) $rating['delivery_score'];
$rating['communication_score'] = (int) $rating['communication_score'];
$rating['compliance_score'] = (int) $rating['compliance_score'];
$rating['overall_score'] = (float) $rating['overall_score'];

jsonSuccess($rating);
