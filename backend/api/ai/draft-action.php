<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Method not allowed'], 405); exit();
}

$token = getBearerToken();
$user = validateToken($token);
if (!$user) {
    jsonResponse(['success' => false, 'message' => 'Authentication required'], 401); exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$data = $input['data'] ?? [];

try {
    $db = Database::getInstance();

    if ($action === 'draft_tender') {
        // Only admin can create tenders
        if ($user['role'] !== 'admin') {
            jsonResponse(['success' => false, 'message' => 'Unauthorized - admin only'], 403); exit();
        }
        
        $db->execute(
            "INSERT INTO tenders (title, description, budget, submission_deadline, status, created_by, created_at) 
             VALUES (?, ?, ?, ?, 'draft', ?, NOW())",
            [
                $data['title'] ?? 'Untitled Tender',
                $data['description'] ?? '',
                $data['budget'] ?? 0,
                $data['deadline'] ?? date('Y-m-d H:i:s', strtotime('+30 days')),
                $user['id']
            ]
        );
        jsonResponse(['success' => true, 'message' => 'Tender draft saved successfully.']);

    } elseif ($action === 'draft_bid') {
        $tenderId = (int)($data['tender_id'] ?? 0);
        if (!$tenderId) {
            jsonResponse(['success' => false, 'message' => 'Tender ID required'], 400); exit();
        }
        
        $db->execute(
            "INSERT INTO bids (tender_id, supplier_id, bid_amount, technical_proposal, status, created_at)
             VALUES (?, ?, ?, ?, 'draft', NOW())",
            [
                $tenderId,
                $user['id'],
                $data['amount'] ?? 0,
                $data['proposal'] ?? ''
            ]
        );
        jsonResponse(['success' => true, 'message' => 'Bid draft saved successfully.']);

    } else {
        jsonResponse(['success' => false, 'message' => 'Unknown action'], 400);
    }

} catch (Exception $e) {
    error_log('Draft action error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Failed to save draft.'], 500);
}
