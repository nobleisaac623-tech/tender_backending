<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/config/auth-middleware.php';
require_once APP_ROOT . '/helpers/response.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/audit.php';

requireRole(['admin']);
checkAIRateLimit($currentUser['id'], 'bid_comparison', 10);

$data      = json_decode(file_get_contents('php://input'), true);
$tender_id = (int)($data['tender_id'] ?? 0);

if (!$tender_id) jsonError('Tender ID is required.');

$tender = $db->queryOne("SELECT * FROM tenders WHERE id = ?", [$tender_id]);
if (!$tender) jsonError('Tender not found.');

$bids = $db->query("
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
    ORDER BY b.bid_amount ASC", [$tender_id]);

if (count($bids) < 2) jsonError('At least 2 bids are needed for a comparison report.');

$bidsText = implode("\n\n", array_map(fn($b, $i) =>
    "BID " . ($i+1) . ":\n" .
    "Company: {$b['company_name']}\n" .
    "Amount: GHS {$b['bid_amount']}\n" .
    "Avg Evaluation Score: " . ($b['avg_score'] ?? 'Not yet evaluated') . "\n" .
    "Proposal Summary: " . substr($b['technical_proposal'] ?? 'Not provided', 0, 400),
    $bids, array_keys($bids)
));

$domainPrompt = "You are a senior procurement analyst producing executive-level bid 
comparison reports for procurement committees. Be objective, data-driven, and actionable. 
Respond with valid JSON only.";

$userMessage = "Produce a bid comparison and recommendation report.

TENDER: {$tender['title']}
CATEGORY: {$tender['category']}
ALLOCATED BUDGET: GHS {$tender['budget']}
TOTAL BIDS: " . count($bids) . "

BIDS:
{$bidsText}

Return ONLY valid JSON:
{
  \"executive_summary\": \"2-3 sentence overview of the competitive landscape and bid quality\",
  \"recommended_supplier\": \"Exact company name of recommended bid\",
  \"recommendation_reason\": \"Clear 2-sentence justification\",
  \"comparison\": [
    {
      \"company\": \"Company Name\",
      \"bid_amount\": 42000,
      \"value_for_money\": \"excellent\",
      \"technical_strength\": \"strong\",
      \"key_advantage\": \"Main competitive advantage\",
      \"key_concern\": \"Main concern or 'None identified'\",
      \"overall_rank\": 1
    }
  ],
  \"market_observations\": \"Note on pricing competitiveness and market dynamics\",
  \"risks\": [\"Risk 1\", \"Risk 2\"],
  \"procurement_advice\": \"One actionable sentence of advice for the award decision\"
}";

try {
    $raw    = callGemini($domainPrompt, $userMessage, 2000);
    $parsed = extractJSON($raw);
    logAudit($currentUser['id'], 'ai_request', 'tender', $tender_id, 'feature: bid_comparison');
    jsonSuccess($parsed);
} catch (Exception $e) {
    jsonError('ProcureAI comparison is unavailable right now. Please try again.');
}
