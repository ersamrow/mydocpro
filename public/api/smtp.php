<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

function contactMailer(): PHPMailer {
    $autoload = is_file(__DIR__ . '/vendor/autoload.php')
        ? __DIR__ . '/vendor/autoload.php' : dirname(__DIR__, 2) . '/vendor/autoload.php';
    if (!is_file($autoload)) throw new RuntimeException('SMTP dependency missing.');
    require_once $autoload;
    $required = ['SMTP_HOST', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'CONTACT_FROM_EMAIL', 'CONTACT_ADMIN_EMAIL'];
    foreach ($required as $key) {
        if (getenv($key) === false || trim(getenv($key)) === '') throw new RuntimeException('SMTP configuration incomplete.');
    }
    $host = trim(getenv('SMTP_HOST'));
    if (!preg_match('/^[a-zA-Z0-9.-]+$/D', $host)) throw new RuntimeException('Invalid SMTP host.');
    $encryption = strtolower(getenv('SMTP_ENCRYPTION') ?: 'tls');
    if (!in_array($encryption, ['tls', 'ssl'], true)) throw new RuntimeException('Invalid SMTP encryption.');
    $port = filter_var(getenv('SMTP_PORT') ?: ($encryption === 'ssl' ? '465' : '587'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]);
    if ($port === false) throw new RuntimeException('Invalid SMTP port.');
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $host;
    $mail->Port = $port;
    $mail->SMTPAuth = true;
    $mail->Username = getenv('SMTP_USERNAME');
    $mail->Password = getenv('SMTP_PASSWORD');
    $mail->SMTPSecure = $encryption === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
    $mail->SMTPDebug = 0;
    $mail->Timeout = 15;
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->setFrom(getenv('CONTACT_FROM_EMAIL'), 'MyDocPro');
    return $mail;
}

function contactSend(PHPMailer $mailer, string $to, string $subject, string $body, array $headers): bool {
    try {
        $mailer->clearAllRecipients();
        $mailer->clearReplyTos();
        $mailer->addAddress($to);
        $mailer->addReplyTo($headers['Reply-To']);
        $mailer->Subject = $subject;
        $mailer->Body = $body;
        return $mailer->send();
    } catch (Throwable $error) {
        // Never expose SMTP credentials or provider diagnostics in the response.
        return false;
    }
}
