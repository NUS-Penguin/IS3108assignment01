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

    console.log('🎬 CineVillage Admin Portal initialized');
});
