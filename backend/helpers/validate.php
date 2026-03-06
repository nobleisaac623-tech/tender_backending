<?php
/**
 * Input validation helpers.
 */

declare(strict_types=1);

function sanitizeString(?string $value, int $maxLength = 10000): string
{
    if ($value === null || $value === '') {
        return '';
    }
    return mb_substr(trim($value), 0, $maxLength);
}

function validateEmail(?string $value): ?string
{
    $v = sanitizeString($value, 255);
    return filter_var($v, FILTER_VALIDATE_EMAIL) ? $v : null;
}

function validateRequired(?string $value, string $fieldName): string
{
    $v = $value === null ? '' : trim($value);
    if ($v === '') {
        return $fieldName . ' is required';
    }
    return '';
}

function validateLength(?string $value, int $min, int $max, string $fieldName): string
{
    $len = mb_strlen(trim((string) $value));
    if ($len < $min) {
        return "$fieldName must be at least $min characters";
    }
    if ($max > 0 && $len > $max) {
        return "$fieldName must be at most $max characters";
    }
    return '';
}

function validatePassword(?string $value): string
{
    $v = (string) $value;
    if (strlen($v) < 8) {
        return 'Password must be at least 8 characters';
    }
    return '';
}

function validateNumeric(?string $value, ?float $min = null, ?float $max = null, string $fieldName = 'Value'): string
{
    if ($value === null || $value === '') {
        return $fieldName . ' is required';
    }
    if (!is_numeric($value)) {
        return $fieldName . ' must be a number';
    }
    $n = (float) $value;
    if ($min !== null && $n < $min) {
        return "$fieldName must be at least $min";
    }
    if ($max !== null && $n > $max) {
        return "$fieldName must be at most $max";
    }
    return '';
}

function validateInt(?string $value, ?int $min = null, ?int $max = null, string $fieldName = 'Value'): string
{
    $err = validateNumeric($value, $min !== null ? (float) $min : null, $max !== null ? (float) $max : null, $fieldName);
    if ($err !== '') {
        return $err;
    }
    $n = (int) $value;
    if ((string) $n !== trim((string) $value)) {
        return $fieldName . ' must be an integer';
    }
    return '';
}

function validateEnum(?string $value, array $allowed, string $fieldName = 'Value'): string
{
    $v = trim((string) $value);
    if (!in_array($v, $allowed, true)) {
        return $fieldName . ' must be one of: ' . implode(', ', $allowed);
    }
    return '';
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
