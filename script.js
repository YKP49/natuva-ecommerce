// Product data
const products = [
    {
        id: 1,
        name: 'Desi Ghee',
        image: 'https://tulasipickles.com/wp-content/uploads/2023/03/desi-cow-ghee.jpg',
        prices: {
            '500ml': 499,
            '1L': 899,
            '3L': 2499,
            '5L': 3999
        }
    },
    {
        id: 2,
        name: 'Groundnut Oil',
        image: 'https://www.thespruceeats.com/thmb/Dw_Rp19b-GQFhAjrAaDZNtAp5-0=/2081x1441/filters:fill(auto,1)/GettyImages-911699190-5af06e1fa474be0036590249.jpg',
        prices: {
            '500ml': 299,
            '1L': 549,
            '3L': 1499,
            '5L': 2399
        }
    },
    {
        id: 3,
        name: 'Sunflower Oil',
        image: 'https://vijayimpex.co.in/wp-content/uploads/2021/05/PID-140270_190518-SunflowerSeedOil-1VI.jpg',
        prices: {
            '500ml': 249,
            '1L': 449,
            '3L': 1299,
            '5L': 1999
        }
    },
    {
        id: 4,
        name: 'Coconut Oil',
        image: 'https://www.ishtaorganics.in/cdn/shop/files/Fireflycoconutoilin2bottlesonein500mlanotherin1lwithacoconutinsideandwhiebackgrou.jpg?v=1712694482',
        prices: {
            '500ml': 399,
            '1L': 749,
            '3L': 1999,
            '5L': 3299
        }
    },
    {
        id: 5,
        name: 'Mustard Oil',
        image: 'https://cdn.shopify.com/s/files/1/0065/1087/0583/files/Mustard_Oil_-_Ayurvedic_Wisdom.jpg?v=1716145664',
        prices: {
            '500ml': 279,
            '1L': 499,
            '3L': 1399,
            '5L': 2199
        }
    }
];

let cart = [];

try {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
} catch (e) {
    console.error('Error loading cart:', e);
    cart = [];
}

// Initialize the website
document.addEventListener('DOMContentLoaded', () => {
    displayProducts();
    updateCartCount();
});
// Display products in the grid
function displayProducts() {
    const productsGrid = document.querySelector('.products-grid');
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <select class="quantity-selector" onchange="updatePrice(this, ${product.id})">
                    <option value="500ml">500ml</option>
                    <option value="1L">1 Liter</option>
                    <option value="3L">3 Liters</option>
                    <option value="5L">5 Liters</option>
                </select>
                <p class="product-price">₹${product.prices['500ml']}</p>
                <div class="product-buttons">
                    <button class="buy-now-btn" onclick="buyNow(${product.id})">Buy Now</button>
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id})">Add to Cart</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Update price based on quantity selection
function updatePrice(select, productId) {
    const product = products.find(p => p.id === productId);
    const price = product.prices[select.value];
    select.parentElement.querySelector('.product-price').textContent = `₹${price}`;
}
// Add to cart functionality
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const quantitySelect = document.querySelector(`.product-card:nth-child(${productId}) .quantity-selector`);
    const selectedQuantity = quantitySelect.value;
    const price = product.prices[selectedQuantity];
    
    const cartItem = {
        id: productId,
        name: product.name,
        quantity: 1,  // Set quantity to 1 by default
        price: price, // This will be a number now
        selectedSize: selectedQuantity,  // Store the selected size (500ml, 1L, etc.)
        image: product.image
    };
    
    cart.push(cartItem);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    updateCartCount();
    showAddToCartModal();
}


// Update cart count
function updateCartCount() {
    const cartCount = document.querySelector('.cart-count');
    cartCount.textContent = cart.length;
    updateCartDisplay();
}

// Toggle cart overlay
function toggleCart() {
    const cartOverlay = document.getElementById('cartOverlay');
    cartOverlay.classList.toggle('active');
    updateCartDisplay();
}

// Update cart display
function updateCartDisplay() {
    const cartItems = document.querySelector('.cart-items');
    const checkoutBtn = document.querySelector('.checkout-btn');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Your cart is empty. Shop our amazing products!</p>';
        document.getElementById('cartTotal').textContent = '₹0.00';
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
        return;
    }

    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = '1';
    checkoutBtn.style.cursor = 'pointer';

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.quantity}</p>
                <p>₹${item.price}</p>
                <div class="cart-item-quantity">
                    <button onclick="updateCartItemQuantity(${index}, 'decrease')">-</button>
                    <span>1</span>
                    <button onclick="updateCartItemQuantity(${index}, 'increase')">+</button>
                    <button onclick="removeFromCart(${index})">Remove</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;
}

// Remove item from cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
}

// Update cart item quantity
function updateCartItemQuantity(index, action) {
    const item = cart[index];
    const product = products.find(p => p.id === item.id);
    const quantities = Object.keys(product.prices);
    const currentIndex = quantities.indexOf(item.quantity);
    
    if (action === 'increase' && currentIndex < quantities.length - 1) {
        item.quantity = quantities[currentIndex + 1];
        item.price = product.prices[item.quantity];
    } else if (action === 'decrease' && currentIndex > 0) {
        item.quantity = quantities[currentIndex - 1];
        item.price = product.prices[item.quantity];
    }
    
    updateCartDisplay();
}

// Show add to cart modal
function showAddToCartModal() {
    const modal = document.getElementById('addToCartModal');
    modal.style.display = 'block';
}

// View cart
function viewCart() {
    const modal = document.getElementById('addToCartModal');
    modal.style.display = 'none';
    toggleCart();
}

// Continue shopping
function continueShopping() {
    const modal = document.getElementById('addToCartModal');
    modal.style.display = 'none';
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    // Save cart to localStorage before redirecting
    localStorage.setItem('cart', JSON.stringify(cart));
    // Redirect to checkout page
    window.location.href = 'checkout.html';
}
// Buy now functionality
function buyNow(productId) {
    // First add to cart
    addToCart(productId);
    
    // Then redirect to checkout
    setTimeout(() => {
        window.location.href = 'checkout.html';
    }, 100); // Small delay to ensure cart is saved
}