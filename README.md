# HealthLens

HealthLens is a full-stack health-report understanding web application for academic/demo use. It turns a laboratory report into structured results, retrieves medical terminology information dynamically from MedlinePlus, and provides a compact one-page report summary.

## Stack
- React 19 + Vite
- Express + Node.js
- MongoDB + Mongoose
- JWT authentication
- Multer file upload
- PDF text extraction with pdf-parse, including layout-aware extraction and support for common vertical/table report layouts
- Recharts
- Lucide React
- Responsive custom CSS

## Main features
- Registration and login
- Protected dashboard
- Medical report upload
- Structured extraction of test name, result, unit, report-specific reference range, status and method
- Status calculation from the reference range printed on the uploaded report
- Dynamic MedlinePlus terminology lookup instead of a test-by-test explanation list
- Short plain-language explanation generated from the matched MedlinePlus result
- Clickable **Source: MedlinePlus** link to the exact matched page
- Dynamic "Why is it measured?" information from the matched source
- Status- and category-aware general nutrition & wellness guidance
- Conservative medical safety language and healthcare-professional guidance
- Report history with search and filters
- Trends charts
- Profile/settings
- Responsive dark professional UI
- **One-page HealthLens report summary** at the end of every report
- **Print / Save PDF** button for the one-page summary

## MedlinePlus integration
HealthLens uses the official MedlinePlus Web Service. The application searches the requested laboratory terminology, prioritizes exact title matches, uses the returned MedlinePlus summary/snippet to create a short explanation, and returns the matched page URL for the source link.

The application does not copy a complete MedlinePlus page into HealthLens. It displays a short educational summary and links the user to the MedlinePlus source.

## Run

### 1. Requirements
Install:
- Node.js 20+
- MongoDB Community Server, or use MongoDB Atlas

### 2. Environment
Copy:
`server/.env.example` -> `server/.env`

Set:
- MONGO_URI
- JWT_SECRET
- PORT=5000

### 3. Install
From the HealthLens folder:

```powershell
npm install
npm run install-all
```

### 4. Start
```powershell
npm run dev
```

Frontend:
http://localhost:5173

Backend:
http://localhost:5000

The Vite development server proxies `/api` requests to the Express server on port 5000.

## Demo account
The app provides a "Use Demo Account" action on the login page.

## One-page summary
Open any analyzed report and scroll to **HealthLens report summary** at the bottom. Select **Print / Save PDF**. The print stylesheet hides the rest of the application and formats only the summary as an A4 portrait page, so the browser's print dialog can be used to save the summary as a PDF.

## Medical safety
HealthLens is educational software. It does not diagnose conditions or prescribe medication. Reference ranges vary by laboratory and individual circumstances. A result outside a reference range does not by itself establish a diagnosis. Users should discuss persistent, concerning or symptomatic results with a qualified healthcare professional.


### Upload format
HealthLens accepts medical report PDFs up to 25 MB. It extracts report-specific result values, units and reference ranges rather than assuming a fixed reference range.

## Web-researched nutrition & wellness guidance

HealthLens now performs a separate web search through the MedlinePlus Web Service for nutrition/lifestyle guidance for each laboratory terminology and result status. It extracts relevant source facts, converts them into short plain-language bullets, and stores the source URL/title. This wellness lookup is independent from the terminology explanation lookup, so an exact MedlinePlus test page is not required for wellness guidance. If no suitable web guidance is found, HealthLens uses a conservative terminology/status-specific fallback rather than a generic paragraph.
