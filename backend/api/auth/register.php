<?php
/**
 * POST /api/auth/register — Supplier self-registration.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/config/jwt.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';
require_once dirname(dirname(__DIR__)) . '/helpers/email.php';
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

// Block registration for actively blacklisted suppliers (by email or company name).
// We keep the message generic as per requirements.
$companyNameForCheck = sanitizeString($body['company_name'] ?? $name, 255);

// Check blacklist by email
$stmt = $pdo->prepare("
    SELECT 1
    FROM supplier_blacklist sb
    JOIN users u ON u.id = sb.supplier_id
    WHERE sb.is_active = 1 AND u.email = ?
    LIMIT 1
");
$stmt->execute([$email]);
if ($stmt->fetchColumn()) {
    jsonError('Unable to complete registration. Please contact support.', 400);
}

// Check blacklist by company name
if ($companyNameForCheck !== '') {
    $stmt = $pdo->prepare("
        SELECT 1
        FROM supplier_blacklist sb
        JOIN users u ON u.id = sb.supplier_id
        JOIN supplier_profiles sp ON sp.user_id = u.id
        WHERE sb.is_active = 1 AND sp.company_name = ?
        LIMIT 1
    ");
    $stmt->execute([$companyNameForCheck]);
    if ($stmt->fetchColumn()) {
        jsonError('Unable to complete registration. Please contact support.', 400);
    }
}
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Email already registered', 409);
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'supplier', 'pending')");
$stmt->execute([$name, $email, $hash]);
$userId = (int) $pdo->lastInsertId();

$companyName = $companyNameForCheck;
$regNo = sanitizeString($body['registration_number'] ?? null, 100);
$address = sanitizeString($body['address'] ?? null, 500);
$phone = sanitizeString($body['phone'] ?? null, 50);
$website = sanitizeString($body['website'] ?? null, 255);
$category = sanitizeString($body['category'] ?? null, 100);
$taxId = sanitizeString($body['tax_id'] ?? null, 100);
$categories = $body['categories'] ?? [];

$stmt = $pdo->prepare("INSERT INTO supplier_profiles (user_id, company_name, registration_number, address, phone, website, category, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->execute([$userId, $companyName, $regNo, $address, $phone, $website, $category, $taxId]);

// Save multiple categories if provided
if (!empty($categories) && is_array($categories)) {
    foreach ($categories as $categoryName) {
        $categoryName = sanitizeString($categoryName, 100);
        if (empty($categoryName)) continue;
        
        // Find category by name
        $catStmt = $pdo->prepare("SELECT id FROM tender_categories WHERE name = ?");
        $catStmt->execute([$categoryName]);
        $categoryRow = $catStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($categoryRow) {
            $insertCatStmt = $pdo->prepare(
                "INSERT IGNORE INTO supplier_categories (supplier_id, category_id, created_at) VALUES (?, ?, NOW())"
            );
            $insertCatStmt->execute([$userId, $categoryRow['id']]);
        }
    }
}

auditLog($pdo, null, 'supplier_registered', 'users', $userId, "Email: $email");

// Brevo-powered admin notification about the new supplier.
try {
    sendBrevoSupplierRegistrationEmail([
        'contact_name' => $name,
        'email' => $email,
        'company_name' => $companyName,
        'categories' => $categories,
    ]);
} catch (Throwable $e) {
    // Never break registration on email failure
    error_log('Brevo registration email failed: ' . $e->getMessage());
}

notifyAdmin('New supplier registration', "A new supplier has registered: $name ($email). Please review and approve in the admin panel.");

jsonSuccess([
    'user_id' => $userId,
    'message' => 'Registration successful. Your account is pending approval.',
], 201);