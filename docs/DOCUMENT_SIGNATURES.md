# Document Signatures

Purpose:

Allow documents to move through a signature workflow.

## Table

```text
document_signatures
```

Fields:

- document_id
- requested_by
- signed_by
- signer_name
- signer_email
- status
- signature_type
- signature_data
- comment
- requested_at
- signed_at
- rejected_at

## Statuses

```text
pending
signed
rejected
```

## API

List signatures for document:

```text
GET /api/v1/documents/{documentId}/signatures
```

Request signature:

```text
POST /api/v1/documents/{documentId}/signatures
```

Sign document:

```text
POST /api/v1/documents/{documentId}/signatures/{signatureId}/sign
```

Reject signature request:

```text
POST /api/v1/documents/{documentId}/signatures/{signatureId}/reject
```

## Roles

Request signature:

```text
manager / admin
```

Sign or reject:

```text
authenticated user
```

## Current MVP signature type

```text
typed
```

This means signature_data stores a typed text signature.

Later this can be extended to canvas/image signature data.

## Document status

When a signature is signed, the related document status is updated to:

```text
signed
```

## Audit actions

- document_signature_requested
- document_signed
- document_signature_rejected

## Frontend

```text
/documents
```

The documents page supports:

- open document signature panel
- request signature
- sign pending signature request
- reject pending signature request
