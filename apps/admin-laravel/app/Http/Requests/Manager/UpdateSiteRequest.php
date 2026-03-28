<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PUT /manager/sites/{siteId}
 * All fields are optional (sometimes) to support partial updates.
 */
class UpdateSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'      => ['sometimes', 'string', 'max:200'],
            'address'   => ['sometimes', 'string', 'max:500'],
            'province'  => ['sometimes', 'string', 'max:100'],
            'district'  => ['sometimes', 'nullable', 'string', 'max:100'],
            'lat'       => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng'       => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'site_type' => ['sometimes', 'nullable', 'string', 'max:50'],
        ];
    }
}
