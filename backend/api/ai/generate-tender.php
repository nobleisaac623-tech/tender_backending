<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/config/auth-middleware.php';
require_once APP_ROOT . '/helpers/response.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/audit.php';

requireRole(['admin']);
checkAIRateLimit($currentUser['id'], 'tender_writer', 15);

$data     = json_decode(file_get_contents('php://input'), true);
$keywords = trim(sanitize($data['keywords'] ?? ''));
$category = trim(sanitize($data['category'] ?? 'General'));
$budget   = trim(sanitize($data['budget'] ?? 'Not specified'));
$duration = trim(sanitize($data['duration'] ?? '12 months'));

if (strlen($keywords) < 5) {
    jsonError('Please describe what you need in at least a few words.');
}

$domainPrompt = "You are helping an admin write a professional tender document for a 
Ghana government or private sector procurement. Follow GPPA (Ghana Public Procurement 
Authority) best practices. Respond with valid JSON only — no markdown, no extra text.";

$userMessage = "Generate a professional tender document based on:
- Description: {$keywords}
- Category: {$category}  
- Budget: {$budget}
- Duration: {$duration}

Return ONLY a valid JSON object:
{
  \"title\": \"Professional tender title, max 80 characters\",
  \"description\": \"Formal 3-4 paragraph description covering: (1) background and context, (2) scope of work and objectives, (3) key technical requirements, (4) expected deliverables and success criteria. Write in formal procurement language.\",
  \"criteria\": [
    {\"name\": \"Technical Proposal\", \"description\": \"Quality, clarity and feasibility of the technical approach and methodology\", \"max_score\": 100, \"weight\": 40},
    {\"name\": \"Price and Value\", \"description\": \"Competitiveness, reasonableness and transparency of pricing\", \"max_score\": 100, \"weight\": 35},
    {\"name\": \"Experience and Capacity\", \"description\": \"Relevant past experience, qualified team, and organizational capacity\", \"max_score\": 100, \"weight\": 25}
  ],
  \"requirements\": [
    \"Valid business registration certificate\",
    \"Current tax clearance certificate\",
    \"Minimum 3 years relevant industry experience\",
    \"Signed bid form and declaration\"
  ],
  \"tags\": [\"relevant\", \"keyword\", \"tags\"]
}";

try {
    logAudit($currentUser['id'], 'ai_request', 'tender', null, 'feature: tender_writer');
    $raw    = callGemini($domainPrompt, $userMessage, 2000);
    $parsed = extractJSON($raw);
    jsonSuccess($parsed);
} catch (Exception $e) {
    jsonError('ProcureAI could not generate the tender right now. Please try again.');
}
