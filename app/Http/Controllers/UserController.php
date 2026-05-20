<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'name', 'email', 'role', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Users/Create', [
            'permissionCatalog' => User::permissionCatalog(),
            'roleDefaults' => [
                'admin' => User::defaultPermissionsForRole('admin'),
                'ppc' => User::defaultPermissionsForRole('ppc'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'role' => 'required|in:admin,ppc',
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'in:'.implode(',', User::permissionKeys())],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'permissions' => $this->normalizePermissions(
                $request->input('permissions', User::defaultPermissionsForRole($request->role))
            ),
            'email_verified_at' => now(),
        ]);

        return redirect()->route('users.index')->with('success', 'User created successfully.');
    }

    public function show(User $user)
    {
        return Inertia::render('Admin/Users/Show', [
            'user' => array_merge(
                $user->only(['id', 'name', 'email', 'role', 'created_at']),
                ['permissions' => $user->permissions()]
            ),
            'permissionCatalog' => User::permissionCatalog(),
        ]);
    }

    public function edit(User $user)
    {
        return Inertia::render('Admin/Users/Edit', [
            'user' => array_merge(
                $user->only(['id', 'name', 'email', 'role']),
                ['permissions' => $user->permissions()]
            ),
            'permissionCatalog' => User::permissionCatalog(),
            'roleDefaults' => [
                'admin' => User::defaultPermissionsForRole('admin'),
                'ppc' => User::defaultPermissionsForRole('ppc'),
            ],
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class.',email,'.$user->id,
            'role' => 'required|in:admin,ppc',
            'password' => ['nullable', 'confirmed', Rules\Password::defaults()],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'in:'.implode(',', User::permissionKeys())],
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'permissions' => $this->normalizePermissions(
                $request->input('permissions', User::defaultPermissionsForRole($request->role))
            ),
        ]);

        if ($request->filled('password')) {
            $user->update([
                'password' => Hash::make($request->password),
            ]);
        }

        return redirect()->route('users.index')->with('success', 'User updated successfully.');
    }

    public function destroy(User $user): RedirectResponse
    {
        // Prevent admin from deleting themselves
        if ($user->id === auth()->id()) {
            return redirect()->route('users.index')->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return redirect()->route('users.index')->with('success', 'User deleted successfully.');
    }

    private function normalizePermissions(array $permissions): array
    {
        return collect($permissions)
            ->intersect(User::permissionKeys())
            ->unique()
            ->values()
            ->all();
    }
}
