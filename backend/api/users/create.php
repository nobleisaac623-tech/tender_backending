<?php
/**
 * POST /api/users/create — Create a new user (admin only).
 * Can create users with role: admin, evaluator, supplier
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

// Get input
$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$role = trim($data['role'] ?? 'supplier');

// Validate input
if (!$name) {
    jsonError('Name is required', 400);
}
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Valid email is required', 400);
}
if (!$password || strlen($password) < 6) {
    jsonError('Password must be at least 6 characters', 400);
}
if (!in_array($role, ['admin', 'evaluator', 'supplier'], true)) {
    jsonError('Invalid role. Must be admin, evaluator, or supplier', 400);
}

// Check if email already exists
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Email already exists', 409);
}

// Hash password
$passwordHash = password_hash($password, PASSWORD_BCRYPT);

// Insert user
$stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)");
$status = ($role === 'supplier') ? 'pending' : 'active';
$stmt->execute([$name, $email, $passwordHash, $role, $status]);

$userId = (int) $pdo->lastInsertId();

// Audit log
auditLog($pdo, $user['user_id'], 'user_created', 'users', $userId, "Created user: $email with role: $role");

jsonSuccess([
    'user' => [
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'status' => $status,
    ]
], 201);
