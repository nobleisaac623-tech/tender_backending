<?php
/**
 * Auth middleware: require valid JWT and optionally specific role(s).
 * Returns 401 if no/invalid token, 403 if wrong role.
 */

declare(strict_types=1);

require_once __DIR__ . '/jwt.php';
require_once dirname(__DIR__) . '/helpers/response.php';

/**
 * Require authenticated user. Returns payload array or exits with 401.
 *
 * @return array{user_id: int, role: string, name: string, exp: int, iat: int}
 */
function requireAuth(): array
{
    $token = jwtFromRequest();
    if (!$token) {
        jsonError('Authentication required', 401);
    }
    $payload = jwtDecode($token);
    if (!$payload || empty($payload['user_id']) || empty($payload['role'])) {
        jsonError('Invalid or expired token', 401);
    }
    $pdo = $GLOBALS['pdo'] ?? null;
    if ($pdo) {
        $hash = hash('sha256', $token);
        $stmt = $pdo->prepare("SELECT 1 FROM token_blacklist WHERE token_hash = ? AND expires_at > NOW()");
        $stmt->execute([$hash]);
        if ($stmt->fetch()) {
            jsonError('Token has been revoked', 401);
        }
    }
    $GLOBALS['auth_user'] = $payload;
    return $payload;
}

/**
 * Require one of the given roles. Call after requireAuth().
 *
 * @param array $allowedRoles e.g. ['admin', 'evaluator']
 */
function requireRole(array $allowedRoles): void
{
    $payload = $GLOBALS['auth_user'] ?? null;
    if (!$payload) {
        $payload = requireAuth();
        $GLOBALS['auth_user'] = $payload;
    }
    if (!in_array($payload['role'], $allowedRoles, true)) {
        jsonError('Forbidden', 403);
    }
}

/**
 * Require admin only.
 */
function requireAdmin(): void
{
    requireRole(['admin']);
}

/**
 * Require evaluator only.
 */
function requireEvaluator(): void
{
    requireRole(['evaluator']);
}

/**
 * Require supplier only.
 */
function requireSupplier(): void
{
    requireRole(['supplier']);
}
