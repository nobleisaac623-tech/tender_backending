<?php
/**
 * JWT encode/decode helper. Uses HMAC SHA-256.
 * Tokens stored in httpOnly cookie; optional Authorization header support.
 */

declare(strict_types=1);

function jwtSecret(): string
{
    $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: '';
    if (strlen($secret) < 32) {
        throw new RuntimeException('JWT_SECRET must be at least 32 characters');
    }
    return $secret;
}

function jwtExpiry(): int
{
    return (int) ($_ENV['JWT_EXPIRY'] ?? getenv('JWT_EXPIRY') ?: 28800);
}

/**
 * Encode payload to JWT.
 *
 * @param array{user_id: int, role: string, name: string, email?: string} $payload
 */
function jwtEncode(array $payload): string
{
    $secret = jwtSecret();
    $expiry = jwtExpiry();
    $payload['exp'] = time() + $expiry;
    $payload['iat'] = time();

    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $headerB64 = strtr(base64_encode(json_encode($header)), '+/', '-_');
    $payloadB64 = strtr(base64_encode(json_encode($payload)), '+/', '-_');
    $signature = hash_hmac('sha256', "$headerB64.$payloadB64", $secret, true);
    $sigB64 = strtr(base64_encode($signature), '+/', '-_');

    return "$headerB64.$payloadB64.$sigB64";
}

/**
 * Decode and verify JWT. Returns payload array or null if invalid.
 *
 * @return array{user_id: int, role: string, name: string, exp: int, iat: int}|null
 */
function jwtDecode(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    $secret = jwtSecret();
    $signature = hash_hmac('sha256', "{$parts[0]}.{$parts[1]}", $secret, true);
    $sigB64 = strtr(base64_encode($signature), '+/', '-_');
    if (!hash_equals($sigB64, $parts[2])) {
        return null;
    }
    $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/'), true), true);
    if (!is_array($payload) || empty($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }
    return $payload;
}

/**
 * Get JWT from cookie (preferred) or Authorization header.
 */
function jwtFromRequest(): ?string
{
    if (!empty($_COOKIE['token'])) {
        return $_COOKIE['token'];
    }
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(\S+)/', $header, $m)) {
        return $m[1];
    }
    return null;
}

/**
 * Set httpOnly cookie with JWT.
 */
function jwtSetCookie(string $token): void
{
    $expiry = (int) ($_ENV['JWT_EXPIRY'] ?? 28800);
    $maxAge = $expiry;
    $frontendUrl = $_ENV['FRONTEND_URL'] ?? '';
    $domain = '';
    $secure = !empty($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'production';
    $sameSite = 'Lax';
    $path = '/';
    $header = sprintf(
        'Set-Cookie: token=%s; Max-Age=%d; Path=%s; HttpOnly; SameSite=%s',
        urlencode($token),
        $maxAge,
        $path,
        $sameSite
    );
    if ($secure) {
        $header .= '; Secure';
    }
    if ($domain !== '') {
        $header .= "; Domain=$domain";
    }
    header($header);
}

/**
 * Clear JWT cookie (logout).
 */
function jwtClearCookie(): void
{
    header('Set-Cookie: token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
}
