<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('app:status', function () {
    $this->info('Rail CRM backend is available.');
});
