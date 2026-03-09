<?php
/**
 * Auth helper functions
 */

require_once __DIR__ . '/../config/jwt.php';

function getBearerToken(): ?string {
    return jwtFromRequest();
}

function validateToken($token = null): ?array {
    if (!$token) {
        $token = jwtFromRequest();
    }
    if (!$token) {
        return null;
    }
    return jwtDecode($token);
}
