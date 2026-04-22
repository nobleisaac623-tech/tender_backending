<?php
/**
 * JSON response helpers.
 */

declare(strict_types=1);

function jsonSuccess(mixed $data = null, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function jsonError(string $message, int $code = 400, array $meta = []): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    $payload = ['success' => false, 'message' => $message];
    if (isset($meta['error_code']) && is_string($meta['error_code']) && $meta['error_code'] !== '') {
        $payload['error_code'] = $meta['error_code'];
    }
    if (isset($meta['details']) && is_array($meta['details'])) {
        $payload['details'] = $meta['details'];
    }
    echo json_encode($payload);
    exit;
}
