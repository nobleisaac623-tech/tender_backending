<?php
/**
 * POST /api/contact/send — Extended contact form with subject, phone. Sends email + stores in DB.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/response.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$data = getJsonBody();

$name    = sanitizeString($data['name'] ?? null, 255);
$email   = validateEmail($data['email'] ?? null);
$phone   = sanitizeString($data['phone'] ?? null, 50);
$subject = sanitizeString($data['subject'] ?? null, 255);
$message = sanitizeString($data['message'] ?? null, 500);

if (!$name || strlen($name) < 2) {
    jsonError('Name must be at least 2 characters', 400);
}
if (!$email) {
    jsonError('Valid email is required', 400);
}
if (!$subject) {
    jsonError('Subject is required', 400);
}
if (!$message || strlen($message) < 10) {
    jsonError('Message must be at least 10 characters', 400);
}
if (strlen($message) > 500) {
    jsonError('Message must be at most 500 characters', 400);
}

$adminEmail = $_ENV['ADMIN_EMAIL'] ?? $_ENV['MAIL_FROM'] ?? 'procurement@example.com';

$body = "
<h2>New Contact Form Message</h2>
<p><strong>From:</strong> " . htmlspecialchars($name) . "</p>
<p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
<p><strong>Phone:</strong> " . htmlspecialchars($phone ?: 'Not provided') . "</p>
<p><strong>Subject:</strong> " . htmlspecialchars($subject) . "</p>
<hr>
<p><strong>Message:</strong></p>
<p>" . nl2br(htmlspecialchars($message)) . "</p>
";

sendMail($adminEmail, "Contact Form: " . $subject, $body);

$pdo = $GLOBALS['pdo'] ?? null;
if ($pdo) {
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$name, $email, $phone ?: null, $subject, $message]);
    } catch (PDOException $e) {
        error_log('Contact message insert failed: ' . $e->getMessage());
    }
}

jsonSuccess(['message' => 'Message sent successfully']);
