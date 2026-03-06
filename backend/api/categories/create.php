<?php
/**
 * POST /api/categories/create — Admin create category.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

requireAuth();
requireAdmin();

$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$name = sanitizeString($body['name'] ?? null, 100);
$description = sanitizeString($body['description'] ?? null, 255);
$color = sanitizeString($body['color'] ?? null, 7);

$err = validateRequired($name, 'Name');
if ($err === '' && $color !== '' && !preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
    $err = 'Color must be a hex value (e.g. #3b82f6)';
}
if ($err !== '') {
    jsonError($err, 400);
}

if ($color === '') {
    $color = '#1e3a5f';
}

$stmt = $pdo->prepare("INSERT INTO tender_categories (name, description, color) VALUES (?, ?, ?)");
$stmt->execute([$name, $description, $color]);
$id = (int) $pdo->lastInsertId();

jsonSuccess(['id' => $id]);
