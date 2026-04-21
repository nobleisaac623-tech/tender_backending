<?php
/**
 * Router for PHP built-in server on Railway
 * Handles /api/* routing to .php files in /app/api/
 */

// Enable error reporting FIRST - before any other code
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');

// Set base directory to /app for Railway
$baseDir = '/app';

// Define app root constant for use in required files
define('APP_ROOT', $baseDir);

// Include CORS - check if file exists first
$corsFile = $baseDir . '/config/cors.php';
if (file_exists($corsFile)) {
    require_once $corsFile;
} else {
    error_log("CORS file missing: " . $corsFile);
    // Don't fail hard on CORS missing - just log
    // http_response_code(500);  // Commented out
}

// Set JSON content type for API responses
header('Content-Type: application/json');

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Root path - return API status (test if router works)
if ($uri === '/' || $uri === '') {
    echo json_encode([
        'status' => 'online',
        'message' => 'Tender Management System API',
        'version' => '1.0.0',
        'timestamp' => date('c')
    ]);
    exit;
}

// API routing - map /api/tenders/public -> /app/api/tenders/public.php
if (strpos($uri, '/api/') === 0) {
    // Remove leading slash and get the path after /api/
    $apiPath = substr($uri, 5); // Remove '/api/' prefix
    
    // Base directory for API files
    $apiDir = $baseDir . '/api/';
    
    // Check if path already ends with .php - don't append again
    if (strpos($apiPath, '.php') !== false) {
        // Path already has .php extension
        $filePath = $apiDir . $apiPath;
        
        if (file_exists($filePath) && is_file($filePath)) {
try {
                require $filePath;
                exit;
            } catch (Throwable $e) {
                // Log full error to Railway logs
                error_log("API Error in router.php: " . $e->getMessage());
                error_log("File: " . $e->getFile() . ", Line: " . $e->getLine());
                error_log("Trace: " . $e->getTraceAsString());
                
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Error loading API endpoint: ' . $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
'debug' => (getenv('APP_DEBUG') || isset($_ENV['APP_DEBUG']) ? true : false)  // Remove in prod
                ]);
                exit;
            }
        }
    } else {
        // Try direct .php file: /api/tenders/public -> /app/api/tenders/public.php
        $filePath = $apiDir . $apiPath . '.php';
        
        if (file_exists($filePath) && is_file($filePath)) {
            try {
                require $filePath;
                exit;
            } catch (Throwable $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Error loading API endpoint',
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
                exit;
            }
        }
        
        // Try index.php in directory: /api/tenders -> /app/api/tenders/index.php
        $indexPath = $apiDir . rtrim($apiPath, '/') . '/index.php';
        
        if (file_exists($indexPath) && is_file($indexPath)) {
            try {
                require $indexPath;
                exit;
            } catch (Throwable $e) {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'error' => 'Error loading API endpoint',
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]);
                exit;
            }
        }
    }
    
    // File not found - return 404
    http_response_code(404);
    echo json_encode([
        'success' => false,
        'message' => 'Endpoint not found',
        'requested_path' => $uri,
        'checked_path' => $filePath ?? $apiDir . $apiPath
    ]);
    exit;
}

// 404 Not Found - no match
http_response_code(404);
echo json_encode([
    'success' => false,
    'message' => 'Endpoint not found',
    'requested_path' => $uri
]);
