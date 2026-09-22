# HealthLens PDF parser fix

This build includes a multi-layout medical laboratory PDF parser.

Tested against the supplied report layouts:
- PALAK CHANDVANIYA report: 23 laboratory rows with usable reference ranges were extracted.
- Apollo/Sample Smart Report Clinics: 54 laboratory rows with usable reference ranges were extracted; placeholder `0 - 0` HbA1c/eAG ranges are intentionally not treated as real reference ranges.

The parser supports:
- same-line rows (`TEST : value unit range`)
- table rows without a colon (`TEST value unit range`)
- vertically extracted PDF tables (`TEST` / `: value` / `unit` / `range`)
- multi-line test names
- report-specific reference ranges
- comma-formatted values
- common medical units
- High/Low status derived from the report's own range
- conservative rejection of page/date/chart noise

Wellness guidance is generated independently of MedlinePlus, so MedlinePlus availability cannot remove the General nutrition & wellness section.

For image-only scanned PDFs, OCR is still required because there is no machine-readable text to parse.
