<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sirep' => [
        'assy_endpoint' => env('SIREP_ASSY_ENDPOINT', 'http://10.251.45.134:8001/api/shared/assy'),
        'carline_endpoint' => env('SIREP_CARLINE_ENDPOINT', 'http://10.251.45.134:8001/api/shared/carline'),
        'conveyor_endpoint' => env('SIREP_CONVEYOR_ENDPOINT', 'http://10.251.45.134:8001/api/shared/conveyor'),
        'timeout' => env('SIREP_TIMEOUT', 30),
    ],

];
