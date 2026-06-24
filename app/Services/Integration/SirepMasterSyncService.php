<?php

namespace App\Services\Integration;

use App\Models\Assy;
use App\Models\CarLine;
use App\Traits\LogsActivity;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SirepMasterSyncService
{
    public function syncMaster(): array
    {
        $carline = $this->syncCarlines();
        $assy = $this->syncAssy();

        return [
            'carline' => $carline,
            'assy' => $assy['assy'],
            'carline_from_assy' => $assy['carline'],
        ];
    }

    public function syncCarlines(): array
    {
        $stats = $this->emptyStats();
        $syncedCodes = [];

        // Suppress individual CarLine created/updated log entries.
        // The controller will record a single consolidated sirep_sync log.
        CarLine::withoutLogging(function () use (&$stats, &$syncedCodes) {
            foreach ($this->fetchRows('carline_endpoint') as $index => $row) {
                $stats['total']++;

                try {
                    $code = $this->readField($row, ['code', 'name', 'carline', 'carline_code']);

                    if (!$code) {
                        $stats['skipped']++;
                        continue;
                    }

                    $this->upsertCarline($code, $row, $stats);
                    $syncedCodes[] = $this->limit($code, 20);
                } catch (Throwable $e) {
                    $stats['skipped']++;
                    $stats['errors'][] = "Row " . ($index + 1) . ": " . $e->getMessage();
                }
            }

            // Hapus carline di database lokal SIPLAN yang tidak ada lagi di respon API SIREP terbaru,
            // tetapi hanya jika carline tersebut tidak sedang digunakan oleh data Assy atau SR.
            if (!empty($syncedCodes)) {
                $carlinesToDelete = CarLine::whereNotIn('code', $syncedCodes)->get();
                foreach ($carlinesToDelete as $carline) {
                    $inUse = $carline->assy()->exists() || \App\Models\SR::where('carline_id', $carline->id)->exists();
                    if (!$inUse) {
                        $carline->delete();
                    }
                }
            }
        });

        return $stats;
    }

    public function syncAssy(): array
    {
        $assyStats   = $this->emptyStats();
        $carlineStats = $this->emptyStats();

        // Suppress individual Assy & CarLine created/updated log entries.
        // The controller will record a single consolidated sirep_sync log.
        Assy::withoutLogging(function () use (&$assyStats, &$carlineStats) {
            CarLine::withoutLogging(function () use (&$assyStats, &$carlineStats) {
                foreach ($this->fetchRows('assy_endpoint') as $index => $row) {
                    $assyStats['total']++;

                    try {
                        $assyNumber = $this->readField($row, ['assy_number']);

                        if (!$assyNumber) {
                            $assyStats['errors'][] = "Row " . ($index + 1) . ": field assy_number wajib ada dari API SIREP.";
                            $assyStats['skipped']++;
                            continue;
                        }

                        $carlineId = null;
                        $carlineCode = $this->readField($row, [
                            'carline_code',
                            'carlineCode',
                            'carline',
                            'model',
                            'model_code',
                        ]);

                        if ($carlineCode) {
                            $carlineStats['total']++;
                            $carline = $this->upsertCarline($carlineCode, $row, $carlineStats);
                            $carlineId = $carline->id;
                        }

                        $assy = Assy::firstOrNew([
                            'assy_number' => $this->limit($assyNumber, 50),
                        ]);

                        $assy->fill([
                            'carline_id' => $carlineId ?? $assy->carline_id,
                            'assy_code' => $this->limit(
                                $this->readField($row, ['assy_code', 'assyCode', 'code']) ?? $assy->assy_code,
                                20
                            ),
                            'level' => $this->limit(
                                $this->readField($row, ['level', 'assy_level']) ?? $assy->level,
                                20
                            ),
                            'pattern' => $this->limit(
                                $this->readField($row, ['pattern', 'type', 'drive_side', 'driveSide']) ?? $assy->pattern,
                                255
                            ),
                            'standard_sea_quantity' => $this->toInteger(
                                $this->readField($row, ['standard_sea_quantity', 'standardSeaQuantity', 'std_pack', 'stdPack', 'standard_pack', 'pack']) ?? $assy->standard_sea_quantity
                            ),
                            'standard_air_quantity' => $this->toInteger(
                                $this->readField($row, ['standard_air_quantity', 'standardAirQuantity']) ?? $assy->standard_air_quantity
                            ),
                            'max_quantity_sea' => $this->toInteger(
                                $this->readField($row, ['max_quantity_sea', 'maxQuantitySea']) ?? $assy->max_quantity_sea
                            ),
                            'max_quantity_air' => $this->toInteger(
                                $this->readField($row, ['max_quantity_air', 'maxQuantityAir']) ?? $assy->max_quantity_air
                            ),
                            'umh' => (function() use ($row, $assy) {
                                $val = $this->readField($row, ['umh', 'umh_gum', 'umhGum']);
                                $parsed = $val !== null ? $this->toDecimal($val) : null;
                                return ($parsed !== null && $parsed > 0.0) ? $parsed : ($assy->umh ?? 0.0);
                            })(),
                            'is_active' => $assy->exists ? $assy->is_active : true,
                        ]);

                        $assy->save();

                        if ($assy->wasRecentlyCreated) {
                            $assyStats['created']++;
                            if (count($assyStats['created_items'] ?? []) < 100) {
                                $assyStats['created_items'][] = $this->limit($assyNumber, 50);
                            }
                        } else {
                            $assyStats['updated']++;
                            if (count($assyStats['updated_items'] ?? []) < 100) {
                                $assyStats['updated_items'][] = $this->limit($assyNumber, 50);
                            }
                        }
                    } catch (Throwable $e) {
                        $assyStats['skipped']++;
                        $assyStats['errors'][] = "Row " . ($index + 1) . ": " . $e->getMessage();
                    }
                }
            });
        });

        return [
            'assy'    => $assyStats,
            'carline' => $carlineStats,
        ];
    }

    private function getEndpointUrl(string $endpointKey): string
    {
        $baseUrl = rtrim(config('services.sirep.base_url'), '/');
        $key = str_replace('_endpoint', '', $endpointKey);
        $path = config("services.sirep.endpoints.{$key}");

        if (!$baseUrl || !$path) {
            throw new \RuntimeException("Endpoint SIREP {$endpointKey} belum dikonfigurasi.");
        }

        return "{$baseUrl}/" . ltrim($path, '/');
    }

    private function fetchRows(string $endpointKey): array
    {
        $url = $this->getEndpointUrl($endpointKey);

        $response = Http::timeout((int) config('services.sirep.timeout', 30))
            ->withOptions([
                'proxy' => '',
                'curl' => [
                    CURLOPT_NOPROXY => '*',
                ],
            ])
            ->acceptJson()
            ->get($url);

        $response->throw();

        $payload = $response->json();

        if (is_array($payload) && array_is_list($payload)) {
            return $payload;
        }

        if (is_array($payload) && isset($payload['data']) && is_array($payload['data'])) {
            return $payload['data'];
        }

        return [];
    }

    private function upsertCarline(string $code, array $row, array &$stats): CarLine
    {
        $code = $this->limit($code, 20);
        $description = $this->readField($row, ['description', 'desc']);

        $carline = CarLine::firstOrNew(['code' => $code]);

        if (Schema::hasColumn($carline->getTable(), 'description') && ($description || !$carline->exists)) {
            $carline->description = $description ? $this->limit($description, 255) : $carline->description;
        }

        $carline->save();

        if ($carline->wasRecentlyCreated) {
            $stats['created']++;
            if (count($stats['created_items'] ?? []) < 100) {
                $stats['created_items'][] = $code;
            }
        } else {
            $stats['updated']++;
            if (count($stats['updated_items'] ?? []) < 100) {
                $stats['updated_items'][] = $code;
            }
        }

        return $carline;
    }

    private function readField(array $row, array $keys): ?string
    {
        $lookup = [];

        foreach ($row as $key => $value) {
            if (is_array($value) || is_object($value)) {
                continue;
            }

            $normalized = $this->normalizeFieldKey((string) $key);
            $lookup[$normalized] = $value;
            $lookup[str_replace('_', '', $normalized)] = $value;
        }

        foreach ($keys as $key) {
            $normalized = $this->normalizeFieldKey($key);
            $compact = str_replace('_', '', $normalized);
            $value = $lookup[$normalized] ?? $lookup[$compact] ?? null;

            if ($value !== null && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return null;
    }

    private function normalizeFieldKey(string $key): string
    {
        $key = preg_replace('/(?<!^)[A-Z]/', '_$0', $key);
        $key = preg_replace('/[^A-Za-z0-9]+/', '_', $key);

        return trim(strtolower($key), '_');
    }

    private function limit(?string $value, int $length): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return substr(trim($value), 0, $length);
    }

    private function toDecimal(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        return (float) str_replace(',', '.', (string) $value);
    }

    private function toInteger(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) $value;
    }

    private function emptyStats(): array
    {
        return [
            'total'         => 0,
            'created'       => 0,
            'updated'       => 0,
            'skipped'       => 0,
            'errors'        => [],
            'created_items' => [],
            'updated_items' => [],
        ];
    }
}
