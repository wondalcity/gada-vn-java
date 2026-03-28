<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /manager/sites
 */
class StoreSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:200'],
            'address'   => ['required', 'string', 'max:500'],
            'province'  => ['required', 'string', 'max:100'],
            'district'  => ['nullable', 'string', 'max:100'],
            'lat'       => ['nullable', 'numeric', 'between:-90,90'],
            'lng'       => ['nullable', 'numeric', 'between:-180,180'],
            'site_type' => ['nullable', 'string', 'max:50'],
        ];
    }
}
