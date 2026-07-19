let booksData = [];

/** Load books from REST API (MySQL). Returns [] on failure. */
async function fetchBooksFromApi() {
    try {
        const response = await fetch('http://localhost:8080/api/books');
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Failed to fetch books from backend', e);
        return [];
    }
}

/**
 * Fallback when API returns no rows: same catalog as books.xml (served as static file).
 * Shape matches /api/books so filters and cart keep working.
 */
async function fetchBooksFromBooksXml() {
    try {
        const response = await fetch('books.xml');
        if (!response.ok) return [];
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'application/xml');
        if (doc.querySelector('parsererror')) {
            console.error('books.xml parse error');
            return [];
        }
        const out = [];
        let id = 1;
        doc.querySelectorAll('book').forEach((bookEl) => {
            const t = (tag) => {
                const n = bookEl.querySelector(tag);
                return n && n.textContent != null ? n.textContent.trim() : '';
            };
            const title = t('title');
            const author = t('author');
            if (!title || !author) return;
            const priceRaw = t('price') || '0';
            const rating = parseFloat(t('rating'));
            out.push({
                id: id++,
                title,
                author,
                price: priceRaw,
                oldPrice: t('oldPrice'),
                discount: t('discount'),
                rating: Number.isFinite(rating) ? rating : 0,
                image: t('image') || 'images/placeholder.jpg',
                category: t('category') || 'Fantasy',
                bestseller: false,
                edition: t('edition') || 'Standard',
                type: t('type') || t('format') || 'Paperback',
                format: t('format') || t('type') || 'Paperback'
            });
        });
        return out;
    } catch (e) {
        console.error('books.xml fallback failed', e);
        return [];
    }
}

// Helper to generate star HTML correctly
function generateStars(rating) {
    let html = '';
    for(let i = 1; i <= 5; i++) {
        if(i <= rating) {
            html += '<i class="fa-solid fa-star"></i>';
        } else if (i - 0.5 <= rating) {
            html += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            html += '<i class="fa-regular fa-star"></i>';
        }
    }
    return html;
}

function enrichBooksData() {
    const editionsList = ["Standard", "Special", "Limited"];
    const typesList = ["Paperback", "Hardcover", "Audio"];
    booksData.forEach(book => {
        if(!book.edition) book.edition = editionsList[Math.floor(Math.random() * editionsList.length)];
        if(!book.type) book.type = typesList[Math.floor(Math.random() * typesList.length)];
        if(book.bestseller === undefined) book.bestseller = Math.random() > 0.7; // 30% chance info
    });
}

// Function to render books
const booksContainer = document.getElementById('books-container');

function applyFilters() {
    const activeTab = document.querySelector('#category-tabs .active');
    const activeCategory = activeTab ? activeTab.innerText.trim() : 'All Books';
    const searchEl = document.querySelector('#search');
    const searchQuery = searchEl ? searchEl.value.toLowerCase() : '';
    const priceRangeEl = document.querySelector('#price-range');
    const maxPrice = priceRangeEl ? parseInt(priceRangeEl.value, 10) : 1000;
    const ratingEl = document.querySelector('input[name="rating"]:checked');
    const minRating = ratingEl ? parseFloat(ratingEl.value) : 0;
    const bestsellerEl = document.querySelector('#bestseller-filter');
    const isBestsellerChecked = bestsellerEl ? bestsellerEl.checked : false;

    const checkedEditions = Array.from(document.querySelectorAll('.edition-chk:checked')).map(el => el.value);
    const checkedTypes = Array.from(document.querySelectorAll('.type-chk:checked')).map(el => el.value);

    let filteredBooks = booksData.filter(b => {
        // Category
        if (activeCategory !== 'All Books' && b.category !== activeCategory) return false;

        // Search
        if (searchQuery && !b.title.toLowerCase().includes(searchQuery) && !b.author.toLowerCase().includes(searchQuery)) return false;

        // Price handling (number vs string)
        let priceVal = 0;
        if (typeof b.price === 'number') {
            priceVal = b.price;
        } else {
            priceVal = parseInt(String(b.price || '').replace(/[^0-9]/g, ''), 10);
        }
        if (!Number.isFinite(priceVal)) priceVal = 0;
        if (priceVal > maxPrice) return false;

        // Rating
        const r = typeof b.rating === 'number' ? b.rating : parseFloat(b.rating);
        const ratingVal = Number.isFinite(r) ? r : 0;
        if (ratingVal < minRating) return false;
        
        // Bestseller
        if (isBestsellerChecked && !b.bestseller) return false;

        // Editions
        if (checkedEditions.length > 0 && !checkedEditions.includes(b.edition)) return false;

        // Types (API may use type or format)
        const fmt = b.type || b.format;
        if (checkedTypes.length > 0 && !checkedTypes.includes(fmt)) return false;
        
        return true;
    });

    renderBooksArray(filteredBooks);
    renderSearchDropdown(filteredBooks, searchQuery);
}

function renderBooksArray(books) {
    if (!booksContainer) return;
    booksContainer.innerHTML = '';

    if (books.length === 0) {
        booksContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; font-size: 18px; margin-top: 40px;">No magic found with these filters. Try adjusting them!</p>';
        return;
    }

    books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.style.animation = 'fadeIn 0.5s ease-out forwards';
        
        let discountHtml = book.discount ? `<span class="badge discount">${book.discount}</span>` : '';
        let oldPriceHtml = book.oldPrice ? `<span class="old-price">${book.oldPrice}</span>` : '';
        let bestsellerBadge = book.bestseller ? '<span class="badge" style="background:#f59e0b; left: auto; right: 25px;">Bestseller</span>' : '';
        
        card.innerHTML = `
            ${discountHtml}
            ${bestsellerBadge}
            <img src="${book.image}" alt="${book.title}">
            <div class="card-content">
                <h3>${book.title}</h3>
                <p class="author">${book.author}</p>
                <p class="price">${typeof book.price === 'number' ? '₹' + book.price : book.price} ${oldPriceHtml}</p>
                <div class="rating">
                    ${generateStars(typeof book.rating === 'number' ? book.rating : parseFloat(book.rating) || 0)}
                </div>
                <div class="card-actions">
                    <button class="add-to-cart-btn" data-title="${book.title}"><i class="fa-solid fa-cart-plus"></i> Add to Cart</button>
                    <i class="fa-regular fa-heart wishlist-icon"></i>
                </div>
            </div>
        `;
        booksContainer.appendChild(card);
    });
}

function renderSearchDropdown(books, query) {
    const dropdown = document.getElementById('search-dropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    
    if (!query || query.trim() === '') {
        dropdown.classList.add('hidden');
        return;
    }

    if (books.length === 0) {
        dropdown.innerHTML = '<div style="padding: 15px; color: #94a3b8; font-size: 13px; text-align: center;">No books found.</div>';
    } else {
        // limit to top 5 results
        books.slice(0, 5).forEach(book => {
            const item = document.createElement('div');
            item.className = 'search-dropdown-item';
            item.innerHTML = `
                <img src="${book.image}" alt="">
                <div>
                    <span class="search-dropdown-title">${book.title}</span>
                    <span class="search-dropdown-author">${book.author}</span>
                </div>
            `;
            // Click to auto-complete and filter
            item.addEventListener('click', () => {
                document.getElementById('search').value = book.title;
                dropdown.classList.add('hidden');
                applyFilters();
            });
            dropdown.appendChild(item);
        });
    }

    dropdown.classList.remove('hidden');
}

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('search-dropdown');
    const searchInput = document.getElementById('search');
    if (dropdown && searchInput && !dropdown.contains(e.target) && e.target !== searchInput) {
        dropdown.classList.add('hidden');
    }
});

// Bind Filter Controls
const searchInput = document.querySelector("#search");
if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
}

const priceRange = document.querySelector('#price-range');
const priceDisplay = document.querySelector('#price-display');
if(priceRange) {
    priceRange.addEventListener('input', (e) => {
        priceDisplay.innerText = `₹${e.target.value}`;
        applyFilters();
    });
}

document.querySelectorAll('input[name="rating"], #bestseller-filter, .edition-chk, .type-chk').forEach(input => {
    input.addEventListener('change', applyFilters);
});

// Category Tabs Active State & Filter
document.querySelectorAll("#category-tabs button").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelector("#category-tabs button.active")?.classList.remove("active");
        tab.classList.add("active");
        applyFilters();
    });
});

function selectCategory(categoryName) {
    document.querySelectorAll("#category-tabs button").forEach(tab => {
        if(tab.innerText.trim() === categoryName) {
            tab.click();
        }
    });
}

// Using event delegation for cart and wishlist since buttons are dynamic
let cartData = JSON.parse(localStorage.getItem('taleVerseCart')) || [];
const cartCountElement = document.querySelector("#cart-count");
if(cartCountElement) {
    cartCountElement.innerText = cartData.length;
}
let wishlistCount = 0;
const wishlistCountElement = document.querySelector("#wishlist-count");

document.body.addEventListener('click', function(e) {
    // Handle Add to cart
    if(e.target.closest('.add-to-cart-btn')) {
        const btn = e.target.closest('.add-to-cart-btn');
        const title = btn.getAttribute('data-title');
        
        let cartData = JSON.parse(localStorage.getItem('taleVerseCart')) || [];
        const bookToAdd = booksData.find(b => b.title === title);
        
        if (bookToAdd) {
            cartData.push(bookToAdd);
            localStorage.setItem('taleVerseCart', JSON.stringify(cartData));
            if (cartCountElement) cartCountElement.innerText = cartData.length;
        }
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
        btn.style.background = '#10b981';
        btn.style.borderColor = '#10b981';
        btn.style.color = 'white';
        
        if (cartCountElement) {
            cartCountElement.style.transform = 'scale(1.5)';
            setTimeout(() => { cartCountElement.style.transform = 'scale(1)'; }, 200);
        }

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }
    
    // Handle wishlist
    if(e.target.classList.contains('wishlist-icon')) {
        const iconElement = e.target;
        iconElement.classList.toggle("active");
        
        if (iconElement.classList.contains('active')) {
            iconElement.classList.remove('fa-regular');
            iconElement.classList.add('fa-solid');
            wishlistCount++;
        } else {
            iconElement.classList.remove('fa-solid');
            iconElement.classList.add('fa-regular');
            wishlistCount--;
        }

        if (wishlistCountElement) {
            wishlistCountElement.innerText = wishlistCount;
            wishlistCountElement.style.transform = 'scale(1.5)';
            setTimeout(() => { wishlistCountElement.style.transform = 'scale(1)'; }, 200);
        }
    }
});

window.addEventListener('taleverse-books-changed', async () => {
    booksData = await fetchBooksFromApi();
    if (booksData.length === 0) {
        booksData = await fetchBooksFromBooksXml();
    }
    enrichBooksData();
    applyFilters();
});

// Light/Dark Theme Toggle
function toggleTheme() {
    document.body.classList.toggle("light-mode");
    const themeIcon = document.getElementById("theme-icon");
    
    if (document.body.classList.contains("light-mode")) {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
        themeIcon.style.color = "#f59e0b";
    } else {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
        themeIcon.style.color = "";
    }
}

// Global window load logic
window.addEventListener('load', async () => {
    // Check Auth Session (must not throw — otherwise books never load)
    let session = null;
    try {
        const raw = localStorage.getItem('taleVerseSession');
        session = raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn('Ignoring invalid taleVerseSession in localStorage');
        localStorage.removeItem('taleVerseSession');
    }
    const authLink = document.getElementById('auth-link');
    const authIcon = document.getElementById('auth-icon');
    const userGreeting = document.getElementById('user-greeting');

    if (session && authLink && userGreeting && authIcon) {
        authIcon.classList.remove('fa-regular', 'fa-user');
        authIcon.classList.add('fa-solid', 'fa-user-check');
        authIcon.style.color = '#10b981';
        
        let firstName = session.name.split(' ')[0];
        userGreeting.innerText = `Hi, ${firstName}`;
        
        authLink.href = '#';
        authLink.title = 'Click to Logout';
        
        authLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const ok = await TVModal.confirm(
                'Are you sure you want to end your magical session and logout?',
                'Logout of TaleVerse?',
                { confirmLabel: 'Yes, Logout', cancelLabel: 'Stay', confirmCls: 'tv-modal-btn-violet', icon: '🔮' }
            );
            if (ok) {
                localStorage.removeItem('taleVerseSession');
                window.location.reload();
            }
        });
    }

    booksData = await fetchBooksFromApi();
    if (booksData.length === 0) {
        booksData = await fetchBooksFromBooksXml();
        if (booksData.length > 0) {
            console.warn('Using books.xml on homepage (API returned no books or server unreachable).');
        }
    } else {
        console.log('Fetched books from API:', booksData.length);
    }

    enrichBooksData();
    applyFilters();
    
    // Loader
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => { document.getElementById('loader').style.display = 'none'; }, 500);
    }, 800);
});
