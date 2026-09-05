(() => {
    'use strict';

    const root = document.documentElement;
    root.classList.add('js');

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
        if (window.bootstrap) {
            window.bootstrap.Tooltip.getOrCreateInstance(element);
        }
    });

    document.querySelectorAll('[data-password-toggle]').forEach((button) => {
        button.addEventListener('click', () => {
            const selector = button.getAttribute('data-password-toggle');
            const input = selector ? document.querySelector(selector) : null;
            if (!(input instanceof HTMLInputElement)) return;

            const willShow = input.type === 'password';
            input.type = willShow ? 'text' : 'password';
            button.setAttribute('aria-label', willShow ? 'Hide password' : 'Show password');
            const icon = button.querySelector('i');
            if (icon) icon.className = `bi ${willShow ? 'bi-eye-slash' : 'bi-eye'}`;
            input.focus({ preventScroll: true });
        });
    });

    const calculatePasswordStrength = (value) => {
        let score = 0;
        if (value.length >= 8) score += 1;
        if (value.length >= 12) score += 1;
        if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
        if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
        return Math.min(score, 4);
    };

    document.querySelectorAll('[data-password-strength]').forEach((input) => {
        const panel = input.closest('div');
        const scope = panel?.parentElement ?? input.parentElement;
        const meter = scope?.querySelector('[data-password-meter]');
        const hint = scope?.querySelector('[data-password-hint]');
        const labels = ['Use at least 8 characters.', 'Weak', 'Fair', 'Good', 'Strong'];

        input.addEventListener('input', () => {
            const score = calculatePasswordStrength(input.value);
            if (meter) {
                meter.style.width = input.value ? `${Math.max(score, 1) * 25}%` : '0%';
                meter.dataset.strength = String(score);
            }
            if (hint && input.value) hint.textContent = `${labels[score]}. A longer passphrase is safer.`;
        });
    });

    const validatePasswordConfirmations = (form) => {
        form.querySelectorAll('[data-password-confirm]').forEach((confirmation) => {
            const selector = confirmation.getAttribute('data-password-confirm');
            const source = selector ? form.querySelector(selector) || document.querySelector(selector) : null;
            if (source instanceof HTMLInputElement && confirmation instanceof HTMLInputElement) {
                confirmation.setCustomValidity(confirmation.value === source.value ? '' : 'Passwords do not match.');
            }
        });
    };

    document.querySelectorAll('.needs-validation').forEach((form) => {
        form.querySelectorAll('[data-password-confirm]').forEach((confirmation) => {
            confirmation.addEventListener('input', () => validatePasswordConfirmations(form));
            const selector = confirmation.getAttribute('data-password-confirm');
            const source = selector ? form.querySelector(selector) || document.querySelector(selector) : null;
            source?.addEventListener('input', () => validatePasswordConfirmations(form));
        });

        form.addEventListener('submit', (event) => {
            validatePasswordConfirmations(form);
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                form.classList.add('was-validated');
                const invalid = form.querySelector(':invalid');
                invalid?.focus({ preventScroll: true });
                invalid?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
                return;
            }

            const submitter = event.submitter;
            if (submitter instanceof HTMLButtonElement && submitter.dataset.submitLabel) {
                submitter.dataset.originalLabel = submitter.innerHTML;
                submitter.disabled = true;
                submitter.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${submitter.dataset.submitLabel}`;
            }
        });
    });

    document.querySelectorAll('form[data-confirm]:not(.js-confirm-form)').forEach((form) => {
        form.addEventListener('submit', (event) => {
            if (!window.confirm(form.dataset.confirm || 'Continue with this action?')) {
                event.preventDefault();
            }
        });
    });

    const authModal = document.getElementById('authModal');
    authModal?.addEventListener('show.bs.modal', (event) => {
        const trigger = event.relatedTarget;
        const tabName = trigger?.getAttribute?.('data-auth-tab');
        const tabButton = document.getElementById(tabName === 'register' ? 'modal-register-tab' : 'modal-login-tab');
        if (tabButton && window.bootstrap) window.bootstrap.Tab.getOrCreateInstance(tabButton).show();
    });

    document.querySelector('[data-error-summary], [data-form-errors]')?.focus({ preventScroll: true });

    document.querySelectorAll('[data-history-back]').forEach((button) => {
        button.addEventListener('click', () => history.back());
    });

    const offlineBanner = document.querySelector('[data-offline-banner]');
    const updateConnectionState = () => {
        if (!offlineBanner) return;
        offlineBanner.hidden = navigator.onLine;
        document.body.classList.toggle('is-offline', !navigator.onLine);
    };
    window.addEventListener('online', updateConnectionState);
    window.addEventListener('offline', updateConnectionState);
    updateConnectionState();

    let installPrompt = null;
    const installButtons = [...document.querySelectorAll('[data-install-app]')];
    const setInstallVisibility = (visible) => {
        installButtons.forEach((button) => button.classList.toggle('d-none', !visible));
    };

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        installPrompt = event;
        setInstallVisibility(true);
    });

    installButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            if (!installPrompt) return;
            installPrompt.prompt();
            await installPrompt.userChoice;
            installPrompt = null;
            setInstallVisibility(false);
        });
    });

    window.addEventListener('appinstalled', () => {
        installPrompt = null;
        setInstallVisibility(false);
    });

    if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost')) {
        window.addEventListener('load', () => {
            const appBase = document.body.dataset.appBase || document.baseURI;
            navigator.serviceWorker.register(new URL('service-worker.js', appBase).href).catch(() => {
                // The web experience remains fully functional if offline support cannot be registered.
            });
        });
    }
})();
