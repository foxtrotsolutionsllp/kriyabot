<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('meetings', function (Blueprint $table): void {
            $table->foreignId('saved_place_id')->nullable()->after('created_by')->constrained('saved_places')->nullOnDelete();
        });
        Schema::table('user_preferences', function (Blueprint $table): void {
            $table->string('assistant_name', 40)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('meetings', function (Blueprint $table): void {
            $table->dropForeign(['saved_place_id']);
            $table->dropColumn('saved_place_id');
        });
        Schema::table('user_preferences', function (Blueprint $table): void {
            $table->dropColumn('assistant_name');
        });
    }
};
