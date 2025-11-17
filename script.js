// Updated script.js for PHP MySQL integration
const API_BASE = 'api';

// Global variables
let products = [];
let categories = [];
let stockTransactions = [];
let settings = { lowStockThreshold: 10, currencySymbol: '$' };

let currentPage = 1;
const itemsPerPage = 10;
let filteredProducts = [];

// Initialize data from API
async function initializeData() {
    try {
        const [settingsRes, productsRes, categoriesRes, transactionsRes] = await Promise.all([
            fetch(`${API_BASE}/settings.php`),
            fetch(`${API_BASE}/products.php?page=1&limit=1000`),
            fetch(`${API_BASE}/categories.php`),
            fetch(`${API_BASE}/transactions.php`)
        ]);
        
        // ... rest of the code
    } catch (error) {
        console.error('Error initializing data:', error);
        showToast('Error loading data from server', true);
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;
        
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(page).classList.add('active');
        
        document.getElementById('pageTitle').textContent = item.textContent.trim();
        
        if (page === 'dashboard') updateDashboard();
        if (page === 'products') renderProducts();
        if (page === 'categories') renderCategories();
        if (page === 'stock') renderStockTransactions();
        if (page === 'reports') updateReports();
        
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('mobile-visible');
        }
    });
});

// Mobile toggle
document.getElementById('mobileToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-visible');
});

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const icon = document.querySelector('#darkModeToggle i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
});

// Toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    
    if (isError) {
        toast.classList.add('error');
    } else {
        toast.classList.remove('error');
    }
    
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Product status
function getProductStatus(quantity) {
    if (quantity === 0) return 'out-stock';
    if (quantity <= settings.lowStockThreshold) return 'low-stock';
    return 'in-stock';
}

function getStatusText(status) {
    const statusMap = {
        'in-stock': 'In Stock',
        'low-stock': 'Low Stock',
        'out-stock': 'Out of Stock'
    };
    return statusMap[status] || status;
}

// Update dashboard
function updateDashboard() {
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => getProductStatus(p.quantity) === 'low-stock').length;
    const totalCategories = categories.length;
    const inventoryValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('lowStockItems').textContent = lowStockItems;
    document.getElementById('totalCategories').textContent = totalCategories;
    document.getElementById('inventoryValue').textContent = settings.currencySymbol + inventoryValue.toFixed(2);
    
    updateCharts();
}

// Update charts
let categoryChart, statusChart;

function updateCharts() {
    const categoryData = {};
    categories.forEach(cat => {
        categoryData[cat.name] = products.filter(p => p.category_name === cat.name).length;
    });
    
    const statusData = {
        'In Stock': products.filter(p => getProductStatus(p.quantity) === 'in-stock').length,
        'Low Stock': products.filter(p => getProductStatus(p.quantity) === 'low-stock').length,
        'Out of Stock': products.filter(p => getProductStatus(p.quantity) === 'out-stock').length
    };
    
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctxCategory, {
        type: 'bar',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                label: 'Products per Category',
                data: Object.values(categoryData),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
    
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(ctxStatus, {
        type: 'pie',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
}

// Render products
function renderProducts() {
    applyFilters();
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedProducts = filteredProducts.slice(start, end);
    
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    
    paginatedProducts.forEach(product => {
        const status = getProductStatus(product.quantity);
        const totalValue = product.quantity * product.price;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.category_name || product.category}</td>
            <td>${product.quantity}</td>
            <td>${settings.currencySymbol}${parseFloat(product.price).toFixed(2)}</td>
            <td>${settings.currencySymbol}${totalValue.toFixed(2)}</td>
            <td><span class="status-badge status-${status}">${getStatusText(status)}</span></td>
            <td class="action-buttons">
                <button class="btn btn-primary btn-small" onclick="editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    renderPagination();
    updateCategoryFilter();
}

// Pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderProducts();
        }
    };
    pagination.appendChild(prevBtn);
    
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.classList.toggle('active', i === currentPage);
        pageBtn.onclick = () => {
            currentPage = i;
            renderProducts();
        };
        pagination.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderProducts();
        }
    };
    pagination.appendChild(nextBtn);
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchProduct').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredProducts = products.filter(product => {
        const categoryName = product.category_name || product.category || 'Uncategorized';
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.id.toString().includes(searchTerm);
        
        // Updated category matching logic
        let matchesCategory = true;
        if (categoryFilter) {
            if (categoryFilter === 'uncategorized') {
                matchesCategory = !categoryName || categoryName === 'Uncategorized';
            } else {
                matchesCategory = categoryName === categoryFilter;
            }
        }
        
        const matchesStatus = !statusFilter || getProductStatus(product.quantity) === statusFilter;
        
        return matchesSearch && matchesCategory && matchesStatus;
    });
    
    currentPage = 1;
}
document.getElementById('searchProduct').addEventListener('input', renderProducts);
document.getElementById('categoryFilter').addEventListener('change', renderProducts);
document.getElementById('statusFilter').addEventListener('change', renderProducts);

// Update category filter
function updateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    const productCategory = document.getElementById('productCategory');
    
    const currentFilterValue = categoryFilter.value;
    const currentCategoryValue = productCategory.value;
    
    // Update category filter dropdown
    categoryFilter.innerHTML = '<option value="">All Categories</option><option value="uncategorized">Uncategorized</option>';
    productCategory.innerHTML = '<option value="">No Category</option>';
    
    categories.forEach(cat => {
        const categoryName = cat.name || cat;
        const option1 = document.createElement('option');
        option1.value = categoryName;
        option1.textContent = categoryName;
        categoryFilter.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = categoryName;
        option2.textContent = categoryName;
        productCategory.appendChild(option2);
    });
    
    categoryFilter.value = currentFilterValue;
    productCategory.value = currentCategoryValue;
}
// Modal controls
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('active'));
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Add product button
document.getElementById('addProductBtn').addEventListener('click', () => {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('modalTitle').textContent = 'Add Product';
    document.getElementById('productDate').valueAsDate = new Date();
    document.getElementById('productModal').classList.add('active');
    updateCategoryFilter();
});

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value.trim(),
        category_id: await getCategoryId(document.getElementById('productCategory').value), // This can be null now
        quantity: parseInt(document.getElementById('productQuantity').value),
        price: parseFloat(document.getElementById('productPrice').value),
        supplier: document.getElementById('productSupplier').value.trim(),
        date_added: document.getElementById('productDate').value
    };
    
    // UPDATED VALIDATION - category_id is now optional
    if (!productData.name || isNaN(productData.quantity) || isNaN(productData.price)) {
        showToast('Please fill Name, Quantity, and Price fields correctly', true);
        return;
    }
    
    const success = await saveProduct(productData, !!productId);
    if (success) {
        document.getElementById('productModal').classList.remove('active');
    }
});
// Save product to API
async function saveProduct(productData, isEdit = false) {
    try {
        const url = isEdit ? `${API_BASE}/products/${productData.id}` : `${API_BASE}/products`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(productData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save product');
        }
        
        const result = await response.json();
        showToast(result.message);
        
        // Refresh data
        await initializeData();
        return true;
    } catch (error) {
        showToast(error.message || 'Error saving product', true);
        return false;
    }
}

// Edit product
async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        
        // Set category name in dropdown
        const categoryName = product.category_name || product.category;
        document.getElementById('productCategory').value = categoryName;
        
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productSupplier').value = product.supplier || '';
        document.getElementById('productDate').value = product.date_added || product.date || '';
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productModal').classList.add('active');
        updateCategoryFilter();
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/categories.php?id=${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
        
        const result = await response.json();
        showToast(result.message);
        
        await initializeData();
    } catch (error) {
        showToast(error.message || 'Error deleting category', true);
    }
}

// Helper function to get category ID by name
async function getCategoryId(categoryName) {
    if (!categoryName || categoryName === '') {
        return null; // Return null for empty category
    }
    
    try {
        const categoriesRes = await fetch(`${API_BASE}/categories.php`);
        if (categoriesRes.ok) {
            const categories = await categoriesRes.json();
            const category = categories.find(cat => (cat.name || cat) === categoryName);
            return category ? category.id : null;
        }
    } catch (error) {
        console.error('Error getting category ID:', error);
    }
    return null;
}

// Categories
document.getElementById('addCategoryBtn').addEventListener('click', () => {
    document.getElementById('categoryModal').classList.add('active');
});

document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryName = document.getElementById('categoryName').value.trim();
    
    if (!categoryName) {
        showToast('Please enter a category name', true);
        return;
    }
    
    const success = await saveCategory(categoryName);
    if (success) {
        document.getElementById('categoryModal').classList.remove('active');
        document.getElementById('categoryForm').reset();
    }
});



// Save category to API
async function saveCategory(categoryName) {
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: categoryName })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add category');
        }
        
        const result = await response.json();
        showToast(result.message);
        
        // Refresh data
        await initializeData();
        return true;
    } catch (error) {
        showToast(error.message || 'Error adding category', true);
        return false;
    }
}

function renderCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = '';
    
    categories.forEach(category => {
        const categoryName = category.name || category;
        const productCount = category.product_count || products.filter(p => (p.category_name || p.category) === categoryName).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.category_name || product.category || 'Uncategorized'}</td><td>${categoryName}</td>
            <td>${productCount}</td>
            <td>
                <button class="btn btn-danger btn-small" onclick="deleteCategory(${category.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Delete category
async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/categories/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete category');
        }
        
        const result = await response.json();
        showToast(result.message);
        
        // Refresh data
        await initializeData();
    } catch (error) {
        showToast(error.message || 'Error deleting category', true);
    }
}

// Stock transactions
function renderStockTransactions() {
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';
    
    const sortedTransactions = [...stockTransactions].reverse().slice(0, 50);
    
    sortedTransactions.forEach(transaction => {
        const date = new Date(transaction.transaction_date).toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${transaction.product_name || transaction.product}</td>
            <td><span class="status-badge ${transaction.transaction_type === 'Stock In' ? 'status-in-stock' : 'status-out-stock'}">${transaction.transaction_type}</span></td>
            <td>${transaction.quantity}</td>
            <td>${transaction.notes}</td>
        `;
        tbody.appendChild(row);
    });
}

// Reports
let monthlyChart, topProductsChart;

function updateReports() {
    // Monthly trends (dummy data for demo)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const stockIn = [45, 52, 48, 60, 55, 58];
    const stockOut = [30, 35, 32, 40, 38, 42];
    
    const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctxMonthly, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Stock In',
                data: stockIn,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }, {
                label: 'Stock Out',
                data: stockOut,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });
    
    // Top products by value
    const topProducts = products
        .map(p => ({ name: p.name, value: p.quantity * p.price }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    
    const ctxTop = document.getElementById('topProductsChart').getContext('2d');
    if (topProductsChart) topProductsChart.destroy();
    topProductsChart = new Chart(ctxTop, {
        type: 'bar',
        data: {
            labels: topProducts.map(p => p.name),
            datasets: [{
                label: 'Total Value',
                data: topProducts.map(p => p.value),
                backgroundColor: '#4f46e5'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y'
        }
    });
}

// Settings
document.getElementById('saveSettings').addEventListener('click', async () => {
    const settingsData = {
        low_stock_threshold: parseInt(document.getElementById('lowStockThreshold').value),
        currency_symbol: document.getElementById('currencySymbol').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settingsData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save settings');
        }
        
        const result = await response.json();
        showToast(result.message);
        
        // Refresh data to get updated settings
        await initializeData();
    } catch (error) {
        showToast(error.message || 'Error saving settings', true);
    }
});

document.getElementById('clearData').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        // This would need a separate API endpoint to clear data
        showToast('Clear data functionality needs backend implementation', true);
    }
});

// Export to CSV
document.getElementById('exportCSV').addEventListener('click', () => {
    const headers = ['ID', 'Name', 'Category', 'Quantity', 'Unit Price', 'Total Value', 'Status'];
    const rows = products.map(p => [
        p.id,
        p.name,
        p.category_name || p.category,
        p.quantity,
        p.price,
        (p.quantity * p.price).toFixed(2),
        getStatusText(getProductStatus(p.quantity))
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    
    showToast('CSV exported successfully!');
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
});