<?php
/**
 * PUT /api/suppliers/update — Supplier update own profile.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireSupplier();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$name = sanitizeString($body['name'] ?? null, 255);
if ($name !== '') {
    $stmt = $pdo->prepare("UPDATE users SET name = ? WHERE id = ?");
    $stmt->execute([$name, $user['user_id']]);
}

$stmt = $pdo->prepare("SELECT id FROM supplier_profiles WHERE user_id = ?");
$stmt->execute([$user['user_id']]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);

$companyName = sanitizeString($body['company_name'] ?? null, 255);
$regNo = sanitizeString($body['registration_number'] ?? null, 100);
$address = sanitizeString($body['address'] ?? null, 500);
$phone = sanitizeString($body['phone'] ?? null, 50);
$website = sanitizeString($body['website'] ?? null, 255);
$category = sanitizeString($body['category'] ?? null, 100);
$taxId = sanitizeString($body['tax_id'] ?? null, 100);

if ($profile) {
    $stmt = $pdo->prepare("UPDATE supplier_profiles SET company_name = COALESCE(NULLIF(?, ''), company_name), registration_number = ?, address = ?, phone = ?, website = ?, category = ?, tax_id = ? WHERE user_id = ?");
    $stmt->execute([$companyName ?: null, $regNo ?: null, $address ?: null, $phone ?: null, $website ?: null, $category ?: null, $taxId ?: null, $user['user_id']]);
} else {
    $stmt = $pdo->prepare("INSERT INTO supplier_profiles (user_id, company_name, registration_number, address, phone, website, category, tax_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$user['user_id'], $companyName ?: 'Company', $regNo, $address, $phone, $website, $category, $taxId]);
}

jsonSuccess(['message' => 'Profile updated']);