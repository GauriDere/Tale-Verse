/**
 * Navbar "database" icon — opens MySQL-backed books CRUD (taleversedatabase.books via /api/books).
 */
(function () {
    const overlay = document.getElementById('db-catalog-overlay');
    const trigger = document.getElementById('db-catalog-trigger');
    const closeBtn = document.getElementById('db-catalog-close');
    const tbody = document.getElementById('db-catalog-tbody');
    const msgEl = document.getElementById('db-catalog-msg');
    const countEl = document.getElementById('db-record-count');
    const refreshBtn = document.getElementById('db-catalog-refresh');
    const addBtn = document.getElementById('db-catalog-add');
    const formWrap = document.getElementById('db-catalog-form-wrap');
    const form = document.getElementById('db-catalog-form');
    const formTitle = document.getElementById('db-form-title');
    const cancelFormBtn = document.getElementById('db-form-cancel');

    if (!overlay || !trigger) return;

    let formMode = 'add';

    function esc(s) {
        if (s == null || s === '') return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function setMsg(text, isError) {
        msgEl.textContent = text || '';
        msgEl.classList.toggle('db-catalog-msg--error', !!isError);
    }

    function openOverlay() {
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        loadTable();
    }

    function closeOverlay() {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        formWrap.classList.add('hidden');
        setMsg('');
    }

    async function loadTable() {
        setMsg('Loading…');
        tbody.innerHTML = '';
        try {
            const res = await fetch('http://localhost:8080/api/books');
            const data = await res.json();
            if (!res.ok) {
                setMsg(data.error || 'Could not load books.', true);
                return;
            }
            if (!Array.isArray(data)) {
                setMsg('Unexpected response.', true);
                return;
            }
            if (countEl) countEl.textContent = String(data.length);
            setMsg(data.length ? '' : 'No rows yet. Add a book.');
            data.forEach(book => {
                const tr = document.createElement('tr');
                const fmt = book.format || book.type || '—';
                tr.innerHTML = `
                    <td>#${book.id}</td>
                    <td><img class="db-cat-thumb" src="${esc(book.image)}" alt=""></td>
                    <td><strong>${esc(book.title)}</strong><br><span class="db-cat-muted">${esc(book.author)}</span></td>
                    <td>${esc(book.category)}</td>
                    <td>${esc(book.price)}</td>
                    <td>${book.rating != null ? esc(String(book.rating)) : '—'}</td>
                    <td>${esc(book.edition)}</td>
                    <td>${esc(fmt)}</td>
                    <td class="db-cat-actions">
                        <button type="button" class="db-catalog-btn db-catalog-btn-sm" data-edit="${book.id}">Edit</button>
                        <button type="button" class="db-catalog-btn db-catalog-btn-sm db-catalog-btn-danger" data-del="${book.id}">Delete</button>
                    </td>`;
                tbody.appendChild(tr);
            });
            tbody.querySelectorAll('[data-edit]').forEach(btn => {
                btn.addEventListener('click', () => startEdit(parseInt(btn.getAttribute('data-edit'), 10)));
            });
            tbody.querySelectorAll('[data-del]').forEach(btn => {
                btn.addEventListener('click', () => removeRow(parseInt(btn.getAttribute('data-del'), 10)));
            });
        } catch (e) {
            setMsg('Network error — is the TaleVerse server running?', true);
        }
    }

    function showForm(mode) {
        formMode = mode;
        formWrap.classList.remove('hidden');
        formTitle.textContent = mode === 'add' ? 'Add book' : 'Edit book';
        form.reset();
        document.getElementById('db-book-id').value = '';
        document.getElementById('db-book-image').value = 'images/placeholder.jpg';
        document.getElementById('db-book-rating').value = '4.5';
        document.getElementById('db-book-edition').value = 'Standard';
        document.getElementById('db-book-bestseller').checked = false;
        setFormatSelect('Paperback');
    }

    function setFormatSelect(value) {
        const sel = document.getElementById('db-book-format');
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

    async function startEdit(id) {
        try {
            const res = await fetch('http://localhost:8080/api/books?id=' + encodeURIComponent(id));
            const book = await res.json();
            if (!res.ok) {
                setMsg(book.error || 'Load failed', true);
                return;
            }
            formMode = 'edit';
            formWrap.classList.remove('hidden');
            formTitle.textContent = 'Edit book #' + book.id;
            document.getElementById('db-book-id').value = book.id;
            document.getElementById('db-book-title').value = book.title || '';
            document.getElementById('db-book-author').value = book.author || '';
            document.getElementById('db-book-price').value = book.price || '';
            document.getElementById('db-book-category').value = book.category || 'Fantasy';
            document.getElementById('db-book-image').value = book.image || '';
            document.getElementById('db-book-oldprice').value = book.oldPrice || '';
            document.getElementById('db-book-discount').value = book.discount || '';
            document.getElementById('db-book-rating').value = book.rating != null ? book.rating : 4.5;
            document.getElementById('db-book-edition').value = book.edition || 'Standard';
            document.getElementById('db-book-bestseller').checked = !!book.bestseller;
            setFormatSelect(book.format || book.type || 'Paperback');
            formWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (e) {
            setMsg('Could not load book.', true);
        }
    }

    async function removeRow(id) {
        const ok = await TVModal.confirm(
            'This book will be permanently removed from the TaleVerse database. This action cannot be undone!',
            'Delete Book?',
            { confirmLabel: 'Yes, Delete', cancelLabel: 'Cancel', confirmCls: 'tv-modal-btn-danger', icon: '🗑️' }
        );
        if (!ok) return;
        setMsg('Deleting…');
        try {
            const res = await fetch('http://localhost:8080/api/books?id=' + encodeURIComponent(id), { method: 'DELETE' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg(data.error || 'Delete failed', true);
                return;
            }
            setMsg('Deleted.');
            window.dispatchEvent(new CustomEvent('taleverse-books-changed'));
            await loadTable();
        } catch (e) {
            setMsg('Delete request failed.', true);
        }
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setMsg('Saving…');
        const payload = {
            id: document.getElementById('db-book-id').value,
            title: document.getElementById('db-book-title').value,
            author: document.getElementById('db-book-author').value,
            price: document.getElementById('db-book-price').value,
            category: document.getElementById('db-book-category').value,
            image: document.getElementById('db-book-image').value,
            oldPrice: document.getElementById('db-book-oldprice').value,
            discount: document.getElementById('db-book-discount').value,
            rating: parseFloat(document.getElementById('db-book-rating').value) || 0,
            edition: document.getElementById('db-book-edition').value,
            format: document.getElementById('db-book-format').value,
            bestseller: document.getElementById('db-book-bestseller').checked
        };
        const method = formMode === 'add' ? 'POST' : 'PUT';
        try {
            const res = await fetch('http://localhost:8080/api/books', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg(data.error || 'Save failed', true);
                return;
            }
            setMsg('Saved to MySQL.');
            formWrap.classList.add('hidden');
            window.dispatchEvent(new CustomEvent('taleverse-books-changed'));
            await loadTable();
        } catch (err) {
            setMsg('Save request failed.', true);
        }
    });

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        openOverlay();
    });
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openOverlay();
        }
    });
    closeBtn.addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) closeOverlay();
    });
    refreshBtn.addEventListener('click', () => loadTable());
    addBtn.addEventListener('click', () => showForm('add'));
    cancelFormBtn.addEventListener('click', () => {
        formWrap.classList.add('hidden');
        setMsg('');
    });
})();
