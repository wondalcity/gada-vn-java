<?php

namespace App\Services\Storage;

use Aws\S3\S3Client;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class S3Service
{
    private S3Client $client;
    private string $bucket;

    public function __construct()
    {
        $this->bucket = config('filesystems.disks.s3.bucket');
        $this->client = new S3Client([
            'region'      => config('filesystems.disks.s3.region'),
            'credentials' => [
                'key'    => config('filesystems.disks.s3.key'),
                'secret' => config('filesystems.disks.s3.secret'),
            ],
        ]);
    }

    /**
     * Upload a file and return the bare S3 key.
     * Key format: {prefix}/{uuid}.{ext}
     */
    public function upload(UploadedFile $file, string $prefix): string
    {
        $key = sprintf('%s/%s.%s', $prefix, Str::uuid(), $file->getClientOriginalExtension());

        $this->client->putObject([
            'Bucket'      => $this->bucket,
            'Key'         => $key,
            'Body'        => $file->getContent(),
            'ContentType' => $file->getMimeType(),
        ]);

        return $key; // Only store key in DB — never store full URL
    }

    /**
     * Generate a presigned URL valid for $ttlSeconds (default 15 minutes).
     */
    public function presignedUrl(string $key, int $ttlSeconds = 900): string
    {
        $cmd = $this->client->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key'    => $key,
        ]);

        return (string) $this->client->createPresignedRequest($cmd, "+{$ttlSeconds} seconds")->getUri();
    }
}
