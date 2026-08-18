# EcoWorld Pile Drawing Review Prototype

A fully interactive three-step website prototype:

1. Dependent property dropdowns
   - Eco Grandeur → Avenham Garden / Regent Garden
   - Eco Majestic → Vila / Vyla
   - Eco Botanic → Nortern Garden
2. Four required drawing uploads
   - Construction Drawing
   - Architecture Drawing
   - Pile Efficiency Drawing
   - Pile Load
3. AI/OCR review
   - Extracts PDF text and runs OCR on image drawings
   - Detects pile type, diameter, length, load, test load, efficiency, spacing and concrete grade
   - Compares extracted values across the four documents

## Storage

Files are saved in browser IndexedDB. This is persistent local storage: files remain after refresh on the same browser/device. No external cloud account or credentials are required.

For a production deployment, replace IndexedDB with approved corporate storage such as Azure Blob, AWS S3, SharePoint, Firebase Storage or Supabase Storage, with authentication and access controls.

## Run

Because PDF/OCR libraries are loaded as modules from a CDN, serve the folder through a local web server instead of double-clicking the HTML file.

With Python installed:

```bash
cd ecoworld-pile-review
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Supported uploads

- PDF
- PNG
- JPG / JPEG
- WEBP
- TXT (useful for testing extraction logic)

Maximum file size is 25 MB per file.

## Important engineering note

This is a prototype document-review aid, not a replacement for professional engineering verification. OCR and regex extraction can miss annotations or misread drawings, especially scanned or low-resolution files.

## Quick demo

The `demo-files` folder contains four small text files you can upload to test the full flow immediately. The pile-load demo intentionally contains a **350 mm** diameter while the other files contain **300 mm**, so the comparison screen should flag a diameter mismatch.
