<?php
/**
 * POST /api/users/invite-evaluator — Admin invites an evaluator via password set link.
 * Body: { "name": "Jane", "email": "jane@example.com" }
 *
 * Creates user with role=evaluator and status=pending (if not exists),
 * creates an invite token, emails link to set password.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';
require_once dirname(dirname(__DIR__)) . '/helpers/email.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$admin = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$name = sanitizeString($body['name'] ?? null, 255);
$email = validateEmail($body['email'] ?? null);
if ($name === '' || !$email) {
    jsonError('Valid name and email are required', 400);
}

// Create or fetch evaluator user
$stmt = $pdo->prepare("SELECT id, role, status FROM users WHERE email = ?");
$stmt->execute([$email]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

$userId = 0;
if ($existing) {
    if (($existing['role'] ?? '') !== 'evaluator') {
        jsonError('A user with this email already exists and is not an evaluator', 409);
    }
    $userId = (int) $existing['id'];
} else {
    // users.password is NOT NULL; set strong random until invite completes
    $tempPassword = bin2hex(random_bytes(16));
    $hash = password_hash($tempPassword, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'evaluator', 'pending')");
    $stmt->execute([$name, $email, $hash]);
    $userId = (int) $pdo->lastInsertId();
    auditLog($pdo, (int) $admin['user_id'], 'evaluator_invited_user_created', 'users', $userId, $email);
}

// Create invite token
$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);
$expiresAt = date('Y-m-d H:i:s', time() + 48 * 3600);

// Invalidate previous unused invites for this user (best-effort)
$pdo->prepare("UPDATE user_invites SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL")->execute([$userId]);

$stmt = $pdo->prepare("INSERT INTO user_invites (user_id, token_hash, invite_type, expires_at) VALUES (?, ?, 'set_password', ?)");
$stmt->execute([$userId, $tokenHash, $expiresAt]);

$frontend = rtrim((string) (getenv('FRONTEND_URL') ?: ($_ENV['FRONTEND_URL'] ?? '')), '/');
if ($frontend === '') {
    // fallback to APP_URL if FRONTEND_URL isn't set
    $frontend = rtrim((string) (getenv('APP_URL') ?: ($_ENV['APP_URL'] ?? '')), '/');
}
if ($frontend === '') {
    jsonError('FRONTEND_URL (or APP_URL) is not configured for invite links', 500);
}

$link = $frontend . '/set-password?token=' . urlencode($token) . '&email=' . urlencode($email);

$subject = 'Evaluator invitation — set your password';
$html = '<p>Hello ' . htmlspecialchars($name ?: 'there') . ',</p>'
    . '<p>You have been invited as an <strong>Evaluator</strong>.</p>'
    . '<p>Please set your password using the link below (valid for 48 hours):</p>'
    . '<p><a href="' . htmlspecialchars($link) . '">' . htmlspecialchars($link) . '</a></p>'
    . '<p>After setting your password, your account may require admin approval before you can sign in.</p>';

$sent = false;
try {
    $sent = brevoSendEmail($email, $subject, $html, "Set your password: $link");
} catch (Throwable $e) {
    error_log('Invite email failed: ' . $e->getMessage());
    $sent = false;
}

auditLog($pdo, (int) $admin['user_id'], 'evaluator_invited', 'users', $userId, $email);

jsonSuccess([
    'message' => $sent ? 'Invitation sent' : 'Invitation created (email delivery failed)',
    'user_id' => $userId,
    'email_sent' => (bool) $sent,
]);

