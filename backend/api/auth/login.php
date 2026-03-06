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

$stmt = $pdo->prepare("SELECT id, name, email, password, role, status FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password'])) {
    $stmt = $pdo->prepare("INSERT INTO login_attempts (ip_address) VALUES (?)");
    $stmt->execute([$ip]);
    jsonError('Invalid email or password', 401);
}

if ($user['status'] === 'suspended') {
    $msg = 'Your account has been suspended. Please contact the administrator.';
    if ($user['role'] === 'supplier') {
        $bl = getActiveBlacklist($pdo, (int) $user['id']);
        if ($bl) {
            $stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
            $admin = $stmt->fetch(PDO::FETCH_ASSOC);
            $adminEmail = $admin['email'] ?? ($_ENV['ADMIN_EMAIL'] ?? '');
            $msg = $adminEmail
                ? "Your account has been suspended. Please contact the administrator at $adminEmail."
                : 'Your account has been suspended. Please contact the administrator.';
        }
    }
    jsonError($msg, 403);
}
if ($user['status'] === 'pending' && $user['role'] === 'supplier') {
    jsonError('Your account is pending approval', 403);
}

if ($user['role'] === 'supplier' && isSupplierBlacklisted($pdo, (int) $user['id'])) {
    $stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    $adminEmail = $admin['email'] ?? ($_ENV['ADMIN_EMAIL'] ?? '');
    $msg = $adminEmail
        ? "Your account has been suspended. Please contact the administrator at $adminEmail."
        : 'Your account has been suspended. Please contact the administrator.';
    jsonError($msg, 403);
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