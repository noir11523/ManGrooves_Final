<?php

declare(strict_types=1);

return [
    'name' => env_value('APP_NAME', 'ManGROOVES'),
    'environment' => env_value('APP_ENV', 'production'),
    'debug' => filter_var(env_value('APP_DEBUG', 'false'), FILTER_VALIDATE_BOOL),
    'url' => rtrim((string) env_value('APP_URL', ''), '/'),
    'timezone' => env_value('APP_TIMEZONE', 'Asia/Manila'),
    'session_lifetime' => max(300, (int) env_value('SESSION_LIFETIME', '1800')),
    'registration_attempt_limit_per_hour' => max(1, (int) env_value('REGISTRATION_ATTEMPT_LIMIT_PER_HOUR', '10')),
    'report_submission_limit_per_hour' => max(1, (int) env_value('REPORT_SUBMISSION_LIMIT_PER_HOUR', '12')),
    'pending_report_limit_per_guardian' => max(1, (int) env_value('PENDING_REPORT_LIMIT_PER_GUARDIAN', '25')),
    'mobile_token_lifetime_days' => max(1, min(90, (int) env_value('MOBILE_TOKEN_LIFETIME_DAYS', '30'))),
    'database' => [
        'host' => env_value('DB_HOST', '127.0.0.1'),
        'port' => (int) env_value('DB_PORT', '3306'),
        'name' => env_value('DB_DATABASE', 'mangrooves_db'),
        'username' => env_value('DB_USERNAME', 'root'),
        'password' => env_value('DB_PASSWORD', ''),
    ],
    'uploads' => [
        'directory' => APP_ROOT . '/storage/uploads',
        'max_bytes' => max(1, (int) env_value('UPLOAD_MAX_MB', '5')) * 1024 * 1024,
        'allowed_mimes' => [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
        ],
    ],
    'cluster_radius_meters' => max(10, (int) env_value('CLUSTER_RADIUS_METERS', '75')),
    'barangay_max_distance_meters' => max(500, (int) env_value('BARANGAY_MAX_DISTANCE_METERS', '5000')),
];
