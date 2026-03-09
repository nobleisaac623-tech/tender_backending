<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/helpers/auth.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/database.php';
require_once APP_ROOT . '/helpers/response.php';

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

// Authenticate user
$token = getBearerToken();
$user = validateToken($token);

if (!$user) {
    http_response_code(401);
    echo json_encode(["success" => false, "reply" => "Authentication required."]);
    exit();
}

$userId = (int) $user['user_id'];
$userRole = $user['role'] ?? 'user';
$userName = $user['name'] ?? $user['username'] ?? 'there';

// Get request body
$input = json_decode(file_get_contents('php://input'), true);
$message = trim($input['message'] ?? '');
$history = $input['history'] ?? [];

if (empty($message)) {
    jsonError('Message is required', 400);
}

// Sanitize message
$message = htmlspecialchars(strip_tags($message), ENT_QUOTES, 'UTF-8');

// Get DB connection
$db = null;
try {
    $db = Database::getInstance();
} catch (Exception $e) {
    error_log('DB connection failed: ' . $e->getMessage());
}

// Check rate limit
checkAIRateLimit($userId, $db);

// Build user context
$userContext = [
    'role' => $userRole,
    'name' => $userName
];

// Call ProcureAI (Groq)
try {
    $reply = callAI($message, $history, $userContext);

    // Log the conversation
    logAIChat($userId, $message, $reply, $db);

    jsonSuccess(['reply' => $reply]);

} catch (Exception $e) {
    error_log('ProcureAI error: ' . $e->getMessage());
    jsonError('ProcureAI is temporarily unavailable. Please try again in a moment.', 500);
}
