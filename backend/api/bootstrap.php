<?php
/**
 * Bootstrap: load env, config, and DB. Call at top of each API entry.
 * Assumes this file is in backend/api/ so backend root is dirname(__DIR__).
 */

declare(strict_types=1);

$backendRoot = dirname(__DIR__);
$envPath = $backendRoot . DIRECTORY_SEPARATOR . '.env';
if (is_readable($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }
    }
}

require_once $backendRoot . '/config/cors.php';
require_once $backendRoot . '/config/database.php';
require_once $backendRoot . '/helpers/response.php';
