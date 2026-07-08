<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\CurrentUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ManagerDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = CurrentUser::fromRequest($request);
        if (!CurrentUser::hasRole($user, ['manager', 'admin'])) {
            return response()->json(['message' => 'Only manager or admin can view manager dashboard.'], 403);
        }

        $pendingApprovalsQuery = DB::table('work_event_approvals')->where('status', 'pending');
        $approvedUninvoicedQuery = DB::table('work_event_approvals')
            ->leftJoin('invoice_items', 'invoice_items.approval_id', '=', 'work_event_approvals.id')
            ->where('work_event_approvals.status', 'approved')
            ->whereNull('invoice_items.id');
        $pendingSignaturesQuery = DB::table('document_signatures')->where('status', 'pending');
        $openWorkOrdersQuery = DB::table('work_orders')->where('status', '!=', 'closed');

        return response()->json([
            'data' => [
                'counts' => [
                    'pending_approvals' => (clone $pendingApprovalsQuery)->count(),
                    'approved_uninvoiced' => (clone $approvedUninvoicedQuery)->count(),
                    'documents_needing_signature' => (clone $pendingSignaturesQuery)->count(),
                    'open_work_orders' => (clone $openWorkOrdersQuery)->count(),
                ],
                'pending_approvals' => (clone $pendingApprovalsQuery)
                    ->orderByDesc('id')
                    ->limit(10)
                    ->get(),
                'approved_uninvoiced' => (clone $approvedUninvoicedQuery)
                    ->select('work_event_approvals.*')
                    ->orderByDesc('work_event_approvals.id')
                    ->limit(10)
                    ->get(),
                'documents_needing_signature' => DB::table('document_signatures')
                    ->join('documents', 'documents.id', '=', 'document_signatures.document_id')
                    ->where('document_signatures.status', 'pending')
                    ->select(
                        'document_signatures.id as signature_id',
                        'document_signatures.document_id',
                        'document_signatures.signer_name',
                        'document_signatures.signer_email',
                        'document_signatures.signature_type',
                        'document_signatures.requested_at',
                        'documents.title as document_title',
                        'documents.status as document_status'
                    )
                    ->orderByDesc('document_signatures.id')
                    ->limit(10)
                    ->get(),
                'open_work_orders' => (clone $openWorkOrdersQuery)
                    ->orderByDesc('id')
                    ->limit(10)
                    ->get(),
                'generated_at' => now()->toISOString(),
                'generated_for' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                ],
            ],
        ]);
    }
}
