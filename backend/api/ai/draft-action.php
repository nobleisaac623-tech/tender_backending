<?php
require_once __DIR__ . '/../bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$userId = (int)($user['user_id'] ?? 0);
$role = $user['role'] ?? 'user';
$pdo = $GLOBALS['pdo'] ?? null;

$input = getJsonBody();
$action = sanitizeString($input['action'] ?? '', 50);
$data = is_array($input['data'] ?? null) ? $input['data'] : [];

try {
    if (!($pdo instanceof PDO)) {
        jsonError('Database not available', 500);
    }

    if ($action === 'draft_tender') {
        if ($role !== 'admin') {
            jsonError('Unauthorized - admin only', 403);
        }

        $title = sanitizeString($data['title'] ?? 'Untitled Tender', 255);
        $description = sanitizeString($data['description'] ?? '', 20000);
        $budget = (float)($data['budget'] ?? 0);
        $deadline = sanitizeString($data['deadline'] ?? '', 30);
        if ($deadline === '') {
            $deadline = date('Y-m-d H:i:s', strtotime('+30 days'));
        }

        $stmt = $pdo->prepare(
            "INSERT INTO tenders (title, description, budget, submission_deadline, status, created_by, created_at)
             VALUES (?, ?, ?, ?, 'draft', ?, NOW())"
        );
        $stmt->execute([$title, $description, $budget, $deadline, $userId]);

        auditLog($pdo, $userId, 'ai_draft_saved', 'tender', (int)$pdo->lastInsertId(), 'action: draft_tender');
        jsonSuccess(['message' => 'Tender draft saved successfully.']);
    }

    if ($action === 'draft_bid') {
        if ($role !== 'supplier') {
            jsonError('Unauthorized - supplier only', 403);
        }

        $tenderId = (int)($data['tender_id'] ?? 0);
        if (!$tenderId) {
            jsonError('Tender ID required', 400);
        }
        $amount = (float)($data['amount'] ?? 0);
        $proposal = sanitizeString($data['proposal'] ?? '', 20000);

        $stmt = $pdo->prepare(
            "INSERT INTO bids (tender_id, supplier_id, bid_amount, technical_proposal, status, created_at)
             VALUES (?, ?, ?, ?, 'draft', NOW())"
        );
        $stmt->execute([$tenderId, $userId, $amount, $proposal]);

        auditLog($pdo, $userId, 'ai_draft_saved', 'bid', (int)$pdo->lastInsertId(), 'action: draft_bid');
        jsonSuccess(['message' => 'Bid draft saved successfully.']);
    }

    jsonError('Unknown action', 400);
} catch (Throwable $e) {
    error_log('Draft action error: ' . $e->getMessage());
    jsonError('Failed to save draft.', 500);
}
