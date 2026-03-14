// Main JavaScript for CineVillage Admin Portal

document.addEventListener('DOMContentLoaded', function () {
    const html = document.documentElement;

    // Always use dark mode
    html.setAttribute('data-theme', 'dark');

    // Mobile menu toggle for template sidebar
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const toggleMobileMenu = () => {
        if (!mobileMenuToggle || !sidebar || !sidebarOverlay) {
            return;
        }

        mobileMenuToggle.classList.toggle('active');
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    };

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleMobileMenu);
    }

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarWrapper = document.getElementById('sidebar-wrapper');

    if (sidebarToggle && sidebarWrapper) {
        sidebarToggle.addEventListener('click', function () {
            sidebarWrapper.classList.toggle('show');
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
    const navLinks = document.querySelectorAll('#sidebar-wrapper .list-group-item, #sidebar .nav-item');

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

                if (rows < 1 || rows > 25 || columns < 1 || columns > 25) {
                    alert('Please enter valid dimensions (Rows: 1-25, Columns: 1-25)');
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

        // Generate seat matrix based on dimensions (defaults to regular seats)
        function generateSeatMatrix() {
            seatMatrix = [];
            for (let row = 0; row < rows; row++) {
                const currentRow = [];
                for (let col = 0; col < columns; col++) {
                    currentRow.push('regular');
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
            updateSeatStatistics();
        }

        // Render the seat grid
        function renderSeatGrid() {
            const seatLayout = document.getElementById('seatLayout');
            const seatGrid = document.getElementById('seatGrid');
            const rowLabels = document.getElementById('rowLabels');
            const columnLabels = document.getElementById('columnLabels');

            // Clear existing content
            seatGrid.innerHTML = '';
            rowLabels.innerHTML = '';
            columnLabels.innerHTML = '';

            if (seatLayout) {
                seatLayout.style.setProperty('--rows', String(rows));
                seatLayout.style.setProperty('--cols', String(columns));
            }

            document.documentElement.style.setProperty('--rows', String(rows));
            document.documentElement.style.setProperty('--cols', String(columns));

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

                    // Get seat type from matrix, default to 'regular' if not set
                    const seatType = seatMatrix[row] && seatMatrix[row][col] ? seatMatrix[row][col] : 'regular';

                    seat.className = `seat seat-${seatType}`;
                    seat.dataset.row = row;
                    seat.dataset.column = col;
                    seat.dataset.seatType = seatType;
                    seat.innerHTML = seatType === 'empty'
                        ? ''
                        : '<span class="seat-icon" aria-hidden="true"></span>';

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
                seat.innerHTML = newType === 'empty'
                    ? ''
                    : '<span class="seat-icon" aria-hidden="true"></span>';
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
                updateFormData();
            }
        }

        // Initialize the seat configuration
        initializeSeatConfiguration();

        // Load existing data if in edit mode
        if (window.location.pathname.includes('/edit')) {
            loadExistingSeatMatrix();
        }
    }

    // ========================================
    // SCREENING TIMELINE SCHEDULER
    // ========================================
    if (document.getElementById('screeningScheduler')) {
        const MINUTES_IN_DAY = 24 * 60;
        const SLOT_MINUTES = 15;

        const schedulerRoot = document.getElementById('screeningScheduler');
        const timelineRows = document.getElementById('timelineRows');
        const timelineHourAxis = document.getElementById('timelineHourAxis');
        const datePicker = document.getElementById('timelineDatePicker');
        const prevDateBtn = document.getElementById('timelinePrevDate');
        const nextDateBtn = document.getElementById('timelineNextDate');
        const todayBtn = document.getElementById('timelineToday');
        const timelineAlert = document.getElementById('timelineAlert');

        const cleaningBuffer = Number(schedulerRoot.dataset.cleaningBuffer || 15);
        let selectedDate = datePicker ? datePicker.value : schedulerRoot.dataset.selectedDate;
        let halls = [];
        let screenings = [];
        let dragPayload = null;

        const parseJsonScript = (elementId, fallbackValue) => {
            const element = document.getElementById(elementId);
            if (!element || !element.textContent) return fallbackValue;
            try {
                return JSON.parse(element.textContent);
            } catch (error) {
                return fallbackValue;
            }
        };

        const parseEncodedDataAttribute = (value, fallbackValue) => {
            if (!value) return fallbackValue;
            try {
                return JSON.parse(decodeURIComponent(value));
            } catch (error) {
                return fallbackValue;
            }
        };

        halls = parseEncodedDataAttribute(schedulerRoot.dataset.halls, parseJsonScript('timelineHallsData', []));
        screenings = parseEncodedDataAttribute(schedulerRoot.dataset.screenings, parseJsonScript('timelineScreeningsData', []));

        const showAlert = (message, type = 'warning') => {
            if (!timelineAlert) return;
            timelineAlert.className = `alert alert-${type}`;
            timelineAlert.textContent = message;
            timelineAlert.classList.remove('d-none');
            setTimeout(() => {
                timelineAlert.classList.add('d-none');
            }, 5000);
        };

        const getDayStart = (value) => {
            const date = new Date(value);
            date.setHours(0, 0, 0, 0);
            return date;
        };

        const getISODate = (date) => {
            const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            return adjusted.toISOString().slice(0, 10);
        };

        const formatTime = (dateValue) => {
            return new Date(dateValue).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        };

        const formatDateTimeLocal = (date) => {
            const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
            return adjusted.toISOString().slice(0, 16);
        };

        const renderHourAxis = () => {
            if (!timelineHourAxis) return;
            timelineHourAxis.innerHTML = '';
            for (let hour = 0; hour < 24; hour++) {
                const cell = document.createElement('div');
                cell.className = 'timeline-hour-cell border-end small text-muted';
                cell.textContent = `${String(hour).padStart(2, '0')}:00`;
                timelineHourAxis.appendChild(cell);
            }
        };

        const getOverlapForDay = (screening, dayStart, dayEnd) => {
            const start = new Date(screening.startTime);
            const end = new Date(screening.endTime);

            if (start >= dayEnd || end <= dayStart) {
                return null;
            }

            const visibleStart = start < dayStart ? dayStart : start;
            const visibleEnd = end > dayEnd ? dayEnd : end;

            return {
                visibleStart,
                visibleEnd,
                clippedAtStart: start < dayStart,
                clippedAtEnd: end > dayEnd
            };
        };

        const minutesSinceDayStart = (date, dayStart) => {
            return Math.floor((date.getTime() - dayStart.getTime()) / 60000);
        };

        const buildScreeningBlock = (screening, overlapInfo, dayStart) => {
            const block = document.createElement('div');
            const status = screening.status || 'Scheduled';
            const badgeClass = status === 'Completed' ? 'bg-secondary' : 'bg-primary';

            block.className = `timeline-screening-block ${badgeClass} text-white`;
            block.draggable = status === 'Scheduled';
            block.dataset.screeningId = screening.id;
            block.dataset.hallId = screening.hall?.id || '';

            const startMinutes = minutesSinceDayStart(overlapInfo.visibleStart, dayStart);
            const durationMinutes = Math.max(15, minutesSinceDayStart(overlapInfo.visibleEnd, dayStart) - startMinutes);
            const leftPercent = (startMinutes / MINUTES_IN_DAY) * 100;
            const widthPercent = (durationMinutes / MINUTES_IN_DAY) * 100;

            block.style.left = `${leftPercent}%`;
            block.style.width = `${widthPercent}%`;

            block.innerHTML = `
                <div class="fw-semibold text-truncate">${screening.movie?.title || 'Movie'}</div>
                <div class="small">${formatTime(overlapInfo.visibleStart)} - ${formatTime(overlapInfo.visibleEnd)}</div>
                <div class="small">${screening.movie?.durationMinutes || 0} min</div>
                <div class="d-flex gap-1 mt-1">
                    <button type="button" class="btn btn-light btn-sm py-0 px-1 timeline-block-action" data-action="edit">Edit</button>
                    <button type="button" class="btn btn-light btn-sm py-0 px-1 timeline-block-action" data-action="cancel">Cancel</button>
                    <button type="button" class="btn btn-light btn-sm py-0 px-1 timeline-block-action" data-action="delete">Delete</button>
                </div>
            `;

            block.addEventListener('click', (event) => {
                const action = event.target.dataset.action;
                if (action === 'edit') {
                    event.stopPropagation();
                    window.location.href = `/admin/screenings/${screening.id}/edit`;
                    return;
                }

                if (action === 'delete') {
                    event.stopPropagation();
                    const confirmed = confirm('Delete this screening?');
                    if (confirmed) {
                        deleteTimelineScreening(screening.id);
                    }
                    return;
                }

                if (action === 'cancel') {
                    event.stopPropagation();
                    const confirmed = confirm('Cancel this screening?');
                    if (confirmed) {
                        cancelTimelineScreening(screening.id);
                    }
                }
            });

            block.addEventListener('dragstart', (event) => {
                if (status !== 'Scheduled') {
                    event.preventDefault();
                    return;
                }

                dragPayload = {
                    type: 'screening',
                    screeningId: screening.id
                };
                event.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
                event.dataTransfer.effectAllowed = 'move';
            });

            return block;
        };

        const renderRows = () => {
            if (!timelineRows) return;

            timelineRows.innerHTML = '';
            const dayStart = getDayStart(selectedDate);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            halls.forEach((hall) => {
                const row = document.createElement('div');
                row.className = 'timeline-row border-bottom';

                const hallColumn = document.createElement('div');
                hallColumn.className = 'timeline-hall-column';
                hallColumn.innerHTML = `
                    <div class="fw-semibold">${hall.name}</div>
                    <small class="text-muted text-capitalize">${hall.status}</small>
                `;

                const track = document.createElement('div');
                track.className = 'timeline-track';
                track.dataset.hallId = hall.id;

                const grid = document.createElement('div');
                grid.className = 'timeline-track-grid';
                for (let hour = 0; hour < 24; hour++) {
                    const cell = document.createElement('div');
                    cell.className = 'timeline-track-cell border-end';
                    grid.appendChild(cell);
                }

                const blockLayer = document.createElement('div');
                blockLayer.className = 'timeline-block-layer';

                screenings
                    .filter((screening) => screening.hall && screening.hall.id === hall.id && screening.status !== 'Cancelled')
                    .forEach((screening) => {
                        const overlapInfo = getOverlapForDay(screening, dayStart, dayEnd);
                        if (!overlapInfo) return;
                        blockLayer.appendChild(buildScreeningBlock(screening, overlapInfo, dayStart));
                    });

                track.appendChild(grid);
                track.appendChild(blockLayer);

                track.addEventListener('dragover', (event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    track.classList.add('timeline-track-drop');
                });

                track.addEventListener('dragleave', () => {
                    track.classList.remove('timeline-track-drop');
                });

                track.addEventListener('drop', async (event) => {
                    event.preventDefault();
                    track.classList.remove('timeline-track-drop');

                    let payload = dragPayload;
                    if (!payload) {
                        try {
                            payload = JSON.parse(event.dataTransfer.getData('text/plain') || '{}');
                        } catch (parseError) {
                            payload = null;
                        }
                    }
                    if (!payload || !payload.type) return;

                    if (hall.status !== 'active') {
                        showAlert(`Cannot schedule in ${hall.name} because it is ${hall.status}.`, 'warning');
                        return;
                    }

                    const startDateTime = getDropDateTime(event, track, selectedDate);
                    if (!startDateTime) return;

                    const now = new Date();
                    if (startDateTime < now) {
                        showAlert('Cannot schedule screenings in the past.', 'warning');
                        return;
                    }

                    if (payload.type === 'movie') {
                        await createTimelineScreening(payload.movieId, hall.id, startDateTime);
                    }

                    if (payload.type === 'screening') {
                        await moveTimelineScreening(payload.screeningId, hall.id, startDateTime);
                    }

                    dragPayload = null;
                });

                row.appendChild(hallColumn);
                row.appendChild(track);
                timelineRows.appendChild(row);
            });
        };

        const getDropDateTime = (event, trackElement, selectedDateValue) => {
            const trackRect = trackElement.getBoundingClientRect();
            const x = Math.min(Math.max(event.clientX - trackRect.left, 0), trackRect.width);
            const minuteRaw = (x / trackRect.width) * MINUTES_IN_DAY;
            const snappedMinutes = Math.floor(minuteRaw / SLOT_MINUTES) * SLOT_MINUTES;

            const start = getDayStart(selectedDateValue);
            start.setMinutes(snappedMinutes);
            return start;
        };

        const requestJson = async (url, options = {}) => {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json'
                },
                ...options
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Operation failed');
            }
            return result;
        };

        const refreshTimelineData = async () => {
            try {
                const result = await requestJson(`/admin/screenings/timeline/data?date=${selectedDate}`);
                screenings = result.screenings || [];
                renderRows();
            } catch (error) {
                showAlert(error.message, 'danger');
            }
        };

        const createTimelineScreening = async (movieId, hallId, startDate) => {
            try {
                await requestJson('/admin/screenings/timeline', {
                    method: 'POST',
                    body: JSON.stringify({
                        movieId,
                        hallId,
                        startDateTime: formatDateTimeLocal(startDate)
                    })
                });

                await refreshTimelineData();
            } catch (error) {
                showAlert(error.message, 'warning');
            }
        };

        const moveTimelineScreening = async (screeningId, hallId, startDate) => {
            try {
                await requestJson(`/admin/screenings/timeline/${screeningId}/move`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        hallId,
                        startDateTime: formatDateTimeLocal(startDate)
                    })
                });

                await refreshTimelineData();
            } catch (error) {
                showAlert(error.message, 'warning');
            }
        };

        const deleteTimelineScreening = async (screeningId) => {
            try {
                await requestJson(`/admin/screenings/timeline/${screeningId}`, {
                    method: 'DELETE'
                });
                await refreshTimelineData();
            } catch (error) {
                showAlert(error.message, 'warning');
            }
        };

        const cancelTimelineScreening = async (screeningId) => {
            try {
                await requestJson(`/admin/screenings/timeline/${screeningId}/cancel`, {
                    method: 'PATCH'
                });
                await refreshTimelineData();
            } catch (error) {
                showAlert(error.message, 'warning');
            }
        };

        const moveDateByDays = (dayDelta) => {
            const current = getDayStart(selectedDate);
            current.setDate(current.getDate() + dayDelta);
            selectedDate = getISODate(current);
            datePicker.value = selectedDate;
            refreshTimelineData();
        };

        if (prevDateBtn) {
            prevDateBtn.addEventListener('click', () => moveDateByDays(-1));
        }

        if (nextDateBtn) {
            nextDateBtn.addEventListener('click', () => moveDateByDays(1));
        }

        if (todayBtn) {
            todayBtn.addEventListener('click', () => {
                selectedDate = getISODate(new Date());
                datePicker.value = selectedDate;
                refreshTimelineData();
            });
        }

        if (datePicker) {
            datePicker.addEventListener('change', () => {
                selectedDate = datePicker.value;
                refreshTimelineData();
            });
        }

        const movieItems = document.querySelectorAll('.timeline-movie-item');
        movieItems.forEach((item) => {
            item.addEventListener('dragstart', (event) => {
                dragPayload = {
                    type: 'movie',
                    movieId: item.dataset.movieId,
                    durationMinutes: Number(item.dataset.duration || 0)
                };
                event.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
                event.dataTransfer.effectAllowed = 'move';
            });
        });

        renderHourAxis();
        renderRows();

        if (timelineHourAxis && timelineRows) {
            timelineHourAxis.addEventListener('scroll', () => {
                timelineRows.scrollLeft = timelineHourAxis.scrollLeft;
            });

            timelineRows.addEventListener('scroll', () => {
                timelineHourAxis.scrollLeft = timelineRows.scrollLeft;
            });
        }

        showAlert(`Drag and drop enabled. Cleaning buffer: ${cleaningBuffer} minutes.`, 'info');
    }

    console.log('🎬 CineVillage Admin Portal initialized');
});
