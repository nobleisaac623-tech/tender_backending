<?php
/**
 * Email helper using PHPMailer (optional).
 * If PHPMailer is not installed, mail() is used as fallback.
 */

declare(strict_types=1);

function sendMail(string $to, string $subject, string $bodyHtml, string $bodyText = ''): bool
{
    // Prefer Brevo globally when configured, so all endpoints using sendMail() benefit.
    $brevoApiKey = $_ENV['BREVO_API_KEY'] ?? getenv('BREVO_API_KEY');
    if (!empty($brevoApiKey)) {
        $fromEmail = $_ENV['BREVO_SENDER_EMAIL'] ?? getenv('BREVO_SENDER_EMAIL') ?: ($_ENV['MAIL_FROM'] ?? 'noreply@example.com');
        $fromName = $_ENV['BREVO_SENDER_NAME'] ?? getenv('BREVO_SENDER_NAME') ?: 'ProcurEase';
        $payload = [
            'sender' => [
                'email' => $fromEmail,
                'name'  => $fromName,
            ],
            'to' => [
                ['email' => $to],
            ],
            'subject' => $subject,
            'htmlContent' => $bodyHtml,
            'textContent' => $bodyText !== '' ? $bodyText : strip_tags($bodyHtml),
        ];

        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'api-key: ' . $brevoApiKey,
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log('Brevo error (sendMail): ' . $curlError);
            return false;
        }
        if ($httpCode >= 200 && $httpCode < 300) {
            return true;
        }

        error_log('Brevo HTTP ' . $httpCode . ' response (sendMail): ' . (string) $response);
        return false;
    }

    $from = $_ENV['MAIL_FROM'] ?? 'noreply@localhost';
    $host = $_ENV['MAIL_HOST'] ?? null;
    $port = (int) ($_ENV['MAIL_PORT'] ?? 587);
    $user = $_ENV['MAIL_USER'] ?? '';
    $pass = $_ENV['MAIL_PASS'] ?? '';

    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = $host ?? 'localhost';
            $mail->SMTPAuth   = !empty($user);
            $mail->Username   = $user;
            $mail->Password   = $pass;
            $mail->SMTPSecure = $port === 465 ? \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS : \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $port;
            $mail->setFrom($from);
            $mail->addAddress($to);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body    = $bodyHtml;
            $mail->AltBody = $bodyText ?: strip_tags($bodyHtml);
            $mail->send();
            return true;
        } catch (Exception $e) {
            error_log('Mail error: ' . $e->getMessage());
            return false;
        }
    }

    $headers = "MIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nFrom: $from\r\n";
    return (bool) @mail($to, $subject, $bodyHtml, $headers);
}

function notifyAdmin(string $subject, string $message): void
{
    $adminEmail = $_ENV['ADMIN_EMAIL'] ?? null;
    if (!$adminEmail) {
        $pdo = $GLOBALS['pdo'] ?? null;
        if ($pdo) {
            $stmt = $pdo->query("SELECT email FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $adminEmail = $row['email'] ?? null;
        }
    }
    if ($adminEmail) {
        sendMail($adminEmail, $subject, nl2br(htmlspecialchars($message)), $message);
    }
}
