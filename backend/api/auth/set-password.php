<?php
/**
 * POST /api/auth/set-password — Set password using invite token.
 * Body: { "token": "...", "password": "..." }
 *
 * Marks invite as used and updates user's password.
 * Does NOT auto-approve; admin must approve evaluator (status -> active).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$token = trim((string) ($body['token'] ?? ''));
$password = (string) ($body['password'] ?? '');

if ($token === '') {
    jsonError('Token is required', 400);
}
$err = validatePassword($password);
if ($err !== '') {
    jsonError($err, 400);
}

$tokenHash = hash('sha256', $token);

$stmt = $pdo->prepare("
    SELECT ui.id AS invite_id, ui.user_id, ui.expires_at, ui.used_at, u.role, u.status
    FROM user_invites ui
    JOIN users u ON u.id = ui.user_id
    WHERE ui.token_hash = ?
      AND ui.invite_type = 'set_password'
    LIMIT 1
");
$stmt->execute([$tokenHash]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$row) {
    jsonError('Invalid token', 400);
}
if ($row['used_at'] !== null) {
    jsonError('Token already used', 400);
}
if (strtotime((string) $row['expires_at']) < time()) {
    jsonError('Token expired', 400);
}

$userId = (int) $row['user_id'];
$hash = password_hash($password, PASSWORD_BCRYPT);

$pdo->beginTransaction();
try {
    $pdo->prepare("UPDATE users SET password = ? WHERE id = ?")->execute([$hash, $userId]);
    $pdo->prepare("UPDATE user_invites SET used_at = NOW() WHERE id = ?")->execute([(int) $row['invite_id']]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

jsonSuccess([
    'message' => 'Password set successfully',
    'status' => ($row['status'] ?? null),
    'role' => ($row['role'] ?? null),
]);

