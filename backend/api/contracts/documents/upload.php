<?php
/**
 * POST /api/contracts/documents/upload — Upload document to contract. Admin or contract's supplier. PDF, DOC, DOCX only.
 */

declare(strict_types=1);

require_once dirname(dirname(__DIR__)) . '/bootstrap.php';
require_once dirname(dirname(dirname(__DIR__))) . '/config/auth-middleware.php';
require_once dirname(dirname(dirname(__DIR__))) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$contractId = isset($_POST['contract_id']) ? (int) $_POST['contract_id'] : 0;
$documentType = trim((string) ($_POST['document_type'] ?? 'contract'));
if (!in_array($documentType, ['contract', 'amendment', 'correspondence', 'other'], true)) {
    $documentType = 'contract';
}

if ($contractId <= 0) {
    jsonError('contract_id required', 400);
}

$stmt = $pdo->prepare("SELECT id, supplier_id FROM contracts WHERE id = ?");
$stmt->execute([$contractId]);
$contract = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$contract) {
    jsonError('Contract not found', 404);
}

if ($user['role'] === 'supplier' && (int) $contract['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}
if ($user['role'] !== 'admin' && $user['role'] !== 'supplier') {
    jsonError('Forbidden', 403);
}

$allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
$allowedExt = ['pdf', 'doc', 'docx'];
$maxSize = 10 * 1024 * 1024;

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
    jsonError('File type not allowed. Use PDF, DOC, DOCX.', 400);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExt, true)) {
    jsonError('File extension not allowed', 400);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(dirname(__DIR__))) . '/uploads');
if (!is_dir($uploadPath)) {
    @mkdir($uploadPath, 0755, true);
}
$filename = 'contract_' . bin2hex(random_bytes(12)) . '.' . $ext;
$dest = $uploadPath . DIRECTORY_SEPARATOR . $filename;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    jsonError('Failed to save file', 500);
}

$originalName = preg_replace('/[^\w\s\-\.]/', '', $file['name']) ?: 'document';
$originalName = mb_substr($originalName, 0, 255);

$stmt = $pdo->prepare("INSERT INTO contract_documents (contract_id, filename, original_name, document_type, uploaded_by) VALUES (?, ?, ?, ?, ?)");
$stmt->execute([$contractId, $filename, $originalName, $documentType, $user['user_id']]);
$id = (int) $pdo->lastInsertId();

jsonSuccess(['id' => $id, 'filename' => $filename, 'original_name' => $originalName], 201);
