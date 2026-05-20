<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'permissions',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'permissions' => 'array',
        ];
    }

    public function hasRole(array|string $roles): bool
    {
        $roles = collect(is_array($roles) ? $roles : [$roles])
            ->map(fn (string $role) => strtolower(trim($role)))
            ->all();

        return in_array($this->role, $roles, true);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isStaff(): bool
    {
        return $this->hasRole('ppc');
    }

    public static function permissionCatalog(): array
    {
        return [
            'General' => [
                ['key' => 'dashboard.view', 'label' => 'Dashboard'],
            ],
            'Masters' => [
                ['key' => 'masters.view', 'label' => 'Masters Menu'],
                ['key' => 'customers.view', 'label' => 'Customers'],
                ['key' => 'ports.view', 'label' => 'Ports'],
                ['key' => 'sr-templates.view', 'label' => 'SR Templates'],
                ['key' => 'production-week.view', 'label' => 'Production Week'],
                ['key' => 'carline.view', 'label' => 'Carline'],
                ['key' => 'assy.view', 'label' => 'Assy'],
            ],
            'Shipping Release' => [
                ['key' => 'sr.upload', 'label' => 'Upload SR'],
                ['key' => 'summary.view', 'label' => 'Summary'],
                ['key' => 'spp.view', 'label' => 'SPP'],
                ['key' => 'history.view', 'label' => 'History'],
            ],
            'System' => [
                ['key' => 'users.view', 'label' => 'Users'],
            ],
        ];
    }

    public static function permissionKeys(): array
    {
        return collect(self::permissionCatalog())
            ->flatten(1)
            ->pluck('key')
            ->all();
    }

    public static function defaultPermissionsForRole(string $role): array
    {
        $permissions = [
            'admin' => [
                'dashboard.view',
                'masters.view',
                'customers.view',
                'ports.view',
                'sr-templates.view',
                'production-week.view',
                'carline.view',
                'assy.view',
                'sr.upload',
                'summary.view',
                'spp.view',
                'history.view',
                'users.view',
            ],
            'ppc' => [
                'dashboard.view',
                'masters.view',
                'production-week.view',
                'carline.view',
                'assy.view',
                'sr.upload',
                'summary.view',
                'spp.view',
                'history.view',
            ],
        ];

        return $permissions[strtolower(trim($role))] ?? $permissions['ppc'];
    }

    public function permissions(): array
    {
        $storedPermissions = $this->getAttribute('permissions');

        if (is_array($storedPermissions)) {
            return array_values(array_intersect($storedPermissions, self::permissionKeys()));
        }

        return self::defaultPermissionsForRole($this->role);
    }

    public function hasPermission(string $permission): bool
    {
        return in_array($permission, $this->permissions(), true);
    }

    public function getRoleLabelAttribute(): string
    {
        return match ($this->role) {
            'admin' => 'Admin',
            'ppc' => 'PPC',
            default => 'PPC',
        };
    }

    public function getRoleAttribute(?string $value): string
    {
        return strtolower(trim($value ?: 'ppc'));
    }

    public function setRoleAttribute(?string $value): void
    {
        $this->attributes['role'] = strtolower(trim($value ?: 'ppc'));
    }
}
