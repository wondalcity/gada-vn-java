<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /manager/jobs/{jobId}/shifts
 * Supports both single work_date and batch dates[] array.
 */
class StoreShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'work_date' => ['required_without:dates', 'date'],
            'dates'     => ['sometimes', 'array'],
            'dates.*'   => ['date'],
        ];
    }
}
