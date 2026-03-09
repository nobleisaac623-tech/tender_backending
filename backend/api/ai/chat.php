<?php
require_once APP_ROOT . '/config/cors.php';
require_once APP_ROOT . '/helpers/auth.php';
require_once APP_ROOT . '/helpers/ai.php';
require_once APP_ROOT . '/helpers/database.php';
require_once APP_ROOT . '/helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405); exit();
}

$token = getBearerToken();
$user = validateToken($token);

if (!$user) {
    jsonResponse(['success' => false, 'message' => 'Authentication required'], 401); exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$message = trim(htmlspecialchars(strip_tags($input['message'] ?? ''), ENT_QUOTES, 'UTF-8'));
$history = $input['history'] ?? [];
$tenderId = (int)($input['tender_id'] ?? 0);

if (empty($message)) {
    jsonResponse(['success' => false, 'message' => 'Message is required'], 400); exit();
}

try { 
    $db = Database::getInstance(); 
    if (!is_object($db)) {
        $db = null;
    }
} catch (Exception $e) { 
    error_log('DB error: ' . $e->getMessage());
    $db = null; 
}

$userId = (int)($user['user_id'] ?? $user['id'] ?? 0);

if (!$userId) {
    jsonResponse(['success' => false, 'message' => 'Invalid token'], 401); exit();
}

checkAIRateLimit($userId, $db);

$userRole = $user['role'] ?? 'user';
$userName = $user['name'] ?? $user['username'] ?? 'there';

$userContext = [
    'id'        => $userId,
    'role'      => $userRole,
    'name'      => $userName,
    'tender_id' => $tenderId ?: null
];

try {
    $reply = callAI($message, $history, $userContext, $db);
    logAIChat($userId, $message, $reply, $db);

    // Check if AI returned a draft action - more robust extraction
    $actionData = null;
    preg_match('/\{[^{}]*"action"[^{}]*\}/s', $reply, $matches);
    if (!empty($matches[0])) {
        $decoded = json_decode($matches[0], true);
        if (json_last_error() === JSON_ERROR_NONE && isset($decoded['action'], $decoded['data'])) {
            $actionData = $decoded;
        }
    }

    jsonResponse([
        'success' => true,
        'reply' => $reply,
        'action' => $actionData
    ]);

} catch (Exception $e) {
    error_log('ProcureAI: ' . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'ProcureAI is temporarily unavailable.'], 500);
}
