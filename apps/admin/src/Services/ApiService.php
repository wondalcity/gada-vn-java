<?php
declare(strict_types=1);

namespace GadaAdmin\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

class ApiService
{
    private Client $client;
    private string $baseUrl;
    private string $token;

    public function __construct()
    {
        $this->baseUrl = rtrim($_ENV['API_BASE_URL'] ?? 'http://localhost:3001/v1', '/');
        $this->token = $_ENV['ADMIN_SERVICE_ACCOUNT_JWT'] ?? '';

        $this->client = new Client([
            'base_uri' => $this->baseUrl . '/',
            'timeout' => 10,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->token,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
        ]);
    }

    public function get(string $path, array $query = []): array
    {
        try {
            $resp = $this->client->get(ltrim($path, '/'), ['query' => $query]);
            $body = json_decode($resp->getBody()->getContents(), true);
            return $body['data'] ?? $body ?? [];
        } catch (RequestException $e) {
            error_log('API GET error: ' . $e->getMessage());
            return [];
        }
    }

    public function post(string $path, array $data = []): array
    {
        try {
            $resp = $this->client->post(ltrim($path, '/'), ['json' => $data]);
            $body = json_decode($resp->getBody()->getContents(), true);
            return $body['data'] ?? $body ?? [];
        } catch (RequestException $e) {
            error_log('API POST error: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }

    public function put(string $path, array $data = []): array
    {
        try {
            $resp = $this->client->put(ltrim($path, '/'), ['json' => $data]);
            $body = json_decode($resp->getBody()->getContents(), true);
            return $body['data'] ?? $body ?? [];
        } catch (RequestException $e) {
            error_log('API PUT error: ' . $e->getMessage());
            return ['error' => $e->getMessage()];
        }
    }
}
