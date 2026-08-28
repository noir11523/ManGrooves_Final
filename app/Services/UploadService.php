<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;

final class UploadService
{
    /**
     * @param array<string,mixed> $file One entry from $_FILES.
     * @return array{path:string,original_name:string,mime:string,sha256:string,absolute_path:string}
     */
    public function storeReportPhoto(array $file): array
    {
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error !== UPLOAD_ERR_OK) {
            throw new RuntimeException($this->uploadErrorMessage($error));
        }

        $temporary = (string) ($file['tmp_name'] ?? '');
        $reportedSize = (int) ($file['size'] ?? 0);
        if ($temporary === '' || !is_file($temporary) || !is_readable($temporary)) {
            throw new RuntimeException('The uploaded photo could not be read. Please choose it again.');
        }
        if (PHP_SAPI !== 'cli' && !is_uploaded_file($temporary)) {
            throw new RuntimeException('The photo was not received through a valid upload.');
        }

        $actualSize = filesize($temporary);
        $maxBytes = (int) \config('uploads.max_bytes', 5 * 1024 * 1024);
        if ($actualSize === false || $actualSize < 1 || $reportedSize < 1 || $actualSize !== $reportedSize) {
            throw new RuntimeException('The uploaded photo is empty or incomplete.');
        }
        if ($actualSize > $maxBytes) {
            throw new RuntimeException('The photo is larger than the ' . round($maxBytes / 1048576, 1) . ' MB limit.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string) $finfo->file($temporary);
        $allowed = (array) \config('uploads.allowed_mimes', []);
        if (!isset($allowed[$mime])) {
            throw new RuntimeException('Upload a genuine JPG, PNG, or WebP image.');
        }
        $imageInfo = @getimagesize($temporary);
        if ($imageInfo === false || ($imageInfo['mime'] ?? '') !== $mime) {
            throw new RuntimeException('The file contents do not match a supported photo format.');
        }
        $width = (int) ($imageInfo[0] ?? 0);
        $height = (int) ($imageInfo[1] ?? 0);
        if ($width < 100 || $height < 100 || $width > 12000 || $height > 12000 || ($width * $height) > 50000000) {
            throw new RuntimeException('Use a photo between 100 px and 12,000 px per side.');
        }

        $original = basename(str_replace('\\', '/', (string) ($file['name'] ?? 'photo')));
        $original = preg_replace('/[^A-Za-z0-9._ -]/', '_', $original) ?: 'photo';
        $extension = (string) $allowed[$mime];
        $relativeDirectory = 'storage/uploads/reports/' . date('Y/m');
        $directory = rtrim((string) \config('uploads.directory'), '/\\') . '/reports/' . date('Y/m');
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new RuntimeException('Photo storage is unavailable. Please try again later.');
        }

        $filename = bin2hex(random_bytes(20)) . '.' . $extension;
        $destination = $directory . '/' . $filename;
        $moved = PHP_SAPI === 'cli'
            ? rename($temporary, $destination)
            : move_uploaded_file($temporary, $destination);
        if (!$moved) {
            throw new RuntimeException('The photo could not be saved. Please try again.');
        }
        @chmod($destination, 0640);

        $hash = hash_file('sha256', $destination);
        if ($hash === false) {
            @unlink($destination);
            throw new RuntimeException('The saved photo could not be verified.');
        }

        return [
            'path' => $relativeDirectory . '/' . $filename,
            'original_name' => mb_substr($original, 0, 255),
            'mime' => $mime,
            'sha256' => $hash,
            'absolute_path' => $destination,
        ];
    }

    public function removeStoredPhoto(?string $absolutePath): void
    {
        if (!$absolutePath || !is_file($absolutePath)) {
            return;
        }
        $uploadRoot = realpath((string) \config('uploads.directory'));
        $target = realpath($absolutePath);
        if ($uploadRoot !== false && $target !== false && str_starts_with($target, $uploadRoot . DIRECTORY_SEPARATOR)) {
            @unlink($target);
        }
    }

    private function uploadErrorMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'The selected photo is too large.',
            UPLOAD_ERR_PARTIAL => 'The photo upload was interrupted. Please try again.',
            UPLOAD_ERR_NO_FILE => 'Take or choose a mangrove photo before continuing.',
            default => 'The photo could not be uploaded. Please try again.',
        };
    }
}
