<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Admin translation management (web panel).
 *
 * GET  /admin/translations           — list all translations
 * PUT  /admin/translations/{id}      — update a single translation (id = "locale__key")
 */
class TranslationController extends Controller
{
    public function index(Request $request)
    {
        $locale = $request->query('locale', 'vi');
        $search = $request->query('q');

        try {
            $query = DB::table('ref.translations')
                ->where('locale', $locale)
                ->orderBy('key');

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('key', 'ilike', "%$search%")
                      ->orWhere('value', 'ilike', "%$search%");
                });
            }

            $translations = $query->paginate(50);
            $locales = DB::table('ref.translations')
                ->select(DB::raw('DISTINCT locale'))
                ->orderBy('locale')
                ->pluck('locale');
        } catch (\Exception $e) {
            $translations = collect()->paginate(1);
            $locales = collect(['ko', 'vi', 'en']);
        }

        return view('admin.translations.index', compact('translations', 'locale', 'search', 'locales'));
    }

    /**
     * PUT /admin/translations/{translation}
     * $translation = "locale__key" composite identifier.
     * locale and key may also be passed in the request body as fallback.
     */
    public function update(Request $request, string $translation)
    {
        $data = $request->validate([
            'value'  => 'required|string',
            'locale' => 'sometimes|string|max:10',
            'key'    => 'sometimes|string|max:255',
        ]);

        // Composite ID: "vi__jobs.title"
        if (str_contains($translation, '__')) {
            [$locale, $key] = explode('__', $translation, 2);
        } else {
            $locale = $data['locale'] ?? $request->query('locale', 'vi');
            $key    = $data['key']    ?? $translation;
        }

        DB::statement(
            'INSERT INTO ref.translations (locale, key, value, updated_at)
             VALUES (?, ?, ?, NOW())
             ON CONFLICT (locale, key)
             DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
            [$locale, $key, $data['value']]
        );

        return redirect()->back()->with('success', '번역이 저장되었습니다.');
    }
}
