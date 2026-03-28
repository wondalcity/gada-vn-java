<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Maps to ref.construction_trades.
 */
class Trade extends Model
{
    protected $table = 'ref.construction_trades';

    public $timestamps = false;

    protected $fillable = ['code', 'name_ko', 'name_vi', 'name_en'];
}
