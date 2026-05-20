<?php

namespace App\Services\Variance;

use Illuminate\Support\Facades\Cache;

class AnalyticsCacheService
{
    private const VERSION_KEY = 'variance:analytics:version';

    public function remember(string $scope, array $filters, \Closure $callback, int $minutes = 10): mixed
    {
        return Cache::remember($this->key($scope, $filters), now()->addMinutes($minutes), $callback);
    }

    public function invalidate(): void
    {
        if (! Cache::has(self::VERSION_KEY)) {
            Cache::forever(self::VERSION_KEY, 1);
        }

        Cache::increment(self::VERSION_KEY);
    }

    private function key(string $scope, array $filters): string
    {
        $version = Cache::get(self::VERSION_KEY, 1);

        return 'variance:analytics:'.$version.':'.$scope.':'.md5(json_encode($filters));
    }
}
