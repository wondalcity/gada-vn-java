<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin translation management endpoints.
 * Translations are stored in ref.translations (locale, key, value).
 *
 * GET /admin/translations      — returns all translation entries across all locales
 * PUT /admin/translations      — batch upsert (array of {locale, key, value})
 *
 * If the ref.translations table does not exist (e.g. migration not yet run),
 * GET returns an empty array and PUT returns a 503 instead of throwing.
 */
class AdminTranslationController extends Controller
{
    /**
     * GET /admin/translations
     * Returns all rows from ref.translations ordered by locale then key.
     */
    public function index(): JsonResponse
    {
        try {
            $rows = DB::table('ref.translations')
                ->orderBy('locale')
                ->orderBy('key')
                ->get(['locale', 'key', 'value']);

            $data = $rows->map(fn ($r) => [
                'locale' => $r->locale,
                'key'    => $r->key,
                'value'  => $r->value,
            ])->toArray();
        } catch (\Exception $e) {
            // Table does not exist or DB unavailable — return empty gracefully
            $data = [];
        }

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
        ]);
    }

    /**
     * PUT /admin/translations
     * Batch upsert translations. Each item must have locale, key, and value.
     * Performs an INSERT … ON CONFLICT (locale, key) DO UPDATE so every item is
     * either inserted or its value updated atomically.
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $request->validate([
            'translations'          => 'required|array|min:1',
            'translations.*.locale' => 'required|string|max:10',
            'translations.*.key'    => 'required|string|max:255',
            'translations.*.value'  => 'required|string',
        ]);

        $items = $request->input('translations');

        try {
            DB::transaction(function () use ($items) {
                foreach ($items as $item) {
                    DB::statement(
                        'INSERT INTO ref.translations (locale, key, value, updated_at)
                         VALUES (?, ?, ?, NOW())
                         ON CONFLICT (locale, key)
                         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
                        [$item['locale'], $item['key'], $item['value']]
                    );
                }
            });
        } catch (\Exception $e) {
            return response()->json([
                'statusCode' => 503,
                'message'    => 'Translation table unavailable: ' . $e->getMessage(),
            ], 503);
        }

        // Return the full updated set so the frontend can reconcile state
        $rows = DB::table('ref.translations')
            ->orderBy('locale')
            ->orderBy('key')
            ->get(['locale', 'key', 'value']);

        $data = $rows->map(fn ($r) => [
            'locale' => $r->locale,
            'key'    => $r->key,
            'value'  => $r->value,
        ])->toArray();

        return response()->json([
            'statusCode' => 200,
            'data'       => $data,
        ]);
    }
}
