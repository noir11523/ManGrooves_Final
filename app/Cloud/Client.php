<?php
declare(strict_types=1);

final class CloudError extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400) { parent::__construct($message); }
}

final class CloudClient
{
    public static function projectUrl(): string
    {
        $url = rtrim((string) getenv('SUPABASE_URL'), '/');
        if (!preg_match('~^https://[a-z0-9-]+\.supabase\.co$~D', $url)
            && !(getenv('APP_LOCAL_TEST') === '1' && preg_match('~^http://127\.0\.0\.1:[0-9]+$~D', $url))) {
            throw new RuntimeException('Set a valid SUPABASE_URL.');
        }
        return $url;
    }
    public static function request(string $path, ?array $body = null, ?string $token = null): array
    {
        // Paths are chosen by our router, never arbitrary external URLs.
        if (!preg_match('~^(auth/v1/token\?grant_type=(password|refresh_token)|functions/v1/api/[a-z-]+\.php(?:\?[^\r\n]*)?)$~D', $path)) throw new CloudError('Page not found.', 404);
        $key = (string) getenv('SUPABASE_PUBLISHABLE_KEY');
        if ($key === '' || str_starts_with($key, 'sb_secret_')) throw new RuntimeException('Set the public Supabase key.');
        $headers = ['Accept: application/json', 'apikey: ' . $key];
        // Run database-heavy API work beside this project's Seoul database.
        if (str_starts_with($path, 'functions/v1/')) $headers[] = 'x-region: ap-northeast-2';
        if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
        $handle = curl_init(self::projectUrl() . '/' . $path);
        $options = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 45, CURLOPT_FOLLOWLOCATION => false];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = json_encode((object) $body, JSON_THROW_ON_ERROR);
        }
        $options[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($handle, $options);
        $raw = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);
        if ($raw === false) throw new CloudError('Could not connect. Please try again.', 503);
        $result = json_decode($raw, true);
        if ($status < 200 || $status >= 300 || !is_array($result) || ($result['ok'] ?? true) === false) {
            $message = $result['message'] ?? $result['error_description'] ?? $result['msg'] ?? 'Could not complete this request. Please try again.';
            if (($result['error_code'] ?? '') === 'invalid_credentials') $message = 'Email or password is incorrect.';
            throw new CloudError((string) $message, $status >= 400 && $status <= 599 ? $status : 502);
        }
        return $result;
    }
    public static function accessToken(): string
    {
        if (empty($_SESSION['access_token'])) throw new CloudError('Sign in to continue.', 401);
        if ((int) ($_SESSION['expires_at'] ?? 0) <= time() + 60) {
            try {
                self::storeTokens(self::request('auth/v1/token?grant_type=refresh_token', ['refresh_token' => $_SESSION['refresh_token'] ?? '']));
            } catch (CloudError $error) {
                if ($error->status < 500) CloudSession::clear();
                throw $error;
            }
        }
        return $_SESSION['access_token'];
    }
    public static function storeTokens(array $data): void
    {
        if (empty($data['access_token']) || empty($data['refresh_token'])) throw new CloudError('Sign in again.', 401);
        $_SESSION['access_token'] = $data['access_token'];
        $_SESSION['refresh_token'] = $data['refresh_token'];
        $_SESSION['expires_at'] = $data['expires_at'] ?? time() + (int) ($data['expires_in'] ?? 3600);
    }
    public static function api(string $endpoint, array $query = [], ?array $body = null, bool $anonymous = false, ?string $proof = null): array
    {
        if (!preg_match('/^[a-z-]+\.php$/D', $endpoint)) throw new CloudError('Page not found.', 404);
        return self::request('functions/v1/api/' . $endpoint . ($query ? '?' . http_build_query($query) : ''), $body, $proof ?? ($anonymous ? null : self::accessToken()));
    }
    public static function login(string $email, string $password): array
    {
        $tokens = self::request('auth/v1/token?grant_type=password', ['email' => $email, 'password' => $password]);
        // Pending or disabled accounts may not open the website, even with a valid Auth token.
        $user = self::api('me.php', proof: $tokens['access_token'])['user'];
        CloudSession::clear();
        self::storeTokens($tokens);
        return $user;
    }
}
