<?php

namespace App\Http\Requests\Worker;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /worker/profile/id-documents
 * Both images are required on every upload. Re-uploading resets id_verified to false.
 */
class UploadIdDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_number' => ['required', 'string', 'max:50'],
            'id_front'  => ['required', 'file', 'mimes:jpeg,jpg,png', 'max:10240'],
            'id_back'   => ['required', 'file', 'mimes:jpeg,jpg,png', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'id_front.max' => 'ID front image must not exceed 10 MB.',
            'id_back.max'  => 'ID back image must not exceed 10 MB.',
        ];
    }
}
