<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use App\Support\Ocr;
use App\Support\SignatureProtocolPdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('documents')->orderByDesc('id')->limit(100)->get(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $document = DB::table('documents')->where('id', $id)->first();

        if (!$document) {
            return response()->json(['message' => __('Document not found.')], 404);
        }

        return response()->json(['data' => $document]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can create documents.')], 403);
        }

        $title = trim((string) $request->input('title', ''));

        if ($title === '') {
            return response()->json([
                'message' => __('Document title is required.'),
                'errors' => ['title' => ['Title is required.']],
            ], 422);
        }

        $upload = $this->handleUpload($request);
        if ($upload instanceof JsonResponse) {
            return $upload;
        }

        $now = now();
        $id = DB::table('documents')->insertGetId([
            'client_id' => $request->input('client_id'),
            'work_order_id' => $request->input('work_order_id'),
            'title' => $title,
            'type' => $request->input('type', 'report'),
            'status' => $request->input('status', $upload ? 'uploaded' : 'draft'),
            'file_path' => $upload['file_path'] ?? $request->input('file_path'),
            'original_filename' => $upload['original_filename'] ?? null,
            'mime_type' => $upload['mime_type'] ?? null,
            'size_bytes' => $upload['size_bytes'] ?? null,
            'uploaded_by' => $upload ? $user->id : null,
            'ocr_status' => 'not_started',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('audit_logs')->insert([
            'user_id' => $user->id,
            'action' => $upload ? 'document_uploaded' : 'document_created',
            'entity_type' => 'document',
            'entity_id' => $id,
            'payload' => json_encode(['title' => $title, 'file' => $upload['original_filename'] ?? null]),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return response()->json([
            'message' => $upload ? 'Document uploaded.' : 'Document created.',
            'data' => DB::table('documents')->where('id', $id)->first(),
        ], 201);
    }

    public function download(Request $request, int $id): JsonResponse|BinaryFileResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can download documents.')], 403);
        }

        $document = DB::table('documents')->where('id', $id)->first();

        if (!$document || !$document->file_path) {
            return response()->json(['message' => __('Document file not found.')], 404);
        }

        $path = storage_path('app/'.$document->file_path);
        if (!is_file($path)) {
            return response()->json(['message' => __('Stored file is missing.')], 404);
        }

        return response()->download($path, $document->original_filename ?: basename($path));
    }

    public function printData(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can print documents.')], 403);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (!$document) {
            return response()->json(['message' => __('Document not found.')], 404);
        }

        $workOrder = $document->work_order_id
            ? DB::table('work_orders')->where('id', $document->work_order_id)->first()
            : null;

        $signatures = DB::table('document_signatures')
            ->where('document_id', $id)
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'document' => $document,
                'work_order' => $workOrder,
                'signatures' => $signatures,
                'printed_by' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'printed_at' => now()->toISOString(),
            ],
        ]);
    }

    /** Signature protocol PDF (document data, file fingerprint, signatures). */
    public function signaturePdf(int $id): \Symfony\Component\HttpFoundation\Response
    {
        $document = DB::table('documents')->where('id', $id)->first();
        if (!$document) {
            return response()->json(['message' => __('Document not found.')], 404);
        }

        $name = 'Unterschriftsprotokoll_'.preg_replace('/[^A-Za-z0-9\-]+/', '_', (string) $document->title).'.pdf';

        return response(SignatureProtocolPdf::render($id), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
            'Cache-Control' => 'no-store',
        ]);
    }

    public function startOcr(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can start OCR.')], 403);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (!$document) {
            return response()->json(['message' => __('Document not found.')], 404);
        }

        $path = $document->file_path ? storage_path('app/'.$document->file_path) : null;
        $now = now();

        if (!$path || !is_file($path)) {
            return response()->json(['message' => __('Document file not found.')], 404);
        }

        if (!Ocr::canRunHere()) {
            // Web PHP may not start programs; the scheduler command picks this up within a minute.
            DB::table('documents')->where('id', $id)->update(['ocr_status' => 'queued', 'updated_at' => $now]);
            $this->audit($user->id, 'document_ocr_queued', $id, ['document_id' => $id]);

            return response()->json([
                'message' => __('Text recognition has started. The result will appear in about a minute.'),
                'data' => DB::table('documents')->where('id', $id)->first(),
                'ocr_available' => true,
                'queued' => true,
            ], 202);
        }

        $text = Ocr::extract($path, $document->mime_type);

        if ($text === null) {
            DB::table('documents')->where('id', $id)->update(['ocr_status' => 'pending', 'updated_at' => $now]);
            $this->audit($user->id, 'document_ocr_pending', $id, ['document_id' => $id]);

            return response()->json([
                'message' => __('Text recognition is not installed on the server. Enter the text manually.'),
                'data' => DB::table('documents')->where('id', $id)->first(),
                'ocr_available' => false,
            ], 422);
        }

        DB::table('documents')->where('id', $id)->update([
            'ocr_status' => $text === '' ? 'failed' : 'done',
            'extracted_text' => $text === '' ? $document->extracted_text : $text,
            'ocr_processed_at' => $now,
            'updated_at' => $now,
        ]);
        $this->audit($user->id, 'document_ocr_saved', $id, ['document_id' => $id, 'automatic' => true]);

        return response()->json([
            'message' => $text === '' ? __('No text was recognised in this file.') : __('Text recognised.'),
            'data' => DB::table('documents')->where('id', $id)->first(),
            'ocr_available' => true,
        ]);
    }

    public function saveOcrText(Request $request, int $id): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => __('Only manager or admin can save OCR text.')], 403);
        }

        $document = DB::table('documents')->where('id', $id)->first();
        if (!$document) {
            return response()->json(['message' => __('Document not found.')], 404);
        }

        $text = trim((string) $request->input('extracted_text', ''));
        if ($text === '') {
            return response()->json(['message' => __('Extracted text is required.')], 422);
        }

        $now = now();
        DB::table('documents')->where('id', $id)->update([
            'ocr_status' => 'done',
            'extracted_text' => $text,
            'ocr_processed_at' => $now,
            'updated_at' => $now,
        ]);

        $this->audit($user->id, 'document_ocr_saved', $id, ['document_id' => $id]);

        return response()->json([
            'message' => __('Document OCR text saved.'),
            'data' => DB::table('documents')->where('id', $id)->first(),
        ]);
    }

    private function handleUpload(Request $request): array|JsonResponse|null
    {
        if (!$request->hasFile('file')) {
            return null;
        }

        $file = $request->file('file');
        if (!$file->isValid()) {
            return response()->json(['message' => __('Uploaded file is invalid.')], 422);
        }

        $allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        $mime = (string) $file->getMimeType();
        if (!in_array($mime, $allowed, true)) {
            return response()->json(['message' => __('Only PDF, JPG, PNG and WebP files are allowed.')], 422);
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            return response()->json(['message' => __('Document file must be smaller than 10 MB.')], 422);
        }

        $directory = storage_path('app/documents');
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $filename = now()->format('YmdHis').'-'.Str::random(16).'.'.$extension;
        $file->move($directory, $filename);

        return [
            'file_path' => 'documents/'.$filename,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $mime,
            'size_bytes' => $file->getSize(),
        ];
    }

    private function audit(int $userId, string $action, int $documentId, array $payload): void
    {
        $now = now();
        DB::table('audit_logs')->insert([
            'user_id' => $userId,
            'action' => $action,
            'entity_type' => 'document',
            'entity_id' => $documentId,
            'payload' => json_encode($payload),
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
