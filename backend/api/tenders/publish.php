<?php
/**
 * POST /api/tenders/publish — Admin publish tender.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();
$id = isset($body['id']) ? (int) $body['id'] : (isset($_GET['id']) ? (int) $_GET['id'] : 0);
if ($id <= 0) {
    jsonError('Invalid tender ID', 400);
}

$stmt = $pdo->prepare("SELECT id, title, reference_number, status FROM tenders WHERE id = ?");
$stmt->execute([$id]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if ($tender['status'] !== 'draft') {
    jsonError('Only draft tenders can be published', 400);
}

$stmt = $pdo->prepare("UPDATE tenders SET status = 'published' WHERE id = ?");
$stmt->execute([$id]);

$stmt = $pdo->query("SELECT u.email, u.name FROM users u INNER JOIN supplier_profiles sp ON sp.user_id = u.id WHERE u.role = 'supplier' AND u.status = 'active' AND sp.is_approved = 1");
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    sendMail(
        $row['email'],
        'New Tender Published: ' . $tender['title'],
        '<p>Dear ' . htmlspecialchars($row['name']) . ',</p><p>A new tender has been published: <strong>' . htmlspecialchars($tender['title']) . '</strong> (Ref: ' . htmlspecialchars($tender['reference_number']) . '). Please log in to view and submit your bid.</p>',
        'A new tender has been published: ' . $tender['title'] . ' (Ref: ' . $tender['reference_number'] . ').'
    );
}
$stmt = $pdo->prepare("INSERT INTO notifications (user_id, title, message) SELECT id, ?, ? FROM users WHERE role = 'supplier' AND status = 'active'");
$stmt->execute(['New Tender', 'Tender "' . $tender['title'] . '" has been published.']);

auditLog($pdo, $user['user_id'], 'tender_published', 'tenders', $id, $tender['title']);
jsonSuccess(['message' => 'Tender published']);