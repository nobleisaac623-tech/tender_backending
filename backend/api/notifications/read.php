<?php
/**
 * POST /api/notifications/read — Mark notification(s) as read. Body: { "id": 1 } or { "ids": [1,2] }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$ids = [];
if (isset($body['id'])) {
    $ids = [(int) $body['id']];
} elseif (!empty($body['ids']) && is_array($body['ids'])) {
    foreach ($body['ids'] as $id) {
        $ids[] = (int) $id;
    }
}
if (empty($ids)) {
    jsonError('Provide id or ids', 400);
}

$placeholders = implode(',', array_fill(0, count($ids), '?'));
$params = array_merge($ids, [$user['user_id']]);
$stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id IN ($placeholders) AND user_id = ?");
$stmt->execute($params);
jsonSuccess(['message' => 'Marked as read']);