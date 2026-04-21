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

// Fetch user - include suspend fields if they exist
$stmt = $pdo->prepare("SELECT id, name, email, password, role, status, updated_at FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    $stmt = $pdo->prepare("INSERT INTO login_attempts (ip_address) VALUES (?)");
    $stmt->execute([$ip]);
    jsonError('Invalid email or password', 401);
}

// Check account status BEFORE issuing JWT
if ($user['role'] === 'supplier' || $user['role'] === 'evaluator') {
    if (($user['status'] ?? '') === 'pending') {
        jsonError('Account pending approval', 403, ['error_code' => 'ACCOUNT_PENDING']);
    }
    if (($user['status'] ?? '') === 'suspended') {
        jsonError('Account suspended', 403, ['error_code' => 'ACCOUNT_SUSPENDED']);
    }
}

// Supplier-only: load profile to provide reasons (rejection/suspension)
if ($user['role'] === 'supplier') {

    // Load supplier profile for reasons (rejection/suspension)
    $profile = ['rejection_reason' => null, 'suspension_reason' => null];
    try {
        $profileStmt = $pdo->prepare("SELECT rejection_reason, suspension_reason FROM supplier_profiles WHERE user_id = ?");
        $profileStmt->execute([(int) $user['id']]);
        $row = $profileStmt->fetch(PDO::FETCH_ASSOC);
        if ($row !== false) {
            $profile = $row;
        }
    } catch (\PDOException $e) {
        // If columns don't exist yet (older DB), attempt to add them once and retry, but never break login
        if ($e->getCode() === '42S22') {
            try {
                $pdo->exec("
                    ALTER TABLE supplier_profiles
                        ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL,
                        ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL
                ");
                $profileStmt = $pdo->prepare("SELECT rejection_reason, suspension_reason FROM supplier_profiles WHERE user_id = ?");
                $profileStmt->execute([(int) $user['id']]);
                $row = $profileStmt->fetch(PDO::FETCH_ASSOC);
                if ($row !== false) {
                    $profile = $row;
                }
            } catch (\Throwable $e2) {
                // Ignore migration failure; we'll just operate without detailed reasons
                $profile = ['rejection_reason' => null, 'suspension_reason' => null];
            }
        } else {
            // For any other SQL error, fall back silently to no reasons
            $profile = ['rejection_reason' => null, 'suspension_reason' => null];
        }
    }

    // Check if suspended
    if ($user['status'] === 'suspended') {
        jsonResponse([
            'success' => false,
            'error_code' => 'ACCOUNT_SUSPENDED',
            'message' => 'Your account has been suspended.',
            'details' => [
                'status' => 'suspended',
                'reason' => $profile['suspension_reason'] ?? 'No reason provided.',
                'suspended_at' => $user['updated_at'] ?? null,
                'contact_email' => getenv('MAIL_FROM') ?: 'procurement@example.com',
                'email' => $user['email'],
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
                'email' => $user['email'],
            ]
        ], 403);
    }

    // Check if pending approval or rejected
    if ($user['status'] === 'pending') {
        $rejectionReason = $profile['rejection_reason'] ?? null;
        if ($rejectionReason) {
            jsonResponse([
                'success' => false,
                'error_code' => 'ACCOUNT_REJECTED',
                'message' => 'Your registration was rejected.',
                'details' => [
                    'status' => 'rejected',
                    'reason' => $rejectionReason,
                    'contact_email' => getenv('MAIL_FROM') ?: 'procurement@example.com',
                    'email' => $user['email'],
                ]
            ], 403);
        }

        jsonResponse([
            'success' => false,
            'error_code' => 'ACCOUNT_PENDING',
            'message' => 'Your account is awaiting approval.',
            'details' => [
                'status' => 'pending',
                'reason' => 'Our team is reviewing your registration.',
                'contact_email' => getenv('MAIL_FROM') ?: 'procurement@example.com',
                'email' => $user['email'],
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