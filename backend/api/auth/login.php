<?php
/**
 * POST /api/auth/login — Login for all roles. Returns JWT in cookie + body.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/config/jwt.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/blacklist.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$email = trim((string) ($body['email'] ?? ''));
$password = $body['password'] ?? '';

if ($email === '' || $password === '') {
    jsonError('Email and password are required', 400);
}

$pdo = $GLOBALS['pdo'];

// Rate limit: max 5 attempts per minute per IP
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip = is_string($ip) ? trim(explode(',', $ip)[0]) : '0.0.0.0';
$stmt = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)");
$stmt->execute([$ip]);
if ((int) $stmt->fetchColumn() >= 5) {
    jsonError('Too many login attempts. Try again later.', 429);
}

// Fetch user with additional fields for status checks
$stmt = $pdo->prepare("SELECT id, name, email, password, role, status, suspend_reason, suspended_at FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    $stmt = $pdo->prepare("INSERT INTO login_attempts (ip_address) VALUES (?)");
    $stmt->execute([$ip]);
    jsonError('Invalid email or password', 401);
}

// Check account status BEFORE issuing JWT - only for suppliers
if ($user['role'] === 'supplier') {

    // Check if suspended
    if ($user['status'] === 'suspended') {
        jsonResponse([
            'success' => false,
            'error_code' => 'ACCOUNT_SUSPENDED',
            'message' => 'Your account has been suspended.',
            'details' => [
                'status' => 'suspended',
                'reason' => $user['suspend_reason'] ?? 'No reason provided.',
                'suspended_at' => $user['suspended_at'] ?? null,
                'contact_email' => getenv('MAIL_FROM') ?: 'procurement@example.com',
            ]
        ], 403);
    }

    // Check if blacklisted
    $blacklist = getActiveBlacklist($pdo, (int) $user['id']);
    if ($blacklist) {
        jsonResponse([
            'success' => false,
            'error_code' => 'ACCOUNT_BLACKLISTED',
            'message' => 'Your account has been permanently blocked.',
            'details' => [
                'status' => 'blacklisted',
                'reason' => $blacklist['reason'] ?? 'No reason provided.',
                'blacklisted_at' => $blacklist['blacklisted_at'] ?? null,
                'contact_email' => getenv('MAIL_FROM') ?: 'procurement@example.com',
            ]
        ], 403);
    }

    // Check if pending approval
    if ($user['status'] === 'pending') {
        jsonResponse([
            'success' => false,
            'error_code' => 'ACCOUNT_PENDING',
            'message' => 'Your account is awaiting approval.',
            'details' => [
                'status' => 'pending',
                'reason' => 'Our team is reviewing your registration.',
                'contact_email' => getenv('MAIL_FROM') ?: 'procurement@example.com',
            ]
        ], 403);
    }
}

$payload = [
    'user_id' => (int) $user['id'],
    'role' => $user['role'],
    'name' => $user['name'],
    'email' => $user['email'],
];
$token = jwtEncode($payload);
jwtSetCookie($token);

auditLog($pdo, (int) $user['id'], 'login', 'users', (int) $user['id'], null);

unset($user['password']);
$user['id'] = (int) $user['id'];
jsonSuccess([
    'user' => $user,
    'token' => $token,
]);