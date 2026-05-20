<?php

namespace App\Services;

use App\Models\Assy;

class MasterAssyResolverService
{
    public function apply(array $mapped): array
    {
        $assyMap = Assy::with('carline')
            ->whereIn('assy_number', collect($mapped)->pluck('assy_number')->filter()->unique())
            ->get()
            ->keyBy('assy_number');
        $unknownAssyNumbers = [];

        foreach ($mapped as &$item) {
            $assy = $assyMap->get($item['assy_number'] ?? null);

            if ($assy) {
                $item['assy_id'] = $assy->id;
                $item['carline_id'] = $assy->carline_id;
                $item['model'] = $item['model'] ?? $assy->carline?->code;
                $item['family'] = $item['family'] ?? $assy->carline?->description;
                $item['is_mapped'] = true;
                $item['mapping_error'] = null;

                continue;
            }

            $item['assy_id'] = null;
            $item['is_mapped'] = false;
            $item['mapping_error'] = 'Assy number '.($item['assy_number'] ?? '-').' tidak ditemukan di master assy.';
            $unknownAssyNumbers[] = $item['assy_number'] ?? null;
        }
        unset($item);

        return [
            $mapped,
            array_values(array_unique(array_filter($unknownAssyNumbers))),
        ];
    }
}
