<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Super Admin Emails
    |--------------------------------------------------------------------------
    | Comma-separated emails that bypass role checks and have full access.
    | Set via SUPER_ADMIN_EMAILS env var. Not stored in DB.
    */
    'super_admin_emails'   => env('SUPER_ADMIN_EMAILS', ''),

    /*
    |--------------------------------------------------------------------------
    | Admin Panel Password
    |--------------------------------------------------------------------------
    | Single shared password for the web admin panel. All admin users use this
    | password — individual user passwords are NOT used for admin login.
    | Set via ADMIN_PANEL_PASSWORD env var.
    */
    'admin_panel_password' => env('ADMIN_PANEL_PASSWORD', 'gadaAdmin2026!'),

    /*
    |--------------------------------------------------------------------------
    | Supported Locales
    |--------------------------------------------------------------------------
    */
    'locales'        => ['ko', 'vi', 'en'],
    'default_locale' => 'ko',
    'fallback_chain' => ['ko'], // If requested locale missing → ko → raw key

    /*
    |--------------------------------------------------------------------------
    | File Upload Limits (bytes)
    |--------------------------------------------------------------------------
    */
    'upload_limits' => [
        'id_document' => 10 * 1024 * 1024,   // 10 MB
        'signature'   =>  2 * 1024 * 1024,   //  2 MB
        'site_image'  => 10 * 1024 * 1024,   // 10 MB
        'manager_doc' => 10 * 1024 * 1024,   // 10 MB
    ],

    /*
    |--------------------------------------------------------------------------
    | S3 Key Prefixes
    |--------------------------------------------------------------------------
    */
    's3_prefixes' => [
        'id_documents' => 'id-documents',
        'signatures'   => 'signatures',
        'site_images'  => 'site-images',
        'manager_docs' => 'manager-docs',
        'contracts'    => 'contracts',
    ],

    /*
    |--------------------------------------------------------------------------
    | OTP Rate Limits
    |--------------------------------------------------------------------------
    */
    'otp_rate_limit' => [
        'max_attempts'  => 5,
        'decay_minutes' => 15,
    ],
];
