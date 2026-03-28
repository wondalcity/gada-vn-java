<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** Validates POST /auth/social/facebook */
class FacebookAuthRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // Firebase ID Token obtained client-side from signInWithPopup(FacebookAuthProvider)
            'idToken' => ['required', 'string'],
        ];
    }
}
