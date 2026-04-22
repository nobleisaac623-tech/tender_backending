<?php
/**
 * GET /api/tenders/public-document-download?id=1 — Download tender document (no auth).
 * Only for documents on published tenders.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid document ID', 400);
}

$pdo = $GLOBALS['pdo'];
$stmt = $pdo->prepare("
    SELECT td.filename, td.original_name
    FROM tender_documents td
    JOIN tenders t ON t.id = td.tender_id
    WHERE td.id = ? AND t.status = 'published'
");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('Document not found', 404);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');
$path = $uploadPath . DIRECTORY_SEPARATOR . $row['filename'];
if (!is_file($path)) {
    jsonError('File not found', 404);
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . addslashes($row['original_name']) . '"');
header('Content-Length: ' . filesize($path));
readfile($path);
exit;
