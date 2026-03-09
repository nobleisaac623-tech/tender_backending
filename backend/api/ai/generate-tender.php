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

$input = getJsonBody();
$keywords = sanitizeString($input['keywords'] ?? '', 2000);
$category = sanitizeString($input['category'] ?? 'General', 100);
$budget = sanitizeString($input['budget'] ?? 'Not specified', 100);
$duration = sanitizeString($input['duration'] ?? '12 months', 100);

if (mb_strlen($keywords) < 5) {
    jsonError('Please describe what you need in at least a few words.', 400);
}

checkAIRateLimit($userId, $pdo);

$domainPrompt =
    "You are helping an admin write a professional tender document for a Ghana government or private sector procurement. " .
    "Follow GPPA (Ghana Public Procurement Authority) best practices. " .
    "You MUST respond with a single top-level JSON object and these exact keys: title, description, criteria, requirements, tags. " .
    "Do not nest the result under any other key. Respond with valid JSON only — no markdown, no extra text.";

$userMessage =
    "Generate a professional tender document based on:\n" .
    "- Description: {$keywords}\n" .
    "- Category: {$category}\n" .
    "- Budget: {$budget}\n" .
    "- Duration: {$duration}\n\n" .
    "Return ONLY a valid JSON object:\n" .
    "{\n" .
    "  \"title\": \"Professional tender title, max 80 characters\",\n" .
    "  \"description\": \"Formal 3-4 paragraph description covering: (1) background and context, (2) scope of work and objectives, (3) key technical requirements, (4) expected deliverables and success criteria. Write in formal procurement language.\",\n" .
    "  \"criteria\": [\n" .
    "    {\"name\": \"Technical Proposal\", \"description\": \"Quality, clarity and feasibility of the technical approach and methodology\", \"max_score\": 100, \"weight\": 40},\n" .
    "    {\"name\": \"Price and Value\", \"description\": \"Competitiveness, reasonableness and transparency of pricing\", \"max_score\": 100, \"weight\": 35},\n" .
    "    {\"name\": \"Experience and Capacity\", \"description\": \"Relevant past experience, qualified team, and organizational capacity\", \"max_score\": 100, \"weight\": 25}\n" .
    "  ],\n" .
    "  \"requirements\": [\n" .
    "    \"Valid business registration certificate\",\n" .
    "    \"Current tax clearance certificate\",\n" .
    "    \"Minimum 3 years relevant industry experience\",\n" .
    "    \"Signed bid form and declaration\"\n" .
    "  ],\n" .
    "  \"tags\": [\"relevant\", \"keyword\", \"tags\"]\n" .
    "}";

try {
    $raw = callAI($domainPrompt . "\n\n" . $userMessage, [], [
        'id' => $userId,
        'role' => $user['role'] ?? 'admin',
        'name' => $user['name'] ?? 'there',
    ], $pdo);
    $parsed = ai_extract_json($raw);

    // Normalize common model/legacy shapes to a top-level tender draft object.
    if (isset($parsed['data']) && is_array($parsed['data'])) {
        $parsed = $parsed['data'];
    }
    if (isset($parsed['reply']) && is_string($parsed['reply'])) {
        $maybe = json_decode($parsed['reply'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($maybe)) {
            $parsed = $maybe;
        }
    }

    $title = isset($parsed['title']) ? trim((string)$parsed['title']) : '';
    $description = isset($parsed['description']) ? trim((string)$parsed['description']) : '';
    if ($title === '' || $description === '') {
        throw new Exception('Incomplete tender draft from AI');
    }

    if ($pdo instanceof PDO) {
        auditLog($pdo, $userId, 'ai_request', 'tender', null, 'feature: tender_writer');
    }

    jsonSuccess($parsed);
} catch (Throwable $e) {
    error_log('AI generate-tender error: ' . $e->getMessage());
    jsonError('ProcureAI could not generate the tender right now. Please try again.', 500);
}
