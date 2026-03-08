<?php
/**
 * POST /api/auth/appeal — Submit an appeal for suspended/blacklisted account.
 * Body: { "supplier_email": "email@example.com", "message": "appeal message" }
 * No auth required - supplier is logged out when accessing this.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$email = trim((string) ($body['supplier_email'] ?? ''));
$message = trim((string) ($body['message'] ?? ''));

if ($email === '') {
    jsonError('Email is required', 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Invalid email format', 400);
}

if ($message === '') {
    jsonError('Message is required', 400);
}

if (strlen($message) < 30) {
    jsonError('Message must be at least 30 characters', 400);
}

if (strlen($message) > 500) {
    jsonError('Message must not exceed 500 characters', 400);
}

$pdo = $GLOBALS['pdo'];

// Find the supplier by email - must be a supplier with suspended/blacklisted status
$stmt = $pdo->prepare("SELECT id, name, email, status FROM users WHERE email = ? AND role = 'supplier'");
$stmt->execute([$email]);
$supplier = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$supplier) {
    jsonError('No suspended or blacklisted account found with this email', 404);
}

// Check if account is actually suspended or blacklisted
$isSuspended = $supplier['status'] === 'suspended';
$isBlacklisted = false;

if (!$isSuspended) {
    // Check blacklist table
    $stmt = $pdo->prepare("SELECT id FROM supplier_blacklist WHERE supplier_id = ? AND is_active = 1");
    $stmt->execute([$supplier['id']]);
    $isBlacklisted = (bool) $stmt->fetchColumn();
}

if (!$isSuspended && !$isBlacklisted) {
    jsonError('Your account is not suspended or blacklisted. Please log in normally.', 400);
}

// Check for duplicate appeals (prevent spam)
$stmt = $pdo->prepare("SELECT id FROM account_appeals WHERE supplier_email = ? AND status = 'pending' AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOURS)");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('You have already submitted an appeal within the last 24 hours. Please wait for a response.', 429);
}

// Save the appeal
$stmt = $pdo->prepare("INSERT INTO account_appeals (supplier_id, supplier_email, supplier_name, message) VALUES (?, ?, ?, ?)");
$stmt->execute([$supplier['id'], $email, $supplier['name'], $message]);

// Get admin email for notification
$stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
$admin = $stmt->fetch(PDO::FETCH_ASSOC);
$adminEmail = $admin['email'] ?? getenv('MAIL_FROM') ?: 'procurement@example.com';

// Send email to admin
$subject = 'Account Appeal from ' . ($supplier['name'] ?: $email);
$emailBody = "
<p>Dear Administrator,</p>
<p>A supplier has submitted an appeal for their account.</p>
<p><strong>Supplier Name:</strong> " . htmlspecialchars($supplier['name'] ?? 'N/A') . "<br>
<strong>Supplier Email:</strong> " . htmlspecialchars($email) . "<br>
<strong>Account Status:</strong> " . ($isSuspended ? 'Suspended' : 'Blacklisted') . "<br>
<strong>Date:</strong> " . date('F j, Y \a\t H:i') . "</p>
<p><strong>Appeal Message:</strong></p>
<p>" . nl2br(htmlspecialchars($message)) . "</p>
<p><a href=\"" . (getenv('APP_URL') ?: 'https://tender-production.up.railway.app') . "/admin/suppliers/" . $supplier['id'] . "\">View Supplier Profile</a></p>
";

sendMail(
    $adminEmail,
    $subject,
    $emailBody,
    "Account Appeal from {$supplier['name'] ?? $email}. Message: {$message}"
);

// Also notify the supplier
sendMail(
    $email,
    'Appeal Submitted - ' . ($supplier['name'] ?: 'Supplier Account'),
    '<p>Dear ' . htmlspecialchars($supplier['name'] ?? 'Supplier') . ',</p>
    <p>We have received your appeal. Our team will review it and contact you within 2 business days.</p>
    <p><strong>Your Message:</strong></p>
    <p>' . nl2br(htmlspecialchars($message)) . '</p>
    <p>Thank you for contacting us.</p>',
    "Your appeal has been submitted. We will review it within 2 business days."
);

jsonSuccess([
    'message' => 'Appeal submitted successfully',
    'details' => [
        'email' => $email,
        'status' => 'pending'
    ]
]);
