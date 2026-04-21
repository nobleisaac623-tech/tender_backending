<?php
/**
 * Database connection using PDO.
 * Supports Railway and local environment variables.
 */

declare(strict_types=1);

/**
 * Load .env file if present
 */
function loadEnv(string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) {
            continue;
        }
        if (strpos($line, '=') === false) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'");
        if (!array_key_exists($name, $_ENV)) {
            $_ENV[$name] = $value;
            putenv("$name=$value");
        }
    }
}

// Try to load .env file from various locations
$envPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
loadEnv($envPath);

// Helper function to get environment variable
function getEnvVar(string $name, string $default = ''): string
{
    // Check getenv() first (works for Railway)
    $value = getenv($name);
    if ($value !== false && $value !== '') {
        return $value;
    }
    
    // Check $_ENV
    if (isset($_ENV[$name]) && $_ENV[$name] !== '') {
        return $_ENV[$name];
    }
    
    return $default;
}

// Railway provides: MYSQLHOST, MYSQLPORT, MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD
// Also support: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS

// Get host - prioritize DB_* then Railway MYSQL*
$host = getEnvVar('DB_HOST') ?: getEnvVar('MYSQL_HOST') ?: getEnvVar('MYSQLHOST') ?: 'localhost';

// Get port
$port = getEnvVar('DB_PORT') ?: getEnvVar('MYSQL_PORT') ?: getEnvVar('MYSQLPORT') ?: '3306';

// Get database name
$name = getEnvVar('DB_NAME') ?: getEnvVar('MYSQL_DATABASE') ?: getEnvVar('MYSQLDATABASE') ?: 'railway';

// Get username
$user = getEnvVar('DB_USER') ?: getEnvVar('MYSQL_USER') ?: getEnvVar('MYSQLUSER') ?: 'root';

// Get password
$pass = getEnvVar('DB_PASS') ?: getEnvVar('MYSQL_PASSWORD') ?: getEnvVar('MYSQLPASSWORD') ?: '';

// Build DSN
$dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE  => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES    => false,
];

try {
    // Using $GLOBALS ensures PDO is accessible across all include scopes
    $GLOBALS['pdo'] = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // Detailed logging for Railway debugging
    error_log("=== DB Connection FAILED ===");
    error_log("Host: " . $host);
    error_log("Port: " . $port);
    error_log("DB: " . $name);
    error_log("User: " . $user);
    error_log("Error: " . $e->getMessage());
    error_log("Code: " . $e->getCode());
    error_log("======================");
    
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Database connection failed',
'debug' => (getenv('APP_DEBUG') || isset($_ENV['APP_DEBUG']) ? true : false),
        'host' => $host,
        'port' => $port,
        'database' => $name,
        'user' => $user,
        'error_code' => $e->getCode()
    ]);
    exit;
}

$pdo = $GLOBALS['pdo'];
