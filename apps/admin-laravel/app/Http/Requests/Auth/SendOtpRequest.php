<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /auth/otp/send
 * Phone must be a valid Vietnamese E.164 number starting with +84.
 * We also accept generic international format for flexibility.
 */
class SendOtpRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'phone' => [
                'required',
                'string',
                // E.164 format: + followed by 7-15 digits
                'regex:/^\+[1-9]\d{6,14}$/',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.required' => 'Phone number is required.',
            'phone.regex'    => 'Phone must be in E.164 format (e.g. +84901234567).',
        ];
    }
}
