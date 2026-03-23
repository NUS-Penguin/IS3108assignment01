# CineVillage Admin Portal - In-Depth Feature Walkthrough Script

Let’s jump straight into the system walkthrough, focusing on features and UI.

First, authentication. On the login screen, admins enter username and password. If needed, there are register and forgot-password flows. Once logged in, access is controlled through protected admin routes and session-based authentication.

Now we’re at the dashboard. This page gives a quick operational snapshot with three top stats: total movies, active halls, and screenings today. Right below, we have shortcut buttons for New Screening, Add Movie, and Add Hall. The Upcoming Screenings table shows movie details with poster, hall, start time, duration, and action controls, so users can manage near-term schedules without leaving the dashboard.

Next, halls. In the halls list, each hall row shows name, capacity, configuration summary, current status, maintenance info, and action buttons to view, edit, or delete. Status badges show whether a hall is Active, Maintenance, or Cleaning.

Inside Create/Edit Hall, admins configure hall name, number of rows, and number of columns. Capacity is calculated live based on dimensions. Clicking Generate Seating Layout builds the interactive seat matrix editor.

The seat editor supports multiple seat modes:
- Add Regular
- Add VIP
- Add Wheelchair
- Add Unavailable
- Clear Seat

You select a mode and click seats to apply changes. The UI updates immediately and includes:
- a visual legend for all seat types
- live seat statistics counters
- a cinema-style preview with row and column labels plus screen position

Hall status is configurable in the same form. If Maintenance is selected, additional fields appear for maintenance start date, end date, and reason, so temporary hall downtime is tracked explicitly.

On the Hall Details page, admins get full hall visibility: capacity cards, screening counts, seat type distribution bars, and a read-only seat layout preview. It also shows created/updated timestamps and maintenance period details when relevant.

Now movies. In Movies, admins can browse the full catalog and use filters to narrow by title and metadata. This supports faster scheduling decisions when the movie library grows.

In Create/Edit Movie, admins manage core movie data including title, genre, release year, status, and poster image. Poster upload makes the catalog easier to scan visually, and updates are reflected in list views and scheduling UI.

Now the screenings module, which has two scheduling workflows.

Workflow one is the timeline scheduler. This is the drag-and-drop planner:
- Y-axis is halls/theatres
- X-axis is time

At the top, the toolbar supports date navigation using previous/next day, direct date picker, and Today shortcut. There are AM and PM view toggles to focus planning by half-day windows. The cleaning buffer note is always visible as a scheduling constraint reference.

On the right, the Movie Library panel lists draggable movie cards with duration and genre. There is a search input to quickly locate a movie before dragging.

To schedule, drag a movie card into a hall-time slot. To reschedule, drag an existing screening block to a new slot or hall. The system prevents invalid actions like scheduling in non-active halls or in past time slots, and shows warning alerts when needed.

Each screening block shows title and time range and includes action buttons:
- Edit
- Delete

Edit opens the screening seat overview page for that screening. Delete removes the screening after confirmation.

Workflow two is manual form scheduling. In the manual form, admins choose movie, choose hall, and pick start date/time. The form auto-previews estimated end time based on movie duration. It also surfaces validation errors when there are overlap or constraint issues.

Now the screening seat overview page. This page is read-only and focused on live occupancy visibility. At the top, summary cards show:
- Total Seats
- Occupied Seats
- Available Seats
- Unavailable Seats

Below that, a screening summary section displays movie, hall, status, duration, start time, and end time. Then there is a full seat map with legend and row/column labels, so admins can inspect current booked-seat state visually.

From this page, admins can continue with operational actions:
- Edit Screening to update scheduling details
- Delete Screening if needed
- Back to Screenings for timeline-level planning

That’s the full feature walkthrough of the current UI: dashboard monitoring, detailed hall configuration, movie catalog management, drag-and-drop plus manual screening workflows, and screening-level booked-seat visibility.
