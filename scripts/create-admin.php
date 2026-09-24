<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/app/bootstrap.php';

$options = getopt('', ['first-name:', 'last-name:', 'email:']);
try {
    $names = \App\Services\UserName::fromInput([
        'first_name' => $options['first-name'] ?? null,
        'last_name' => $options['last-name'] ?? null,
    ]);
} catch (InvalidArgumentException $exception) {
    fwrite(STDERR, $exception->getMessage() . ' Use --first-name and --last-name.' . PHP_EOL);
    exit(1);
}
$email = strtolower(trim(scalar_string($options['email'] ?? null)));
$password = scalar_string(getenv('MANGROOVES_BOOTSTRAP_PASSWORD') ?: null);

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    fwrite(STDERR, 'Provide a valid --email address.' . PHP_EOL);
    exit(1);
}
if (strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) {
    fwrite(STDERR, 'The securely supplied password must contain 12 to 72 characters.' . PHP_EOL);
    exit(1);
}

try {
    $pdo = Database::connection();
    $exists = $pdo->prepare('SELECT 1 FROM users WHERE email = :email LIMIT 1');
    $exists->execute(['email' => $email]);
    if ($exists->fetchColumn()) {
        throw new DomainException('An account already uses that email address.');
    }
    $statement = $pdo->prepare(
        "INSERT INTO users (first_name, last_name, full_name, email, password_hash, role, status)
         VALUES (:first_name, :last_name, :full_name, :email, :hash, 'system_admin', 'active')"
    );
    $statement->execute([
        ...$names,
        'email' => $email,
        'hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
    echo 'System administrator created: ' . $email . PHP_EOL;
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, 'Administrator creation failed: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
