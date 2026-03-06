<?php
/**
 * GET /api/uploads/download — Download file. type=tender_doc|bid_doc, id=document_id.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];
$type = trim((string) ($_GET['type'] ?? ''));
$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;

if (!in_array($type, ['tender_doc', 'bid_doc'], true) || $id <= 0) {
    jsonError('Invalid type or id', 400);
}

$uploadPath = $_ENV['UPLOAD_PATH'] ?? (dirname(dirname(__DIR__)) . '/uploads');

if ($type === 'tender_doc') {
    $stmt = $pdo->prepare("SELECT td.filename, td.original_name, t.id AS tender_id FROM tender_documents td JOIN tenders t ON t.id = td.tender_id WHERE td.id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        jsonError('Document not found', 404);
    }
    $tenderId = (int) $row['tender_id'];
    if ($user['role'] === 'supplier') {
        $stmt = $pdo->prepare("SELECT 1 FROM tenders WHERE id = ? AND status = 'published'");
        $stmt->execute([$tenderId]);
        if (!$stmt->fetch()) {
            jsonError('Forbidden', 403);
        }
    } elseif ($user['role'] === 'evaluator') {
        $stmt = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
        $stmt->execute([$tenderId, $user['user_id']]);
        if (!$stmt->fetch()) {
            jsonError('Forbidden', 403);
        }
    }
} else {
    $stmt = $pdo->prepare("SELECT bd.filename, bd.original_name, b.supplier_id, b.tender_id FROM bid_documents bd JOIN bids b ON b.id = bd.bid_id WHERE bd.id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        jsonError('Document not found', 404);
    }
    if ($user['role'] === 'supplier' && (int) $row['supplier_id'] !== $user['user_id']) {
        jsonError('Forbidden', 403);
    }
    if ($user['role'] === 'evaluator') {
        $stmt = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
        $stmt->execute([$row['tender_id'], $user['user_id']]);
        if (!$stmt->fetch()) {
            jsonError('Forbidden', 403);
        }
    }
}

$path = $uploadPath . DIRECTORY_SEPARATOR . $row['filename'];
if (!is_file($path)) {
    jsonError('File not found', 404);
}

header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . addslashes($row['original_name']) . '"');
header('Content-Length: ' . filesize($path));
readfile($path);
exit;