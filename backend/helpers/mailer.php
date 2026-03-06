<?php
/**
 * Email helper using PHPMailer (optional).
 * If PHPMailer is not installed, mail() is used as fallback.
 */

declare(strict_types=1);

function sendMail(string $to, string $subject, string $bodyHtml, string $bodyText = ''): bool
{
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
