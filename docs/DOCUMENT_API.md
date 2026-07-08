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

## Roles

Create/upload/download requires:

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

## Frontend

```text
/documents
```

The UI supports:

- metadata-only document creation
- real file upload
- file metadata display
- protected download via API

## Not implemented yet

- PDF inline preview
- OCR extraction
- signature workflow
