<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentSignatureController extends Controller
{
    public function index(int $documentId): JsonResponse
    {
        $document = DB::table('documents')->where('id', $documentId)->first();
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        return response()->json([
            'data' => DB::table('document_signatures')
                ->where('document_id', $documentId)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function requestSignature(Request $request, int $documentId): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can request document signatures.'], 403);
        }

        $document = DB::table('documents')->where('id', $documentId)->first();
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $signerName = trim((string) $request->input('signer_name', ''));
        if ($signerName === '') {
            return response()->json(['message' => 'Signer name is required.'], 422);
        }

        $now = now();
        $id = DB::table('document_signatures')->insertGetId([
            'document_id' => $documentId,
            'requested_by' => $user->id,
            'signer_name' => $signerName,
            'signer_email' => $request->input('signer_email'),
            'status' => 'pending',
            'signature_type' => $request->input('signature_type', 'typed'),
            'comment' => $request->input('comment'),
            'requested_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $this->audit($user->id, 'document_signature_requested', $documentId, [
            'signature_id' => $id,
            'signer_name' => $signerName,
        ]);

        return response()->json([
            'message' => 'Document signature requested.',
            'data' => DB::table('document_signatures')->where('id', $id)->first(),
        ], 201);
    }

    public function sign(Request $request, int $documentId, int $signatureId): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!$user) {
            return response()->json(['message' => 'Authenticated user is required to sign documents.'], 401);
        }

        $signature = $this->signature($documentId, $signatureId);
        if (!$signature) {
            return response()->json(['message' => 'Signature request not found.'], 404);
        }

        if ($signature->status !== 'pending') {
            return response()->json(['message' => 'Only pending signature requests can be signed.'], 409);
        }

        $signatureData = trim((string) $request->input('signature_data', ''));
        if ($signatureData === '') {
            return response()->json(['message' => 'Signature data is required.'], 422);
        }

        $now = now();
        DB::table('document_signatures')->where('id', $signatureId)->update([
            'status' => 'signed',
            'signed_by' => $user->id,
            'signature_data' => $signatureData,
            'comment' => $request->input('comment', $signature->comment),
            'signed_at' => $now,
            'rejected_at' => null,
            'updated_at' => $now,
        ]);

        DB::table('documents')->where('id', $documentId)->update([
            'status' => 'signed',
            'updated_at' => $now,
        ]);

        $this->audit($user->id, 'document_signed', $documentId, ['signature_id' => $signatureId]);

        return response()->json([
            'message' => 'Document signed.',
            'data' => DB::table('document_signatures')->where('id', $signatureId)->first(),
        ]);
    }

    public function reject(Request $request, int $documentId, int $signatureId): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!$user) {
            return response()->json(['message' => 'Authenticated user is required to reject signatures.'], 401);
        }

        $signature = $this->signature($documentId, $signatureId);
        if (!$signature) {
            return response()->json(['message' => 'Signature request not found.'], 404);
        }

        if ($signature->status !== 'pending') {
            return response()->json(['message' => 'Only pending signature requests can be rejected.'], 409);
        }

        $now = now();
        DB::table('document_signatures')->where('id', $signatureId)->update([
            'status' => 'rejected',
            'signed_by' => $user->id,
            'comment' => $request->input('comment'),
            'rejected_at' => $now,
            'updated_at' => $now,
        ]);

        $this->audit($user->id, 'document_signature_rejected', $documentId, ['signature_id' => $signatureId]);

        return response()->json([
            'message' => 'Document signature rejected.',
            'data' => DB::table('document_signatures')->where('id', $signatureId)->first(),
        ]);
    }

    private function signature(int $documentId, int $signatureId): ?object
    {
        return DB::table('document_signatures')
            ->where('id', $signatureId)
            ->where('document_id', $documentId)
            ->first();
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
