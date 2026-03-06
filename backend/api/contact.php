<?php
/**
 * POST /api/contact — Public contact form. Sends message to admin email.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$name = sanitizeString($body['name'] ?? null, 255);
$email = validateEmail($body['email'] ?? null);
$message = sanitizeString($body['message'] ?? null, 5000);

$err = validateRequired($name, 'Name');
if ($err === '') {
    $err = validateLength($name, 1, 255, 'Name');
}
if ($err === '') {
    $err = $email ? '' : 'Valid email is required';
}
if ($err === '') {
    $err = validateRequired($message, 'Message');
}
if ($err === '') {
    $err = validateLength($message, 10, 5000, 'Message');
}

if ($err !== '') {
    jsonError($err, 400);
}

notifyAdmin(
    'Contact form: ' . $name,
    "From: $name <$email>\n\n" . $message
);

jsonSuccess(['message' => 'Thank you. We will get back to you soon.']);
