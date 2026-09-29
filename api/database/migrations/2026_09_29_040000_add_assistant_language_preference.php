<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('user_preferences', function (Blueprint $table): void {
            $table->string('assistant_language', 5)->nullable()->after('assistant_voice');
        });
    }

    public function down(): void
    {
        Schema::table('user_preferences', function (Blueprint $table): void {
            $table->dropColumn('assistant_language');
        });
    }
};
