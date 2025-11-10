// Initialize data
let products = JSON.parse(localStorage.getItem('products')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || ['Electronics', 'Clothing', 'Food', 'Furniture', 'Stationery'];
let stockTransactions = JSON.parse(localStorage.getItem('stockTransactions')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || { lowStockThreshold: 10, currencySymbol: '$' };

let currentPage = 1;
const itemsPerPage = 10;
let filteredProducts = [...products];

// Save data to localStorage
function saveData() {
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('stockTransactions', JSON.stringify(stockTransactions));
    localStorage.setItem('settings', JSON.stringify(settings));
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
        categoryData[cat] = products.filter(p => p.category === cat).length;
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
            <td>${product.category}</td>
            <td>${product.quantity}</td>
            <td>${settings.currencySymbol}${product.price.toFixed(2)}</td>
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
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.id.toString().includes(searchTerm);
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
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
    
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    productCategory.innerHTML = '<option value="">Select Category</option>';
    
    categories.forEach(cat => {
        const option1 = document.createElement('option');
        option1.value = cat;
        option1.textContent = cat;
        categoryFilter.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = cat;
        option2.textContent = cat;
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

// Product form submit
document.getElementById('productForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const quantity = parseInt(document.getElementById('productQuantity').value);
    const price = parseFloat(document.getElementById('productPrice').value);
    const supplier = document.getElementById('productSupplier').value.trim();
    const date = document.getElementById('productDate').value;
    
    if (!name || !category || isNaN(quantity) || isNaN(price)) {
        showToast('Please fill all required fields correctly', true);
        return;
    }
    
    if (productId) {
        // Edit existing product
        const index = products.findIndex(p => p.id === parseInt(productId));
        if (index !== -1) {
            const oldQuantity = products[index].quantity;
            products[index] = {
                ...products[index],
                name,
                category,
                quantity,
                price,
                supplier,
                date
            };
            
            // Log stock transaction
            const diff = quantity - oldQuantity;
            if (diff !== 0) {
                stockTransactions.push({
                    date: new Date().toISOString(),
                    product: name,
                    type: diff > 0 ? 'Stock In' : 'Stock Out',
                    quantity: Math.abs(diff),
                    notes: 'Product updated'
                });
            }
            
            showToast('Product updated successfully!');
        }
    } else {
        // Add new product
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            name,
            category,
            quantity,
            price,
            supplier,
            date
        };
        products.push(newProduct);
        
        // Log stock transaction
        stockTransactions.push({
            date: new Date().toISOString(),
            product: name,
            type: 'Stock In',
            quantity: quantity,
            notes: 'New product added'
        });
        
        showToast('Product added successfully!');
    }
    
    saveData();
    renderProducts();
    updateDashboard();
    document.getElementById('productModal').classList.remove('active');
});

// Edit product
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productSupplier').value = product.supplier || '';
        document.getElementById('productDate').value = product.date || '';
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productModal').classList.add('active');
        updateCategoryFilter();
    }
}

// Delete product
function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        const product = products.find(p => p.id === id);
        products = products.filter(p => p.id !== id);
        
        // Log stock transaction
        if (product) {
            stockTransactions.push({
                date: new Date().toISOString(),
                product: product.name,
                type: 'Stock Out',
                quantity: product.quantity,
                notes: 'Product deleted'
            });
        }
        
        saveData();
        renderProducts();
        updateDashboard();
        showToast('Product deleted successfully!');
    }
}

// Categories
document.getElementById('addCategoryBtn').addEventListener('click', () => {
    document.getElementById('categoryModal').classList.add('active');
});

document.getElementById('categoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const categoryName = document.getElementById('categoryName').value.trim();
    
    if (!categoryName) {
        showToast('Please enter a category name', true);
        return;
    }
    
    if (categories.includes(categoryName)) {
        showToast('Category already exists', true);
        return;
    }
    
    categories.push(categoryName);
    saveData();
    renderCategories();
    updateCategoryFilter();
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('categoryForm').reset();
    showToast('Category added successfully!');
});

function renderCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    tbody.innerHTML = '';
    
    categories.forEach(category => {
        const productCount = products.filter(p => p.category === category).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category}</td>
            <td>${productCount}</td>
            <td>
                <button class="btn btn-danger btn-small" onclick="deleteCategory('${category}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function deleteCategory(category) {
    const hasProducts = products.some(p => p.category === category);
    
    if (hasProducts) {
        showToast('Cannot delete category with products', true);
        return;
    }
    
    if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
        categories = categories.filter(c => c !== category);
        saveData();
        renderCategories();
        updateCategoryFilter();
        showToast('Category deleted successfully!');
    }
}

// Stock transactions
function renderStockTransactions() {
    const tbody = document.getElementById('stockTableBody');
    tbody.innerHTML = '';
    
    const sortedTransactions = [...stockTransactions].reverse().slice(0, 50);
    
    sortedTransactions.forEach(transaction => {
        const date = new Date(transaction.date).toLocaleDateString();
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${transaction.product}</td>
            <td><span class="status-badge ${transaction.type === 'Stock In' ? 'status-in-stock' : 'status-out-stock'}">${transaction.type}</span></td>
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
document.getElementById('lowStockThreshold').value = settings.lowStockThreshold;
document.getElementById('currencySymbol').value = settings.currencySymbol;

document.getElementById('saveSettings').addEventListener('click', () => {
    settings.lowStockThreshold = parseInt(document.getElementById('lowStockThreshold').value);
    settings.currencySymbol = document.getElementById('currencySymbol').value;
    saveData();
    updateDashboard();
    renderProducts();
    showToast('Settings saved successfully!');
});

document.getElementById('clearData').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.clear();
        location.reload();
    }
});

// Export to CSV
document.getElementById('exportCSV').addEventListener('click', () => {
    const headers = ['ID', 'Name', 'Category', 'Quantity', 'Unit Price', 'Total Value', 'Status'];
    const rows = products.map(p => [
        p.id,
        p.name,
        p.category,
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
    updateDashboard();
    renderProducts();
    renderCategories();
    renderStockTransactions();
    updateCategoryFilter();
    
    // Add some sample data if empty
    if (products.length === 0) {
        products = [
            { id: 1, name: 'Laptop', category: 'Electronics', quantity: 15, price: 899.99, supplier: 'TechCorp', date: '2024-01-15' },
            { id: 2, name: 'Office Chair', category: 'Furniture', quantity: 8, price: 199.99, supplier: 'FurniturePlus', date: '2024-02-20' },
            { id: 3, name: 'Notebook', category: 'Stationery', quantity: 150, price: 2.99, supplier: 'StationeryWorld', date: '2024-03-10' },
            { id: 4, name: 'T-Shirt', category: 'Clothing', quantity: 5, price: 19.99, supplier: 'FashionHub', date: '2024-04-05' },
            { id: 5, name: 'Coffee Beans', category: 'Food', quantity: 0, price: 12.99, supplier: 'CoffeeSupply', date: '2024-05-12' }
        ];
        saveData();
        updateDashboard();
        renderProducts();
    }
});