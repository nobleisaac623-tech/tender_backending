<?php
/**
 * POST /api/email/test — Admin-only test email trigger.
 * Body (optional): { "to": "someone@example.com" }
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();

$body = getJsonBody();
$toInput = $body['to'] ?? null;
$to = validateEmail(is_string($toInput) ? $toInput : null);

if (!$to) {
    // Default to current admin's email if no recipient passed
    $to = validateEmail((string) ($user['email'] ?? null));
}

if (!$to) {
    jsonError('Valid recipient email is required', 400);
}

$appName = $_ENV['BREVO_SENDER_NAME'] ?? getenv('BREVO_SENDER_NAME') ?: 'ProcurEase';
$subject = $appName . ' — Email test';
$timestamp = date('Y-m-d H:i:s');

$html = '<p>Hello,</p>'
    . '<p>This is a test email from <strong>' . htmlspecialchars($appName, ENT_QUOTES, 'UTF-8') . '</strong>.</p>'
    . '<p>If you received this, email delivery is working.</p>'
    . '<p><small>Sent at: ' . htmlspecialchars($timestamp, ENT_QUOTES, 'UTF-8') . '</small></p>';
$text = "Hello,\n\nThis is a test email from {$appName}.\nIf you received this, email delivery is working.\n\nSent at: {$timestamp}";

$ok = sendMail($to, $subject, $html, $text);
if (!$ok) {
    jsonError('Email failed to send. Check server logs for Brevo/SMTP details.', 500);
}

jsonSuccess([
    'message' => 'Test email sent',
    'to' => $to,
]);

