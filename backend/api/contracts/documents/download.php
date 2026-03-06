<?php
/**
 * GET /api/contracts/documents/download — Download contract document. Admin or contract's supplier.
 * Query: id=document_id
 */

declare(strict_types=1);

require_once dirname(dirname(__DIR__)) . '/bootstrap.php';
require_once dirname(dirname(dirname(__DIR__))) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid document ID', 400);
}

$stmt = $pdo->prepare("
    SELECT cd.filename, cd.original_name, c.supplier_id
    FROM contract_documents cd
    JOIN contracts c ON c.id = cd.contract_id
    WHERE cd.id = ?
");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('Document not found', 404);
}

if ($user['role'] === 'supplier' && (int) $row['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}
if ($user['role'] !== 'admin' && $user['role'] !== 'supplier') {
    jsonError('Forbidden', 403);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(dirname(__DIR__))) . '/uploads');
$path = $uploadPath . DIRECTORY_SEPARATOR . $row['filename'];
if (!is_file($path)) {
    jsonError('File not found', 404);
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . addslashes($row['original_name']) . '"');
header('Content-Length: ' . filesize($path));
readfile($path);
exit;
