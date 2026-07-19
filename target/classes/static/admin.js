document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('admin-login-container');
    const dashboardContainer = document.getElementById('admin-dashboard');
    const loginForm = document.getElementById('admin-login-form');

    const adminSession = sessionStorage.getItem('adminSession');
    if (adminSession) {
        showDashboard();
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('login-msg');
        msg.textContent = "Authenticating...";

        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch('http://localhost:8080/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                sessionStorage.setItem('adminSession', JSON.stringify(data));
                window.location.href = "admin_database.html";
            } else {
                msg.textContent = data.error || "Authentication failed.";
            }
        } catch (err) {
            msg.textContent = "Server error. Could not connect.";
        }
    });

    document.getElementById('admin-logout').addEventListener('click', () => {
        sessionStorage.removeItem('adminSession');
        window.location.href = 'registration.html';
    });

    function showDashboard() {
        loginContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        fetchBooks();
    }

    async function fetchBooks() {
        try {
            const res = await fetch('http://localhost:8080/api/books');
            if (res.ok) {
                const books = await res.json();
                renderTable(books);
            }
        } catch (e) {
            console.error("Failed to fetch books", e);
        }
    }

    function formatLabel(book) {
        return book.format || book.type || '—';
    }

    function renderTable(books) {
        const tbody = document.getElementById('books-table-body');
        tbody.innerHTML = '';

        books.forEach(book => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${book.id || '?'}</td>
                <td><img src="${book.image || ''}" alt="" style="width:50px; border-radius:4px; border:1px solid #7c3aed;"></td>
                <td>
                    <strong style="color:white;">${escapeHtml(book.title)}</strong><br>
                    <small style="color:#94a3b8;">${escapeHtml(book.author)}</small>
                </td>
                <td>${escapeHtml(book.category || '')}</td>
                <td>${escapeHtml(book.price || '')}</td>
                <td>${book.rating != null ? book.rating : '—'}</td>
                <td>${escapeHtml(book.edition || '—')}</td>
                <td>${escapeHtml(formatLabel(book))}</td>
                <td>
                    <button type="button" class="admin-btn small" data-edit-id="${book.id}">Edit</button>
                    <button type="button" class="admin-btn small danger" data-delete-id="${book.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
            btn.addEventListener('click', () => editBook(parseInt(btn.getAttribute('data-edit-id'), 10)));
        });
        tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
            btn.addEventListener('click', () => deleteBook(parseInt(btn.getAttribute('data-delete-id'), 10)));
        });
    }

    function escapeHtml(s) {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    const modal = document.getElementById('book-modal');
    const closeBtn = document.querySelector('.close-modal');
    const bookForm = document.getElementById('book-form');
    let currentMode = 'add';

    document.getElementById('btn-add-product').addEventListener('click', () => {
        openModal('add');
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    function setFormatSelect(value) {
        const sel = document.getElementById('book-format');
        const v = value || 'Paperback';
        let found = false;
        for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === v) {
                sel.selectedIndex = i;
                found = true;
                break;
            }
        }
        if (!found) {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            sel.appendChild(opt);
            sel.value = v;
        }
    }

    window.openModal = function(mode, book) {
        currentMode = mode;
        const titleLabel = document.getElementById('modal-title');
        const submitBtn = document.getElementById('modal-submit-btn');
        document.getElementById('modal-msg').textContent = '';

        bookForm.reset();

        if (mode === 'add') {
            titleLabel.textContent = "Add New Grimoire";
            submitBtn.textContent = "Create Product";
            document.getElementById('book-id').value = '';
            document.getElementById('book-image').value = 'images/placeholder.jpg';
            document.getElementById('book-old-price').value = '';
            document.getElementById('book-discount').value = '';
            document.getElementById('book-rating').value = '4.5';
            document.getElementById('book-edition').value = 'Standard';
            document.getElementById('book-bestseller').checked = false;
            setFormatSelect('Paperback');
        } else if (mode === 'edit' && book) {
            titleLabel.textContent = "Edit Grimoire (#" + book.id + ")";
            submitBtn.textContent = "Save Changes";
            document.getElementById('book-id').value = book.id;
            document.getElementById('book-title').value = book.title || '';
            document.getElementById('book-author').value = book.author || '';
            document.getElementById('book-price').value = book.price || '';
            document.getElementById('book-category').value = book.category || 'Fantasy';
            document.getElementById('book-image').value = book.image || 'images/placeholder.jpg';
            document.getElementById('book-old-price').value = book.oldPrice || '';
            document.getElementById('book-discount').value = book.discount || '';
            document.getElementById('book-rating').value = book.rating != null ? book.rating : 4.5;
            document.getElementById('book-edition').value = book.edition || 'Standard';
            document.getElementById('book-bestseller').checked = !!book.bestseller;
            setFormatSelect(book.format || book.type || 'Paperback');
        }
        modal.style.display = 'flex';
    };

    window.editBook = async function(id) {
        try {
            const res = await fetch('http://localhost:8080/api/books?id=' + encodeURIComponent(id));
            const data = await res.json();
            if (!res.ok) {
                await TVModal.error(data.error || 'Could not load book data from the server.', 'Failed to Load Book');
                return;
            }
            openModal('edit', data);
        } catch (e) {
            await TVModal.error('Could not connect to the TaleVerse server. Please check that it is running.', 'Server Not Responding');
        }
    };

    bookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('modal-msg');
        msg.style.color = 'white';
        msg.textContent = "Processing...";

        const payload = {
            id: document.getElementById('book-id').value,
            title: document.getElementById('book-title').value,
            author: document.getElementById('book-author').value,
            price: document.getElementById('book-price').value,
            category: document.getElementById('book-category').value,
            image: document.getElementById('book-image').value,
            oldPrice: document.getElementById('book-old-price').value,
            discount: document.getElementById('book-discount').value,
            rating: parseFloat(document.getElementById('book-rating').value) || 0,
            edition: document.getElementById('book-edition').value,
            format: document.getElementById('book-format').value,
            bestseller: document.getElementById('book-bestseller').checked
        };

        const fetchMethod = currentMode === 'add' ? 'POST' : 'PUT';

        try {
            const res = await fetch('http://localhost:8080/api/books', {
                method: fetchMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok && data.success) {
                modal.style.display = 'none';
                fetchBooks();
            } else {
                msg.style.color = '#ef4444';
                msg.textContent = data.error || "Failed operation.";
            }
        } catch (err) {
            msg.style.color = '#ef4444';
            msg.textContent = "Server error occurred.";
        }
    });

    window.deleteBook = async function(id) {
        const ok = await TVModal.confirm(
            'This grimoire will be permanently banished from TaleVerse. This action cannot be undone!',
            'Banish This Book?',
            { confirmLabel: 'Yes, Banish It! 🔥', cancelLabel: 'Keep It', confirmCls: 'tv-modal-btn-danger', icon: '🗑️' }
        );
        if (!ok) return;

        try {
            const res = await fetch('http://localhost:8080/api/books?id=' + encodeURIComponent(id), { method: 'DELETE' });
            if (res.ok) {
                fetchBooks();
            } else {
                await TVModal.error('The book could not be deleted. Please try again.', 'Delete Failed');
            }
        } catch (err) {
            await TVModal.error('Could not reach the TaleVerse server. Please ensure it is running.', 'Server Not Responding');
        }
    };
});
