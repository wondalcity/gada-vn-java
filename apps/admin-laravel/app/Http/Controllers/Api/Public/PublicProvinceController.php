<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Public province list — no auth required.
 *
 * GET /public/provinces  — all Vietnamese provinces with computed slugs
 */
class PublicProvinceController extends Controller
{
    /**
     * GET /public/provinces
     *
     * Returns all provinces from ref.vn_provinces ordered by name_vi.
     * The slug field is computed dynamically from name_vi via Str::slug(),
     * since ref.vn_provinces has no slug column in the schema.
     */
    public function index(): JsonResponse
    {
        $provinces = DB::table('ref.vn_provinces')
            ->select('code', 'name_vi', 'name_en')
            ->orderBy('name_vi')
            ->get();

        $data = $provinces->map(fn (object $p) => [
            'code'   => $p->code,
            'nameVi' => $p->name_vi,
            'nameEn' => $p->name_en,
            'slug'   => Str::slug($p->name_vi),
        ])->values();

        return response()->json(['statusCode' => 200, 'data' => $data]);
    }
}
