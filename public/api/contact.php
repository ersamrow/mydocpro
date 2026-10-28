<?php
declare(strict_types=1);

require_once __DIR__ . '/smtp.php';

// All delivery settings come from the PHP server environment.
$admin = getenv('CONTACT_ADMIN_EMAIL') ?: '';
$sender = getenv('CONTACT_FROM_EMAIL') ?: '';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, string $message): never {
    http_response_code($status);
    if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => $message]);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Contact MyDocPro</title><main><h1>Contact MyDocPro</h1><p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p><a href="/contact">Back to contact</a></main></html>';
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, 'Please submit the contact form.');
}
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) respond(413, 'Your message is too large.');
if (!empty($_FILES)) respond(400, 'Attachments are not supported.');
$input = [];
foreach (['name', 'email', 'subject', 'message', 'website'] as $key) {
    if (isset($_POST[$key]) && !is_string($_POST[$key])) respond(400, 'Invalid form data.');
    $input[$key] = trim($_POST[$key] ?? '');
}
if ($input['website'] !== '') respond(400, 'Please leave the website field empty.');
foreach (['name' => 400, 'subject' => 600, 'message' => 20000] as $key => $max) {
    if ($input[$key] === '' || strlen($input[$key]) > $max || !preg_match('//u', $input[$key])) respond(400, 'Please check your name, subject and message.');
}
if (strlen($input['message']) < 10) respond(400, 'Please enter a message of at least 10 characters.');
if (strlen($input['email']) > 254 || !filter_var($input['email'], FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $input['email'])) respond(400, 'Please enter a valid email address.');
if (preg_match('/[\r\n]/', $input['name'] . $input['subject'])) respond(400, 'Name and subject must be on one line.');
foreach ([$admin, $sender] as $address) {
    if (!filter_var($address, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $address)) respond(503, 'Contact email is not configured. Please try later.');
}

try { $mailer = contactMailer(); }
catch (Throwable $error) { respond(503, 'Contact email is not configured. Please try later.'); }

// A fixed-size, locked store outside the web root; retain only hashed keys and timestamps.
$store = @fopen(sys_get_temp_dir() . '/mydocpro-contact-limits.json', 'c+');
if (!$store || !flock($store, LOCK_EX)) respond(503, 'Contact service is temporarily unavailable. Please try later.');
$now = time();
$limits = json_decode(stream_get_contents($store), true) ?: [];
foreach ($limits as $key => $times) {
    $limits[$key] = array_values(array_filter($times, fn($time) => $time > $now - 3600));
    if (!$limits[$key]) unset($limits[$key]);
}
$keys = [hash('sha256', 'ip:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown')), hash('sha256', 'email:' . strtolower($input['email'])), 'global'];
foreach ($keys as $key) {
    if (count($limits[$key] ?? []) >= ($key === 'global' ? 100 : 5)) {
        flock($store, LOCK_UN); fclose($store);
        header('Retry-After: 3600');
        respond(429, 'Too many messages. Please try again in an hour.');
    }
    $limits[$key][] = $now;
}
rewind($store);
if (!ftruncate($store, 0) || fwrite($store, json_encode($limits)) === false || !fflush($store)) {
    flock($store, LOCK_UN); fclose($store);
    respond(503, 'Contact service is temporarily unavailable. Please try later.');
}
flock($store, LOCK_UN); fclose($store);

$headers = ['From' => 'MyDocPro <' . $sender . '>', 'MIME-Version' => '1.0', 'Content-Type' => 'text/plain; charset=UTF-8'];
$body = "New contact message\n\nName: {$input['name']}\nEmail: {$input['email']}\nSubject: {$input['subject']}\n\n{$input['message']}\n";
$accepted = contactSend($mailer, $admin, 'MyDocPro contact message', $body, $headers + ['Reply-To' => $input['email']]);
if (!$accepted) respond(503, 'Your message could not be sent. Please email info@mydocpro.co.in directly.');
// Keep the acknowledgement fixed so this endpoint cannot relay arbitrary content to users.
$confirmed = contactSend($mailer, $input['email'], 'We received your message - MyDocPro', "Thank you for contacting MyDocPro.\n\nYour message has been submitted to our support team. We will reply to this email address if a response is needed. No response time is guaranteed.\n\nIf you did not contact us, you can ignore this confirmation.\n\nMyDocPro\nhttps://mydocpro.co.in\n", $headers + ['Reply-To' => $admin]);
respond(200, $confirmed ? 'Your message has been sent. A confirmation email is on its way; please check your spam folder too.' : 'Your message has been sent to support, but we could not send the confirmation email. You do not need to submit again.');
