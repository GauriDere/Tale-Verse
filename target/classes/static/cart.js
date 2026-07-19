// cart.js

const cartItemsContainer = document.getElementById('cart-items-container');
const cartCountElement   = document.getElementById('cart-count');
const subtotalElement    = document.getElementById('cart-subtotal');
const taxElement         = document.getElementById('cart-tax');
const totalElement       = document.getElementById('cart-total');
const checkoutBtn        = document.getElementById('checkout-btn');
const loginNotice        = document.getElementById('login-required-notice');

// ── Session check ────────────────────────────────────────────
let userSession = null;
try {
    const raw = localStorage.getItem('taleVerseSession');
    userSession = raw ? JSON.parse(raw) : null;
} catch (e) {
    localStorage.removeItem('taleVerseSession');
}

// ── Update navbar user icon ──────────────────────────────────
const cartAuthIcon  = document.getElementById('cart-auth-icon');
const cartUserName  = document.getElementById('cart-user-name');
const cartUserIcon  = document.getElementById('cart-user-icon');

if (userSession && cartAuthIcon) {
    cartAuthIcon.classList.remove('fa-regular', 'fa-user');
    cartAuthIcon.classList.add('fa-solid', 'fa-user-check');
    cartAuthIcon.style.color = '#10b981';
    if (cartUserName) {
        cartUserName.innerText = `Hi, ${userSession.name.split(' ')[0]}`;
        cartUserName.style.color = '#10b981';
    }
    if (cartUserIcon) cartUserIcon.title = `Logged in as ${userSession.name}`;
} else {
    if (cartUserIcon) cartUserIcon.title = 'Not logged in — sign in to pay';
}

// ── Apply checkout button state based on login ──────────────
function applyCheckoutState() {
    if (!userSession) {
        // Locked state — visually dimmed with lock icon
        checkoutBtn.innerHTML = '<i class="fa-solid fa-lock" style="margin-right:8px;"></i>Sign In to Pay';
        checkoutBtn.style.opacity        = '0.55';
        checkoutBtn.style.cursor         = 'not-allowed';
        checkoutBtn.style.filter         = 'grayscale(0.3)';
        checkoutBtn.style.background     = 'linear-gradient(45deg,#64748b,#475569)';
        checkoutBtn.style.boxShadow      = 'none';
        if (loginNotice) loginNotice.classList.remove('hidden');
    } else {
        // Unlocked — normal gold CTA
        checkoutBtn.innerHTML = 'Proceed to Payment';
        checkoutBtn.style.opacity    = '1';
        checkoutBtn.style.cursor     = 'pointer';
        checkoutBtn.style.filter     = '';
        checkoutBtn.style.background = '';
        checkoutBtn.style.boxShadow  = '';
        if (loginNotice) loginNotice.classList.add('hidden');
    }
}

// ── Render cart items ────────────────────────────────────────
function renderCart() {
    let cartData = JSON.parse(localStorage.getItem('taleVerseCart')) || [];

    if (cartCountElement) cartCountElement.innerText = cartData.length;
    cartItemsContainer.innerHTML = '';

    if (cartData.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your magical cart is empty. <br><a href="user.html" style="color: #c084fc; text-decoration: underline;">Return to the library</a></p>';
        updateTotals(0);
        applyCheckoutState();
        return;
    }

    let subtotal = 0;
    cartData.forEach((book, index) => {
        let priceVal = 0;
        if (typeof book.price === 'number') {
            priceVal = book.price;
        } else {
            priceVal = parseInt(String(book.price || '').replace(/[^0-9]/g, ''), 10);
        }
        if (!isNaN(priceVal)) subtotal += priceVal;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item book-card';
        cartItem.style.animation     = 'fadeIn 0.5s ease-out forwards';
        cartItem.style.flexDirection = 'row';
        cartItem.style.alignItems    = 'center';
        cartItem.style.gap           = '20px';
        cartItem.style.marginBottom  = '15px';

        cartItem.innerHTML = `
            <img src="${book.image}" alt="${book.title}" style="width:80px;height:120px;object-fit:cover;border-radius:8px;margin-bottom:0;">
            <div class="cart-item-details" style="flex:1;">
                <h3 style="margin-bottom:5px;font-size:18px;">${book.title}</h3>
                <p class="author">${book.author}</p>
                <p class="price" style="margin-top:10px;">${typeof book.price === 'number' ? '₹' + book.price : book.price}</p>
            </div>
            <button class="remove-btn" data-index="${index}"
              style="background:transparent;color:#ef4444;border:1px solid #ef4444;padding:8px 15px;border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;font-weight:500;transition:all 0.3s;">
              <i class="fa-solid fa-trash"></i> Remove
            </button>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    updateTotals(subtotal);
    applyCheckoutState();
}

function updateTotals(subtotal) {
    const tax   = Math.round(subtotal * 0.05);
    const total = subtotal + tax;
    subtotalElement.innerText = `₹${subtotal}`;
    taxElement.innerText      = `₹${tax}`;
    totalElement.innerText    = `₹${total}`;
}

// ── Remove item ──────────────────────────────────────────────
cartItemsContainer.addEventListener('click', function(e) {
    if (e.target.closest('.remove-btn')) {
        const btn   = e.target.closest('.remove-btn');
        const index = parseInt(btn.getAttribute('data-index'));
        let cartData = JSON.parse(localStorage.getItem('taleVerseCart')) || [];
        cartData.splice(index, 1);
        localStorage.setItem('taleVerseCart', JSON.stringify(cartData));
        renderCart();
    }
});

// ── Checkout ─────────────────────────────────────────────────
checkoutBtn.addEventListener('click', async () => {
    // 1. Not logged in — prompt to sign in
    if (!userSession) {
        const go = await TVModal.confirm(
            'You need to sign in to your TaleVerse account before completing a purchase.',
            '🔒 Login Required',
            {
                confirmLabel: 'Sign In Now',
                cancelLabel:  'Continue Browsing',
                confirmCls:   'tv-modal-btn-violet',
                icon:         '📖'
            }
        );
        if (go) window.location.href = 'registration.html';
        return;
    }

    // 2. Cart empty
    let cartData = JSON.parse(localStorage.getItem('taleVerseCart')) || [];
    if (cartData.length === 0) {
        showPopup('emptyCartPopup');
        return;
    }

    // 3. Proceed — clear cart, show success
    localStorage.removeItem('taleVerseCart');
    renderCart();
    showPopup('paymentPopup');
});

// ── Theme toggle ─────────────────────────────────────────────
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const themeIcon = document.getElementById('theme-icon');
    if (document.body.classList.contains('light-mode')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        themeIcon.style.color = '#f59e0b';
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        themeIcon.style.color = '';
    }
}

// ── Popup helpers ────────────────────────────────────────────
function showPopup(id) {
    document.getElementById(id).classList.remove('hidden');
}
function closePopup(id) {
    document.getElementById(id).classList.add('hidden');
}

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('load', renderCart);

