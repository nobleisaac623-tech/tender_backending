<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../helpers/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/tender_image.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

$token = getBearerToken();
$user = validateToken($token);
if (!$user) { jsonResponse(['success' => false, 'message' => 'Unauthorized'], 401); exit(); }

$tenderId = (int)($_GET['id'] ?? 0);
if (!$tenderId) { jsonResponse(['success' => false, 'message' => 'Tender ID required'], 400); exit(); }

try {
    $db = Database::getInstance();

    $tender = $db->queryOne(
        "SELECT t.id, t.title, t.description, tc.name as category
         FROM tenders t
         LEFT JOIN tender_categories tc ON t.category_id = tc.id
         WHERE t.id = ?",
        [$tenderId]
    );

    if (!$tender) { jsonResponse(['success' => false, 'message' => 'Tender not found'], 404); exit(); }

    $image = fetchTenderImage(
        $tender['id'],
        $tender['title'],
        $tender['description'] ?? '',
        $tender['category'] ?? ''
    );

    jsonResponse(['success' => true, 'image' => $image]);

} catch (Exception $e) {
    error_log('Tender image API error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Could not load image'], 500);
}
