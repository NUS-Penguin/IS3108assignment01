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

    // ========================================
    // SEAT CONFIGURATION MATRIX TOOL
    // ========================================

    // Hall Form - Seat Configuration Matrix
    if (document.getElementById('generateLayoutBtn')) {
        let currentSeatMode = 'regular';
        let seatMatrix = [];
        let rows = 0;
        let columns = 0;

        // Initialize seat configuration
        function initializeSeatConfiguration() {
            const generateBtn = document.getElementById('generateLayoutBtn');
            const rowsInput = document.getElementById('rows');
            const columnsInput = document.getElementById('columns');
            const seatModeControls = document.getElementById('seatModeControls');
            const seatLegend = document.getElementById('seatLegend');
            const seatStats = document.getElementById('seatStats');
            const seatGridContainer = document.getElementById('seatGridContainer');

            generateBtn.addEventListener('click', function () {
                rows = parseInt(rowsInput.value) || 0;
                columns = parseInt(columnsInput.value) || 0;

                if (rows < 1 || rows > 26 || columns < 1 || columns > 50) {
                    alert('Please enter valid dimensions (Rows: 1-26, Columns: 1-50)');
                    return;
                }

                generateSeatMatrix();
                showSeatConfiguration();
                updateSeatStatistics();
            });

            // Seat mode button handlers
            const seatModeButtons = document.querySelectorAll('.seat-mode-btn');
            seatModeButtons.forEach(btn => {
                btn.addEventListener('click', function () {
                    // Remove active class from all buttons
                    seatModeButtons.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                    currentSeatMode = this.dataset.mode;
                });
            });

            // Update capacity display when dimensions change
            function updateCapacityDisplay() {
                const r = parseInt(rowsInput.value) || 0;
                const c = parseInt(columnsInput.value) || 0;
                const capacity = r * c;
                const display = document.getElementById('capacityDisplay');
                if (display) {
                    display.textContent = `${capacity} seats (${r} rows × ${c} columns)`;
                }
            }

            rowsInput.addEventListener('input', updateCapacityDisplay);
            columnsInput.addEventListener('input', updateCapacityDisplay);
        }

        // Generate seat matrix based on dimensions
        function generateSeatMatrix() {
            seatMatrix = [];
            for (let row = 0; row < rows; row++) {
                const currentRow = [];
                for (let col = 0; col < columns; col++) {
                    currentRow.push('empty');
                }
                seatMatrix.push(currentRow);
            }
        }

        // Show seat configuration UI elements
        function showSeatConfiguration() {
            document.getElementById('seatModeControls').style.display = 'block';
            document.getElementById('seatLegend').style.display = 'block';
            document.getElementById('seatStats').style.display = 'block';
            document.getElementById('seatGridContainer').style.display = 'block';

            renderSeatGrid();
        }

        // Render the seat grid
        function renderSeatGrid() {
            const seatGrid = document.getElementById('seatGrid');
            const rowLabels = document.getElementById('rowLabels');
            const columnLabels = document.getElementById('columnLabels');

            // Clear existing content
            seatGrid.innerHTML = '';
            rowLabels.innerHTML = '';
            columnLabels.innerHTML = '';

            // Set grid template columns
            seatGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
            columnLabels.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

            // Create row labels (A, B, C, etc.)
            for (let row = 0; row < rows; row++) {
                const rowLabel = document.createElement('div');
                rowLabel.className = 'row-label';
                rowLabel.textContent = String.fromCharCode(65 + row); // A, B, C...
                rowLabels.appendChild(rowLabel);
            }

            // Create column labels (1, 2, 3, etc.)
            for (let col = 0; col < columns; col++) {
                const colLabel = document.createElement('div');
                colLabel.className = 'column-label';
                colLabel.textContent = col + 1;
                columnLabels.appendChild(colLabel);
            }

            // Create seat elements
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    const seat = document.createElement('div');
                    seat.className = 'seat seat-empty';
                    seat.dataset.row = row;
                    seat.dataset.column = col;
                    seat.dataset.seatType = 'empty';

                    // Add click handler
                    seat.addEventListener('click', function () {
                        changeSeatType(row, col, currentSeatMode);
                    });

                    seatGrid.appendChild(seat);
                }
            }
        }

        // Change seat type
        function changeSeatType(row, col, newType) {
            // Update matrix
            seatMatrix[row][col] = newType;

            // Update visual representation
            const seat = document.querySelector(`[data-row="${row}"][data-column="${col}"]`);
            if (seat) {
                // Remove old seat type classes
                seat.classList.remove('seat-regular', 'seat-vip', 'seat-wheelchair', 'seat-unavailable', 'seat-empty');
                // Add new seat type class
                seat.classList.add(`seat-${newType}`);
                seat.dataset.seatType = newType;
            }

            // Update statistics
            updateSeatStatistics();

            // Update form data
            updateFormData();
        }

        // Update seat statistics
        function updateSeatStatistics() {
            const stats = {
                regular: 0,
                vip: 0,
                wheelchair: 0,
                unavailable: 0,
                empty: 0
            };

            // Count seat types
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < columns; col++) {
                    const seatType = seatMatrix[row][col];
                    stats[seatType]++;
                }
            }

            // Update display
            document.getElementById('regularCount').textContent = stats.regular;
            document.getElementById('vipCount').textContent = stats.vip;
            document.getElementById('wheelchairCount').textContent = stats.wheelchair;
            document.getElementById('unavailableCount').textContent = stats.unavailable;
        }

        // Update hidden form data
        function updateFormData() {
            const seatMatrixInput = document.getElementById('seatMatrix');
            if (seatMatrixInput) {
                // Convert 2D matrix to flat array for form submission
                const flatMatrix = [];
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < columns; col++) {
                        flatMatrix.push(seatMatrix[row][col]);
                    }
                }
                seatMatrixInput.value = JSON.stringify(flatMatrix);
            }
        }

        // Load existing seat matrix for edit mode
        function loadExistingSeatMatrix() {
            const existingMatrix = window.seatMatrix; // Passed from EJS template
            if (existingMatrix && existingMatrix.length > 0) {
                seatMatrix = existingMatrix;
                const rowsInput = document.getElementById('rows');
                const columnsInput = document.getElementById('columns');
                rows = parseInt(rowsInput.value);
                columns = parseInt(columnsInput.value);

                // Auto-generate and show the seat configuration
                showSeatConfiguration();
                updateSeatStatistics();

                // Update seat visual states
                setTimeout(() => {
                    for (let row = 0; row < rows; row++) {
                        for (let col = 0; col < columns; col++) {
                            const seatType = seatMatrix[row][col];
                            const seat = document.querySelector(`[data-row="${row}"][data-column="${col}"]`);
                            if (seat) {
                                seat.classList.remove('seat-empty');
                                seat.classList.add(`seat-${seatType}`);
                                seat.dataset.seatType = seatType;
                            }
                        }
                    }
                    updateFormData();
                }, 100);
            }
        }

        // Initialize the seat configuration
        initializeSeatConfiguration();

        // Load existing data if in edit mode
        if (window.location.pathname.includes('/edit')) {
            loadExistingSeatMatrix();
        }
    }

    console.log('🎬 CineVillage Admin Portal initialized');
});
