<?php

return [
    'defaults' => [
        'guard' => 'web',
        'passwords' => 'app_users',
    ],

    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'app_users',
        ],
        'api' => [
            'driver' => 'sanctum',
            'provider' => 'app_users',
        ],
    ],

    'providers' => [
        'app_users' => [
            'driver' => 'eloquent',
            'model' => App\Models\AppUser::class,
        ],
    ],

    'passwords' => [
        'app_users' => [
            'provider' => 'app_users',
            'table' => 'password_reset_tokens',
            'expire' => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,
];
