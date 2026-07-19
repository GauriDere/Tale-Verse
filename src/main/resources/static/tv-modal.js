/**
 * tv-modal.js — TaleVerse Themed Modal System
 * Replaces all native browser alert() and confirm() dialogs
 * with a dark/violet/gold magical-themed popup matching the app.
 *
 * API:
 *   TVModal.alert(message, title?)          → Promise<void>
 *   TVModal.confirm(message, title?)        → Promise<boolean>
 *   TVModal.success(message, title?)        → Promise<void>
 *   TVModal.error(message, title?)          → Promise<void>
 *   TVModal.warning(message, title?)        → Promise<void>
 */

const TVModal = (() => {
    // ── Inject styles only once ──────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('tv-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'tv-modal-styles';
        style.textContent = `
            /* ── TaleVerse Modal Overlay ─────────────────────────── */
            .tv-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(2, 6, 23, 0.88);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                backdrop-filter: blur(6px);
                animation: tvmo-fadein 0.2s ease;
            }
            @keyframes tvmo-fadein {
                from { opacity: 0; }
                to   { opacity: 1; }
            }

            /* ── Modal Box ───────────────────────────────────────── */
            .tv-modal-box {
                background: linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%);
                border: 1px solid rgba(124, 58, 237, 0.5);
                border-radius: 22px;
                padding: 36px 36px 28px;
                max-width: 420px;
                width: 90%;
                text-align: center;
                box-shadow: 0 0 50px rgba(124, 58, 237, 0.55),
                            0 20px 60px rgba(0, 0, 0, 0.6);
                animation: tvmo-popin 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                position: relative;
                overflow: hidden;
                font-family: 'Poppins', sans-serif;
            }
            @keyframes tvmo-popin {
                from { opacity: 0; transform: scale(0.82) translateY(20px); }
                to   { opacity: 1; transform: scale(1)   translateY(0);     }
            }

            /* sparkle shimmer behind content */
            .tv-modal-box::before {
                content: '';
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at 30% 20%, rgba(124,58,237,0.12) 0%, transparent 60%),
                            radial-gradient(circle at 70% 80%, rgba(250,204,21,0.07) 0%, transparent 60%);
                pointer-events: none;
            }

            /* ── Logo ────────────────────────────────────────────── */
            .tv-modal-logo {
                width: 64px;
                margin-bottom: 14px;
                filter: drop-shadow(0 0 10px gold);
                display: block;
                margin-left: auto;
                margin-right: auto;
            }

            /* ── Icon badge ──────────────────────────────────────── */
            .tv-modal-icon {
                font-size: 36px;
                margin-bottom: 10px;
                display: block;
            }

            /* ── Title ───────────────────────────────────────────── */
            .tv-modal-title {
                font-family: 'Playfair Display', serif;
                font-size: 21px;
                font-weight: 700;
                color: #facc15;
                margin: 0 0 10px 0;
                text-shadow: 0 0 12px rgba(250, 204, 21, 0.35);
                line-height: 1.25;
            }

            /* ── Message ─────────────────────────────────────────── */
            .tv-modal-msg {
                font-size: 14.5px;
                color: #c4b5fd;
                margin: 0 0 26px 0;
                line-height: 1.6;
            }

            /* ── Buttons row ─────────────────────────────────────── */
            .tv-modal-btns {
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .tv-modal-btn {
                font-family: 'Poppins', sans-serif;
                font-size: 14px;
                font-weight: 600;
                padding: 10px 28px;
                border-radius: 25px;
                border: none;
                cursor: pointer;
                transition: transform 0.18s, box-shadow 0.18s;
                min-width: 100px;
            }
            .tv-modal-btn:hover {
                transform: translateY(-2px);
            }

            /* Primary — gold gradient (confirm / ok) */
            .tv-modal-btn-primary {
                background: linear-gradient(45deg, #facc15, #f59e0b);
                color: #0f172a;
                box-shadow: 0 0 18px rgba(250, 204, 21, 0.4);
            }
            .tv-modal-btn-primary:hover {
                box-shadow: 0 0 28px rgba(250, 204, 21, 0.65);
            }

            /* Danger — red (destructive confirm) */
            .tv-modal-btn-danger {
                background: linear-gradient(45deg, #ef4444, #b91c1c);
                color: #fff;
                box-shadow: 0 0 14px rgba(239, 68, 68, 0.4);
            }
            .tv-modal-btn-danger:hover {
                box-shadow: 0 0 24px rgba(239, 68, 68, 0.6);
            }

            /* Ghost — cancel */
            .tv-modal-btn-ghost {
                background: transparent;
                color: #94a3b8;
                border: 1px solid rgba(148, 163, 184, 0.35);
            }
            .tv-modal-btn-ghost:hover {
                border-color: #c084fc;
                color: #c084fc;
                box-shadow: 0 0 12px rgba(192, 132, 252, 0.2);
            }

            /* Violet (generic ok for info/success/warning) */
            .tv-modal-btn-violet {
                background: linear-gradient(45deg, #7c3aed, #6d28d9);
                color: #fff;
                box-shadow: 0 0 16px rgba(124, 58, 237, 0.45);
            }
            .tv-modal-btn-violet:hover {
                box-shadow: 0 0 26px rgba(124, 58, 237, 0.65);
            }
        `;
        document.head.appendChild(style);
    }

    // ── Build and show the modal ──────────────────────────────────────────────
    function showModal({ icon, title, message, buttons }) {
        injectStyles();
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'tv-modal-overlay';

            // Try to find the logo image path
            const logoSrc = 'images/logo1_copy.png';

            const box = document.createElement('div');
            box.className = 'tv-modal-box';

            const btnHtml = buttons.map((btn, i) =>
                `<button class="tv-modal-btn ${btn.cls}" data-idx="${i}">${btn.label}</button>`
            ).join('');

            box.innerHTML = `
                <img class="tv-modal-logo" src="${logoSrc}" alt="TaleVerse">
                <span class="tv-modal-icon">${icon}</span>
                <h2 class="tv-modal-title">${title}</h2>
                <p class="tv-modal-msg">${message}</p>
                <div class="tv-modal-btns">${btnHtml}</div>
            `;

            overlay.appendChild(box);
            document.body.appendChild(overlay);

            // Close & resolve on button click
            box.querySelectorAll('.tv-modal-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    overlay.style.animation = 'tvmo-fadein 0.15s ease reverse forwards';
                    setTimeout(() => {
                        overlay.remove();
                        resolve(buttons[idx].value);
                    }, 130);
                });
            });

            // Close on overlay click (only for alert/info, not confirm)
            if (buttons.length === 1) {
                overlay.addEventListener('click', e => {
                    if (e.target === overlay) {
                        overlay.remove();
                        resolve(buttons[0].value);
                    }
                });
            }

            // ESC key
            const onKey = e => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', onKey);
                    overlay.remove();
                    resolve(buttons[buttons.length - 1].value); // last = cancel/false
                }
            };
            document.addEventListener('keydown', onKey);

            // Focus first button
            setTimeout(() => box.querySelector('.tv-modal-btn')?.focus(), 50);
        });
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Generic alert (single OK button — violet) */
    function alert(message, title = 'TaleVerse') {
        return showModal({
            icon: 'ℹ️',
            title,
            message,
            buttons: [{ label: 'Got it', cls: 'tv-modal-btn-violet', value: undefined }]
        });
    }

    /** Success popup */
    function success(message, title = 'Success ✨') {
        return showModal({
            icon: '🎉',
            title,
            message,
            buttons: [{ label: 'Wonderful!', cls: 'tv-modal-btn-primary', value: undefined }]
        });
    }

    /** Error popup */
    function error(message, title = 'Oops! Something went wrong') {
        return showModal({
            icon: '⚠️',
            title,
            message,
            buttons: [{ label: 'Understood', cls: 'tv-modal-btn-danger', value: undefined }]
        });
    }

    /** Warning popup */
    function warning(message, title = 'Heads up!') {
        return showModal({
            icon: '🔮',
            title,
            message,
            buttons: [{ label: 'OK', cls: 'tv-modal-btn-violet', value: undefined }]
        });
    }

    /**
     * Confirm popup — resolves true (confirm) or false (cancel).
     * @param {string} message
     * @param {string} [title]
     * @param {object} [opts] — { confirmLabel, cancelLabel, confirmCls }
     */
    function confirm(message, title = 'Are you sure?', opts = {}) {
        const confirmLabel = opts.confirmLabel || 'Yes, proceed';
        const cancelLabel  = opts.cancelLabel  || 'Cancel';
        const confirmCls   = opts.confirmCls   || 'tv-modal-btn-primary';
        const icon         = opts.icon         || '🔮';

        return showModal({
            icon,
            title,
            message,
            buttons: [
                { label: cancelLabel,  cls: 'tv-modal-btn-ghost',  value: false },
                { label: confirmLabel, cls: confirmCls,             value: true  }
            ]
        });
    }

    return { alert, confirm, success, error, warning };
})();
