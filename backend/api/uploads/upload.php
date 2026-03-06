<?php
/**
 * POST /api/uploads/upload — Upload file. Returns file reference for tender_documents or bid_documents.
 * Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG. Max 10MB.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
];
$allowedExt = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
$maxSize = 10 * 1024 * 1024; // 10MB

if (empty($_FILES['file'])) {
    jsonError('No file uploaded', 400);
}
$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    jsonError('Upload failed', 400);
}
if ($file['size'] > $maxSize) {
    jsonError('File too large (max 10MB)', 400);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!in_array($mime, $allowedMimes, true)) {
    jsonError('File type not allowed. Use PDF, DOC, DOCX, XLS, XLSX, PNG, JPG.', 400);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
    jsonError('File extension not allowed', 400);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');
if (!is_dir($uploadPath)) {
    @mkdir($uploadPath, 0755, true);
}
$filename = bin2hex(random_bytes(16)) . '.' . $ext;
$dest = $uploadPath . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    jsonError('Failed to save file', 500);
}

$originalName = preg_replace('/[^\w\s\-\.]/', '', $file['name']) ?: 'document';
$originalName = mb_substr($originalName, 0, 255);

jsonSuccess([
    'filename' => $filename,
    'original_name' => $originalName,
    'file_size' => (int) $file['size'],
]);