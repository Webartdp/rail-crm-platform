# Document API

Purpose:

Store document and Belege metadata and files for future PDF/OCR/signature workflows.

## API

List documents:

```text
GET /api/v1/documents
```

Show document metadata:

```text
GET /api/v1/documents/{id}
```

Create document metadata or upload file:

```text
POST /api/v1/documents
```

Download stored file:

```text
GET /api/v1/documents/{id}/download
```

Print/export data:

```text
GET /api/v1/documents/{id}/print-data
```

Mark document OCR as pending:

```text
POST /api/v1/documents/{id}/ocr/start
```

Save extracted OCR text:

```text
POST /api/v1/documents/{id}/ocr/text
```

## Roles

Create/upload/download/OCR/print actions require:

```text
manager / admin
```

## Upload

Use multipart/form-data with fields:

- title
- type
- status
- work_order_id
- file

Allowed file types:

- PDF
- JPG
- PNG
- WebP

Max file size:

```text
10 MB
```

Storage path:

```text
storage/app/documents
```

The folder is created automatically on upload.

## Print data

The print data endpoint returns:

- document
- work_order
- signatures
- printed_by
- printed_at

Frontend page:

```text
/documents/{id}/print
```

The print page shows:

- document metadata
- related work order
- OCR/extracted text
- typed signatures
- canvas signatures as images
- print button

## OCR fields

- ocr_status: not_started / pending / done
- extracted_text
- ocr_processed_at

## Fields

- client_id
- work_order_id
- title
- type
- status
- file_path
- original_filename
- mime_type
- size_bytes
- uploaded_by
- ocr_status
- extracted_text
- ocr_processed_at

## Frontend

```text
/documents
```

The UI supports:

- metadata-only document creation
- real file upload
- file metadata display
- protected download via API
- inline preview for PDF files
- inline preview for image files
- print/export page link
- mark OCR pending
- save extracted OCR text

## Preview implementation note

Preview uses the protected download API through frontend fetch.

The frontend receives a Blob, creates an object URL, then renders:

- PDF in iframe
- images in img

This keeps the document endpoint protected by Bearer token instead of exposing public file URLs.

## Not implemented yet

- automatic OCR extraction service
