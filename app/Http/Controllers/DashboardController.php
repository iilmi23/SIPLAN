<?php

namespace App\Http\Controllers;

use App\Models\Assy;
use App\Models\CarLine;
use App\Models\Customer;
use App\Models\SPP;
use App\Models\SR;
use App\Models\UploadBatch;
use App\Services\PlanningCacheService;
use App\Services\Variance\VarianceAnalyticsService;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __construct(
        private readonly VarianceAnalyticsService $varianceAnalytics,
        private readonly PlanningCacheService $cache
    ) {
    }

    public function index()
    {
        return Inertia::render('Admin/Dashboard', $this->cache->remember('dashboard', ['variance' => 'operational_v1'], fn () => [
            'stats' => [
                'total_customers' => Customer::count(),
                'total_assy' => Assy::count(),
                'total_sr' => UploadBatch::count(),
                'total_spp' => SPP::count(),
                'total_carlines' => CarLine::count(),
            ],
            'recent_customers' => Customer::latest()->take(5)->get(),
            'recent_sr' => SR::latest()->take(5)->get(),
            'varianceDashboard' => $this->varianceAnalytics->operationalDashboard(),
        ], 5));
    }
}
