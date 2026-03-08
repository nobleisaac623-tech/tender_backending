<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/config/auth-middleware.php';
require_once APP_ROOT . '/helpers/response.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/audit.php';

requireRole(['admin']);

$data        = json_decode(file_get_contents('php://input'), true);
$supplier_id = (int)($data['supplier_id'] ?? 0);

if (!$supplier_id) jsonError('Supplier ID is required.');

// Check 24-hour cache first
$cached = $db->queryOne(
    "SELECT result FROM ai_cache 
     WHERE cache_key = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
    ["supplier_risk_{$supplier_id}"]
);
if ($cached) jsonSuccess(json_decode($cached['result'], true));

$supplier = $db->queryOne("
    SELECT u.name, u.created_at, u.status,
           sp.company_name, sp.registration_number, sp.category,
           sp.address, sp.tax_id, sp.website, sp.phone,
           COUNT(DISTINCT b.id)  as total_bids,
           COUNT(DISTINCT c.id)  as total_contracts,
           ROUND(AVG(sr.overall_score), 1) as avg_rating
    FROM users u
    JOIN supplier_profiles sp ON sp.user_id = u.id
    LEFT JOIN bids b ON b.supplier_id = u.id AND b.status != 'draft'
    LEFT JOIN contracts c ON c.supplier_id = u.id
    LEFT JOIN supplier_ratings sr ON sr.supplier_id = u.id
    WHERE u.id = ?
    GROUP BY u.id", [$supplier_id]);

if (!$supplier) jsonError('Supplier not found.');

$domainPrompt = "You are a procurement risk analyst specializing in African SME supplier 
assessment. Evaluate supplier risk fairly — a new business is not automatically high risk. 
Consider all available evidence. Respond with valid JSON only.";

$userMessage = "Assess procurement risk for this supplier:

Company: {$supplier['company_name']}
Registration No: " . ($supplier['registration_number'] ?: 'Not provided') . "
Tax ID: " . ($supplier['tax_id'] ? 'Provided' : 'Not provided') . "
Category: {$supplier['category']}
Location: {$supplier['address']}
Website: " . ($supplier['website'] ? 'Provided' : 'Not provided') . "
Phone: " . ($supplier['phone'] ? 'Provided' : 'Not provided') . "
Account registered: {$supplier['created_at']}
Total bids submitted: {$supplier['total_bids']}
Contracts completed: {$supplier['total_contracts']}
Average performance rating: " . ($supplier['avg_rating'] ?? 'No ratings yet') . " / 5

Return ONLY valid JSON:
{
  \"risk_level\": \"low\",
  \"risk_score\": 22,
  \"factors\": [
    {\"factor\": \"Business Registration\", \"impact\": \"positive\", \"note\": \"Registration provided\"},
    {\"factor\": \"Contract History\", \"impact\": \"positive\", \"note\": \"3 completed contracts\"},
    {\"factor\": \"Performance Rating\", \"impact\": \"positive\", \"note\": \"4.2/5 avg rating\"},
    {\"factor\": \"Account Age\", \"impact\": \"neutral\", \"note\": \"Registered 8 months ago\"}
  ],
  \"summary\": \"2 sentence risk summary with overall assessment\",
  \"recommendations\": [\"Specific verification step 1\", \"Specific verification step 2\"]
}";

try {
    $raw    = callGemini($domainPrompt, $userMessage, 1000);
    $parsed = extractJSON($raw);

    // Cache for 24 hours
    $db->query(
        "INSERT INTO ai_cache (cache_key, result) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE result = VALUES(result), created_at = NOW()",
        ["supplier_risk_{$supplier_id}", json_encode($parsed)]
    );

    logAudit($currentUser['id'], 'ai_request', 'supplier', $supplier_id, 'feature: risk_analyzer');
    jsonSuccess($parsed);
} catch (Exception $e) {
    jsonError('ProcureAI risk analysis is unavailable right now. Please try again.');
}
