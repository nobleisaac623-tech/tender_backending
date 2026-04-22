<?php
/**
 * POST /api/bids/documents — Supplier: attach uploaded file to bid.
 * Body: { "bid_id": 1, "filename": "...", "original_name": "...", "file_size": 123, "document_type"?: string }
 */
+
declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireSupplier();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$bidId = isset($body['bid_id']) ? (int) $body['bid_id'] : 0;
$filename = sanitizeString($body['filename'] ?? null, 255);
$originalName = sanitizeString($body['original_name'] ?? null, 255);
$fileSize = isset($body['file_size']) ? (int) $body['file_size'] : 0;
$documentType = sanitizeString($body['document_type'] ?? null, 100);

if ($bidId <= 0 || $filename === '') {
    jsonError('bid_id and filename required', 400);
}

$stmt = $pdo->prepare("
    SELECT b.id, b.status, b.supplier_id, b.tender_id, t.status AS tender_status, t.submission_deadline
    FROM bids b
    JOIN tenders t ON t.id = b.tender_id
    WHERE b.id = ?
");
$stmt->execute([$bidId]);
$bid = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bid) {
    jsonError('Bid not found', 404);
}

if ((int) $bid['supplier_id'] !== (int) $user['user_id']) {
    jsonError('Forbidden', 403);
}

if (($bid['status'] ?? '') === 'submitted') {
    jsonError('Cannot attach documents after submission', 400);
}

if (($bid['tender_status'] ?? '') !== 'published') {
    jsonError('Tender is not open for bids', 400);
}
if (!empty($bid['submission_deadline']) && strtotime((string) $bid['submission_deadline']) < time()) {
    jsonError('Submission deadline has passed', 400);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');
$path = $uploadPath . DIRECTORY_SEPARATOR . $filename;
if (!is_file($path)) {
    jsonError('File not found. Upload first via /api/uploads/upload', 400);
}

$stmt = $pdo->prepare("INSERT INTO bid_documents (bid_id, filename, original_name, document_type, file_size) VALUES (?, ?, ?, ?, ?)");
$stmt->execute([
    $bidId,
    $filename,
    $originalName ?: $filename,
    $documentType ?: null,
    $fileSize > 0 ? $fileSize : null,
]);
$id = (int) $pdo->lastInsertId();

jsonSuccess(['id' => $id], 201);

