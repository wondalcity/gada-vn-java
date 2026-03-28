<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates PUT /worker/profile
 * full_name and date_of_birth are required to mark profile_complete.
 * All other profile fields are optional on each update.
 */
class UpdateWorkerProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'full_name'          => ['required', 'string', 'max:200'],
            'date_of_birth'      => ['required', 'date'],
            'gender'             => ['nullable', 'string', 'in:MALE,FEMALE,OTHER'],
            'experience_months'  => ['nullable', 'integer', 'min:0', 'max:600'],
            'primary_trade_id'   => ['nullable', 'integer'],
            'current_province'   => ['nullable', 'string', 'max:200'],
            'bio'                => ['nullable', 'string', 'max:500'],
            'bank_account_number'=> ['nullable', 'string', 'max:50'],
            'bank_name'          => ['nullable', 'string', 'max:200'],
            'terms_accepted'     => ['sometimes', 'boolean'],
            'privacy_accepted'   => ['sometimes', 'boolean'],
        ];
    }
}
