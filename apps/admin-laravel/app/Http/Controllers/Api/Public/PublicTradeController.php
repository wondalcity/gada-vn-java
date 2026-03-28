<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Public trade (construction trade) list — no auth required.
 *
 * GET /public/trades  — all construction trades ordered by Korean name
 */
class PublicTradeController extends Controller
{
    /**
     * GET /public/trades
     *
     * Returns all rows from ref.construction_trades ordered by name_ko.
     * Response keys are camelCase to match the frontend contract.
     */
    public function index(): JsonResponse
    {
        $trades = DB::table('ref.construction_trades')
            ->select('id', 'code', 'name_ko', 'name_vi')
            ->orderBy('name_ko')
            ->get();

        $data = $trades->map(fn (object $t) => [
            'id'     => $t->id,
            'code'   => $t->code,
            'nameKo' => $t->name_ko,
            'nameVi' => $t->name_vi,
        ])->values();

        return response()->json(['statusCode' => 200, 'data' => $data]);
    }
}
