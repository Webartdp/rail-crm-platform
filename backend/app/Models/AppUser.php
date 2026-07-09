<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class AppUser extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'app_users';

    protected $fillable = [
        'employee_profile_id',
        'name',
        'email',
        'password_hash',
        'role',
        'api_token',
        'is_active',
    ];

    protected $hidden = [
        'password_hash',
        'api_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }
}
