<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('job_title', 120)->nullable()->after('name');
            $table->string('department', 120)->nullable()->after('job_title');
            $table->string('phone', 40)->nullable()->after('department');
            $table->string('location', 160)->nullable()->after('phone');
            $table->text('bio')->nullable()->after('location');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['job_title', 'department', 'phone', 'location', 'bio']);
        });
    }
};
