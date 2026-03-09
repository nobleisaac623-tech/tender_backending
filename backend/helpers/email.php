<?php
/**
 * Brevo (Sendinblue) email helper for ProcurEase.
 *
 * Uses Railway env vars:
 *   BREVO_API_KEY
 *   BREVO_SENDER_EMAIL
 *   BREVO_SENDER_NAME
 *   ADMIN_EMAIL
 */

declare(strict_types=1);

function brevoSendEmail(string $to, string $subject, string $html, string $text = ''): bool
{
    $apiKey = $_ENV['BREVO_API_KEY'] ?? getenv('BREVO_API_KEY');
    $fromEmail = $_ENV['BREVO_SENDER_EMAIL'] ?? getenv('BREVO_SENDER_EMAIL') ?: ($_ENV['MAIL_FROM'] ?? 'noreply@example.com');
    $fromName = $_ENV['BREVO_SENDER_NAME'] ?? getenv('BREVO_SENDER_NAME') ?: 'ProcurEase';

    if (!$apiKey) {
        // Fallback to existing mail helper if Brevo is not configured
        if (function_exists('sendMail')) {
            return sendMail($to, $subject, $html, $text);
        }
        return false;
    }

    $payload = [
        'sender' => [
            'email' => $fromEmail,
            'name'  => $fromName,
        ],
        'to' => [
            ['email' => $to],
        ],
        'subject' => $subject,
        'htmlContent' => $html,
        'textContent' => $text !== '' ? $text : strip_tags($html),
    ];

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'api-key: ' . $apiKey,
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log('Brevo error: ' . $curlError);
        return false;
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        error_log('Brevo HTTP ' . $httpCode . ' response: ' . $response);
        return false;
    }

    return true;
}

/**
 * Send a branded admin notification when a new supplier registers.
 *
 * @param array{
 *   contact_name: string,
 *   email: string,
 *   company_name: string,
 *   categories?: array<int, string>
 * } $data
 */
function sendBrevoSupplierRegistrationEmail(array $data): void
{
    $adminEmail = $_ENV['ADMIN_EMAIL'] ?? getenv('ADMIN_EMAIL');
    if (!$adminEmail) {
        return;
    }

    $company = htmlspecialchars($data['company_name'] ?? '', ENT_QUOTES, 'UTF-8');
    $contact = htmlspecialchars($data['contact_name'] ?? '', ENT_QUOTES, 'UTF-8');
    $email   = htmlspecialchars($data['email'] ?? '', ENT_QUOTES, 'UTF-8');

    $categories = $data['categories'] ?? [];
    $categoriesList = '';
    if (is_array($categories) && count($categories) > 0) {
        $safeCats = array_map(fn($c) => htmlspecialchars((string) $c, ENT_QUOTES, 'UTF-8'), $categories);
        $categoriesList = '<p><strong>Categories:</strong> ' . implode(', ', $safeCats) . '</p>';
    }

    $appUrl = $_ENV['APP_URL'] ?? getenv('APP_URL') ?? 'https://tender-production.up.railway.app';
    $reviewUrl = rtrim($appUrl, '/') . '/admin/suppliers?tab=pending';

    $subject = 'New Supplier Registration – ' . ($company ?: $contact ?: $email);

    $html = "
      <div style=\"font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; background: #0f172a;\">
        <div style=\"max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;\">
          <div style=\"padding: 16px 20px; background: linear-gradient(135deg, #1d4ed8, #7c3aed); color: #f9fafb;\">
            <h1 style=\"margin: 0; font-size: 18px; font-weight: 700;\">ProcurEase – New Supplier Registration</h1>
            <p style=\"margin: 4px 0 0; font-size: 13px; opacity: 0.9;\">A new supplier account is awaiting your approval.</p>
          </div>
          <div style=\"padding: 20px;\">
            <p style=\"font-size: 14px; color: #111827; margin: 0 0 12px;\">Dear Administrator,</p>
            <p style=\"font-size: 14px; color: #374151; margin: 0 0 16px;\">
              A new supplier has registered on <strong>ProcurEase</strong> and is pending approval.
            </p>
            <div style=\"border-radius: 10px; border: 1px solid #e5e7eb; background: #f9fafb; padding: 12px 14px; font-size: 13px; color: #111827;\">
              <p style=\"margin: 0 0 6px;\"><strong>Company:</strong> {$company}</p>
              <p style=\"margin: 0 0 6px;\"><strong>Contact:</strong> {$contact}</p>
              <p style=\"margin: 0 0 4px;\"><strong>Email:</strong> <a href=\"mailto:{$email}\" style=\"color: #1d4ed8;\">{$email}</a></p>
              {$categoriesList}
            </div>
            <p style=\"margin: 16px 0 10px; font-size: 13px; color: #4b5563;\">
              You can review and approve this supplier from the admin panel.
            </p>
            <p style=\"margin: 0 0 18px;\">
              <a href=\"{$reviewUrl}\" style=\"display: inline-block; padding: 8px 14px; border-radius: 999px; background: #1d4ed8; color: #ffffff; font-size: 13px; font-weight: 600; text-decoration: none;\">Review pending suppliers</a>
            </p>
            <p style=\"margin: 0; font-size: 11px; color: #9ca3af;\">This email was sent automatically by ProcurEase.</p>
          </div>
        </div>
      </div>
    ";

    $text = "New supplier registration\n\n"
      . "Company: {$data['company_name']}\n"
      . "Contact: {$data['contact_name']}\n"
      . "Email: {$data['email']}\n";

    brevoSendEmail($adminEmail, $subject, $html, $text);
}

