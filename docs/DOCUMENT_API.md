# Document API

Purpose:

Store document and Belege metadata for future PDF/OCR/signature workflows.

## API

List documents:

```text
GET /api/v1/documents
```

Create document metadata:

```text
POST /api/v1/documents
```

## Fields

- client_id
- work_order_id
- title
- type
- status
- file_path

## Frontend

```text
/documents
```

The current UI creates document metadata placeholders.

## Not implemented yet

- real file upload
- PDF preview
- OCR extraction
- signature workflow
