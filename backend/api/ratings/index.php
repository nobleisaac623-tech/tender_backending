<?php
/**
 * GET /api/ratings — List ratings. Admin: all or filter by supplier_id; Supplier: own only.
 * Returns ratings + aggregate for the (filtered) supplier.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$supplierIdParam = isset($_GET['supplier_id']) ? (int) $_GET['supplier_id'] : 0;

$supplierId = $supplierIdParam;
if ($user['role'] === 'supplier') {
    $supplierId = $user['user_id'];
}

$where = '1=1';
$params = [];
if ($supplierId > 0) {
    $where .= ' AND sr.supplier_id = ?';
    $params[] = $supplierId;
}

$stmt = $pdo->prepare("
    SELECT sr.id, sr.contract_id, sr.tender_id, sr.quality_score, sr.delivery_score, sr.communication_score, sr.compliance_score, sr.overall_score, sr.comments, sr.rated_at,
           c.contract_number, t.title AS tender_title
    FROM supplier_ratings sr
    JOIN contracts c ON c.id = sr.contract_id
    JOIN tenders t ON t.id = sr.tender_id
    WHERE $where
    ORDER BY sr.rated_at DESC
");
$stmt->execute($params);
$ratings = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($ratings as &$r) {
    $r['id'] = (int) $r['id'];
    $r['contract_id'] = (int) $r['contract_id'];
    $r['tender_id'] = (int) $r['tender_id'];
    $r['quality_score'] = (int) $r['quality_score'];
    $r['delivery_score'] = (int) $r['delivery_score'];
    $r['communication_score'] = (int) $r['communication_score'];
    $r['compliance_score'] = (int) $r['compliance_score'];
    $r['overall_score'] = (float) $r['overall_score'];
}

$aggregate = null;
if ($supplierId > 0 && count($ratings) > 0) {
    $stmt = $pdo->prepare("
        SELECT
            AVG(overall_score) AS average_overall,
            AVG(quality_score) AS average_quality,
            AVG(delivery_score) AS average_delivery,
            AVG(communication_score) AS average_communication,
            AVG(compliance_score) AS average_compliance,
            COUNT(*) AS total_ratings
        FROM supplier_ratings
        WHERE supplier_id = ?
    ");
    $stmt->execute([$supplierId]);
    $agg = $stmt->fetch(PDO::FETCH_ASSOC);
    $distribution = ['1' => 0, '2' => 0, '3' => 0, '4' => 0, '5' => 0];
    $stmt = $pdo->prepare("SELECT overall_score FROM supplier_ratings WHERE supplier_id = ?");
    $stmt->execute([$supplierId]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $bucket = (string) round((float) $row['overall_score']);
        if ($bucket < '1') $bucket = '1';
        if ($bucket > '5') $bucket = '5';
        $distribution[$bucket] = ($distribution[$bucket] ?? 0) + 1;
    }
    $aggregate = [
        'average_overall' => round((float) $agg['average_overall'], 2),
        'average_quality' => round((float) $agg['average_quality'], 2),
        'average_delivery' => round((float) $agg['average_delivery'], 2),
        'average_communication' => round((float) $agg['average_communication'], 2),
        'average_compliance' => round((float) $agg['average_compliance'], 2),
        'total_ratings' => (int) $agg['total_ratings'],
        'rating_distribution' => $distribution,
    ];
}

jsonSuccess([
    'ratings' => $ratings,
    'aggregate' => $aggregate,
]);
