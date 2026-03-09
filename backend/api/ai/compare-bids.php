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
requireRole(['admin']);

$userId = (int)($user['user_id'] ?? 0);
$pdo = $GLOBALS['pdo'] ?? null;
checkAIRateLimit($userId, $pdo);

$input = getJsonBody();
$tenderId = (int)($input['tender_id'] ?? 0);
if (!$tenderId) {
    jsonError('Tender ID is required.', 400);
}

try {
    $tender = ai_db_query_one($pdo, "SELECT * FROM tenders WHERE id = ?", [$tenderId]);
    if (!$tender) {
        jsonError('Tender not found.', 404);
    }

    $bids = ai_db_query_all($pdo, "
        SELECT b.id, b.bid_amount, b.technical_proposal,
               sp.company_name,
               ROUND(AVG(e.score), 1) as avg_score,
               COUNT(DISTINCT e.id) as eval_count
        FROM bids b
        JOIN users u ON u.id = b.supplier_id
        JOIN supplier_profiles sp ON sp.user_id = b.supplier_id
        LEFT JOIN evaluations e ON e.bid_id = b.id
        WHERE b.tender_id = ? AND b.status IN ('submitted','under_review','accepted','rejected')
        GROUP BY b.id
        ORDER BY b.bid_amount ASC
    ", [$tenderId]);

    if (count($bids) < 2) {
        jsonError('At least 2 bids are needed for a comparison report.', 400);
    }

    $bidsText = implode("\n\n", array_map(
        fn($b, $i) =>
            "BID " . ($i + 1) . ":\n" .
            "Company: {$b['company_name']}\n" .
            "Amount: GHS {$b['bid_amount']}\n" .
            "Avg Evaluation Score: " . ($b['avg_score'] ?? 'Not yet evaluated') . "\n" .
            "Proposal Summary: " . mb_substr($b['technical_proposal'] ?? 'Not provided', 0, 400),
        $bids,
        array_keys($bids)
    ));

    $domainPrompt =
        "You are a senior procurement analyst producing executive-level bid comparison reports for procurement committees. " .
        "Be objective, data-driven, and actionable. Respond with valid JSON only — no markdown, no extra text.";

    $userMessage =
        "Produce a bid comparison and recommendation report.\n\n" .
        "TENDER: {$tender['title']}\n" .
        "CATEGORY: {$tender['category']}\n" .
        "ALLOCATED BUDGET: GHS {$tender['budget']}\n" .
        "TOTAL BIDS: " . count($bids) . "\n\n" .
        "BIDS:\n{$bidsText}\n\n" .
        "Return ONLY valid JSON:\n" .
        "{\n" .
        "  \"executive_summary\": \"2-3 sentence overview of the competitive landscape and bid quality\",\n" .
        "  \"recommended_supplier\": \"Exact company name of recommended bid\",\n" .
        "  \"recommendation_reason\": \"Clear 2-sentence justification\",\n" .
        "  \"comparison\": [\n" .
        "    {\n" .
        "      \"company\": \"Company Name\",\n" .
        "      \"bid_amount\": 42000,\n" .
        "      \"value_for_money\": \"excellent\",\n" .
        "      \"technical_strength\": \"strong\",\n" .
        "      \"key_advantage\": \"Main competitive advantage\",\n" .
        "      \"key_concern\": \"Main concern or 'None identified'\",\n" .
        "      \"overall_rank\": 1\n" .
        "    }\n" .
        "  ],\n" .
        "  \"market_observations\": \"Note on pricing competitiveness and market dynamics\",\n" .
        "  \"risks\": [\"Risk 1\", \"Risk 2\"],\n" .
        "  \"procurement_advice\": \"One actionable sentence of advice for the award decision\"\n" .
        "}";

    $raw = callAI($domainPrompt . "\n\n" . $userMessage, [], [
        'id' => $userId,
        'role' => $user['role'] ?? 'admin',
        'name' => $user['name'] ?? 'there',
        'tender_id' => $tenderId,
    ], $pdo);
    $parsed = ai_extract_json($raw);

    if ($pdo instanceof PDO) {
        auditLog($pdo, $userId, 'ai_request', 'tender', $tenderId, 'feature: bid_comparison');
    }

    jsonSuccess($parsed);
} catch (Throwable $e) {
    error_log('AI compare-bids error: ' . $e->getMessage());
    jsonError('ProcureAI comparison is unavailable right now. Please try again.', 500);
}
