<?php
/**
 * DELETE /api/tenders/documents-delete?id=1 — Admin: remove a tender document.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid document ID', 400);
}

$stmt = $pdo->prepare('SELECT id, filename FROM tender_documents WHERE id = ?');
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('Document not found', 404);
}

$stmt = $pdo->prepare('DELETE FROM tender_documents WHERE id = ?');
$stmt->execute([$id]);

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');
$path = $uploadPath . DIRECTORY_SEPARATOR . $row['filename'];
if (is_file($path)) {
    @unlink($path);
}

jsonSuccess(['message' => 'Document removed']);
