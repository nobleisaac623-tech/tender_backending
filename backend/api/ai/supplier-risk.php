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
$supplierId = (int)($input['supplier_id'] ?? 0);
if (!$supplierId) {
    jsonError('Supplier ID is required.', 400);
}

try {
    // Cache for 24 hours
    $cached = ai_db_query_one(
        $pdo,
        "SELECT result FROM ai_cache WHERE cache_key = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)",
        ["supplier_risk_{$supplierId}"]
    );
    if (!empty($cached['result'])) {
        $decoded = json_decode((string)$cached['result'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            jsonSuccess($decoded);
        }
        // If cache is corrupt, fall through to regenerate
    }

    $supplier = ai_db_query_one($pdo, "
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
        GROUP BY u.id
    ", [$supplierId]);

    if (!$supplier) {
        jsonError('Supplier not found.', 404);
    }

    $domainPrompt =
        "You are a procurement risk analyst specializing in African SME supplier assessment. " .
        "Evaluate supplier risk fairly — a new business is not automatically high risk. " .
        "Consider all available evidence. Respond with valid JSON only — no markdown, no extra text.";

    $userMessage =
        "Assess procurement risk for this supplier:\n\n" .
        "Company: {$supplier['company_name']}\n" .
        "Registration No: " . ($supplier['registration_number'] ?: 'Not provided') . "\n" .
        "Tax ID: " . ($supplier['tax_id'] ? 'Provided' : 'Not provided') . "\n" .
        "Category: {$supplier['category']}\n" .
        "Location: {$supplier['address']}\n" .
        "Website: " . ($supplier['website'] ? 'Provided' : 'Not provided') . "\n" .
        "Phone: " . ($supplier['phone'] ? 'Provided' : 'Not provided') . "\n" .
        "Account registered: {$supplier['created_at']}\n" .
        "Total bids submitted: {$supplier['total_bids']}\n" .
        "Contracts completed: {$supplier['total_contracts']}\n" .
        "Average performance rating: " . ($supplier['avg_rating'] ?? 'No ratings yet') . " / 5\n\n" .
        "Return ONLY valid JSON:\n" .
        "{\n" .
        "  \"risk_level\": \"low\",\n" .
        "  \"risk_score\": 22,\n" .
        "  \"factors\": [\n" .
        "    {\"factor\": \"Business Registration\", \"impact\": \"positive\", \"note\": \"Registration provided\"},\n" .
        "    {\"factor\": \"Contract History\", \"impact\": \"positive\", \"note\": \"3 completed contracts\"},\n" .
        "    {\"factor\": \"Performance Rating\", \"impact\": \"positive\", \"note\": \"4.2/5 avg rating\"},\n" .
        "    {\"factor\": \"Account Age\", \"impact\": \"neutral\", \"note\": \"Registered 8 months ago\"}\n" .
        "  ],\n" .
        "  \"summary\": \"2 sentence risk summary with overall assessment\",\n" .
        "  \"recommendations\": [\"Specific verification step 1\", \"Specific verification step 2\"]\n" .
        "}";

    $raw = callAI($domainPrompt . "\n\n" . $userMessage, [], [
        'id' => $userId,
        'role' => $user['role'] ?? 'admin',
        'name' => $user['name'] ?? 'there',
    ], $pdo);
    $parsed = ai_extract_json($raw);

    // Cache JSON for 24 hours
    ai_db_execute(
        $pdo,
        "INSERT INTO ai_cache (cache_key, result) VALUES (?, ?) ON DUPLICATE KEY UPDATE result = VALUES(result), created_at = NOW()",
        ["supplier_risk_{$supplierId}", json_encode($parsed)]
    );

    if ($pdo instanceof PDO) {
        auditLog($pdo, $userId, 'ai_request', 'supplier', $supplierId, 'feature: risk_analyzer');
    }

    jsonSuccess($parsed);
} catch (Throwable $e) {
    error_log('AI supplier-risk error: ' . $e->getMessage());
    jsonError('ProcureAI risk analysis is unavailable right now. Please try again.', 500);
}
