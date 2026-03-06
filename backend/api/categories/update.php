<?php
/**
 * PUT /api/categories/update — Admin update category.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    jsonError('Method not allowed', 405);
}

requireAuth();
requireAdmin();

$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$id = isset($body['id']) ? (int) $body['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid category ID', 400);
}

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

$stmt = $pdo->prepare("SELECT id FROM tender_categories WHERE id = ?");
$stmt->execute([$id]);
if (!$stmt->fetch()) {
    jsonError('Category not found', 404);
}

$stmt = $pdo->prepare("UPDATE tender_categories SET name = ?, description = ?, color = ? WHERE id = ?");
$stmt->execute([$name, $description, $color ?: '#1e3a5f', $id]);

jsonSuccess([]);
