<?php
/**
 * POST /api/auth/register — Supplier self-registration.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/config/jwt.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$body = getJsonBody();
$name = sanitizeString($body['name'] ?? null, 255);
$email = validateEmail($body['email'] ?? null);
$password = $body['password'] ?? '';

$err = validateRequired($name, 'Name');
if ($err === '') $err = validateLength($name, 1, 255, 'Name');
if ($err === '') $err = $email ? '' : 'Valid email is required';
if ($err === '') $err = validatePassword($password);

if ($err !== '') {
    jsonError($err, 400);
}

$pdo = $GLOBALS['pdo'];
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Email already registered', 409);
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'supplier', 'pending')");
$stmt->execute([$name, $email, $hash]);
$userId = (int) $pdo->lastInsertId();

$companyName = sanitizeString($body['company_name'] ?? $name, 255);
$regNo = sanitizeString($body['registration_number'] ?? null, 100);
$address = sanitizeString($body['address'] ?? null, 500);
$phone = sanitizeString($body['phone'] ?? null, 50);
$website = sanitizeString($body['website'] ?? null, 255);
$category = sanitizeString($body['category'] ?? null, 100);
$taxId = sanitizeString($body['tax_id'] ?? null, 100);

$stmt = $pdo->prepare("INSERT INTO supplier_profiles (user_id, company_name, registration_number, address, phone, website, category, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->execute([$userId, $companyName, $regNo, $address, $phone, $website, $category, $taxId]);

auditLog($pdo, null, 'supplier_registered', 'users', $userId, "Email: $email");
notifyAdmin('New supplier registration', "A new supplier has registered: $name ($email). Please review and approve in the admin panel.");

jsonSuccess([
    'user_id' => $userId,
    'message' => 'Registration successful. Your account is pending approval.',
], 201);