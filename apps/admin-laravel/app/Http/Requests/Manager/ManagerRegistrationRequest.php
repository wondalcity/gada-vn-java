<?php

namespace App\Http\Requests\Manager;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Validates POST /manager/register
 * Re-submissions are allowed — a new row is created and the previous one set to is_current=false.
 */
class ManagerRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'business_type'         => ['required', 'in:INDIVIDUAL,CORPORATE'],
            'company_name'          => ['nullable', 'string', 'max:200'],
            'representative_name'   => ['required', 'string', 'max:100'],
            'representative_dob'    => ['nullable', 'date', 'before:today'],
            'representative_gender' => ['nullable', 'in:MALE,FEMALE,OTHER'],
            'business_reg_number'   => ['nullable', 'string', 'max:50'],
            'business_reg_doc'      => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png', 'max:20480'],
            'contact_phone'         => ['nullable', 'string', 'max:20'],
            'contact_address'       => ['nullable', 'string', 'max:500'],
            'province'              => ['nullable', 'string', 'max:100'],
            'first_site_name'       => ['nullable', 'string', 'max:200'],
            'first_site_address'    => ['nullable', 'string', 'max:500'],
            'signature'             => ['nullable', 'file', 'mimes:png,jpeg', 'max:2048'],
            'terms_accepted'        => ['required', 'accepted'],
            'privacy_accepted'      => ['required', 'accepted'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($this->input('business_type') === 'CORPORATE' && empty($this->input('company_name'))) {
                $validator->errors()->add('company_name', '법인명을 입력해주세요.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'business_reg_doc.max' => 'Registration document must not exceed 20 MB.',
        ];
    }
}
