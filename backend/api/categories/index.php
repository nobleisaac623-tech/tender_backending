<?php
/**
 * GET /api/categories — List all tender categories (public, no auth).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$pdo = $GLOBALS['pdo'];
$stmt = $pdo->query("SELECT id, name, description, color FROM tender_categories ORDER BY name ASC");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as &$r) {
    $r['id'] = (int) $r['id'];
}

jsonSuccess($rows);
