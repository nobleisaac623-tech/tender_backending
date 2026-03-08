<?php
/**
 * PUT /api/appeals/update — Update appeal status (admin only).
 * Body: { "appeal_id": 1, "action": "review"|"resolve", "admin_notes": "optional notes" }
 * When resolving, admin can optionally lift the suspension/blacklist.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$appealId = isset($body['appeal_id']) ? (int) $body['appeal_id'] : 0;
$action = isset($body['action']) ? trim($body['action']) : '';
$adminNotes = isset($body['admin_notes']) ? trim($body['admin_notes']) : '';
$liftSuspension = isset($body['lift_suspension']) && $body['lift_suspension'] === true;

if ($appealId <= 0) {
    jsonError('Invalid appeal_id', 400);
}

if (!in_array($action, ['review', 'resolve'], true)) {
    jsonError('Invalid action. Use "review" or "resolve"', 400);
}

// Get the appeal
$stmt = $pdo->prepare("SELECT * FROM account_appeals WHERE id = ?");
$stmt->execute([$appealId]);
$appeal = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$appeal) {
    jsonError('Appeal not found', 404);
}

if ($action === 'review') {
    // Mark as reviewed
    $stmt = $pdo->prepare("UPDATE account_appeals SET status = 'reviewed', reviewed_by = ?, reviewed_at = NOW(), admin_notes = ? WHERE id = ?");
    $stmt->execute([$user['user_id'], $adminNotes ?: null, $appealId]);
    
    auditLog($pdo, $user['user_id'], 'appeal_reviewed', 'account_appeals', $appealId, $appeal['supplier_email']);
    
    jsonSuccess(['message' => 'Appeal marked as reviewed']);
}

if ($action === 'resolve') {
    // Mark as resolved
    $stmt = $pdo->prepare("UPDATE account_appeals SET status = 'resolved', reviewed_by = ?, reviewed_at = NOW(), admin_notes = ? WHERE id = ?");
    $stmt->execute([$user['user_id'], $adminNotes ?: null, $appealId]);
    
    // Optionally lift suspension or blacklist
    if ($liftSuspension && $appeal['supplier_id']) {
        // Check if supplier exists
        $stmt = $pdo->prepare("SELECT id, status FROM users WHERE id = ? AND role = 'supplier'");
        $stmt->execute([$appeal['supplier_id']]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($supplier) {
            // Reactivate the supplier
            $stmt = $pdo->prepare("UPDATE users SET status = 'active', suspend_reason = NULL, suspended_at = NULL WHERE id = ?");
            $stmt->execute([$appeal['supplier_id']]);
            
            // Remove from blacklist if present
            $stmt = $pdo->prepare("UPDATE supplier_blacklist SET is_active = 0 WHERE supplier_id = ?");
            $stmt->execute([$appeal['supplier_id']]);
            
            // Notify the supplier
            sendMail(
                $appeal['supplier_email'],
                'Your Account Has Been Reinstated',
                '<p>Dear ' . htmlspecialchars($appeal['supplier_name'] ?? 'Supplier') . ',</p>
                <p>Good news! Your account has been reinstated after review.</p>
                <p>You can now log in and access the platform.</p>
                <p>Thank you.</p>',
                'Your account has been reinstated. You can now log in.'
            );
            
            $stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)");
            $stmt->execute([$appeal['supplier_id'], 'Account Reinstated', 'Your account has been reinstated after review.']);
        }
    }
    
    auditLog($pdo, $user['user_id'], 'appeal_resolved', 'account_appeals', $appealId, $appeal['supplier_email']);
    
    jsonSuccess(['message' => 'Appeal resolved']);
}
