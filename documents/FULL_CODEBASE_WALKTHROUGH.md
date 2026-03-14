# FULL CODEBASE WALKTHROUGH DOCUMENT
## Cinema Management System (Express + MongoDB)

Audience: Students with basic programming knowledge (Java/Python/HTML/CSS) and limited experience with Node.js/Express/MongoDB/MVC.

---

## 1. HIGH LEVEL SYSTEM OVERVIEW

### 1.1 What this system does
This project is an **internal admin portal** for a cinema chain called **CineVillage**. It is not a customer-facing ticketing website. Instead, it is used by staff (admin/manager) to run cinema operations.

Main responsibilities:
- Manage cinema halls (layout, capacity, maintenance status)
- Manage movies (metadata, poster, status)
- Schedule screenings (time + hall + movie)
- Enforce schedule constraints (no overlap, cleaning buffer, hall availability)
- View seat occupancy snapshot per screening

In short: this is an **operations control panel** for cinema planning.

---

### 1.2 What problem it solves
If cinemas schedule manually in spreadsheets or chat messages, common problems appear:
- Two movies accidentally booked in same hall at overlapping times
- Hall under maintenance still gets scheduled
- Movies deleted while future screenings still exist
- No consistent seat template for each hall
- No clear dashboard for upcoming screenings and activity

This system solves those with rules and centralized data.

---

### 1.3 Who the users are
The system is built for internal users:
- **Admin**: full control
- **Manager**: operational control

The authentication model stores a role (`admin` or `manager`) in session, although role-based authorization is currently light (both use the same protected admin routes).

---

### 1.4 High-level workflow (architecture-story style)
A typical usage path:

1. User opens app and logs in
2. System creates session and grants access to `/admin/*`
3. User sees dashboard summary:
   - movies count
   - active halls count
   - today’s screenings
   - upcoming screenings table
4. User configures halls:
   - dimensions
   - seat matrix (regular/VIP/wheelchair/unavailable/empty)
   - status (active/maintenance/cleaning)
5. User creates or edits movies
6. User schedules screenings through:
   - manual form, or
   - drag-and-drop timeline scheduler
7. Scheduler checks:
   - hall exists and active
   - movie can be scheduled
   - start time is future
   - no duplicate screening (same movie/hall/start)
   - no overlap against existing screenings with cleaning buffer
8. User opens screening details and sees seat occupancy grid
9. Completed screenings are auto-marked by backend logic

This is a classic **server-rendered MVC app**: browser requests pages, server renders HTML (EJS), database stores domain data, and JS enhances interactions.

---

### 1.5 Software architecture map in words
Think of a flow diagram with these boxes:

- **Browser (Client)**
  - submits forms
  - receives rendered HTML
  - runs `public/js/main.js` for UI behavior

- **Express App (`app.js`)**
  - parses requests
  - manages sessions
  - dispatches route handlers

- **Routes**
  - map URLs + HTTP methods to controllers

- **Controllers**
  - receive request
  - call services/models
  - decide which EJS view or JSON response to return

- **Services**
  - contain business rules (especially scheduling/seat logic)

- **Models (Mongoose)**
  - schemas, validation, hooks, database querying

- **MongoDB**
  - persistent data store

- **Views (EJS)**
  - HTML templates with embedded dynamic data

- **Public assets (CSS/JS/images)**
  - styling and interactive behavior

---

## 2. TECHNOLOGY STACK EXPLANATION

### 2.1 Node.js
**Node.js** is JavaScript runtime on the server.

Why used here:
- same language (JS) for server and client-side scripts
- large ecosystem (`express`, `mongoose`, `multer`, etc.)
- excellent for web APIs and request handling

Java/Python comparison:
- Similar to running a Java Spring Boot app on JVM or a Python Flask app on CPython.
- Node’s concurrency model is event-loop based (non-blocking I/O), unlike traditional thread-per-request models.

---

### 2.2 Express.js
**Express** is the web framework handling:
- routing (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- middleware chain
- request/response abstraction

Why used here:
- minimal but powerful structure
- easy middleware composition
- works naturally with server-rendered EJS

Java analogy:
- Express routes + middleware are conceptually similar to Spring `@Controller`, filters, and handler mappings.

Python analogy:
- similar in spirit to Flask route functions + decorators + middlewares.

---

### 2.3 MongoDB + Mongoose
**MongoDB** stores JSON-like documents (BSON), not relational tables.

**Mongoose** provides:
- schemas (field types + validation)
- model methods/statics
- middleware hooks (`pre('save')`, `pre('validate')`)

Why used here:
- flexible schema for nested structures like seat matrices (`[[String]]`, `[[SeatCell]]`)
- easy references between collections (`movie`, `hall` in screening)
- rapid development for CRUD-heavy admin tools

SQL comparison:
- No joins in DB schema design; references are linked and later `populate`d.
- Nested arrays are straightforward in document model.

---

### 2.4 EJS Templates
**EJS (Embedded JavaScript)** renders HTML on server with injected variables.

Why used here:
- simple server-side rendering
- no heavy SPA framework required
- easy to maintain for CRUD dashboards

Comparison:
- Similar to JSP/Thymeleaf in Java, or Jinja2 templates in Python Flask/Django.

---

### 2.5 Session stack (`express-session` + `connect-mongo`)
Sessions are persisted in MongoDB.

Why this matters:
- authentication survives server restarts better than in-memory sessions
- centralized session store
- secure cookie settings (httpOnly, sameSite, secure in prod)

---

### 2.6 File upload (`multer`)
`multer` handles movie poster uploads.
- validates MIME type
- file size limit (5MB)
- safe generated filename

---

### 2.7 Styling stack
- Bootstrap 5 base utilities/components
- TemplateMo theme files
- Project custom overrides (`public/css/styles.css`)

Why this split:
- fast UI foundation
- consistent branded dark theme
- custom cinema-specific widgets (seat grids, timeline scheduler)

---

## 3. PROJECT FOLDER STRUCTURE

Below is the conceptual structure and interaction map.

### 3.1 Root files
- `app.js`: application entry point
- `package.json`: dependencies + scripts
- `README.md`: setup and overview

### 3.2 `config/`
- `db.js`: MongoDB connection logic

Interaction:
- `app.js` calls `connectDB()` before serving traffic.

### 3.3 `models/`
- `User.js`
- `Hall.js`
- `Movie.js`
- `Screening.js`

Purpose:
- define data schema, validations, hooks, methods

Interaction:
- services and controllers query/update these models.

### 3.4 `services/`
- `hallService.js`
- `movieService.js`
- `screeningService.js`

Purpose:
- business rules and domain logic

Interaction:
- controllers delegate complex decisions to services.

### 3.5 `controllers/`
- `authController.js`
- `dashboardController.js`
- `hallController.js`
- `movieController.js`
- `screeningController.js`

Purpose:
- route handlers: parse request, call service/model, render response

### 3.6 `routes/`
- `authRoutes.js`
- `adminRoutes.js`
- `hallRoutes.js`
- `movieRoutes.js`
- `screeningRoutes.js`

Purpose:
- map URLs + HTTP methods to controller functions

### 3.7 `middleware/`
- `authMiddleware.js`: login guard
- `errorMiddleware.js`: centralized error handling + `AppError`
- `uploadMiddleware.js`: poster upload processing
- `validationMiddleware.js`: request validations

### 3.8 `utils/`
- `validationUtils.js`: password strength helper utilities

### 3.9 `views/`
- `layouts/`: global shell layout
- `partials/`: reusable fragments (sidebar/footer/header)
- feature folders (`auth`, `dashboard`, `halls`, `movies`, `screenings`, `admin`)
- `error.ejs`

### 3.10 `public/`
- `css/`: theme + custom styles
- `js/`: main client behavior
- `images/`: static assets including seat icon
- `uploads/posters/`: uploaded movie posters

### 3.11 `css-template/`
Present but empty in this workspace. Likely scaffolding folder; active CSS is under `public/css`.

### 3.12 `documents/`, `prompts/`
Assignment and documentation artifacts. Not part of runtime logic.

---

## 4. APPLICATION ENTRY POINT

File: `app.js`

We will walk top to bottom.

### 4.1 Imports and dependencies
`app.js` imports:
- express core
- path helpers
- method override
- session modules
- env config
- app-specific modules (db, middleware, routes)

### 4.2 Express app creation + DB connection
```js
const app = express();
connectDB();
```
Important design choice: DB connection is initiated during startup. If connection fails, process exits from `config/db.js`.

### 4.3 View engine setup
```js
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
```
Meaning:
- EJS renders templates
- default wrapper is `views/layouts/main.ejs`

### 4.4 Request body parsing middleware
```js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```
- JSON parsing for API-style requests
- URL-encoded parsing for HTML forms

### 4.5 Method override for HTML forms
```js
app.use(methodOverride('_method'));
```
Because HTML forms support only `GET` and `POST`, this enables semantic methods via query string:
- `?_method=PUT`
- `?_method=DELETE`
- `?_method=PATCH`

### 4.6 Static files
```js
app.use(express.static(path.join(__dirname, 'public')));
```
Serves CSS/JS/images and uploaded posters under `/public` path root.

### 4.7 Session setup
Session config includes:
- secret key
- MongoDB session store (`connect-mongo`)
- TTL one day
- cookie security settings

Notable security settings:
- `httpOnly: true`
- `sameSite: 'strict'`
- `secure` enabled in production

### 4.8 Locals middleware (global template variables)
```js
res.locals.flash = req.session.flash;
res.locals.user = req.session.userId ? { ... } : null;
delete req.session.flash;
```
This injects `flash` and `user` into all EJS views automatically.

### 4.9 Route mounting
```js
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/halls', hallRoutes);
app.use('/admin/movies', movieRoutes);
app.use('/admin/screenings', screeningRoutes);
```
This means each route file defines **sub-paths** relative to these prefixes.

### 4.10 404 handler and error handler
Order matters:
1. catch unmatched route -> render 404 page
2. error middleware handles thrown operational/unexpected errors

### 4.11 Server startup
`PORT` from env (default 3000), then `app.listen`.

---

## 5. ROUTING SYSTEM

### 5.1 Express routing fundamentals in this project
Every route maps:
- HTTP method (`GET`, `POST`, etc.)
- URL path
- middleware chain
- final controller function

Example:
```js
router.post('/', validateHall, hallController.create);
```
Flow:
1. incoming POST `/admin/halls`
2. `validateHall` runs first
3. if valid, `hallController.create` executes

---

### 5.2 Route groups

#### Auth routes (`/` prefix)
From `authRoutes.js`:
- `GET /` redirect logic
- `GET /login`, `POST /login`
- `POST /logout`
- register/forgot/reset password endpoints

#### Admin general (`/admin`)
From `adminRoutes.js`:
- protected by `requireAuth`
- `GET /admin/dashboard`
- `GET /admin/settings`

#### Hall routes (`/admin/halls`)
- list, create form, create, show, edit form, update, delete

#### Movie routes (`/admin/movies`)
- list, create form, create, edit form, update, delete
- create/update include upload + validation middleware

#### Screening routes (`/admin/screenings`)
Two clusters:
1) standard CRUD pages
2) timeline JSON endpoints for drag-and-drop scheduler:
   - `GET /timeline/data`
   - `POST /timeline`
   - `PATCH /timeline/:id/move`
   - `PATCH /timeline/:id/cancel`
   - `DELETE /timeline/:id`

---

### 5.3 GET vs POST vs PUT vs PATCH vs DELETE in this app
- **GET**: fetch pages/data (no data mutation)
- **POST**: create new records or login/logout actions
- **PUT**: full update operations (hall/movie/screening forms)
- **PATCH**: partial state change (cancel, move timeline)
- **DELETE**: remove resources

Because form method limitations exist, method override makes PUT/PATCH/DELETE possible from EJS forms.

---

## 6. CONTROLLERS

Controllers are the request orchestration layer. Let’s examine each.

### 6.1 `authController`
Responsibilities:
- render login/register/password pages
- perform authentication and account recovery
- manage session lifecycle

#### `renderLogin`
- if already authenticated, redirects to dashboard
- else renders login form

#### `login`
Detailed logic:
1. validate required username/password
2. find user by username
3. if user missing -> generic invalid credentials
4. if account locked -> show remaining lock time
5. verify password with bcrypt method on model
6. if mismatch:
   - increment failed attempts
   - warn about remaining attempts
   - lock after threshold (5 attempts)
7. if success:
   - reset attempts
   - update `lastLogin`
   - write session fields (`userId`, `username`, `role`, `lastLogin`)
   - redirect dashboard

#### `logout`
- destroys server session
- clears session cookie
- redirects to login

#### `register`
1. validate fields
2. check password match
3. enforce strength policy (`validationUtils`)
4. create `User` with plain password in `passwordHash` field
5. model `pre('save')` hashes password
6. set session and redirect dashboard

#### Forgot/reset password flow
- generates cryptographic token
- stores hashed token + expiry in DB
- development mode logs reset URL in server console
- reset endpoint validates token and expiry
- checks password policy + password history reuse
- updates password and clears reset fields

This controller is security-heavy and uses model methods extensively.

---

### 6.2 `dashboardController`
#### `index`
- computes today range (`todayStart`, `todayEnd`)
- loads current user profile
- runs four parallel queries:
  - movie count
  - active hall count
  - today screening count
  - upcoming screenings list with populated movie/hall
- renders dashboard view with stats and table data

#### `renderSettings`
Simple page render.

---

### 6.3 `hallController`
Responsibilities:
- hall CRUD
- seat matrix parsing + validation handling
- maintenance constraints

Helper functions inside controller:
- `normalizeSeatMatrixInput`: accepts array or JSON string and normalizes
- `getSeatTypeCounts`: computes counts for form display
- `renderEditFormWithError`: convenience renderer for update error paths

#### `index`
Fetches all halls sorted by latest and renders list.

#### `show`
Delegates to `HallService.getHallStatistics`, then renders details and seat preview.

#### `renderForm`
- create mode: blank form
- edit mode: loads hall + seat matrix

#### `create`
Step-by-step:
1. parse primitive fields (name/rows/columns/status)
2. parse and normalize seatMatrix payload
3. if matrix given -> `HallService.processSeatMatrix`
4. else generate regular default matrix
5. compute `seatTypes`
6. if status maintenance -> require and validate date range
7. build hall document and save
8. set flash success and redirect

#### `update`
Similar to create, plus:
- fetches existing hall
- applies updates
- if maintenance status, checks conflicts with screenings (`checkMaintenanceConflicts`)
- clears maintenance fields when status not maintenance

#### `delete`
- blocks deletion if future screenings exist for hall
- otherwise deletes and flashes success

---

### 6.4 `movieController`
Responsibilities:
- movie listing with filters
- movie create/update/delete
- poster upload error handling

Helper:
- `getMovieFormData` + `renderMovieForm` to avoid duplicate form rendering logic

#### `index`
Reads query filters (`search`, `genre`, `status`, `releaseYear`) and calls `MovieService.getAllMovies`.

#### `create` / `update`
Pipeline includes:
1. upload middleware sets `req.file` or `req.uploadError`
2. validation middleware ensures required fields
3. controller checks upload errors
4. delegates to service create/update
5. handles validation/AppError paths by rerendering form

#### `delete`
Delegates to service which blocks deletion if future screenings exist.

---

### 6.5 `screeningController`
This is the most complex controller because it supports both page rendering and timeline API endpoints.

Constants/helpers:
- default cleaning buffer from env
- timeline slot size = 30 minutes
- date normalization helpers
- screening serializer for client-side JSON
- `_snapToTimelineSlot` rounds times to nearest slot

#### `index`
1. marks old scheduled screenings as completed
2. loads selected date
3. fetches halls, non-archived movies, and timeline screenings in parallel
4. transforms halls and screenings to simplified JSON-friendly structures
5. renders timeline page

#### `show`
Seat occupancy logic:
- loads screening + populated movie/hall
- checks if `seatOccupancy` exists
- if missing, generates fallback from hall and persists
- computes stats (occupied/available/unavailable/total)
- renders occupancy page

#### `create` / `update`
Use `ScreeningService` for full scheduling validation and persistence.

#### `delete` / `cancel`
- delete removes screening document
- cancel changes status to `Cancelled` through service

#### Timeline JSON endpoints
- `getTimelineData`: returns screenings for date
- `createFromTimeline`: validates payload, snaps time, creates screening
- `moveTimelineScreening`: move existing screening to hall/time
- `deleteTimelineScreening`: hard delete
- `cancelTimelineScreening`: status update

These endpoints allow AJAX drag-and-drop scheduling without full page reload.

---

## 7. DATABASE MODELS (MONGODB)

### 7.1 `User` schema
Fields:
- identity: `username`, `email`
- auth: `passwordHash`
- authorization: `role`
- security: failed attempts, lock state, lock expiration
- audit: `lastLogin`
- password reuse prevention: `passwordHistory`
- reset flow: token + expiry

Key methods:
- `verifyPassword`
- `isPasswordReused`
- `incrementLoginAttempts`
- `resetLoginAttempts`
- `isLocked`
- `updateLastLogin`
- `createPasswordResetToken`

Key hook:
- pre-save password hashing with bcrypt
- pushes old hash into history when changed

Design insight:
- password history and lockout policy move logic close to user model.

---

### 7.2 `Hall` schema
Fields:
- basic: `name`, `rows`, `columns`
- seat metadata: `seatTypes` (counts by type)
- seat matrix: `seats` as 2D string array
- status: active/maintenance/cleaning
- maintenance schedule fields

Virtual:
- `capacity = rows * columns`

Methods:
- `getSeatDistribution`
- `generateSeatingLayout`
- `_getSeatLabel`
- `getStatusBadgeClass`

Validations:
- matrix dimensions must match rows/columns
- seat values constrained to valid types
- seat type totals cannot exceed capacity
- maintenance date consistency

Important note:
`capacity` includes geometric size (`rows*columns`) even if matrix includes `empty` or `unavailable`; practical sellable seats are interpreted from matrix itself where needed.

---

### 7.3 `Movie` schema
Fields:
- `title`, `description`
- `durationMinutes`
- `genre` (enum)
- `releaseDate`
- poster fields (`posterURL`, `posterPath`)
- lifecycle status (`Now Showing`, `Coming Soon`, `Archived`)

Virtual:
- `durationFormatted` (e.g., `2h 10m`)

Model logic:
- instance method `getFutureScreeningsCount`
- static `search` with title regex and optional filters

Design choice:
- both URL and local path for poster allow flexible source.

---

### 7.4 `Screening` schema
Fields:
- references: `movie`, `hall`
- schedule: `startTime`, `endTime`, `date`
- status: `Scheduled` / `Cancelled` / `Completed`
- `seatOccupancy`: 2D array of seat state objects

Seat occupancy cell object:
- `type`: regular/vip/wheelchair/unavailable/empty
- `status`: available/occupied/unavailable

Indexes:
- `{ hall, date }`
- `{ startTime }`
- `{ movie }`

Pre-validate hook behavior:
- computes normalized `date` from startTime
- fetches movie duration and computes endTime
- auto-switches past scheduled records to completed

Design rationale:
- schedule and seat state are attached to screening itself, enabling historical correctness.

---

### 7.5 Relationships between collections
- `Screening.movie` references `Movie`
- `Screening.hall` references `Hall`
- User is mostly independent except auth/session

No direct relational constraints like SQL foreign keys; integrity is enforced by application logic and query checks.

---

### 7.6 Seat matrix and occupancy structures (critical)
Two separate representations exist:

1) **Hall template (`Hall.seats`)**
```js
[
  ['regular', 'regular', 'vip'],
  ['wheelchair', 'regular', 'empty']
]
```
Meaning: physical seat layout blueprint for that hall.

2) **Screening snapshot (`Screening.seatOccupancy`)**
```js
[
  [ {type:'regular', status:'available'}, {type:'regular', status:'occupied'} ],
  [ {type:'vip', status:'available'}, {type:'empty', status:'unavailable'} ]
]
```
Meaning: stateful view of seat availability for one specific screening.

This separation is foundational and will be revisited in sections 9 and 13.

---

## 8. SCREENING SCHEDULER SYSTEM

This is the most complex feature. It combines backend validation with frontend timeline UX.

### 8.1 Timeline concept
- Day is represented in 30-minute slots
- UI splits into AM and PM views
- Each hall is one row
- Each screening is a block spanning duration slots

In CSS, `--time-columns: 24` with `SLOT_MINUTES=30` means each view shows 12 hours.

---

### 8.2 Scheduling input channels
Two ways to create/update screening:

1) Manual form (`/admin/screenings/new`) with datetime input
2) Drag movie into timeline slot (`POST /timeline`), or drag existing block to move (`PATCH /timeline/:id/move`)

Both paths eventually hit `ScreeningService` for rule enforcement.

---

### 8.3 Duration and end time calculation
Core formula:

$$
\text{endTime} = \text{startTime} + (\text{movieDurationMinutes} \times 60{,}000)
$$

This is enforced in:
- service create/update logic
- model pre-validate hook (safety net)

---

### 8.4 Overlap prevention logic (including cleaning buffer)
Service constants:
- `BUFFER_BEFORE_MINUTES`
- `BUFFER_AFTER_MINUTES`
- default from env, fallback 15

For a new screening interval `[start, end]`, buffered interval is:

$$
[start - b_{before},\; end + b_{after}]
$$

Query pulls possible conflicts in same hall where:
- existing.start < newBufferedEnd
- existing.end > newBufferedStart
- existing not cancelled

Then overlap is validated again in code and throws AppError with detailed message including conflicting movie and time window.

This double-check is robust and user-friendly.

---

### 8.5 Duplicate screening prevention
Additional rule checks exact duplicate:
- same movie
- same hall
- same startTime
- non-cancelled

Prevents accidental duplicate block creation.

---

### 8.6 Movie eligibility rules for scheduling
`_validateMovieSchedulingEligibility` enforces:
- archived movies cannot be scheduled
- coming-soon movies with future release date cannot be scheduled yet

This links planning workflow directly to movie lifecycle status.

---

### 8.7 Hall eligibility rules for scheduling
Hall must exist and have `status === 'active'`.
Maintenance/cleaning halls are blocked.

---

### 8.8 Timeline data retrieval and rendering
Backend:
- `getTimelineScreeningsByDate` loads screenings overlapping selected day

Frontend (`main.js`):
1. parse preloaded halls/screenings from `data-*` attributes
2. build master grid with hall column + hourly markers
3. for each screening, compute visible overlap with current AM/PM window
4. render block with title/time and actions

---

### 8.9 Drag-and-drop mechanics
Movie drag payload:
```js
{ type: 'movie', movieId, durationMinutes, title }
```
Screening drag payload:
```js
{ type: 'screening', screeningId, durationMinutes, title }
```

On slot hover:
- render preview block showing start/end and buffer note

On drop:
- block past times
- block inactive halls
- dispatch create or move API call
- refresh timeline data

---

### 8.10 Slot snapping
Controller method `_snapToTimelineSlot` rounds submitted start times to nearest 30-minute boundary.
This keeps data aligned with visual grid and prevents weird half-slot offsets.

---

### 8.11 Status lifecycle in scheduler
- new/update -> `Scheduled`
- cancel endpoint -> `Cancelled`
- periodic update call in index/data endpoints marks old scheduled screenings as `Completed`

This keeps timeline semantically clean.

---

## 9. SEAT MANAGEMENT SYSTEM

### 9.1 Two-level seat architecture
The system intentionally separates:
- **hall-level template** (physical arrangement)
- **screening-level occupancy** (state at runtime)

This is similar to:
- class definition (template)
- object instance state (runtime-specific)

---

### 9.2 Hall seat template creation/editing
On hall form page:
- user sets rows/columns
- clicks “Generate Seating Layout”
- seat grid appears
- seat editing modes: regular/vip/wheelchair/unavailable/empty
- client script updates 2D matrix and hidden JSON payload

Backend receives flattened matrix JSON and reconstructs matrix via `HallService.processSeatMatrix`.

---

### 9.3 Seat type counting and distribution
After matrix processed:
- service counts types
- stores compact `seatTypes` summary

Used in hall list/detail for quick stats and badges.

---

### 9.4 Screening seat snapshot initialization
When screening is created or hall changed:
- `buildInitialSeatOccupancy(hallDoc)` maps hall seat template into occupancy cells

Mapping logic:
- `empty` => `{ type:'empty', status:'unavailable' }`
- `unavailable` => `{ type:'unavailable', status:'unavailable' }`
- regular/vip/wheelchair => same type with status `available`

Result: screening receives independent snapshot.

---

### 9.5 Why snapshot per screening matters
Suppose hall template changes tomorrow (renovation). Historical screenings from last week should still show old seat map. Snapshot ensures that.

Without snapshot:
- old screening views would mutate retroactively
- occupancy analytics would become inconsistent

So snapshot gives temporal data integrity.

---

### 9.6 Occupancy view rendering
`screenings/show.ejs`:
- reads `seatOccupancy`
- computes counts by status
- displays read-only seat grid with color-coded legend

If missing occupancy, controller generates fallback and saves it, preventing broken page states.

---

### 9.7 Current scope and future extension
Current app visualizes occupancy but does not include customer booking flow. However model design already supports it (`occupied` status). Future booking engine could toggle seat statuses per ticket purchase.

---

## 10. FRONTEND TEMPLATE SYSTEM (EJS)

### 10.1 What EJS is in this app
EJS files are HTML with embedded JS tags:
- `<%= value %>` escaped output
- `<%- html %>` unescaped output
- `<% logic %>` control flow

Server renders final HTML string and sends to browser.

---

### 10.2 Layout architecture
`views/layouts/main.ejs` is global shell.

It handles two page modes:
- authenticated: sidebar + main content + footer
- unauthenticated: auth page layout

It includes all shared CSS and main JS, plus optional per-page `style`/`script` blocks.

---

### 10.3 Partials
Reusable fragments:
- `partials/sidebar.ejs`
- `partials/navbar.ejs`
- `partials/header.ejs`
- `partials/footer.ejs`

Benefits:
- avoids duplication
- consistent navigation and branding

---

### 10.4 Feature view organization
- `auth/`: login/register/forgot/reset
- `dashboard/`: dashboard summary
- `halls/`: list/form/details
- `movies/`: list/form
- `screenings/`: timeline/form/show
- `admin/settings.ejs`
- `error.ejs`

Create/edit wrapper files include shared `form.ejs` to avoid repeated markup.

---

### 10.5 Controller-to-view data passing pattern
Example pattern:
```js
res.render('movies/index', {
  title: 'Movies',
  username: req.session.username,
  movies,
  genres,
  statuses,
  filters
});
```

In EJS, these become variables directly available in template.

---

### 10.6 Dynamic rendering examples
- conditional alerts:
  ```ejs
  <% if (error) { %> ... <% } %>
  ```
- loops for table rows:
  ```ejs
  <% movies.forEach(movie => { %> ... <% }) %>
  ```
- computed classes for status badges
- date formatting with JavaScript Date methods

---

### 10.7 Flash message integration
`app.js` sets `res.locals.flash`, layout renders alert if present. This pattern centralizes user feedback after redirects.

---

### 10.8 EJS vs plain HTML
Plain HTML is static.
EJS generates dynamic pages from data at request time.

Equivalent idea in Java/Python:
- JSP/Thymeleaf templates (Java)
- Jinja2 templates (Python)

---

## 11. CSS TEMPLATE SYSTEM

### 11.1 CSS files and roles
Loaded in layout in this order:
1. `templatemo-crypto-style.css` (base theme, variables, layout primitives)
2. `templatemo-crypto-dashboard.css` (dashboard components)
3. `templatemo-crypto-pages.css` (page-level reusable patterns)
4. `templatemo-crypto-login.css` (auth page styles)
5. `styles.css` (project-specific overrides and cinema features)

Order matters: later files can override earlier styles.

---

### 11.2 Theme strategy
Template uses CSS custom properties (variables) for dark theme:
- background palette
- text colors
- borders/shadows
- accent gradient

`styles.css` also remaps many Bootstrap variables (`--bs-*`) to dark equivalents, ensuring Bootstrap components match template theme.

---

### 11.3 Reusable UI components
Examples:
- `.action-btn` variants
- cards and tables
- sidebar navigation states
- status badges
- alert color tuning for dark mode

These classes are reused across halls/movies/screenings pages.

---

### 11.4 Seat UI styling
`styles.css` defines cinema-specific classes:
- `.cinema-layout`
- `.seat-layout`
- `.seat-grid`
- `.seat-regular`, `.seat-vip`, `.seat-wheelchair`, `.seat-unavailable`, `.seat-empty`, `.seat-occupied`
- labels and legend icon classes

Grid dimensions are controlled by CSS variables (`--rows`, `--cols`) and set dynamically in JS.

---

### 11.5 Timeline scheduler styling
Key classes:
- `.timeline-master-grid`
- `.timeline-hall-name`
- `.timeline-slot-cell`
- `.timeline-screening-block`
- `.timeline-preview-block`
- toolbar alignment classes

This styling turns plain divs into a schedule planner UI.

---

### 11.6 Responsive behavior
- mobile sidebar toggle and overlay
- reduced seat size at narrow width
- timeline hall column width adjustments

---

### 11.7 Notes on template assets
`public/js/templatemo-crypto-script.js` exists but main layout currently uses `public/js/main.js`, so many template default interactions are effectively superseded by project-specific logic.

---

## 12. REQUEST FLOW EXAMPLES

This section traces real request lifecycle from browser to rendered output.

### Example 1: Admin logs in

#### Step 1: Browser submits form
`POST /login` with `username`, `password` from `views/auth/login.ejs`.

#### Step 2: Route dispatch
`authRoutes.js` maps to `authController.login`.

#### Step 3: Controller validation + user lookup
- checks missing fields
- `User.findOne({ username })`
- lockout check

#### Step 4: Password verification
`await user.verifyPassword(password)` compares with bcrypt hash.

#### Step 5: Session creation
If valid:
- set `req.session.userId`, `username`, `role`, `lastLogin`

#### Step 6: Redirect
`res.redirect('/admin/dashboard')`

#### Step 7: Protected route access
`adminRoutes.js` uses `requireAuth`; since session exists, access granted.

#### Step 8: Dashboard data queries
`dashboardController.index` fetches counts and screenings.

#### Step 9: View rendering
`res.render('dashboard/index', data)` inside `layouts/main.ejs`.

#### Step 10: Browser receives HTML + CSS + JS
User sees dashboard.

---

### Example 2: Admin schedules a movie screening from timeline

#### Step 1: User drag movie to timeline slot
Client JS computes target hall + slot -> datetime.

#### Step 2: AJAX request
`POST /admin/screenings/timeline` with payload:
- movieId
- hallId
- startDateTime

#### Step 3: Controller parsing
`screeningController.createFromTimeline`:
- validates required fields
- snaps time to 30-min slot
- calls `ScreeningService.createScreening`

#### Step 4: Service rule checks
- movie exists and schedulable
- hall exists and active
- start in future
- duplicate check
- overlap check with cleaning buffer

#### Step 5: Seat snapshot initialization
Service generates `seatOccupancy` from hall matrix.

#### Step 6: Save screening document
MongoDB receives new screening.

#### Step 7: JSON success response
Controller returns serialized screening data.

#### Step 8: Client refreshes timeline
`refreshTimelineData()` calls `GET /timeline/data?date=...` and re-renders grid.

Outcome: user sees new block instantly.

---

### Example 3: Admin views seat occupancy for screening

#### Step 1: Browser navigation
`GET /admin/screenings/:id`

#### Step 2: Route -> controller
`screeningController.show`

#### Step 3: Load screening + references
`Screening.findById(...).populate('movie').populate('hall')`

#### Step 4: Occupancy integrity check
If occupancy missing/empty:
- build fallback from hall via service
- save screening

#### Step 5: Compute seat statistics
Counts occupied/available/unavailable from matrix.

#### Step 6: Render EJS
`views/screenings/show.ejs` generates read-only seat map.

#### Step 7: Browser displays occupancy legend and grid
User sees screening-specific seat state snapshot.

---

## 13. KEY DESIGN DECISIONS

### 13.1 Service layer between controller and model
Decision:
- keep controllers thinner
- put reusable business rules in services

Why good:
- avoids duplicating overlap logic in multiple controller functions
- easier to test and maintain domain rules

---

### 13.2 Screening stores seat snapshot (not just hall reference)
Decision:
- persist `seatOccupancy` inside screening

Why good:
- historical consistency over time
- supports per-screening seat states
- future booking integration ready

Tradeoff:
- data duplication (similar structure copied from hall)

---

### 13.3 Timeline uses slot-based grid (30-min blocks)
Decision:
- discrete slots instead of free-pixel timeline

Why good:
- easier drag/drop alignment
- easier overlap reasoning
- cleaner UX for operators

Tradeoff:
- less granular than minute-level scheduling

---

### 13.4 Cleaning buffer enforced before and after screenings
Decision:
- include operational turnaround time in conflict checks

Why good:
- realistic cinema operations
- prevents impossible back-to-back schedules

Tradeoff:
- slightly reduced hall utilization

---

### 13.5 Soft lifecycle via statuses
Movies: Now Showing / Coming Soon / Archived
Screenings: Scheduled / Cancelled / Completed
Halls: active / maintenance / cleaning

Why good:
- supports workflows beyond simple CRUD delete
- keeps history while controlling behavior

---

### 13.6 Session-based authentication with Mongo store
Decision:
- classic server-side session model

Why good:
- simple for server-rendered apps
- no JWT complexity for this assignment scope
- integrates naturally with EJS pages

---

### 13.7 `AppError` + centralized error handler
Decision:
- operational errors use structured custom class

Why good:
- consistent user-facing error pages
- centralized handling of validation/cast/duplicate errors

---

### 13.8 Method override for REST-like forms
Decision:
- use `_method` query parameter

Why good:
- keeps semantic HTTP methods while using standard HTML forms

---

### 13.9 Multi-layer validation strategy
Validation exists in:
- route middleware
- service logic
- model schema/hooks

Why good:
- defense in depth
- prevents invalid states from multiple entry paths

---

## 14. POTENTIAL IMPROVEMENTS

This section proposes realistic expansion directions.

### 14.1 Customer ticket booking module
Add customer-facing flow:
- browse screenings
- pick seats
- reserve/purchase ticket
- mark seats occupied atomically

Technical additions:
- booking model (customer, screening, seats, total)
- transaction/locking strategy for seat concurrency

---

### 14.2 Payment integration
Integrate payment gateway (e.g., Stripe/PayPal)
- payment intents
- webhook reconciliation
- failed payment rollback of seat reservation

---

### 14.3 Role-based authorization hardening
Currently both admin/manager share routes.
Enhance with middleware checks:
- only admin can delete halls/movies
- manager can schedule but not manage users

---

### 14.4 Hall capacity semantics refinement
Current `capacity = rows*columns` might include `empty` and `unavailable` cells.
Potential improvement:
- computed sellable capacity excluding non-sellable seat types

---

### 14.5 Better screening lifecycle automation
Use scheduled jobs (cron/queue) instead of opportunistic updates during page load to mark completed screenings.

---

### 14.6 API and frontend decoupling option
For scaling:
- expose REST/GraphQL API
- build separate SPA frontend (React/Vue)

Current server-rendered model is excellent for learning and internal admin operations, but decoupling can improve large-team scalability.

---

### 14.7 Observability and auditing
Add:
- structured logs
- operation audit trail (who changed what and when)
- metrics for scheduling conflicts and utilization

---

### 14.8 Testing strategy expansion
Current codebase has no test suite.
Recommended additions:
- unit tests for service rules (especially overlap logic)
- integration tests for route flows
- UI smoke tests for timeline drag/drop

---

### 14.9 Database indexing and query optimization
As data grows:
- compound index tuning for frequent timeline queries
- pagination on large lists
- projection optimization for dashboard queries

---

### 14.10 Security enhancements
- CSRF protection for form actions
- stricter rate limiting on login/reset endpoints
- security headers via helmet
- stronger session invalidation policies

---

### 14.11 Maintenance and deployment hardening
- environment-specific config management
- containerized deployment (Docker)
- health checks
- backup/restore plan for MongoDB

---

## Closing Learning Notes (for students)

If you are transitioning from Java/Python, the key conceptual bridges are:
- Express routes ≈ controller endpoints
- middleware chain ≈ request filter pipeline
- Mongoose schema/model ≈ ORM entity + repository behavior
- EJS templates ≈ server-side templating engines in other ecosystems
- service layer = domain logic boundary

The most educational parts of this codebase are:
1. multi-layer validation
2. scheduling conflict algorithm with buffer
3. seat template vs screening snapshot design
4. timeline UI + API interaction loop

A practical way to study this project deeply:
1. Start at `app.js`
2. Follow one route group end-to-end (e.g., screenings)
3. Read corresponding service rules
4. Inspect model schema and hooks
5. Open the EJS view and `main.js` section that consumes the response

By repeating this pattern for each module, you will gain a full-stack mental model of MVC in Express + MongoDB.

---

## APPENDIX A — FILE-BY-FILE DEEP WALKTHROUGH

This appendix expands the main sections and walks through implementation details file by file. Treat this as a “guided code reading companion.”

### A.1 `package.json` deep reading

#### Metadata and scripts
- `name`, `version`, `description` identify project package
- `main: app.js` marks entry script
- scripts:
  - `start`: production-like run (`node app.js`)
  - `dev`: hot-reload style run (`nodemon app.js`)
  - `test`: placeholder currently

This reveals development maturity stage: operational app, but no automated test pipeline yet.

#### Dependencies by responsibility

1) **Server framework**
- `express`

2) **View rendering**
- `ejs`
- `express-ejs-layouts`

3) **Database and session persistence**
- `mongoose`
- `express-session`
- `connect-mongo`

4) **Security/auth primitives**
- `bcrypt`

5) **HTTP ergonomics**
- `method-override`
- `dotenv`

6) **Uploads**
- `multer`

The dependency set is tightly focused and avoids unnecessary libraries. This is good for educational readability.

---

### A.2 `config/db.js` deep reading

`connectDB` is asynchronous and wraps `mongoose.connect` in try/catch.

Behavior:
1. Read `process.env.MONGODB_URI`
2. Attempt connection
3. On success, print host
4. On failure, print message and `process.exit(1)`

Design interpretation:
- failing fast at startup is preferred over serving a broken app without DB
- this makes operational errors obvious in development and deployment

Potential extension:
- add retry strategy for transient startup issues
- add explicit options for timeout tuning

---

### A.3 `middleware/errorMiddleware.js` deep reading

`AppError` is custom typed error.

Fields:
- `statusCode`
- `status` (`fail` for 4xx, `error` for 5xx)
- `isOperational = true`

Operational errors are expected business/user errors; programming errors are unexpected bugs.

`errorHandler` execution path:
1. default status and status string
2. log error detail
3. map known error kinds:
  - Mongoose validation error
  - duplicate key (`11000`)
  - cast error (bad ObjectId)
4. if operational error -> render controlled message
5. otherwise 500 generic message (or detailed in development)

Educational takeaway:
- centralizing error translation is cleaner than repeating try/catch render logic in every controller.

---

### A.4 `middleware/authMiddleware.js` deep reading

`requireAuth` is intentionally small:
```js
if (!req.session || !req.session.userId) return res.redirect('/login');
```

This middleware protects admin routes by presence of session identity.

Security note:
- it is authentication guard, not role-based authorization. Role checks could be added as additional middleware.

---

### A.5 `middleware/validationMiddleware.js` deep reading

This middleware validates incoming request fields before controller logic.

#### `validateScreening`
Checks:
1. movie/hall/startTime present
2. startTime parseable as date
3. startTime is in future

#### `validateHall`
Checks:
1. required fields
2. rows range 1–25
3. columns range 1–25

#### `validateMovie`
Checks:
1. required fields
2. duration range 1–500
3. valid release date
4. status in enum if provided

Pattern insight:
- these are coarse-grained checks. Detailed business checks happen later in services/models.

---

### A.6 `middleware/uploadMiddleware.js` deep reading

Purpose: poster upload pipeline for movie forms.

Steps:
1. Ensure upload directory exists (`public/uploads/posters`)
2. Configure disk storage:
  - destination folder
  - generated filename from sanitized title + timestamp + extension
3. Restrict MIME types (`jpeg/jpg/png/webp`)
4. Enforce file size max 5MB
5. Expose `handlePosterUpload` wrapper that:
  - attaches upload errors into `req.uploadError` (non-fatal to pipeline)
  - continues controller flow

Educational detail:
- by attaching upload errors on request object, controller can rerender form with user message rather than crash.

---

### A.7 `utils/validationUtils.js` deep reading

Contains password policy logic:
- minimum length
- uppercase
- number
- special character

Two exported helpers:
1. boolean validator
2. detailed error list generator

Using both enables:
- simple policy check where only pass/fail needed
- user-friendly feedback when registration/reset fails

---

### A.8 `models/User.js` line-by-line conceptual walkthrough

#### Schema fields and rationale
- `username`: unique human-readable login ID
- `email`: unique recovery channel
- `passwordHash`: stores hash, never plaintext
- `role`: user type
- lockout fields (`failedLoginAttempts`, `accountLocked`, `lockUntil`)
- reset token fields (`resetPasswordToken`, `resetPasswordExpires`)
- `passwordHistory`: prevents recent password reuse

#### Pre-save hook behavior
When `passwordHash` modified:
1. if update (not new user), push previous hash into history
2. keep only latest 5 history entries
3. hash new password with bcrypt salt rounds 10

This hook means controllers can assign plaintext password into `passwordHash`, and model guarantees final stored value is hashed.

#### Methods deep usage map
- `verifyPassword` used by login controller
- `isPasswordReused` used in reset flow
- `incrementLoginAttempts` called on failed login
- `resetLoginAttempts` called on successful login
- `isLocked` used before password verification
- `updateLastLogin` updates audit timestamp
- `createPasswordResetToken` generates random token, stores hash

Lockout policy details:
- after 5 failed attempts, lock for 30 minutes
- lock info persisted in DB, so restart does not reset it

---

### A.9 `models/Hall.js` deep walkthrough

#### Schema structure

`seatTypeSchema` summarizes counts by seat category (`regular`, `vip`, `wheelchair`).

Main hall schema includes:
- geometry (`rows`, `columns`)
- matrix blueprint (`seats`)
- summarized counts (`seatTypes`)
- status and maintenance window

#### Custom matrix validator
When `seats` exists and non-empty:
1. number of rows must equal `this.rows`
2. each row length must equal `this.columns`
3. each seat token must be valid enum

This validator protects matrix consistency at persistence level.

#### Virtual and methods
- `capacity`: geometric capacity
- `getSeatDistribution`: percentages by seat type
- `generateSeatingLayout`: builds row/column label objects for rendering
- `getStatusBadgeClass`: maps status to bootstrap badge class

#### Pre-save hooks
Hook 1:
- validates maintenance date order
- clears maintenance fields when status not maintenance

Hook 2:
- verifies seatType count sum <= capacity

Design note:
- two hooks separate concerns (maintenance integrity vs seat count integrity).

---

### A.10 `models/Movie.js` deep walkthrough

#### Core constraints
- title and description length
- duration bounds
- genre enum
- status enum
- optional poster URL regex

#### Virtual
`durationFormatted` converts minutes into human-friendly text.

#### Method
`getFutureScreeningsCount` queries Screening collection for startTime > now.

#### Static search
Builds dynamic query from optional filters:
- title regex (case-insensitive)
- exact genre
- exact status
- release year range filter

Educational mapping:
- this static is equivalent to a parameterized repository search method in Java/Python.

---

### A.11 `models/Screening.js` deep walkthrough

#### Why both `date` and `startTime`/`endTime`?
- `startTime`/`endTime` needed for exact schedule conflict logic
- `date` supports day-level filters/indexing

#### Pre-validate hook
If new or relevant fields changed:
1. normalize `date` to day boundary of start time
2. load movie duration
3. compute `endTime`
4. if scheduled screening already in past, mark completed

This hook ensures consistency even if controller/service forget to compute fields.

#### Index strategy
- hall+date for per-hall day checks
- startTime for temporal queries
- movie for movie-based lookups

---

### A.12 `services/HallService.js` deep walkthrough

#### `getHallStatistics`
Aggregates hall-level operational data:
- total screenings all-time
- upcoming screenings
- today screenings
- seat distribution and rendered layout

This keeps hall controller simple and avoids repeated query code.

#### `validateMaintenanceDates`
Strong date sanity checks:
- both provided
- both valid dates
- start < end

#### `checkMaintenanceConflicts`
Counts screenings in maintenance range; blocks if any found.

This is key operational rule: hall cannot be marked maintenance during scheduled shows.

#### Seat matrix helpers
- `processSeatMatrix`: validates and reconstructs 2D matrix from flattened payload
- `calculateSeatTypesFromMatrix`: derive summary counts
- `generateDefaultSeatMatrix`: all-regular fallback

Design insight:
- matrix conversion logic in service avoids cluttering controller.

---

### A.13 `services/MovieService.js` deep walkthrough

Responsibilities:
- abstract movie CRUD rules
- ensure deletion safety relative to screenings
- enrich listing with future screening counts

#### `getAllMovies`
Calls `Movie.search` then `_attachScreeningCounts`.

`_attachScreeningCounts` uses aggregation pipeline:
1. match future screenings for given movie IDs
2. group by movie
3. map counts back into each movie object

This avoids N+1 query pattern where each movie would individually query count.

#### `createMovie` / `updateMovie`
Maps form data to model fields and handles poster path if uploaded.

#### `deleteMovie`
Precondition: `futureScreeningsCount` must be zero.

This protects referential business integrity at application level.

---

### A.14 `services/ScreeningService.js` deep walkthrough

This file is domain core for scheduling logic.

#### Constants
- default cleaning buffer from env
- symmetric buffer before and after screening
- minute-to-ms constant

#### `buildInitialSeatOccupancy`
Transforms hall matrix into occupancy objects.

Pseudo-transformation:
```text
if hall has seats matrix:
  use it
else:
  build rows x columns all regular

for each seat token:
  empty -> {type:empty, status:unavailable}
  unavailable -> {type:unavailable, status:unavailable}
  regular/vip/wheelchair -> status:available
```

#### `_validateMovieSchedulingEligibility`
Rules:
- archived blocked
- coming soon blocked until release date

#### `createScreening`
Sequence:
1. parse start time
2. fetch movie and hall
3. apply movie eligibility
4. ensure hall active
5. ensure future date
6. compute end time from duration
7. check exact duplicate
8. overlap check with buffer
9. create screening with seat snapshot

#### `_checkForOverlap`
Computes buffered windows and finds conflicting screenings in same hall.

Conflict condition concept:
Two intervals overlap if
$$
start_1 < end_2 \;\text{and}\; end_1 > start_2
$$

Using buffered intervals broadens collision zone.

#### `updateScreening`
Same validation chain as create, with exclude-self overlap logic.
If hall changed or occupancy missing, reinitialize seat snapshot.

#### `cancelScreening`
Sets status cancelled, with guard against double-cancel.

#### `markCompletedScreenings`
Batch update sets scheduled screenings in past to completed.

#### `getTimelineScreeningsByDate`
Returns screenings overlapping selected day boundaries.

---

### A.15 `controllers/dashboardController.js` deep walkthrough

Key design detail: uses `Promise.all` to run independent queries concurrently.

Why important:
- lower total response latency compared to sequential awaits
- cleaner grouped data assembly

The controller populates movie and hall fields for upcoming screenings, making dashboard table rendering straightforward.

---

### A.16 `controllers/hallController.js` deep walkthrough

#### Input handling complexity
Seat matrix may arrive as:
- JS array
- JSON string

Controller normalizes both. This robustness helps because forms/JS may serialize data differently.

#### Rendering strategy
Same `form.ejs` is used for create and edit, with variable flags and defaults.

#### Error strategy
Operational and validation errors rerender the form with user-friendly messages rather than redirecting to generic error page.

#### Delete strategy
Soft business protection:
- if future screenings > 0, deny deletion and flash danger message.

---

### A.17 `controllers/movieController.js` deep walkthrough

#### Filtering UX
Controller persists filter state by sending `filters` object back to view, so selected filter inputs remain visible after search.

#### Upload ergonomics
Instead of hard-failing immediately on upload issue, controller can display exact upload error inside same form context.

#### Delete UX
Service may throw 400/404 app errors; controller converts these into flash messages and redirects back to list.

---

### A.18 `controllers/screeningController.js` deep walkthrough

This controller bridges two interaction styles:
- full-page SSR
- JSON API for dynamic timeline actions

#### Date normalization helpers
`_normalizeSelectedDate` and `_toDateInputValue` avoid timezone glitches and keep date pickers stable.

#### Serialization helper
`_serializeScreening` deliberately returns minimal client payload shape. This avoids leaking unnecessary fields and simplifies frontend code.

#### Timeline endpoints and HTTP semantics
- create -> `201` JSON
- successful move/delete/cancel -> `200` JSON
- failures -> status from `AppError` or default `500`

#### Show page fallback strategy
If a legacy screening lacks occupancy matrix, controller heals data in-place by generating fallback and saving.

This is a practical migration-safe pattern.

---

### A.19 `routes/*` deep walkthrough by pattern

Each route file follows this structure:
1. `express.Router()`
2. imports
3. optional `router.use(requireAuth)`
4. endpoint declarations
5. export router

Patterns worth learning:
- route-level middleware chain composition
- dynamic params (`:id`, `:token`)
- grouping by resource (`/admin/halls`, `/admin/movies`)

---

### A.20 View layer deep walkthrough (`views/layouts/main.ejs`)

#### Head section
- sets page title dynamically
- preloads theme from localStorage
- includes shared CSS and bootstrap icons

#### Body data attributes
- `data-authenticated`
- `data-session-max-age`

These are consumed in `main.js` for session warning logic.

#### Authenticated branch
Renders:
- mobile toggle
- overlay
- dashboard wrapper with sidebar
- flash alert
- page body
- footer

#### Unauthenticated branch
Renders simpler auth layout.

Educational insight:
- this conditional layout is a lightweight alternative to separate base templates for auth/admin.

---

### A.21 Sidebar and navigation deep walkthrough

`views/partials/sidebar.ejs` contains navigation map and active state logic:
- active class based on page title text includes checks
- grouped sections: Main Menu, Account

Logout is a POST form (good practice; avoids destructive GET semantics).

---

### A.22 Auth pages deep walkthrough

Common structure:
- left branding panel
- right form panel
- consistent message/error alerts

#### Login page
- username/password fields
- links to forgot/register

#### Register page
- username/email/password/confirm
- HTML-level constraints (`minlength`, `pattern`) complement backend validation

#### Forgot password page
- email input only
- generic success response to avoid account enumeration leakage

#### Reset password page
- token validity branch
- requirements list shown when token valid

---

### A.23 Dashboard view deep walkthrough

`views/dashboard/index.ejs` includes:
- stat cards
- quick action buttons
- upcoming screenings table with poster thumbnail
- inline delete form from dashboard context

Interesting detail:
- fallback poster URL used if both local and remote poster fields empty.

---

### A.24 Hall views deep walkthrough

#### Hall list (`halls/index.ejs`)
- tabular overview of capacity, configuration, status, maintenance period
- action buttons (view/edit/delete)

#### Hall form (`halls/form.ejs`)
This is one of the richest templates:
- create/edit mode toggles
- dynamic seat editor controls
- maintenance conditional fields
- hidden `seatMatrix` payload
- inline script for capacity and maintenance field behavior

#### Hall show (`halls/show.ejs`)
- KPI cards
- seat distribution with progress bars
- read-only seat matrix preview
- hall metadata table

---

### A.25 Movie views deep walkthrough

#### Movie list (`movies/index.ejs`)
Includes:
- filter/search form
- results table
- status badges
- future screening count badge
- delete guard modal for movies with future screenings

#### Movie form (`movies/form.ejs`)
- status select with policy guidance
- poster file input + live preview
- create/edit mode support

---

### A.26 Screening views deep walkthrough

#### Screening index timeline (`screenings/index.ejs`)
Structure:
- scheduler root with encoded JSON data attributes
- date controls (prev/next/today)
- AM/PM view toggles
- timeline alert box
- timeline grid container
- draggable movie library panel

This template is mostly UI shell; heavy behavior is in `main.js`.

#### Screening form (`screenings/form.ejs`)
- manual scheduling controls
- end-time preview computed in browser
- future min datetime initialization

#### Screening show (`screenings/show.ejs`)
- summary cards
- screening metadata
- read-only occupancy grid by row/column labels

---

### A.27 `public/js/main.js` deep walkthrough (part 1: global UI behavior)

Global DOM-ready tasks:
- enforce dark theme
- mobile sidebar toggles
- auto-dismiss non-info alerts
- generic form submit loading state
- nav active highlight helper
- password confirmation custom validity
- datetime min guard for local datetime inputs

Session warning subsystem:
- reads session max age from body data attr
- schedules warning modal 5 min before expected expiry
- supports “Continue Session” ping via `HEAD /admin/dashboard`
- resets timer on user activity with throttled reset logic

Educational note:
- this is a client-side approximation of session expiry, not guaranteed exact server TTL sync.

---

### A.28 `public/js/main.js` deep walkthrough (part 2: hall seat editor)

Triggered only when hall form has `generateLayoutBtn`.

Main local state:
- `currentSeatMode`
- `seatMatrix`
- `rows`, `columns`

Workflow:
1. generate matrix defaults regular
2. show editor controls
3. render row labels, column labels, seat cells
4. click seat -> change type according to mode
5. recalc counts
6. flatten matrix into hidden input JSON

Edit mode:
- reads `window.seatMatrix` (injected by EJS)
- preloads existing matrix and displays immediately

This is a good example of server-injected data bootstrapping client state.

---

### A.29 `public/js/main.js` deep walkthrough (part 3: timeline scheduler engine)

#### Initialization
- activates if `#screeningScheduler` exists
- defines slot model (`SLOT_MINUTES=30`)
- parses halls and screenings from encoded data attrs

#### Time helpers
- day start normalization
- date formatting for display and API payloads
- slot index to datetime conversion

#### Grid rendering logic
For each hall row:
1. create hall info cell
2. create slot cells
3. attach dragover/dragleave/drop listeners per slot
4. render existing screening blocks overlapping view

#### Screening block rendering
Each block includes:
- title and time text
- edit and delete mini actions
- drag handle behavior for scheduled entries

Poster support:
- if poster exists, uses background image + dark overlay

#### Preview block
During dragover:
- renders temporary preview showing proposed schedule
- includes duration and buffer text

#### Drop behavior
On drop slot:
- reject inactive hall
- reject past time
- if payload movie -> create API
- if payload screening -> move API

#### API utility
`requestJson` wraps fetch, parses JSON, throws on non-success.

#### Data refresh cycle
After create/move/delete/cancel operations:
1. call timeline data endpoint
2. replace in-memory screenings
3. rerender grid

This render-refresh approach avoids complex in-place mutation bugs.

---

### A.30 `public/css/styles.css` deep walkthrough

#### UI scaling
Uses global scale variable (`--ui-scale: 0.75`) applied to body transform.
This is uncommon but can standardize density for dashboard-like views.

#### Seat system CSS
Defines grid geometry with CSS variables and semantic seat color classes.

#### Timeline CSS
Defines master grid columns, block visuals, preview styles, toolbar dimensions.

#### Dark Bootstrap remapping
Extensive override of `--bs-*` variables ensures Bootstrap components match dark palette and avoid white-card mismatches.

---

### A.31 `views/error.ejs` deep walkthrough

A standalone layout (does not rely on main layout) used by centralized error middleware.

Behavior:
- prints title + message
- if user exists, back to dashboard button
- else go to login button

This keeps error UX simple and reliable even if main layout context is not ideal.

---

### A.32 End-to-end data shape examples

#### Hall create payload (simplified)
```json
{
  "name": "Hall A",
  "rows": "10",
  "columns": "15",
  "status": "active",
  "seatMatrix": "[\"regular\",\"vip\", ... ]"
}
```

#### Movie create payload
`multipart/form-data`:
- text fields (`title`, `description`, ...)
- file field `poster`

#### Timeline create payload
```json
{
  "movieId": "...",
  "hallId": "...",
  "startDateTime": "2026-03-14T14:30"
}
```

#### Serialized timeline screening returned to browser
```json
{
  "id": "...",
  "status": "Scheduled",
  "startTime": "...",
  "endTime": "...",
  "movie": { "id": "...", "title": "...", "durationMinutes": 120, "genre": "Action", "poster": "/uploads/posters/..." },
  "hall": { "id": "...", "name": "Hall 1", "status": "active" }
}
```

---

### A.33 Code-reading exercises for students

To deepen understanding, try these exercises:

1. **Trace one request manually**
  - choose `POST /admin/screenings/timeline`
  - write each function called in order

2. **Change buffer value**
  - set `SCREENING_BUFFER_MINUTES` in env
  - predict overlap behavior before running

3. **Create hall with empty seats**
  - verify how occupancy snapshot maps `empty` and `unavailable`

4. **Test movie status rules**
  - attempt scheduling archived and coming-soon movies
  - observe service error messages

5. **Inspect session lifecycle**
  - login, wait near timeout, observe warning modal behavior

Exercises convert passive reading into active architecture learning.

---

### A.34 Conceptual mapping table (Java/Python to this stack)

| Concept (Java/Python) | This project equivalent |
|---|---|
| Controller endpoint method | Express route + controller function |
| Filter/interceptor | Express middleware |
| Service class | `services/*Service.js` |
| Entity/ORM model | Mongoose model schema |
| Template engine (JSP/Jinja) | EJS |
| Session auth | `express-session` + `connect-mongo` |
| Validation annotations + checks | middleware + schema validators + hooks |

Use this table when switching mental models between ecosystems.

---

### A.35 Common misconceptions clarified

1. **“MongoDB has no schema, so anything goes.”**
  - In raw MongoDB maybe flexible, but this app uses Mongoose schema validation heavily.

2. **“Controller should contain all logic.”**
  - Here, heavy rules are intentionally in services for reuse and clarity.

3. **“If hall layout changes, old screenings should update automatically.”**
  - Not desired; historical screening snapshot must stay stable.

4. **“Cancelled screenings are same as deleted.”**
  - No. Cancel keeps record and history; delete removes document.

5. **“Client timeline checks are enough.”**
  - Backend always re-validates to prevent unsafe states.

---

### A.36 Suggested refactor roadmap (educational sequence)

If this were a semester-long evolution project:

Phase 1:
- extract constants and shared date helpers into utility modules
- add DTO-style serializers for all JSON endpoints

Phase 2:
- add unit tests for `ScreeningService._checkForOverlap`
- add integration tests for auth and CRUD paths

Phase 3:
- enforce role-based authorization middleware
- implement soft-delete strategy where appropriate

Phase 4:
- add booking subsystem and payment simulation

Phase 5:
- improve observability (audit trail + structured logs)

This progression preserves current architecture while increasing capability safely.

---

## APPENDIX B — STEP-BY-STEP EXECUTION TRACES (SLOW WALKTHROUGH)

This appendix intentionally slows down the pace. The purpose is to show exactly how runtime control moves through functions.

### B.1 Full trace: first app startup (`node app.js`)

1. Node runtime loads `app.js`.
2. `require('dotenv').config()` reads environment variables.
3. Modules are imported (`routes`, `middleware`, `connectDB`, libraries).
4. `const app = express()` creates Express application object.
5. `connectDB()` runs asynchronously:
  - calls Mongoose connect
  - if success logs host
  - if failure exits process
6. View engine and layout configuration are applied.
7. General middleware registered in order:
  - JSON parser
  - URL encoded parser
  - method override
  - static file server
  - session middleware
8. Locals injection middleware registered.
9. Routers mounted to prefixes.
10. 404 fallback registered.
11. error handler registered.
12. `app.listen` starts server socket and logs URL.

Key learning: middleware order is not decorative; it is runtime control flow order.

---

### B.2 Full trace: page load for unauthenticated user (`GET /`)

1. Browser sends `GET /`.
2. Express passes request through middleware chain.
3. Route mount `/` matches `authRoutes`.
4. Route handler in `authRoutes.js` checks session:
  - if `req.session.userId` exists -> redirect `/admin/dashboard`
  - else redirect `/login`
5. Browser follows redirect to `/login`.
6. `authController.renderLogin` renders `auth/login.ejs`.
7. Layout branch sees no `user`, so auth-page layout branch is used.
8. Browser receives final HTML and loads styles/js.

---

### B.3 Full trace: successful login

Let’s walk this like debugger steps.

#### Request
`POST /login` with form body.

#### Step-by-step runtime
1. Request reaches `authRoutes` -> `authController.login`.
2. Controller extracts `username`, `password` from `req.body`.
3. Null/empty check performed.
4. `User.findOne({ username })` query executes.
5. If user missing, returns rendered login with generic error.
6. If user present, `user.isLocked()` check runs.
7. If locked and lock expiry in future, render lock warning.
8. `await user.verifyPassword(password)` executes bcrypt compare.
9. If mismatch:
  - `await user.incrementLoginAttempts()`
  - calculate remaining attempts
  - render login with warning
10. If match:
  - `await user.resetLoginAttempts()`
  - `await user.updateLastLogin()`
  - set session fields
  - redirect `/admin/dashboard`
11. Browser requests dashboard.
12. `requireAuth` middleware passes.
13. dashboard controller queries stats and renders page.

Important observation:
- login is not just “verify and redirect”; it also performs security-state maintenance (lock counters, timestamps).

---

### B.4 Full trace: failed login until lockout

Attempt 1 to 4:
- each mismatch increments `failedLoginAttempts`
- message includes remaining attempts when close to lock

Attempt 5:
- `incrementLoginAttempts` sets:
  - `accountLocked = true`
  - `lockUntil = now + 30 minutes`
- user is effectively blocked until lock window expires

Subsequent attempts before expiry:
- `isLocked()` returns true
- controller returns lock message immediately

Security value:
- slows brute-force attacks
- gives user visible feedback

---

### B.5 Full trace: registration

1. Browser submits `POST /register`.
2. Controller validates required fields and matching passwords.
3. `isStrongPassword` policy check.
4. New `User` object created with `passwordHash: password` (plaintext currently in memory).
5. `user.save()` triggers pre-save hook:
  - hashes password
6. Mongo stores hash, never plaintext.
7. Session fields set and redirect dashboard.

Potential concern students often have:
- “Why assign plaintext to field named passwordHash?”
  - because hook transforms before persistence. Naming is slightly confusing but behavior is safe if hook always runs.

---

### B.6 Full trace: forgot/reset password

#### Forgot
1. `POST /forgot-password` with email
2. find user by email
3. if not found, still return generic success-style message
4. if found:
  - generate random reset token
  - store SHA-256 hash of token
  - set expiry timestamp
  - save without full validation
  - in development, log reset URL

#### Reset page open
1. `GET /reset-password/:token`
2. hash incoming token and query by hash + expiry > now
3. if invalid/expired, render invalid token state
4. else render reset form

#### Reset submit
1. same token validation
2. validate new password + confirmation
3. enforce strength
4. check reuse against password history hashes
5. assign new password (hook hashes)
6. clear reset token fields and lockout fields
7. save and render login success message

---

### B.7 Full trace: hall creation with custom seat matrix

1. User opens `/admin/halls/new`.
2. Form rendered with defaults.
3. User enters rows/columns and generates seat layout.
4. Client JS creates 2D array and interactive grid.
5. User changes some seats to vip/wheelchair/unavailable/empty.
6. On submit, JS flattens matrix into hidden `seatMatrix` JSON string.
7. `POST /admin/halls` arrives.
8. `validateHall` middleware checks basic fields.
9. `hallController.create` parses body.
10. `normalizeSeatMatrixInput` parses JSON into array.
11. `HallService.processSeatMatrix` rebuilds 2D matrix with validation.
12. `calculateSeatTypesFromMatrix` computes counts.
13. Hall document created and saved.
14. Flash success stored in session.
15. Redirect to hall list where flash is displayed once.

---

### B.8 Full trace: hall update to maintenance status

1. User edits hall and sets status to maintenance.
2. Form requires start/end dates (client-side requirement toggled by JS).
3. Submit `PUT /admin/halls/:id`.
4. Controller loads hall.
5. Service validates maintenance date order.
6. Service checks conflict screenings within maintenance window.
7. If conflicts > 0 -> AppError returned to form.
8. If no conflicts -> maintenance fields set and save succeeds.

This demonstrates business validation that requires database context (cannot be done by simple field checks alone).

---

### B.9 Full trace: movie create with poster upload

1. Browser submits multipart form with file.
2. `handlePosterUpload` middleware runs before validation middleware.
3. Multer saves file if valid.
4. If file invalid/too large, middleware sets `req.uploadError`.
5. `validateMovie` checks textual fields.
6. `movieController.create` sees `req.uploadError`:
  - rerenders form with upload error (no crash)
7. If no upload error, service creates movie with `posterPath`.
8. Redirect and flash success.

---

### B.10 Full trace: movie deletion blocked by future screenings

1. User clicks delete on movie list.
2. `DELETE /admin/movies/:id`
3. Controller calls `MovieService.deleteMovie`.
4. Service queries movie.
5. Service calls `movie.getFutureScreeningsCount()`.
6. If count > 0, throw `AppError(400)` with explanatory message.
7. Controller catches and sets flash danger.
8. User redirected to movie list with explanatory alert.

This is a robust UX because the reason is specific and actionable.

---

### B.11 Full trace: screening create from manual form

1. User fills movie, hall, datetime.
2. `POST /admin/screenings` -> validation middleware first.
3. Controller converts start time string to Date object.
4. `ScreeningService.createScreening` executes rule chain.
5. On success save + flash + redirect list.
6. On failure controller rerenders form with error and repopulated movies/halls.

---

### B.12 Full trace: screening create from timeline drag-and-drop

This is asynchronous JSON flow.

1. Movie card drag starts in browser.
2. `dragPayload` stored with movie id + duration.
3. User drags over hall slot; preview block shown.
4. User drops.
5. Client computes start datetime from slot index and selected date.
6. Client calls `POST /admin/screenings/timeline`.
7. Controller validates, snaps to nearest slot.
8. Service applies full schedule checks.
9. On success returns serialized screening JSON.
10. Client refreshes timeline dataset.
11. Grid rerenders with new block.

---

### B.13 Full trace: screening move operation

1. Existing block drag starts (if status scheduled).
2. Payload type is `screening`.
3. Drop on target hall/slot.
4. Client calls `PATCH /timeline/:id/move` with new hall/time.
5. Controller loads existing screening to preserve movie id.
6. Service `updateScreening` applies duplicate and overlap checks excluding same record.
7. If hall changed, seat occupancy is rebuilt from new hall template.
8. Updated screening returned and timeline refreshed.

---

### B.14 Full trace: screening cancellation vs deletion

Cancellation (`PATCH /:id/cancel` or timeline cancel):
- sets status cancelled
- record remains for history

Deletion (`DELETE /:id` or timeline delete):
- physically removes record

Operational guidance:
- cancellation preferred when historical trace matters
- deletion for cleanup of mistakes/test data

---

### B.15 Full trace: opening screening seat overview page

1. Browser requests `/admin/screenings/:id`.
2. Controller loads screening with populated refs.
3. If occupancy matrix invalid/missing:
  - generate from hall
  - save screening
4. Flatten matrix to calculate stats.
5. Render show page with legend and read-only seat map.

---

### B.16 Detailed pseudo-code for overlap algorithm

```text
function checkOverlap(hallId, newStart, newEnd, excludeId=null):
   beforeBufferMs = BUFFER_BEFORE_MINUTES * 60000
   afterBufferMs  = BUFFER_AFTER_MINUTES  * 60000

   newStartBuffered = newStart - beforeBufferMs
   newEndBuffered   = newEnd   + afterBufferMs

   candidates = screenings where
      hall == hallId
      status != Cancelled
      startTime < newEndBuffered
      endTime > newStartBuffered
      if excludeId: id != excludeId

   for each existing in candidates:
      existingStartBuffered = existing.startTime - beforeBufferMs
      existingEndBuffered   = existing.endTime   + afterBufferMs

      if existingStartBuffered < newEndBuffered AND
        existingEndBuffered > newStartBuffered:
          throw conflict error with movie title/hall/time

   return true
```

Why query and loop both?
- query narrows candidate set efficiently in DB
- loop allows rich conflict message and explicit final check

---

### B.17 Detailed pseudo-code for seat matrix transformation

#### Hall form flattened payload to 2D matrix
```text
input: flatSeatArray length rows*columns
for row in 0..rows-1:
   rowSeats = []
   for col in 0..cols-1:
      index = row*cols + col
      type = flatSeatArray[index] or 'empty'
      validate type
      rowSeats.push(type)
   result.push(rowSeats)
```

#### Hall template to screening occupancy
```text
for each seatType in hall.seats matrix:
   if seatType == 'empty':
     push {type:'empty', status:'unavailable'}
   else if seatType == 'unavailable':
     push {type:'unavailable', status:'unavailable'}
   else:
     normalized = seatType in [regular,vip,wheelchair] ? seatType : regular
     push {type:normalized, status:'available'}
```

---

### B.18 Detailed pseudo-code for session warning timer in `main.js`

```text
SESSION_MAX_AGE = body.dataset.sessionMaxAge or 86400000
WARNING_TIME = 5 minutes
TIME_UNTIL_WARNING = SESSION_MAX_AGE - WARNING_TIME

schedule warning timeout

on warning:
  show modal
  start countdown from 5:00
  if continue clicked:
    HEAD /admin/dashboard
    if success: reset timers
    else redirect login
  if countdown reaches 0:
    redirect login?expired=true

on user activity (throttled):
  reset timer state
```

This illustrates how frontend can provide UX warnings for backend session expiry.

---

### B.19 Troubleshooting decision tree (runtime)

If app does not start:
1. Check MongoDB reachable and `MONGODB_URI` valid
2. Check session secret and env loading
3. Inspect startup logs from `connectDB` and `app.listen`

If login always fails:
1. Verify user exists in DB
2. Check lock state fields
3. Confirm bcrypt hashing by checking user creation path

If scheduling fails unexpectedly:
1. Verify hall is active
2. Verify movie status/release date constraints
3. Confirm startTime is future
4. Inspect overlap buffer conflict message

If seat view appears empty:
1. Check hall seat template exists
2. Confirm fallback generation logic ran
3. Verify `seatOccupancy` persisted after fallback save

---

### B.20 Incremental study plan (multi-session)

To truly get “several hours” value from this document, use this pacing:

Session 1 (90–120 min):
- Sections 1–5 + Appendix A.1–A.7

Session 2 (90–120 min):
- Models and services (Sections 6–9 + Appendix A.8–A.14)

Session 3 (90–120 min):
- View/template/CSS/JS engine (Sections 10–12 + Appendix A.20–A.30)

Session 4 (60–90 min):
- Design decisions and improvements + Appendix B traces

This schedule turns reading into guided architecture training.


