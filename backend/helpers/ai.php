<?php

function getAdminContext($db) {
    if (!$db) return [];
    try {
        return [
            'total_tenders' => $db->queryOne("SELECT COUNT(*) as c FROM tenders")['c'] ?? 0,
            'active_tenders' => $db->queryOne("SELECT COUNT(*) as c FROM tenders WHERE status = 'active'")['c'] ?? 0,
            'total_suppliers' => $db->queryOne("SELECT COUNT(*) as c FROM supplier_profiles")['c'] ?? 0,
            'total_bids' => $db->queryOne("SELECT COUNT(*) as c FROM bids")['c'] ?? 0,
            'pending_bids' => $db->queryOne("SELECT COUNT(*) as c FROM bids WHERE status = 'pending'")['c'] ?? 0,
            'total_contracts' => $db->queryOne("SELECT COUNT(*) as c FROM contracts")['c'] ?? 0,
            'active_contracts' => $db->queryOne("SELECT COUNT(*) as c FROM contracts WHERE status = 'active'")['c'] ?? 0,
            'blacklisted_suppliers' => $db->queryOne("SELECT COUNT(*) as c FROM supplier_blacklist")['c'] ?? 0,
            'recent_tenders' => $db->query("SELECT id, title, status, submission_deadline as deadline, budget FROM tenders ORDER BY created_at DESC LIMIT 5") ?? [],
            'recent_bids' => $db->query("SELECT b.id, b.bid_amount as amount, b.status, t.title as tender_title, sp.company_name FROM bids b JOIN tenders t ON b.tender_id = t.id JOIN supplier_profiles sp ON b.supplier_id = sp.user_id ORDER BY b.created_at DESC LIMIT 5") ?? [],
            'top_rated_suppliers' => $db->query("SELECT sp.company_name, AVG(sr.overall_score) as avg_rating FROM supplier_ratings sr JOIN supplier_profiles sp ON sr.supplier_id = sp.user_id GROUP BY sr.supplier_id ORDER BY avg_rating DESC LIMIT 5") ?? [],
        ];
    } catch (Exception $e) {
        error_log('Admin context error: ' . $e->getMessage());
        return [];
    }
}

function getSupplierContext($userId, $db) {
    if (!$db) return [];
    try {
        return [
            'profile' => $db->queryOne("SELECT company_name, industry, verified FROM supplier_profiles WHERE user_id = ?", [$userId]) ?? [],
            'active_bids' => $db->query("SELECT b.id, b.bid_amount as amount, b.status, t.title, t.submission_deadline as deadline FROM bids b JOIN tenders t ON b.tender_id = t.id WHERE b.supplier_id = ? AND b.status IN ('pending','submitted') ORDER BY b.created_at DESC LIMIT 10", [$userId]) ?? [],
            'won_bids' => $db->queryOne("SELECT COUNT(*) as c FROM bids WHERE supplier_id = ? AND status = 'accepted'", [$userId])['c'] ?? 0,
            'lost_bids' => $db->queryOne("SELECT COUNT(*) as c FROM bids WHERE supplier_id = ? AND status = 'rejected'", [$userId])['c'] ?? 0,
            'avg_rating' => $db->queryOne("SELECT AVG(overall_score) as r FROM supplier_ratings WHERE supplier_id = ?", [$userId])['r'] ?? 0,
            'active_contracts' => $db->query("SELECT c.id, c.status, c.value, t.title FROM contracts c JOIN tenders t ON c.tender_id = t.id WHERE c.supplier_id = ? AND c.status = 'active'", [$userId]) ?? [],
            'available_tenders' => $db->query("SELECT id, title, budget, submission_deadline as deadline, category FROM tenders WHERE status = 'published' AND submission_deadline > NOW() ORDER BY submission_deadline ASC LIMIT 10") ?? [],
        ];
    } catch (Exception $e) {
        error_log('Supplier context error: ' . $e->getMessage());
        return [];
    }
}

function getOfficerContext($db) {
    if (!$db) return [];
    try {
        return [
            'pending_evaluations' => $db->query("SELECT t.id, t.title, COUNT(b.id) as bid_count FROM tenders t JOIN bids b ON b.tender_id = t.id WHERE t.status = 'published' GROUP BY t.id ORDER BY t.submission_deadline ASC LIMIT 5") ?? [],
            'expiring_tenders' => $db->query("SELECT id, title, submission_deadline as deadline, budget FROM tenders WHERE status = 'published' AND submission_deadline BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)") ?? [],
            'recent_contracts' => $db->query("SELECT c.id, c.status, c.value, t.title, sp.company_name FROM contracts c JOIN tenders t ON c.tender_id = t.id JOIN supplier_profiles sp ON c.supplier_id = sp.user_id ORDER BY c.created_at DESC LIMIT 5") ?? [],
        ];
    } catch (Exception $e) {
        error_log('Officer context error: ' . $e->getMessage());
        return [];
    }
}

function getTenderContext($tenderId, $db) {
    if (!$db || !$tenderId) return [];
    try {
        return [
            'tender' => $db->queryOne("SELECT * FROM tenders WHERE id = ?", [$tenderId]) ?? [],
            'bids' => $db->query("SELECT b.id, b.bid_amount as amount, b.status, sp.company_name, AVG(sr.overall_score) as supplier_rating FROM bids b JOIN supplier_profiles sp ON b.supplier_id = sp.user_id LEFT JOIN supplier_ratings sr ON sr.supplier_id = b.supplier_id WHERE b.tender_id = ? GROUP BY b.id ORDER BY b.bid_amount ASC", [$tenderId]) ?? [],
            'criteria' => $db->query("SELECT name, weight FROM evaluation_criteria WHERE tender_id = ?", [$tenderId]) ?? [],
        ];
    } catch (Exception $e) {
        error_log('Tender context error: ' . $e->getMessage());
        return [];
    }
}

function callAI($message, $history = [], $userContext = [], $db = null) {
    $apiKey = $_ENV['GROQ_API_KEY'] ?? getenv('GROQ_API_KEY');

    if (!$apiKey) {
        throw new Exception('ProcureAI is not configured.');
    }

    $role = $userContext['role'] ?? 'user';
    $userName = $userContext['name'] ?? 'there';
    $userId = $userContext['id'] ?? null;
    $tenderId = $userContext['tender_id'] ?? null;

    // Fetch real data based on role
    $contextData = [];
    if ($role === 'admin') {
        $contextData = getAdminContext($db);
    } elseif ($role === 'supplier') {
        $contextData = getSupplierContext($userId, $db);
    } elseif ($role === 'procurement_officer') {
        $contextData = getOfficerContext($db);
    }

    if ($tenderId) {
        $contextData['current_tender'] = getTenderContext($tenderId, $db);
    }

    $systemPrompt = "You are ProcureAI, the intelligent AI assistant built exclusively into ProcurEase — a procurement management platform.

Current user: {$userName}
Current role: {$role}

REAL PLATFORM DATA (use this to answer questions accurately):
" . json_encode($contextData, JSON_PRETTY_PRINT) . "

YOUR CAPABILITIES BY ROLE:

ADMIN:
- Answer questions about platform analytics using real data above
- Draft new tenders (respond with JSON in this format when asked to create a tender):
  {\"action\": \"draft_tender\", \"data\": {\"title\": \"\", \"description\": \"\", \"budget\": 0, \"deadline\": \"\", \"category\": \"\", \"requirements\": \"\"}}
- Shortlist suppliers for a tender based on ratings and past performance
- Flag anomalies in bids or supplier behavior
- Generate procurement summaries and reports

SUPPLIER:
- Show their bids, contracts, and available tenders using real data
- Draft a bid proposal (respond with JSON when asked):
  {\"action\": \"draft_bid\", \"data\": {\"tender_id\": 0, \"amount\": 0, \"proposal\": \"\", \"delivery_timeline\": \"\"}}
- Recommend which tenders to bid on based on their profile and ratings
- Explain bid rejections and suggest improvements

PROCUREMENT OFFICER:
- Summarize tenders and compare bids side by side
- Highlight expiring tenders and pending evaluations
- Draft contract terms based on winning bid

STRICT RULES:
- Use the real platform data provided to give accurate, specific answers
- When creating drafts, always return the JSON action format so the frontend can render an approval UI
- Never reveal you are powered by Groq or LLaMA — you are ProcureAI
- Only answer procurement-related questions
- Always be professional and concise
- Format responses with bullet points or tables where appropriate";

    $messages = [["role" => "system", "content" => $systemPrompt]];

    foreach ($history as $entry) {
        $entryRole = $entry['role'] ?? 'user';
        $content = $entry['content'] ?? $entry['text'] ?? '';
        if (empty($content) || $entryRole === 'system') continue;
        $messages[] = ["role" => $entryRole, "content" => $content];
    }

    $messages[] = ["role" => "user", "content" => $message];

    $body = json_encode([
        "model" => "llama-3.3-70b-versatile",
        "messages" => $messages,
        "max_tokens" => 2048,
        "temperature" => 0.7
    ]);

    $ch = curl_init("https://api.groq.com/openai/v1/chat/completions");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "Authorization: Bearer " . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) throw new Exception('Connection error: ' . $curlError);

    $data = json_decode($response, true);

    if (isset($data['error'])) {
        throw new Exception('ProcureAI error: ' . $data['error']['message']);
    }

    return $data['choices'][0]['message']['content']
        ?? throw new Exception('No response from ProcureAI');
}

function checkAIRateLimit($userId, $db) {
    if (!$db) return;
    try {
        $limit = 50;
        $count = $db->queryOne(
            "SELECT COUNT(*) as count FROM ai_chat_logs WHERE user_id = ? AND created_at >= CURDATE()",
            [$userId]
        );
        if ($count && $count['count'] >= $limit) {
            throw new Exception('Daily message limit reached.');
        }
    } catch (Exception $e) {
        error_log('Rate limit check: ' . $e->getMessage());
    }
}

function logAIChat($userId, $message, $reply, $db) {
    if (!$db) return;
    try {
        $db->execute(
            "INSERT INTO ai_chat_logs (user_id, message, reply, created_at) VALUES (?, ?, ?, NOW())",
            [$userId, $message, $reply]
        );
    } catch (Exception $e) {
        error_log('AI log error: ' . $e->getMessage());
    }
}
