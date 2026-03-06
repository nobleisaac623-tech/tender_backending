<?php
/**
 * POST /api/tenders/documents — Admin: attach uploaded file to tender.
 * Body: { "tender_id": 1, "filename": "...", "original_name": "...", "file_size": 123 }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : 0;
$filename = sanitizeString($body['filename'] ?? null, 255);
$originalName = sanitizeString($body['original_name'] ?? null, 255);
$fileSize = isset($body['file_size']) ? (int) $body['file_size'] : 0;

if ($tenderId <= 0 || $filename === '') {
    jsonError('tender_id and filename required', 400);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');
$path = $uploadPath . DIRECTORY_SEPARATOR . $filename;
if (!is_file($path)) {
    jsonError('File not found. Upload first via /api/uploads/upload', 400);
}

$stmt = $pdo->prepare("SELECT 1 FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
if (!$stmt->fetch()) {
    jsonError('Tender not found', 404);
}

$stmt = $pdo->prepare("INSERT INTO tender_documents (tender_id, filename, original_name, file_size) VALUES (?, ?, ?, ?)");
$stmt->execute([$tenderId, $filename, $originalName ?: $filename, $fileSize]);
$id = (int) $pdo->lastInsertId();
jsonSuccess(['id' => $id], 201);