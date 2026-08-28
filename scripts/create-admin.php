<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/app/bootstrap.php';

$options = getopt('', ['name:', 'email:']);
$name = trim(scalar_string($options['name'] ?? null));
$email = strtolower(trim(scalar_string($options['email'] ?? null)));
$password = scalar_string(getenv('MANGROOVES_BOOTSTRAP_PASSWORD') ?: null);

if (mb_strlen($name) < 2 || mb_strlen($name) > 120) {
    fwrite(STDERR, 'Provide --name with 2 to 120 characters.' . PHP_EOL);
    exit(1);
}
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
        "INSERT INTO users (full_name, email, password_hash, role, status)
         VALUES (:name, :email, :hash, 'system_admin', 'active')"
    );
    $statement->execute([
        'name' => $name,
        'email' => $email,
        'hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
    echo 'System administrator created: ' . $email . PHP_EOL;
    exit(0);
} catch (Throwable $exception) {
    fwrite(STDERR, 'Administrator creation failed: ' . $exception->getMessage() . PHP_EOL);
    exit(1);
}
