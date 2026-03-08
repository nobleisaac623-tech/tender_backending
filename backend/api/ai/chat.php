<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/config/auth-middleware.php';
require_once APP_ROOT . '/helpers/response.php';
require_once APP_ROOT . '/helpers/validate.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/audit.php';

$currentUser = requireAuth();
if (!$currentUser) {
    http_response_code(401);
    echo json_encode(["success" => false, "reply" => "Authentication required."]);
    exit;
}

$userId = (int) $currentUser['user_id'];
checkAIRateLimit($userId, 'procureai_chat', 30);

$data    = json_decode(file_get_contents('php://input'), true);
$message = trim(sanitizeString($data['message'] ?? ''));
$history = $data['history'] ?? [];

if (!$message) jsonError('Message cannot be empty.');
if (strlen($message) > 800) jsonError('Message is too long. Please keep it under 800 characters.');

$roleLabel = match($currentUser['role']) {
    'admin' => 'Administrator',
    'evaluator' => 'Evaluator',
    'supplier' => 'Supplier',
    default => 'User'
};

$domainPrompt = "You are the ProcureAI chat assistant — the intelligent heart of ProcurEase.

YOUR KNOWLEDGE AREAS:
- Ghana Public Procurement Authority (GPPA) Act 663 and regulations
- World Bank and AfDB procurement guidelines and standards
- African business environment: market trends, pricing, supply chain
- Tender writing, evaluation criteria design, and bid assessment
- Contract management, milestone tracking, supplier performance
- Business decision-making: cost-benefit analysis, risk management, ROI
- Anti-corruption in procurement: transparency, audit trails, ethics
- SME development: how small suppliers can grow and win contracts
- Market pricing for common categories: IT, construction, services, supplies
- Supplier relationship management and performance improvement

RESPONSE GUIDELINES:
- Keep responses between 100-250 words unless a detailed breakdown is truly needed
- Use bullet points for lists of 3 or more items
- Bold key terms using **bold** markdown
- Always give practical, actionable advice
- When discussing prices or statistics, say 'market data suggests' or 'industry experience shows'
- For complex legal or regulatory questions, recommend a GPPA-certified procurement consultant
- Current user role is: {$roleLabel}
- Tailor advice appropriately — admins get strategic advice, suppliers get practical bidding tips";

try {
    $reply = callGeminiChat($domainPrompt, $history, $message, 1000);
    logAudit($userId, 'ai_request', 'chat', null, 'feature: procureai_chat');
    jsonSuccess(['reply' => $reply]);
} catch (Exception $e) {
    jsonError('ProcureAI is temporarily unavailable. Please try again in a moment.');
}
