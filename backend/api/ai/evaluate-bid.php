<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/config/auth-middleware.php';
require_once APP_ROOT . '/helpers/response.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/audit.php';

requireRole(['admin', 'evaluator']);
checkAIRateLimit($currentUser['id'], 'bid_evaluator', 20);

$data      = json_decode(file_get_contents('php://input'), true);
$bid_id    = (int)($data['bid_id'] ?? 0);
$tender_id = (int)($data['tender_id'] ?? 0);

if (!$bid_id || !$tender_id) jsonError('Bid ID and Tender ID are required.');

$bid = $db->queryOne("
    SELECT b.bid_amount, b.technical_proposal, 
           u.name as supplier_name, sp.company_name
    FROM bids b
    JOIN users u ON u.id = b.supplier_id
    JOIN supplier_profiles sp ON sp.user_id = b.supplier_id
    WHERE b.id = ? AND b.tender_id = ?", [$bid_id, $tender_id]);

if (!$bid) jsonError('Bid not found.');

$tender   = $db->queryOne("SELECT title, description FROM tenders WHERE id = ?", [$tender_id]);
$criteria = $db->query("SELECT name, description, max_score, weight FROM evaluation_criteria WHERE tender_id = ?", [$tender_id]);

if (empty($criteria)) jsonError('No evaluation criteria defined for this tender.');

$criteriaText = implode("\n", array_map(
    fn($c) => "- {$c['name']} (max: {$c['max_score']} pts, weight: {$c['weight']}%): {$c['description']}",
    $criteria
));

$domainPrompt = "You are an experienced procurement evaluation expert helping to 
assess supplier bids fairly and objectively. You provide suggested scores with clear 
reasoning to help human evaluators make informed decisions. Respond with valid JSON only.";

$userMessage = "Evaluate this bid for the following tender:

TENDER: {$tender['title']}
TENDER DESCRIPTION: {$tender['description']}

SUPPLIER: {$bid['company_name']}
BID AMOUNT: GHS {$bid['bid_amount']}
TECHNICAL PROPOSAL:
{$bid['technical_proposal']}

EVALUATION CRITERIA:
{$criteriaText}

Provide suggested scores and assessment. Return ONLY valid JSON:
{
  \"scores\": [
    {
      \"criteria_name\": \"Technical Proposal\",
      \"suggested_score\": 82,
      \"max_score\": 100,
      \"reasoning\": \"Brief 1-2 sentence justification for this score\"
    }
  ],
  \"overall_assessment\": \"2-3 sentence balanced assessment of this bid's overall quality and competitiveness\",
  \"strengths\": [\"Specific strength 1\", \"Specific strength 2\"],
  \"weaknesses\": [\"Specific weakness or concern 1\", \"Specific weakness 2\"],
  \"risk_level\": \"low\",
  \"recommendation\": \"recommend\"
}";

try {
    logAudit($currentUser['id'], 'ai_request', 'bid', $bid_id, 'feature: bid_evaluator');
    $raw    = callGemini($domainPrompt, $userMessage, 1500);
    $parsed = extractJSON($raw);
    jsonSuccess($parsed);
} catch (Exception $e) {
    jsonError('ProcureAI evaluation is unavailable right now. Please try again.');
}
