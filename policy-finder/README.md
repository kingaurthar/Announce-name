# Policy Finder (Android)

Offline policy finder for NBFC field / branch use. Everything is stored on the phone – nothing is uploaded.

## Features
- **Find** – type a product or a situation (e.g. `tw cibil 720 36 months`, `low cibil`, `lap commercial 80 lakh`).
  Results come instantly from products, situations, LTV grids and text inside your policy PDFs.
  Understands short forms (pl, bl, lap, tw, cv, roi, pf, ntc…) and small spelling mistakes.
- **Instant LTV answer** – if your search has numbers (CIBIL, vehicle age, tenure, loan amount), the matching grid cell is shown on top.
- **Ask a question → YES / NO / ONLY WITH CONDITIONS, with the reason** – e.g.
  `need a tata 1109 vehicle loan but applicant has no property proof, can we do it?` → **NO**, quoting the exact
  line from your uploaded policy (“Property proof … is mandatory for all CV cases”) with document name and page.
  Also compares limits: `pl for 70 year old?` (age 21–58 → NO), `tw loan with cibil 620?`.
  Works fully offline from your PDFs, photos (read by OCR), product notes and saved situations.
- **Reads text from photos & scanned PDFs (OCR, offline)** – done automatically on upload; for older files use
  *More → Read text from photos & scanned PDFs*. Each file shows the text it read, so you can check it.
- **Vehicle loan check** – choose a vehicle model + manufacturing year + tenure and get the **max loan amount, max tenure, rate (ROI), LTV and EMI**.
  Also works from the search box: `swift 2019 36 months`, `activa 2023 3 years`.
  Set it up in the *Vehicle/LTV* tab:
  - **Schemes** (Car / Two Wheeler / CV…): age bands with LTV %, ROI %, max tenure, optional max loan; max vehicle age at loan end; value % of new price by age.
  - **Vehicle models**: new price and optional year-wise valuation. Bulk add by pasting from Excel (`Model, Scheme, Price, 2025, 2024, …`).
- **Products** – interest rate, processing fee, documentation charges, other charges, amount, tenure, eligibility, notes.
- **Policies** – upload policy PDFs and photos. PDF text is read automatically for search; open them in-app with zoom and “Find in this PDF”.
- **LTV / Tenure grids** – rows (CIBIL / vehicle age / property type…) × columns (tenure / amount). Pick from dropdowns or tap a cell. Paste tables straight from Excel.
- **Situations → Solutions** – save common cases with the answer.
- **EMI / PF / LTV calculator**, CSV import for products, full backup / restore.

The app ships with clearly marked **SAMPLE** data. Replace it with your real policy, or remove it in *More → Delete sample data*.

## Getting the APK
Every push that changes `policy-finder/` builds the APK in GitHub Actions
(`.github/workflows/policy-finder-apk.yml`). Download `PolicyFinder.apk` from the
**Releases → “Policy Finder APK (latest)”** page on your phone and install it.

New builds are signed with the same key (`keystore/`), so they install as an update and keep your data.
Still, use *More → Export full backup* from time to time.

## Build locally
Requires JDK 17 + Android SDK: `cd policy-finder && gradle assembleRelease`
