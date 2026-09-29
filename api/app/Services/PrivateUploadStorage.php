<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class PrivateUploadStorage
{
    /** Validate content metadata and store through Laravel's disk abstraction, never a public path. */
    public function store(UploadedFile $file, int $workspaceId, string $folder = 'uploads'): string
    {
        $maxBytes = (int) config('taskflow.uploads.max_file_bytes');
        $mime = $file->getMimeType(); // Fileinfo-detected type, not the browser-supplied Content-Type.
        if ($file->getSize() > $maxBytes || ! in_array($mime, config('taskflow.uploads.allowed_mime_types', []), true)) {
            throw ValidationException::withMessages(['file' => ['The file type is not allowed or the file exceeds the upload limit.']]);
        }

        $path = $file->store('workspaces/'.$workspaceId.'/'.trim($folder, '/'), $this->diskName());
        if (! $path) throw new \RuntimeException('The private upload could not be stored.');
        return $path;
    }

    public function delete(string $path): bool
    {
        $disk = Storage::disk($this->diskName());
        return ! $disk->exists($path) || $disk->delete($path);
    }

    public function diskName(): string { return (string) config('taskflow.uploads.disk', 'private'); }
}
