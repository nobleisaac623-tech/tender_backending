<?php
/**
 * GET /api/users/evaluators — List all evaluators (admin only).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

// Get all evaluators
$stmt = $pdo->query("
    SELECT id, name, email, role, status, created_at 
    FROM users 
    WHERE role = 'evaluator'
    ORDER BY created_at DESC
");
$evaluators = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Add last login from audit_log
foreach ($evaluators as &$evaluator) {
    $evaluator['created_at'] = $evaluator['created_at'];
    
    // Get last login
    $stmt = $pdo->prepare("SELECT created_at FROM audit_log WHERE user_id = ? AND action LIKE '%login%' ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$evaluator['id']]);
    $lastLogin = $stmt->fetch(PDO::FETCH_ASSOC);
    $evaluator['last_login'] = $lastLogin['created_at'] ?? null;
}

jsonSuccess(['evaluators' => $evaluators]);
