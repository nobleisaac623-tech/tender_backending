<?php
/**
 * DELETE /api/bids/documents-delete?id=1 — Supplier: delete an attached bid document (draft only).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireSupplier();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid document ID', 400);
}

$stmt = $pdo->prepare("
    SELECT bd.id, bd.filename, bd.bid_id, b.supplier_id, b.status, t.status AS tender_status, t.submission_deadline
    FROM bid_documents bd
    JOIN bids b ON b.id = bd.bid_id
    JOIN tenders t ON t.id = b.tender_id
    WHERE bd.id = ?
");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('Document not found', 404);
}
if ((int) $row['supplier_id'] !== (int) $user['user_id']) {
    jsonError('Forbidden', 403);
}
if (($row['status'] ?? '') !== 'draft') {
    jsonError('Only draft bid documents can be removed', 400);
}
if (($row['tender_status'] ?? '') !== 'published') {
    jsonError('Tender is not open for bids', 400);
}
if (!empty($row['submission_deadline']) && strtotime((string) $row['submission_deadline']) < time()) {
    jsonError('Submission deadline has passed', 400);
}

// Delete DB row first; file cleanup is best-effort (file may be shared in rare cases)
$stmt = $pdo->prepare("DELETE FROM bid_documents WHERE id = ?");
$stmt->execute([$id]);

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');
$path = $uploadPath . DIRECTORY_SEPARATOR . $row['filename'];
if (is_file($path)) {
    @unlink($path);
}

jsonSuccess(['message' => 'Document removed']);

