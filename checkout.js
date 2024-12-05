// Get cart items from localStorage
let cart = [];
try {
    const cartData = localStorage.getItem('cart');
    if (cartData) {
        cart = JSON.parse(cartData);
        if (!Array.isArray(cart)) {
            console.error('Invalid cart data');
            cart = [];
        }
    }
} catch (e) {
    console.error('Error loading cart:', e);
    cart = [];
}

// Initialize current step
let currentStep = 1;

// Load cart items on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if cart is empty
    if (!cart || cart.length === 0) {
        alert('Your cart is empty! Redirecting to home page...');
        window.location.href = 'index.html';
        return;
    }
    console.log('Cart contents:', cart); // Add this for debugging
    displayOrderSummary();
    setupPaymentForms();
    initializeGooglePlaces();
    initializeRazorpay();

    const paymentButton = document.getElementById('paymentButton');
    if (paymentButton) {
        paymentButton.addEventListener('click', handlePayment);
    }
});

// Display order summary
function displayOrderSummary() {
    const orderItems = document.querySelector('.order-items');
    let subtotal = 0;

    orderItems.innerHTML = cart.map(item => {
        // Make sure price is a number
        const itemPrice = parseFloat(item.price);
        const itemQuantity = parseInt(item.quantity);
        const itemTotal = itemPrice * itemQuantity;
        subtotal += itemTotal;
        
        return `
            <div class="order-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.selectedSize}</p>
                    <p>Quantity: ${item.quantity}</p>
                    <p class="item-price">₹${itemTotal.toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');

    // Update totals
    document.querySelector('.subtotal .amount').textContent = `₹${subtotal.toFixed(2)}`;
    document.querySelector('.total .amount').textContent = `₹${subtotal.toFixed(2)}`;
}

// Navigation between steps
function nextStep(step) {
    if (!validateStep(currentStep)) return;
    
    // Hide current step
    document.querySelector(`#step${currentStep}`).classList.remove('active');
    document.querySelector(`.progress-step[data-step="${currentStep}"]`).classList.remove('active');
    
    // Show next step
    document.querySelector(`#step${step}`).classList.add('active');
    document.querySelector(`.progress-step[data-step="${step}"]`).classList.add('active');
    
    currentStep = step;
}

// Validate each step
function validateStep(step) {
    switch(step) {
        case 1:
            if (cart.length === 0) {
                alert('Your cart is empty!');
                return false;
            }
            return validateCustomerDetails();
        case 2:
            return true; // Payment validation will happen on place order
        default:
            return true;
    }
}

// Handle payment method selection
function setupPaymentForms() {
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    paymentOptions.forEach(option => {
        option.addEventListener('change', function() {
            document.querySelectorAll('.payment-form').forEach(form => {
                form.style.display = 'none';
            });
            if (this.checked && this.value !== 'cod') {
                document.getElementById(`${this.value}Form`).style.display = 'block';
            }
        });
    });
}

// Initialize Razorpay
function initializeRazorpay() {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    document.body.appendChild(script);
}

// Process payment
async function processPayment() {
    const totalAmount = calculateTotal();
    
    try {
        console.log('Starting payment process...');
        console.log('Total Amount:', totalAmount);

        // Create order on server
        const response = await fetch('http://localhost:3000/api/create-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: totalAmount })
        }).catch(error => {
            throw new Error('Unable to connect to server. Please check your internet connection and try again.');
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Order creation failed:', errorText);
            throw new Error(`Order creation failed: ${errorText}`);
        }
        
        const order = await response.json();
        console.log('Order created:', order);
        
        // Initialize Razorpay payment
        const options = {
            key: 'rzp_test_8qzUfq79bivjdu',
            amount: order.amount,
            currency: 'INR',
            name: 'Natuva',
            description: 'Purchase of Natural Products',
            order_id: order.id,
            handler: async function (response) {
                console.log('Payment response:', response);
                
                try {
                    // Verify payment
                    const verifyResponse = await fetch('http://localhost:3000/api/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    }).catch(error => {
                        throw new Error('Unable to verify payment. Please contact support with your order ID.');
                    });
                    
                    if (!verifyResponse.ok) {
                        throw new Error('Payment verification failed. Please contact support.');
                    }

                    const verification = await verifyResponse.json();
                    console.log('Payment verification:', verification);
                    
                    if (verification.verified) {
                        await saveOrder({
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            paymentMethod: 'razorpay',
                            status: 'completed'
                        });
                        showOrderSuccess();
                    } else {
                        throw new Error('Payment verification failed. Please try again or contact support.');
                    }
                } catch (verifyError) {
                    console.error('Payment verification error:', verifyError);
                    throw new Error('Error verifying payment: ' + verifyError.message);
                }
            },
            prefill: {
                name: document.getElementById('customerName').value,
                email: document.getElementById('customerEmail').value,
                contact: document.getElementById('customerPhone').value
            },
            theme: {
                color: '#2C3639'
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment modal closed');
                }
            }
        };
        
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response) {
            console.error('Payment failed:', response.error);
            throw new Error('Payment failed: ' + response.error.description);
        });
        
        rzp.open();
        
    } catch (error) {
        console.error('Payment process error:', error);
        throw error; // Let handlePayment handle the error display
    }
}

// Calculate total amount
function calculateTotal() {
    return cart.reduce((total, item) => {
        const price = parseFloat(item.price);
        const quantity = parseInt(item.quantity);
        if (isNaN(price) || isNaN(quantity)) {
            console.error('Invalid price or quantity:', item);
            return total;
        }
        return total + (price * quantity);
    }, 0);
}

// Save order after payment
async function saveOrder(paymentResponse) {
    const customerDetails = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        streetAddress: document.getElementById('streetAddress').value,
        locality: document.getElementById('locality').value,
        city: document.getElementById('city').value,
        state: document.getElementById('state').value,
        pincode: document.getElementById('pincode').value
    };

    try {
        const response = await fetch('http://localhost:3000/api/save-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerDetails,
                cartItems: cart,
                paymentMethod: 'razorpay',
                paymentDetails: paymentResponse
            })
        });

        const result = await response.json();
        
        if (result.success) {
            // Show success modal
            const modal = document.getElementById('orderSuccessModal');
            modal.style.display = 'block';
            
            // Clear cart
            localStorage.removeItem('cart');
            cart = [];
        } else {
            alert(result.error || 'There was an error saving your order. Please contact support.');
        }
    } catch (error) {
        console.error('Error saving order:', error);
        alert('There was an error saving your order. Please contact support.');
    }
}

// Place order
async function placeOrder() {
    if (!validateCustomerDetails()) {
        alert('Please fill in all required fields correctly');
        return;
    }

    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethod) {
        alert('Please select a payment method');
        return;
    }

    if (paymentMethod.value === 'razorpay') {
        processPayment();
    } else if (paymentMethod.value === 'cod') {
        // Handle COD order
        saveOrder({ paymentMethod: 'cod' });
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('orderSuccessModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Initialize Google Places Autocomplete
function initializeGooglePlaces() {
    const input = document.getElementById('searchAddress');
    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'IN' },
        fields: ['address_components', 'formatted_address', 'geometry']
    });

    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        fillAddressFields(place);
    });
}

// Fill address fields from Google Places result
function fillAddressFields(place) {
    // Reset all fields
    document.getElementById('streetAddress').value = '';
    document.getElementById('locality').value = '';
    document.getElementById('city').value = '';
    document.getElementById('state').value = '';
    document.getElementById('pincode').value = '';

    if (!place.address_components) return;

    // Create a mapping for the address components
    const componentForm = {
        street_number: 'short_name',
        route: 'long_name',
        sublocality_level_1: 'long_name',
        locality: 'long_name',
        administrative_area_level_1: 'long_name',
        postal_code: 'short_name'
    };

    let streetNumber = '';
    let streetName = '';

    // Fill the address fields based on address_components
    for (const component of place.address_components) {
        const addressType = component.types[0];

        if (componentForm[addressType]) {
            const val = component[componentForm[addressType]];
            
            switch(addressType) {
                case 'street_number':
                    streetNumber = val;
                    break;
                case 'route':
                    streetName = val;
                    break;
                case 'sublocality_level_1':
                    document.getElementById('locality').value = val;
                    break;
                case 'locality':
                    document.getElementById('city').value = val;
                    break;
                case 'administrative_area_level_1':
                    document.getElementById('state').value = val;
                    break;
                case 'postal_code':
                    document.getElementById('pincode').value = val;
                    break;
            }
        }
    }

    // Combine street number and name
    document.getElementById('streetAddress').value = 
        (streetNumber ? streetNumber + ' ' : '') + streetName;
}

// Validate customer details
function validateCustomerDetails() {
    const required = [
        'customerName', 
        'customerEmail', 
        'customerPhone', 
        'streetAddress', 
        'locality', 
        'city', 
        'state', 
        'pincode'
    ];

    let isValid = true;

    required.forEach(id => {
        const input = document.getElementById(id);
        const value = input.value.trim();
        
        if (!value) {
            markFieldAsError(input, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(input);
            
            // Additional validation based on field type
            switch(id) {
                case 'customerEmail':
                    if (!isValidEmail(value)) {
                        markFieldAsError(input, 'Please enter a valid email address');
                        isValid = false;
                    }
                    break;
                case 'customerPhone':
                    if (!isValidPhone(value)) {
                        markFieldAsError(input, 'Please enter a valid 10-digit phone number');
                        isValid = false;
                    }
                    break;
                case 'pincode':
                    if (!isValidPincode(value)) {
                        markFieldAsError(input, 'Please enter a valid 6-digit PIN code');
                        isValid = false;
                    }
                    break;
            }
        }
    });

    return isValid;
}

// Validation helper functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^[0-9]{10}$/.test(phone);
}

function isValidPincode(pincode) {
    return /^[0-9]{6}$/.test(pincode);
}

function markFieldAsError(input, message) {
    input.classList.add('error');
    const small = input.nextElementSibling;
    if (small && small.tagName === 'SMALL') {
        small.textContent = message;
    } else {
        const errorMessage = document.createElement('small');
        errorMessage.textContent = message;
        errorMessage.style.color = '#ff4444';
        input.parentNode.insertBefore(errorMessage, input.nextSibling);
    }
}

function clearFieldError(input) {
    input.classList.remove('error');
    const small = input.nextElementSibling;
    if (small && small.tagName === 'SMALL') {
        small.textContent = '';
    }
}

// Handle payment based on selected method
async function handlePayment() {
    try {
        // Show loader
        const button = document.getElementById('paymentButton');
        const loader = button.querySelector('.loader');
        const buttonText = button.querySelector('span');
        const errorDiv = document.getElementById('payment-error');
        
        buttonText.style.display = 'none';
        loader.style.display = 'block';
        errorDiv.style.display = 'none';
        button.disabled = true;

        // Validate form fields
        const requiredFields = [
            'customerName', 
            'customerEmail', 
            'customerPhone', 
            'streetAddress', 
            'locality', 
            'city', 
            'state', 
            'pincode'
        ];

        for (const fieldId of requiredFields) {
            const field = document.getElementById(fieldId);
            if (!field || !field.value.trim()) {
                throw new Error(`Please fill in the ${fieldId.replace(/([A-Z])/g, ' $1').toLowerCase()} field.`);
            }
        }

        const paymentMethod = document.querySelector('input[name="payment"]:checked');
        if (!paymentMethod) {
            throw new Error('Please select a payment method');
        }

        if (paymentMethod.value === 'razorpay') {
            await processPayment();
        } else if (paymentMethod.value === 'cod') {
            await saveOrder({ 
                paymentMethod: 'cod',
                status: 'pending'
            });
            showOrderSuccess();
        }
    } catch (error) {
        console.error('Payment error:', error);
        const errorDiv = document.getElementById('payment-error');
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        // Reset button state
        const button = document.getElementById('paymentButton');
        const loader = button.querySelector('.loader');
        const buttonText = button.querySelector('span');
        
        buttonText.style.display = 'block';
        loader.style.display = 'none';
        button.disabled = false;
    }
}

function showOrderSuccess() {
    // Show success modal
    const modal = document.getElementById('orderSuccessModal');
    modal.style.display = 'block';
    
    // Clear cart
    localStorage.removeItem('cart');
    cart = [];
}