<?php
/**
 * POST /api/tenders/award — Admin: award tender to a bid (sets tender status to awarded, bid to accepted).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

/**
 * Draft contract clauses using AI (best-effort).
 *
 * @return array<string, string|null>
 */
function aiDraftContractClauses(PDO $pdo, array $user, array $tender, array $bidDetail, array $supplierDetail): array
{
    $defaults = [
        'buyer_name_address' => null,
        'supplier_name_address' => null,
        'specification_of_goods' => null,
        'payment_terms_methods' => null,
        'warranty_terms' => null,
        'breach_and_remedies' => null,
        'delivery_terms' => null,
        'price_terms' => null,
        'price_adjustment_terms' => null,
        'termination_terms' => null,
    ];

    try {
        // If AI is not configured, callAI() throws.
        $prompt =
            "You are a procurement contract drafting assistant. Draft concise, enforceable contract clause text.\n" .
            "Use the provided tender and bid details. Keep language clear and professional.\n" .
            "Return STRICT JSON ONLY with these keys:\n" .
            "buyer_name_address, supplier_name_address, specification_of_goods, payment_terms_methods, warranty_terms, breach_and_remedies, delivery_terms, price_terms, price_adjustment_terms, termination_terms.\n\n" .
            "TENDER TITLE: " . ($tender['title'] ?? '') . "\n" .
            "TENDER REFERENCE: " . ($tender['reference_number'] ?? '') . "\n" .
            "TENDER DESCRIPTION: " . ($tender['description'] ?? '') . "\n\n" .
            "SUPPLIER NAME: " . ($supplierDetail['company_name'] ?? $supplierDetail['name'] ?? '') . "\n" .
            "SUPPLIER EMAIL: " . ($supplierDetail['email'] ?? '') . "\n" .
            "SUPPLIER PHONE: " . ($supplierDetail['phone'] ?? '') . "\n" .
            "SUPPLIER ADDRESS: " . ($supplierDetail['address'] ?? '') . "\n\n" .
            "BID AMOUNT (GHS): " . (string) ($bidDetail['bid_amount'] ?? '') . "\n" .
            "DELIVERY TIME: " . (string) ($bidDetail['delivery_time'] ?? '') . "\n" .
            "TECHNICAL PROPOSAL:\n" . (string) ($bidDetail['technical_proposal'] ?? '') . "\n\n" .
            "JSON FORMAT EXAMPLE:\n" .
            "{\n" .
            "  \"buyer_name_address\": \"...\",\n" .
            "  \"supplier_name_address\": \"...\",\n" .
            "  \"specification_of_goods\": \"...\",\n" .
            "  \"payment_terms_methods\": \"...\",\n" .
            "  \"warranty_terms\": \"...\",\n" .
            "  \"breach_and_remedies\": \"...\",\n" .
            "  \"delivery_terms\": \"...\",\n" .
            "  \"price_terms\": \"...\",\n" .
            "  \"price_adjustment_terms\": \"...\",\n" .
            "  \"termination_terms\": \"...\"\n" .
            "}";

        $raw = callAI($prompt, [], [
            'id' => (int) ($user['user_id'] ?? 0),
            'role' => 'admin',
            'name' => (string) ($user['name'] ?? 'Admin'),
            'tender_id' => (int) ($tender['id'] ?? 0),
        ], $pdo);

        $parsed = ai_extract_json($raw);
        $out = [];
        foreach ($defaults as $k => $_) {
            $v = $parsed[$k] ?? null;
            $v = is_string($v) ? trim($v) : null;
            $out[$k] = $v !== '' ? $v : null;
        }
        return array_merge($defaults, $out);
    } catch (Throwable $e) {
        error_log('AI contract drafting failed: ' . $e->getMessage());
        return $defaults;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : 0;
$bidId = isset($body['bid_id']) ? (int) $body['bid_id'] : 0;

if ($tenderId <= 0 || $bidId <= 0) {
    jsonError('tender_id and bid_id required', 400);
}

$stmt = $pdo->prepare("SELECT id, title, reference_number, description, status, budget FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if (!in_array($tender['status'], ['evaluated', 'awarded'], true)) {
    jsonError('Tender must be evaluated before awarding', 400);
}

$stmt = $pdo->prepare("SELECT id, supplier_id, bid_amount, delivery_time, technical_proposal FROM bids WHERE id = ? AND tender_id = ? AND status IN ('submitted', 'accepted')");
$stmt->execute([$bidId, $tenderId]);
$bid = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bid) {
    jsonError('Bid not found or invalid for this tender', 404);
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("UPDATE bids SET status = 'rejected' WHERE tender_id = ? AND id != ?");
    $stmt->execute([$tenderId, $bidId]);
    $stmt = $pdo->prepare("UPDATE bids SET status = 'accepted' WHERE id = ?");
    $stmt->execute([$bidId]);
    $stmt = $pdo->prepare("UPDATE tenders SET status = 'awarded' WHERE id = ?");
    $stmt->execute([$tenderId]);
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}

auditLog($pdo, $user['user_id'], 'tender_awarded', 'tenders', $tenderId, 'Bid #' . $bidId . ' accepted');

// Auto-create draft contract (best-effort) if none exists yet
$contractId = null;
try {
    $stmt = $pdo->prepare("SELECT id FROM contracts WHERE tender_id = ? LIMIT 1");
    $stmt->execute([$tenderId]);
    $existingContractId = (int) ($stmt->fetchColumn() ?: 0);
    if ($existingContractId > 0) {
        $contractId = $existingContractId;
    } else {
        $supplierId = (int) $bid['supplier_id'];

        // Supplier details for clause drafting
        $stmt = $pdo->prepare("
            SELECT u.name, u.email, sp.company_name, sp.address, sp.phone
            FROM users u
            LEFT JOIN supplier_profiles sp ON sp.user_id = u.id
            WHERE u.id = ?
        ");
        $stmt->execute([$supplierId]);
        $supplierDetail = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $today = date('Y-m-d');
        $end = date('Y-m-d', strtotime('+90 days'));
        $year = date('Y');
        $placeholder = 'CON-' . $year . '-' . bin2hex(random_bytes(4));
        $title = 'Contract — ' . ($tender['reference_number'] ?? $tender['title'] ?? ('Tender #' . $tenderId));
        $contractValue = null;
        if (isset($bid['bid_amount']) && is_numeric($bid['bid_amount']) && (float) $bid['bid_amount'] > 0) {
            $contractValue = (float) $bid['bid_amount'];
        } elseif (isset($tender['budget']) && is_numeric($tender['budget']) && (float) $tender['budget'] > 0) {
            $contractValue = (float) $tender['budget'];
        } else {
            $contractValue = 0.01; // placeholder; admin should correct
        }

        $clauses = aiDraftContractClauses($pdo, $user, $tender, $bid, $supplierDetail);
        if (empty($clauses['supplier_name_address'])) {
            $clauses['supplier_name_address'] = trim(
                (string) ($supplierDetail['company_name'] ?? $supplierDetail['name'] ?? '') .
                "\nEmail: " . (string) ($supplierDetail['email'] ?? '') .
                (!empty($supplierDetail['phone']) ? "\nPhone: " . (string) $supplierDetail['phone'] : '') .
                (!empty($supplierDetail['address']) ? "\nAddress: " . (string) $supplierDetail['address'] : '')
            );
        }

        $stmt = $pdo->prepare("
            INSERT INTO contracts (
                tender_id, supplier_id, contract_number, title, description, contract_value, start_date, end_date,
                contract_date, effective_date,
                buyer_name_address, supplier_name_address, specification_of_goods, payment_terms_methods, warranty_terms,
                breach_and_remedies, delivery_terms, price_terms, price_adjustment_terms, termination_terms,
                status, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
        ");
        $stmt->execute([
            $tenderId,
            $supplierId,
            $placeholder,
            $title,
            'Auto-created draft contract from award. Review and complete clauses before signing.',
            $contractValue,
            $today,
            $end,
            $today,
            $today,
            $clauses['buyer_name_address'],
            $clauses['supplier_name_address'],
            $clauses['specification_of_goods'],
            $clauses['payment_terms_methods'],
            $clauses['warranty_terms'],
            $clauses['breach_and_remedies'],
            $clauses['delivery_terms'],
            $clauses['price_terms'],
            $clauses['price_adjustment_terms'],
            $clauses['termination_terms'],
            (int) $user['user_id'],
        ]);
        $contractId = (int) $pdo->lastInsertId();
        $contractNumber = 'CON-' . $year . '-' . str_pad((string) $contractId, 4, '0', STR_PAD_LEFT);
        $pdo->prepare("UPDATE contracts SET contract_number = ? WHERE id = ?")->execute([$contractNumber, $contractId]);

        auditLog($pdo, (int) $user['user_id'], 'contract_auto_created', 'contracts', $contractId, $contractNumber);
        $pdo->prepare("INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)")
            ->execute([
                $supplierId,
                'Contract created',
                'A contract has been created for you: ' . $title . ' (' . $contractNumber . '). Please review and sign.',
            ]);
        if (!empty($supplierDetail['email'])) {
            $mailText = 'A contract has been created for you: ' . $title . ' (' . $contractNumber . '). Please log in to review and sign.';
            sendMail(
                (string) $supplierDetail['email'],
                'Contract created: ' . $title,
                '<p>Hello ' . htmlspecialchars((string) ($supplierDetail['name'] ?? 'Supplier')) . ',</p><p>' . htmlspecialchars($mailText) . '</p>',
                $mailText
            );
        }
    }
} catch (Throwable $e) {
    error_log('Auto contract creation failed: ' . $e->getMessage());
}

jsonSuccess([
    'message' => 'Tender awarded',
    'supplier_id' => (int) $bid['supplier_id'],
    'contract_id' => $contractId,
]);
