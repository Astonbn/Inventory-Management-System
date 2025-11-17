<?php
function getCategories($db) {
    $query = "SELECT c.*, COUNT(p.id) as product_count 
              FROM categories c 
              LEFT JOIN products p ON c.id = p.category_id 
              GROUP BY c.id 
              ORDER BY c.name";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($categories);
}

function addCategory($db, $input) {
    $query = "INSERT INTO categories (name) VALUES (?)";
    $stmt = $db->prepare($query);
    
    try {
        $stmt->execute([$input['name']]);
        echo json_encode(['message' => 'Category added successfully', 'id' => $db->lastInsertId()]);
    } catch(PDOException $e) {
        http_response_code(400);
        echo json_encode(['error' => 'Category already exists']);
    }
}

function deleteCategory($db, $id) {
    // Check if category has products
    $checkStmt = $db->prepare("SELECT COUNT(*) as count FROM products WHERE category_id = ?");
    $checkStmt->execute([$id]);
    $result = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Cannot delete category with products']);
        return;
    }

    $query = "DELETE FROM categories WHERE id = ?";
    $stmt = $db->prepare($query);
    
    try {
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Category deleted successfully']);
    } catch(PDOException $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>