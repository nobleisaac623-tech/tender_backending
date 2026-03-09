<?php

function callAI($message, $history = [], $userContext = []) {
    $apiKey = $_ENV['GROQ_API_KEY'] ?? getenv('GROQ_API_KEY');

    if (!$apiKey) {
        throw new Exception('ProcureAI is not configured. Contact your administrator.');
    }

    // Build dynamic system prompt based on user role
    $role = $userContext['role'] ?? 'user';
    $userName = $userContext['name'] ?? 'there';
    $tenderContext = $userContext['tender'] ?? null;
    $supplierContext = $userContext['supplier'] ?? null;

    $systemPrompt = "You are ProcureAI, the intelligent AI assistant built exclusively into ProcurEase — a procurement management platform.

Your job is to assist procurement officers, suppliers, and administrators with everything related to procurement.

You help with:
- Evaluating and comparing supplier bids and quotations
- Drafting, reviewing, and summarizing tender documents
- Tracking procurement workflows, deadlines, and milestones
- Flagging compliance issues, risks, or anomalies in contracts
- Recommending best-value suppliers based on price, quality, and reliability
- Answering questions about procurement best practices and regulations
- Guiding users through the ProcurEase platform features

Current user role: {$role}
Current user name: {$userName}";

    if ($role === 'admin') {
        $systemPrompt .= "\nAs an admin, you can help with platform oversight, user management insights, and system-wide procurement analytics.";
    } elseif ($role === 'supplier') {
        $systemPrompt .= "\nAs a supplier, focus on helping them submit competitive bids, understand tender requirements, and improve their proposals.";
    } elseif ($role === 'procurement_officer') {
        $systemPrompt .= "\nAs a procurement officer, help with tender creation, supplier evaluation, contract management, and compliance checks.";
    }

    if ($tenderContext) {
        $systemPrompt .= "\nCurrent tender context: " . json_encode($tenderContext);
    }

    if ($supplierContext) {
        $systemPrompt .= "\nCurrent supplier context: " . json_encode($supplierContext);
    }

    $systemPrompt .= "

STRICT RULES:
- Only answer procurement-related questions
- If asked anything unrelated to procurement or ProcurEase, politely say: 'I'm specialized in procurement assistance. Please ask me anything about tenders, suppliers, or procurement workflows.'
- Always be professional, concise, and helpful
- Never reveal that you are powered by Groq or LLaMA — you are ProcureAI
- Never mention OpenAI, Google, or any other AI company
- Address users by their role and name when known
- Format responses clearly using bullet points or numbered lists when appropriate";

    $messages = [["role" => "system", "content" => $systemPrompt]];

    // Add conversation history
    foreach ($history as $entry) {
        $entryRole = $entry['role'] ?? 'user';
        $content = $entry['content'] ?? $entry['text'] ?? '';
        if (empty($content) || $entryRole === 'system') continue;
        $messages[] = ["role" => $entryRole, "content" => $content];
    }

    // Add current message
    $messages[] = ["role" => "user", "content" => $message];

    $body = json_encode([
        "model" => "llama-3.3-70b-versatile",
        "messages" => $messages,
        "max_tokens" => 1024,
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

    if ($curlError) {
        throw new Exception('Connection error: ' . $curlError);
    }

    error_log('Groq HTTP: ' . $httpCode);
    error_log('Groq response: ' . $response);

    $data = json_decode($response, true);

    if (isset($data['error'])) {
        throw new Exception('ProcureAI error: ' . $data['error']['message']);
    }

    $reply = $data['choices'][0]['message']['content'] ?? null;

    if (!$reply) {
        throw new Exception('No response received from ProcureAI');
    }

    return $reply;
}

function checkAIRateLimit($userId, $db) {
    if (!$db) return; // skip if db not available

    try {
        $limit = 50; // messages per day per user
        $count = $db->queryOne(
            "SELECT COUNT(*) as count FROM ai_chat_logs 
             WHERE user_id = ? AND created_at >= CURDATE()",
            [$userId]
        );

        if ($count && $count['count'] >= $limit) {
            throw new Exception('Daily message limit reached. Upgrade your plan for unlimited ProcureAI access.');
        }
    } catch (Exception $e) {
        error_log('Rate limit check failed: ' . $e->getMessage());
        // Don't block the user if rate limit check fails
    }
}

function logAIChat($userId, $message, $reply, $db) {
    if (!$db) return;

    try {
        $db->query(
            "INSERT INTO ai_chat_logs (user_id, message, reply, created_at) 
             VALUES (?, ?, ?, NOW())",
            [$userId, $message, $reply]
        );
    } catch (Exception $e) {
        error_log('AI chat log failed: ' . $e->getMessage());
    }
}
