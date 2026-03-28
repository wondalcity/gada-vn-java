<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /manager/sites/{siteId}/jobs
 */
class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
            'trade_id'    => ['nullable', 'integer', 'exists:ref.construction_trades,id'],
            'work_date'   => ['required', 'date', 'after_or_equal:today'],
            'start_time'  => ['nullable', 'date_format:H:i'],
            'end_time'    => ['nullable', 'date_format:H:i'],
            'daily_wage'  => ['required', 'integer', 'min:0', 'max:99999999'],
            'slots_total' => ['required', 'integer', 'min:1', 'max:999'],
            'expires_at'  => ['nullable', 'date', 'before_or_equal:work_date'],

            'benefits'                  => ['nullable', 'array'],
            'benefits.meals'            => ['boolean'],
            'benefits.transport'        => ['boolean'],
            'benefits.accommodation'    => ['boolean'],
            'benefits.insurance'        => ['boolean'],

            'requirements'                              => ['nullable', 'array'],
            'requirements.min_experience_months'        => ['nullable', 'integer', 'min:0'],
            'requirements.certifications'               => ['nullable', 'array'],
            'requirements.notes'                        => ['nullable', 'string', 'max:500'],
        ];
    }
}
