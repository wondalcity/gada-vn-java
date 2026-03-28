<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PUT /manager/jobs/{jobId}
 * All fields are optional (sometimes) to support partial updates.
 */
class UpdateJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title'       => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'trade_id'    => ['sometimes', 'nullable', 'integer', 'exists:ref.construction_trades,id'],
            'work_date'   => ['sometimes', 'date', 'after_or_equal:today'],
            'start_time'  => ['sometimes', 'nullable', 'date_format:H:i'],
            'end_time'    => ['sometimes', 'nullable', 'date_format:H:i'],
            'daily_wage'  => ['sometimes', 'integer', 'min:0', 'max:99999999'],
            'slots_total' => ['sometimes', 'integer', 'min:1', 'max:999'],
            'expires_at'  => ['sometimes', 'nullable', 'date', 'before_or_equal:work_date'],
            'status'      => ['sometimes', 'in:OPEN,FILLED,CANCELLED,COMPLETED'],

            'benefits'                  => ['sometimes', 'nullable', 'array'],
            'benefits.meals'            => ['boolean'],
            'benefits.transport'        => ['boolean'],
            'benefits.accommodation'    => ['boolean'],
            'benefits.insurance'        => ['boolean'],

            'requirements'                              => ['sometimes', 'nullable', 'array'],
            'requirements.min_experience_months'        => ['nullable', 'integer', 'min:0'],
            'requirements.certifications'               => ['nullable', 'array'],
            'requirements.notes'                        => ['nullable', 'string', 'max:500'],
        ];
    }
}
