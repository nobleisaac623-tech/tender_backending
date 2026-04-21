<?php
/**
 * POST /api/evaluations/finalize — Admin finalize evaluation, compute rankings.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

/**
 * Best-effort extraction of delivery duration in days from free text.
 */
function parseDeliveryDays(?string $delivery): ?float
{
    if (!$delivery) return null;
    $s = strtolower(trim($delivery));
    if ($s === '') return null;

    if (preg_match('/(\d+(?:\.\d+)?)\s*(day|days)\b/', $s, $m)) {
        return (float) $m[1];
    }
    if (preg_match('/(\d+(?:\.\d+)?)\s*(week|weeks|wk|wks)\b/', $s, $m)) {
        return (float) $m[1] * 7.0;
    }
    if (preg_match('/(\d+(?:\.\d+)?)\s*(month|months|mo|mos)\b/', $s, $m)) {
        return (float) $m[1] * 30.0;
    }
    if (preg_match('/\b(\d+(?:\.\d+)?)\b/', $s, $m)) {
        // If unit is missing, assume days.
        return (float) $m[1];
    }

    return null;
}

/**
 * Deterministic fallback scorer when AI is unavailable.
 *
 * @param array<int,array<string,mixed>> $criteriaRows
 * @return array<int,array{score:int,comment:string}>
 */
function buildFallbackScores(array $criteriaRows, array $bid, float $minPrice, float $maxPrice, ?float $minDays, ?float $maxDays): array
{
    $price = isset($bid['bid_amount']) && is_numeric($bid['bid_amount']) ? (float) $bid['bid_amount'] : null;
    $days = parseDeliveryDays((string) ($bid['delivery_time'] ?? ''));
    $proposal = (string) ($bid['technical_proposal'] ?? '');

    // Price score (0-100): lower is better.
    $priceScore = 60.0;
    if ($price !== null && $maxPrice > $minPrice) {
        $ratio = ($maxPrice - $price) / ($maxPrice - $minPrice);
        $priceScore = max(0.0, min(100.0, $ratio * 100.0));
    } elseif ($price !== null) {
        $priceScore = 80.0;
    }

    // Delivery score (0-100): faster is better.
    $deliveryScore = 60.0;
    if ($days !== null && $minDays !== null && $maxDays !== null && $maxDays > $minDays) {
        $ratio = ($maxDays - $days) / ($maxDays - $minDays);
        $deliveryScore = max(0.0, min(100.0, $ratio * 100.0));
    } elseif ($days !== null) {
        $deliveryScore = 75.0;
    }

    // Technical/quality score proxy from proposal richness.
    $len = mb_strlen(trim($proposal));
    $qualityScore = 45.0;
    if ($len >= 1500) $qualityScore = 90.0;
    elseif ($len >= 900) $qualityScore = 80.0;
    elseif ($len >= 500) $qualityScore = 70.0;
    elseif ($len >= 200) $qualityScore = 60.0;

    $baseOther = ($priceScore + $deliveryScore + $qualityScore) / 3.0;

    $result = [];
    foreach ($criteriaRows as $c) {
        $cid = (int) $c['id'];
        $name = strtolower((string) ($c['name'] ?? ''));
        $maxScore = max(1, (int) ($c['max_score'] ?? 100));

        if (strpos($name, 'price') !== false || strpos($name, 'cost') !== false || strpos($name, 'financial') !== false) {
            $raw = $priceScore;
            $reason = 'Auto-scored on price competitiveness against other submitted bids.';
        } elseif (strpos($name, 'delivery') !== false || strpos($name, 'timeline') !== false || strpos($name, 'time') !== false || strpos($name, 'schedule') !== false) {
            $raw = $deliveryScore;
            $reason = 'Auto-scored on proposed delivery time versus other submitted bids.';
        } elseif (strpos($name, 'technical') !== false || strpos($name, 'quality') !== false || strpos($name, 'experience') !== false || strpos($name, 'capability') !== false) {
            $raw = $qualityScore;
            $reason = 'Auto-scored from technical proposal depth and completeness.';
        } else {
            $raw = $baseOther;
            $reason = 'Auto-scored using combined price, delivery, and proposal quality signals.';
        }

        $scaled = (int) round(($raw / 100.0) * $maxScore);
        $result[$cid] = [
            'score' => max(0, min($maxScore, $scaled)),
            'comment' => $reason . ' (AI fallback heuristic)',
        ];
    }

    return $result;
}

/**
 * @param array<int,array<string,mixed>> $criteriaRows
 * @return array<int,array{score:int,comment:string}>
 */
function buildAiScores(PDO $pdo, array $adminUser, array $tender, array $bid, array $criteriaRows): array
{
    $criteriaText = [];
    foreach ($criteriaRows as $c) {
        $criteriaText[] = sprintf(
            "- criteria_id=%d; name=%s; max_score=%d; weight=%s; description=%s",
            (int) $c['id'],
            (string) ($c['name'] ?? ''),
            (int) ($c['max_score'] ?? 100),
            (string) ($c['weight'] ?? '1'),
            (string) ($c['description'] ?? '')
        );
    }

    $prompt = "You are an impartial procurement evaluator.\n"
        . "Score this bid against each criterion using price, delivery time, technical quality, and risk.\n"
        . "Return STRICT JSON ONLY:\n"
        . "{ \"scores\": [ { \"criteria_id\": 1, \"score\": 80, \"reason\": \"...\" } ] }\n\n"
        . "Tender: " . ($tender['title'] ?? '') . "\n"
        . "Tender description: " . ($tender['description'] ?? '') . "\n"
        . "Supplier: " . ($bid['company_name'] ?? $bid['supplier_name'] ?? 'Unknown') . "\n"
        . "Bid amount: " . (string) ($bid['bid_amount'] ?? 'null') . "\n"
        . "Delivery time: " . (string) ($bid['delivery_time'] ?? 'not provided') . "\n"
        . "Technical proposal:\n" . (string) ($bid['technical_proposal'] ?? '') . "\n\n"
        . "Criteria:\n" . implode("\n", $criteriaText);

    $raw = callAI($prompt, [], [
        'id' => (int) ($adminUser['user_id'] ?? 0),
        'role' => 'admin',
        'name' => (string) ($adminUser['name'] ?? 'Admin'),
        'tender_id' => (int) $tender['id'],
    ], $pdo);
    $parsed = ai_extract_json($raw);

    $byId = [];
    foreach ($criteriaRows as $c) {
        $byId[(int) $c['id']] = max(1, (int) ($c['max_score'] ?? 100));
    }

    $out = [];
    $rows = is_array($parsed['scores'] ?? null) ? $parsed['scores'] : [];
    foreach ($rows as $row) {
        $cid = isset($row['criteria_id']) ? (int) $row['criteria_id'] : 0;
        if (!isset($byId[$cid])) continue;
        $maxScore = $byId[$cid];
        $score = isset($row['score']) ? (int) $row['score'] : 0;
        $reason = trim((string) ($row['reason'] ?? 'AI-generated evaluation score.'));
        $out[$cid] = [
            'score' => max(0, min($maxScore, $score)),
            'comment' => $reason !== '' ? $reason : 'AI-generated evaluation score.',
        ];
    }

    return $out;
}

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

// If no evaluator is assigned, generate AI-assisted scores automatically.
$stmt = $pdo->prepare("SELECT COUNT(*) FROM tender_evaluators WHERE tender_id = ?");
$stmt->execute([$tenderId]);
$assignedEvaluators = (int) $stmt->fetchColumn();
$evaluationMode = $assignedEvaluators === 0 ? 'ai_auto' : 'manual';

if ($assignedEvaluators === 0) {
    $stmt = $pdo->prepare("SELECT id, name, description, max_score, weight FROM evaluation_criteria WHERE tender_id = ?");
    $stmt->execute([$tenderId]);
    $criteriaRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($criteriaRows)) {
        jsonError('No evaluation criteria defined for this tender', 400);
    }

    $stmt = $pdo->prepare("
        SELECT b.id, b.bid_amount, b.delivery_time, b.technical_proposal, u.name AS supplier_name, sp.company_name
        FROM bids b
        JOIN users u ON u.id = b.supplier_id
        LEFT JOIN supplier_profiles sp ON sp.user_id = b.supplier_id
        WHERE b.tender_id = ? AND b.status = 'submitted'
    ");
    $stmt->execute([$tenderId]);
    $submittedBids = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($submittedBids)) {
        jsonError('No submitted bids found for automatic evaluation', 400);
    }

    $prices = [];
    $daysList = [];
    foreach ($submittedBids as $b) {
        if (isset($b['bid_amount']) && is_numeric($b['bid_amount'])) $prices[] = (float) $b['bid_amount'];
        $d = parseDeliveryDays((string) ($b['delivery_time'] ?? ''));
        if ($d !== null) $daysList[] = $d;
    }
    $minPrice = !empty($prices) ? min($prices) : 0.0;
    $maxPrice = !empty($prices) ? max($prices) : 0.0;
    $minDays = !empty($daysList) ? min($daysList) : null;
    $maxDays = !empty($daysList) ? max($daysList) : null;

    $ins = $pdo->prepare("
        INSERT INTO evaluations (bid_id, evaluator_id, criteria_id, score, comment)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            score = VALUES(score),
            comment = VALUES(comment),
            updated_at = NOW()
    ");

    foreach ($submittedBids as $bid) {
        $aiScores = [];
        try {
            $aiScores = buildAiScores($pdo, $user, $tender, $bid, $criteriaRows);
        } catch (Throwable $e) {
            error_log('AI auto-evaluation failed for bid ' . (int) $bid['id'] . ': ' . $e->getMessage());
        }

        $fallback = buildFallbackScores($criteriaRows, $bid, $minPrice, $maxPrice, $minDays, $maxDays);
        foreach ($criteriaRows as $c) {
            $cid = (int) $c['id'];
            $picked = $aiScores[$cid] ?? $fallback[$cid] ?? ['score' => 0, 'comment' => 'No score generated.'];
            $ins->execute([(int) $bid['id'], (int) $user['user_id'], $cid, (int) $picked['score'], (string) $picked['comment']]);
        }
    }
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
jsonSuccess([
    'message' => 'Evaluation finalized',
    'evaluation_mode' => $evaluationMode,
    'rankings' => $rankings,
]);