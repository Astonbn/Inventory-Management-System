<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once 'config.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Get the request path
$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME'];
$path = str_replace(dirname($script_name), '', $request_uri);
$path = trim($path, '/');
$path_parts = explode('/', $path);

// Remove empty parts
$path_parts = array_filter($path_parts);
$path_parts = array_values($path_parts);

$endpoint = $path_parts[0] ?? '';
$id = $path_parts[1] ?? '';

try {
    switch($method) {
        case 'GET':
            handleGet($db, $endpoint, $id);
            break;
        case 'POST':
            handlePost($db, $endpoint, $input);
            break;
        case 'PUT':
            handlePut($db, $endpoint, $id, $input);
            break;
        case 'DELETE':
            handleDelete($db, $endpoint, $id);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($db, $endpoint, $id) {
    switch($endpoint) {
        case 'products':
            getProducts($db, $_GET);
            break;
        case 'categories':
            getCategories($db);
            break;
        case 'transactions':
            getTransactions($db);
            break;
        case 'settings':
            getSettings($db);
            break;
        case 'dashboard':
            getDashboardStats($db);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found: ' . $endpoint]);
    }
}

function handlePost($db, $endpoint, $input) {
    switch($endpoint) {
        case 'products':
            addProduct($db, $input);
            break;
        case 'categories':
            addCategory($db, $input);
            break;
        case 'transactions':
            addTransaction($db, $input);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

function handlePut($db, $endpoint, $id, $input) {
    switch($endpoint) {
        case 'products':
            updateProduct($db, $id, $input);
            break;
        case 'settings':
            updateSettings($db, $input);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

function handleDelete($db, $endpoint, $id) {
    switch($endpoint) {
        case 'products':
            deleteProduct($db, $id);
            break;
        case 'categories':
            deleteCategory($db, $id);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
}

// Include the API function files
require_once 'products_api.php';
require_once 'categories_api.php';
require_once 'dashboard_api.php';
?>