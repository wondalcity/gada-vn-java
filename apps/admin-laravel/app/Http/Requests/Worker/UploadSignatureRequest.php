<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /worker/profile/signature
 * Accepts either a file upload (signature) or a base64 data URL (signature_data_url).
 * At least one of the two must be present.
 */
class UploadSignatureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'signature'          => ['nullable', 'file', 'mimes:png,jpeg,jpg', 'max:2048'],
            'signature_data_url' => ['nullable', 'string'],
        ];
    }

    /**
     * Additional validation: require at least one of the two input modes.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $v) {
            if (!$this->hasFile('signature') && !$this->filled('signature_data_url')) {
                $v->errors()->add(
                    'signature',
                    'Either a signature file or signature_data_url is required.'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'signature.max' => 'Signature image must not exceed 2 MB.',
        ];
    }
}
