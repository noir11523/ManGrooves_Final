<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

MobileApi::initialize();

set_exception_handler(static function (Throwable $exception): never {
    error_log((string) $exception);
    json_response([
        'ok' => false,
        'message' => config('debug')
            ? 'Server error: ' . $exception->getMessage()
            : 'The mobile service is temporarily unavailable.',
    ], 500);
});
