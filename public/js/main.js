// Main JavaScript for CineVillage Admin Portal

document.addEventListener('DOMContentLoaded', function () {

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar-wrapper');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('show');
        });
    }

    // Auto-dismiss alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-info)');
    alerts.forEach(alert => {
        if (alert.classList.contains('alert-dismissible')) {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000);
        }
    });

    // Confirm delete actions
    const deleteForms = document.querySelectorAll('form[action*="DELETE"]');
    deleteForms.forEach(form => {
        form.addEventListener('submit', function (e) {
            const confirmed = confirm('Are you sure you want to delete this item?');
            if (!confirmed) {
                e.preventDefault();
            }
        });
    });

    // Add loading state to buttons on form submit
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function () {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.classList.contains('btn-outline-danger')) {
                submitBtn.classList.add('loading');
                submitBtn.disabled = true;
            }
        });
    });

    // Active nav link highlighting
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('#sidebar-wrapper .list-group-item');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (currentPath.startsWith(href) && href !== '/') {
            link.classList.add('active');
        }
    });

    // Form validation feedback
    const forms_validation = document.querySelectorAll('.needs-validation');
    Array.from(forms_validation).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Password confirmation validation
    const passwordFields = document.querySelectorAll('input[name="password"]');
    const confirmPasswordFields = document.querySelectorAll('input[name="confirmPassword"]');

    if (passwordFields.length > 0 && confirmPasswordFields.length > 0) {
        const password = passwordFields[0];
        const confirmPassword = confirmPasswordFields[0];

        confirmPassword.addEventListener('input', function () {
            if (password.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Passwords do not match');
            } else {
                confirmPassword.setCustomValidity('');
            }
        });
    }

    // Datetime input minimum value (prevent past dates)
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    datetimeInputs.forEach(input => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        input.min = now.toISOString().slice(0, 16);
    });

    // Table row click to expand details (future enhancement)
    const tableRows = document.querySelectorAll('.table tbody tr[data-id]');
    tableRows.forEach(row => {
        row.style.cursor = 'pointer';
        row.addEventListener('click', function (e) {
            // Only if not clicking on a button or link
            if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('form')) {
                // Future: Show detail modal or expand row
            }
        });
    });

    // Toast notifications (future enhancement)
    window.showToast = function (message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        alertDiv.style.zIndex = '9999';
        alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alertDiv);
            bsAlert.close();
        }, 3000);
    };

    // Session expiry warning
    // Session max age is 24 hours (86400000 ms) by default
    // Show warning 5 minutes before expiry
    const SESSION_MAX_AGE = parseInt(document.body.dataset.sessionMaxAge) || 86400000; // 24 hours default
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
    const TIME_UNTIL_WARNING = SESSION_MAX_AGE - WARNING_TIME;

    let sessionWarningShown = false;
    let sessionWarningTimer = null;
    let lastActivityTime = Date.now();
    let sessionStartTime = Date.now();

    // Function to show session expiry warning
    function showSessionWarning() {
        if (sessionWarningShown) return;

        sessionWarningShown = true;

        // Create modal for session expiry warning
        const modalHTML = `
            <div class="modal fade" id="sessionWarningModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                                Session Expiring Soon
                            </h5>
                        </div>
                        <div class="modal-body">
                            <p>Your session will expire in <strong><span id="sessionCountdown">5:00</span></strong>.</p>
                            <p>Any unsaved changes will be lost. Click "Continue" to keep your session active.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" id="continueSession">
                                <i class="bi bi-check-circle me-1"></i> Continue Session
                            </button>
                            <a href="/logout" class="btn btn-outline-secondary">
                                <i class="bi bi-box-arrow-right me-1"></i> Logout Now
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = new bootstrap.Modal(document.getElementById('sessionWarningModal'));
        modal.show();

        // Start countdown
        let timeLeft = WARNING_TIME / 1000; // Convert to seconds
        const countdownElement = document.getElementById('sessionCountdown');

        const countdownInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                window.location.href = '/login?expired=true';
            }
        }, 1000);

        // Continue session button
        document.getElementById('continueSession').addEventListener('click', () => {
            // Make a request to refresh the session
            fetch('/admin/dashboard', { method: 'HEAD' })
                .then(() => {
                    clearInterval(countdownInterval);
                    modal.hide();
                    sessionWarningShown = false;
                    sessionStartTime = Date.now();
                    scheduleSessionWarning();
                })
                .catch(() => {
                    window.location.href = '/login?expired=true';
                });
        });
    }

    // Function to schedule session warning
    function scheduleSessionWarning() {
        if (sessionWarningTimer) {
            clearTimeout(sessionWarningTimer);
        }

        sessionWarningTimer = setTimeout(() => {
            showSessionWarning();
        }, TIME_UNTIL_WARNING);
    }

    // Reset session timer on user activity (for authenticated pages only)
    function resetSessionTimer() {
        const now = Date.now();

        // Only reset if more than 1 minute has passed since last activity
        if (now - lastActivityTime > 60000) {
            lastActivityTime = now;
            sessionStartTime = now;
            sessionWarningShown = false;
            scheduleSessionWarning();
        }
    }

    // Track user activity for session management (only on authenticated pages)
    if (document.body.dataset.authenticated === 'true') {
        scheduleSessionWarning();

        // Activity events that should reset the session timer
        ['mousedown', 'keypress', 'scroll', 'click'].forEach(event => {
            document.addEventListener(event, resetSessionTimer, { passive: true });
        });
    }

    console.log('🎬 CineVillage Admin Portal initialized');
});
