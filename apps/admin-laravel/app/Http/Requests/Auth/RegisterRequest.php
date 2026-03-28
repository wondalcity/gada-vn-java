<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates POST /auth/register
 * Called after first OTP login to complete the user's profile.
 * Requires firebase.auth (Bearer token) — user must be authenticated.
 */
class RegisterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            // Name is required — this is what makes isNewUser() = false
            'name'     => ['required', 'string', 'min:2', 'max:100'],
            // Email is optional but must be valid if provided
            'email'    => ['nullable', 'string', 'email', 'max:255'],
            // Password optional — can be set later for email/password login
            'password' => ['nullable', 'string', 'min:8', 'max:255'],
        ];
    }
}
