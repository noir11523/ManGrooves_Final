<?php

declare(strict_types=1);

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = (string) config('database.host');
        $port = (int) config('database.port');
        $name = (string) config('database.name');
        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        self::$connection = new PDO(
            $dsn,
            (string) config('database.username'),
            (string) config('database.password'),
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ]
        );
        self::$connection->exec("SET time_zone = '+08:00'");

        return self::$connection;
    }

    public static function transaction(callable $callback): mixed
    {
        $pdo = self::connection();
        $startedHere = !$pdo->inTransaction();
        if ($startedHere) {
            $pdo->beginTransaction();
        }

        try {
            $result = $callback($pdo);
            if ($startedHere) {
                $pdo->commit();
            }
            return $result;
        } catch (Throwable $exception) {
            if ($startedHere && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $exception;
        }
    }

    public static function reset(): void
    {
        self::$connection = null;
    }
}

