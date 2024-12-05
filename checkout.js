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
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
    // Check if cart is empty
    if (!cart || cart.length === 0) {
        alert('Your cart is empty! Redirecting to home page...');
        window.location.href = 'index.html';
        return;
    }
    console.log('Cart contents:', cart); // Add this for debugging
    setupPaymentForms();
    displayOrderSummary();
    
    // Debug: Check initial state
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    console.log('Initial step1 visibility:', step1 ? step1.style.display : 'step1 not found');
    console.log('Initial step2 visibility:', step2 ? step2.style.display : 'step2 not found');

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
    console.log('nextStep called with step:', step);
    
    if (!validateStep(currentStep)) {
        console.error('Step validation failed for step:', currentStep);
        return;
    }
    
    const currentStepElement = document.getElementById(`step${currentStep}`);
    const nextStepElement = document.getElementById(`step${step}`);
    
    console.log('Current step element:', currentStepElement);
    console.log('Next step element:', nextStepElement);
    
    if (!currentStepElement || !nextStepElement) {
        console.error('Step elements not found:', { 
            currentStep: currentStep, 
            nextStep: step,
            currentElement: currentStepElement,
            nextElement: nextStepElement
        });
        return;
    }
    
    // Hide current step
    currentStepElement.style.display = 'none';
    currentStepElement.classList.remove('active');
    
    // Show next step
    nextStepElement.style.display = 'block';
    nextStepElement.classList.add('active');
    
    // Update progress indicators
    const currentProgress = document.querySelector(`.progress-step[data-step="${currentStep}"]`);
    const nextProgress = document.querySelector(`.progress-step[data-step="${step}"]`);
    
    if (currentProgress) currentProgress.classList.remove('active');
    if (nextProgress) nextProgress.classList.add('active');
    
    console.log('Step transition complete:', {
        from: currentStep,
        to: step,
        currentStepDisplay: currentStepElement.style.display,
        nextStepDisplay: nextStepElement.style.display
    });
    
    currentStep = step;
}

// Validate each step
function validateStep(step) {
    console.log('Validating step:', step);
    
    switch(step) {
        case 1:
            if (cart.length === 0) {
                console.error('Cart is empty');
                alert('Your cart is empty!');
                return false;
            }
            const isValid = validateCustomerDetails();
            console.log('Customer details validation:', isValid);
            return isValid;
        case 2:
            console.log('Step 2 validation: always true');
            return true; // Payment validation will happen on place order
        default:
            console.log('Unknown step:', step);
            return true;
    }
}

// Validate customer details
function validateCustomerDetails() {
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const phone = document.getElementById('customerPhone').value;
    const street = document.getElementById('streetAddress').value;
    const locality = document.getElementById('locality').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    const pincode = document.getElementById('pincode').value;

    // Clear previous errors
    clearFieldError(document.getElementById('customerName'));
    clearFieldError(document.getElementById('customerEmail'));
    clearFieldError(document.getElementById('customerPhone'));
    clearFieldError(document.getElementById('streetAddress'));
    clearFieldError(document.getElementById('locality'));
    clearFieldError(document.getElementById('city'));
    clearFieldError(document.getElementById('state'));
    clearFieldError(document.getElementById('pincode'));

    let isValid = true;

    if (!name.trim()) {
        markFieldAsError(document.getElementById('customerName'), 'Name is required');
        isValid = false;
    }

    if (!email.trim() || !isValidEmail(email)) {
        markFieldAsError(document.getElementById('customerEmail'), 'Valid email is required');
        isValid = false;
    }

    if (!phone.trim() || !isValidPhone(phone)) {
        markFieldAsError(document.getElementById('customerPhone'), 'Valid 10-digit phone number is required');
        isValid = false;
    }

    if (!street.trim()) {
        markFieldAsError(document.getElementById('streetAddress'), 'Street address is required');
        isValid = false;
    }

    if (!locality.trim()) {
        markFieldAsError(document.getElementById('locality'), 'Locality is required');
        isValid = false;
    }

    if (!city.trim()) {
        markFieldAsError(document.getElementById('city'), 'City is required');
        isValid = false;
    }

    if (!state.trim()) {
        markFieldAsError(document.getElementById('state'), 'State is required');
        isValid = false;
    }

    if (!pincode.trim() || !isValidPincode(pincode)) {
        markFieldAsError(document.getElementById('pincode'), 'Valid 6-digit pincode is required');
        isValid = false;
    }

    return isValid;
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