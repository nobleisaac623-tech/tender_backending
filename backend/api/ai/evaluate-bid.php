<?php
require_once __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireRole(['admin', 'evaluator']);

$userId = (int)($user['user_id'] ?? 0);
$pdo = $GLOBALS['pdo'] ?? null;
checkAIRateLimit($userId, $pdo);

$input = getJsonBody();
$bidId = (int)($input['bid_id'] ?? 0);
$tenderId = (int)($input['tender_id'] ?? 0);

if (!$bidId || !$tenderId) {
    jsonError('Bid ID and Tender ID are required.', 400);
}

try {
    $bid = ai_db_query_one($pdo, "
        SELECT b.bid_amount, b.technical_proposal,
               u.name as supplier_name, sp.company_name
        FROM bids b
        JOIN users u ON u.id = b.supplier_id
        JOIN supplier_profiles sp ON sp.user_id = b.supplier_id
        WHERE b.id = ? AND b.tender_id = ?
    ", [$bidId, $tenderId]);

    if (!$bid) {
        jsonError('Bid not found.', 404);
    }

    $tender = ai_db_query_one($pdo, "SELECT title, description FROM tenders WHERE id = ?", [$tenderId]);
    if (!$tender) {
        jsonError('Tender not found.', 404);
    }

    $criteria = ai_db_query_all($pdo, "SELECT name, description, max_score, weight FROM evaluation_criteria WHERE tender_id = ?", [$tenderId]);
    if (empty($criteria)) {
        jsonError('No evaluation criteria defined for this tender.', 400);
    }

    $criteriaText = implode("\n", array_map(
        fn($c) => "- {$c['name']} (max: {$c['max_score']} pts, weight: {$c['weight']}%): {$c['description']}",
        $criteria
    ));

    $domainPrompt =
        "You are an experienced procurement evaluation expert helping to assess supplier bids fairly and objectively. " .
        "You provide suggested scores with clear reasoning to help human evaluators make informed decisions. " .
        "Respond with valid JSON only — no markdown, no extra text.";

    $userMessage =
        "Evaluate this bid for the following tender:\n\n" .
        "TENDER: {$tender['title']}\n" .
        "TENDER DESCRIPTION: {$tender['description']}\n\n" .
        "SUPPLIER: {$bid['company_name']}\n" .
        "BID AMOUNT: GHS {$bid['bid_amount']}\n" .
        "TECHNICAL PROPOSAL:\n{$bid['technical_proposal']}\n\n" .
        "EVALUATION CRITERIA:\n{$criteriaText}\n\n" .
        "Return ONLY valid JSON:\n" .
        "{\n" .
        "  \"scores\": [\n" .
        "    {\n" .
        "      \"criteria_name\": \"Technical Proposal\",\n" .
        "      \"suggested_score\": 82,\n" .
        "      \"max_score\": 100,\n" .
        "      \"reasoning\": \"Brief 1-2 sentence justification for this score\"\n" .
        "    }\n" .
        "  ],\n" .
        "  \"overall_assessment\": \"2-3 sentence balanced assessment of this bid's overall quality and competitiveness\",\n" .
        "  \"strengths\": [\"Specific strength 1\", \"Specific strength 2\"],\n" .
        "  \"weaknesses\": [\"Specific weakness or concern 1\", \"Specific weakness 2\"],\n" .
        "  \"risk_level\": \"low\",\n" .
        "  \"recommendation\": \"recommend\"\n" .
        "}";

    $raw = callAI($domainPrompt . "\n\n" . $userMessage, [], [
        'id' => $userId,
        'role' => $user['role'] ?? 'user',
        'name' => $user['name'] ?? 'there',
        'tender_id' => $tenderId,
    ], $pdo);
    $parsed = ai_extract_json($raw);

    if ($pdo instanceof PDO) {
        auditLog($pdo, $userId, 'ai_request', 'bid', $bidId, 'feature: bid_evaluator');
    }

    jsonSuccess($parsed);
} catch (Throwable $e) {
    error_log('AI evaluate-bid error: ' . $e->getMessage());
    jsonError('ProcureAI evaluation is unavailable right now. Please try again.', 500);
}
