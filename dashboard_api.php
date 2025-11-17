<?php
function getDashboardStats($db) {
    // Total products
    $productsStmt = $db->query("SELECT COUNT(*) as total FROM products");
    $totalProducts = $productsStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Total categories
    $categoriesStmt = $db->query("SELECT COUNT(*) as total FROM categories");
    $totalCategories = $categoriesStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Inventory value
    $valueStmt = $db->query("SELECT SUM(quantity * price) as total FROM products");
    $inventoryValue = $valueStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

    // Low stock items (using default threshold for now)
    $lowStockStmt = $db->query("SELECT COUNT(*) as total FROM products WHERE quantity <= 10 AND quantity > 0");
    $lowStockItems = $lowStockStmt->fetch(PDO::FETCH_ASSOC)['total'];

    // Stock by category
    $categoryStmt = $db->query("
        SELECT c.name, COUNT(p.id) as count 
        FROM categories c 
        LEFT JOIN products p ON c.id = p.category_id 
        GROUP BY c.id, c.name
    ");
    $stockByCategory = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);

    // Stock status distribution
    $statusStmt = $db->query("
        SELECT 
            SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END) as out_stock,
            SUM(CASE WHEN quantity > 0 AND quantity <= 10 THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN quantity > 10 THEN 1 ELSE 0 END) as in_stock
        FROM products
    ");
    $statusDistribution = $statusStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'totalProducts' => $totalProducts,
        'totalCategories' => $totalCategories,
        'inventoryValue' => $inventoryValue,
        'lowStockItems' => $lowStockItems,
        'stockByCategory' => $stockByCategory,
        'statusDistribution' => $statusDistribution
    ]);
}

function getTransactions($db) {
    $query = "SELECT st.*, p.name as product_name 
              FROM stock_transactions st 
              LEFT JOIN products p ON st.product_id = p.id 
              ORDER BY st.transaction_date DESC 
              LIMIT 50";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($transactions);
}

function addTransaction($db, $input) {
    $query = "INSERT INTO stock_transactions (product_id, transaction_type, quantity, notes) 
              VALUES (?, ?, ?, ?)";
    $stmt = $db->prepare($query);
    
    try {
        $stmt->execute([
            $input['product_id'],
            $input['transaction_type'],
            $input['quantity'],
            $input['notes']
        ]);

        // Update product quantity
        if ($input['transaction_type'] == 'Stock In') {
            $updateQuery = "UPDATE products SET quantity = quantity + ? WHERE id = ?";
        } else {
            $updateQuery = "UPDATE products SET quantity = quantity - ? WHERE id = ?";
        }
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute([$input['quantity'], $input['product_id']]);

        echo json_encode(['message' => 'Transaction recorded successfully']);
    } catch(PDOException $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getSettings($db) {
    $query = "SELECT setting_key, setting_value FROM settings";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result = [];
    foreach ($settings as $setting) {
        $result[$setting['setting_key']] = $setting['setting_value'];
    }
    
    echo json_encode($result);
}

function updateSettings($db, $input) {
    foreach ($input as $key => $value) {
        $query = "INSERT INTO settings (setting_key, setting_value) 
                  VALUES (?, ?) 
                  ON DUPLICATE KEY UPDATE setting_value = ?";
        $stmt = $db->prepare($query);
        $stmt->execute([$key, $value, $value]);
    }
    
    echo json_encode(['message' => 'Settings updated successfully']);
}
?>