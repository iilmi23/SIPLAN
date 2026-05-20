<?php

return [
    'templates' => [
        'TYC_JAI_ORIGINAL' => [
            'name'          => 'TYC JAI Original (Monthly)',
            'customer_code' => 'TYC',
            'sheet_name'    => 'JAI (加新件號)',

            // Header di Excel row 19 → 0-based index 18
            'header_row'    => 18,

            // Baris QTY = header_row + 1 = index 19 (Excel row 20)
            'qty_row_offset' => 1,

            // Mapping kolom (0-based)
            'columns' => [
                'model'       => 0,  // A - MODEL
                'family'      => 1,  // B - FAMILY
                'no'          => 2,  // C - No.
                'assy_number' => 3,  // D - PRODUCT NO
                // col E (idx 4) = kosong / merged
                'sfx'         => 5,  // F - SFX  ← FIX: was 4
                // col G (idx 6) = kosong / merged
                'qty_label'   => 6,  // G - QTY/CUM label
                'type'        => 7,  // H ke atas = kolom data tanggal  ← FIX: was 5
            ],

            'firm_keyword'    => 'FIRM',
            'forecast_keyword' => 'FORECAST',
            
            'skip_keywords' => [
                'qty', 'cum', 'total', 'subtotal',
                'type', 'model', 'family', 'product',
                'note', 'balance',
            ],

            'date_formats' => [
                'numeric'         => '/^\d{1,2}$/',           // 3,4,...,12
                'month_day'       => '/^\d{1,2}\/\d{1,2}$/', // 1/1, 12/31
                'year_month'      => '/^\d{4}\/\d{1,2}$/',   // 2023/1
                'year_month_dash' => '/^\d{4}-\d{1,2}$/',    // 2023-1
                'week'            => '/^\d+W$/i',              // 1W, 2W
                'ymd'             => '/^\d{4}-\d{2}-\d{2}$/', // 2024-01-01
            ],
        ],

        // ─── Sheet: JAI (加新件號) (data weekly + assy number baru) ───
        'TYC_JAI' => [
            'name'          => 'TYC JAI Template (Weekly)',
            'customer_code' => 'TYC',
            'sheet_name'    => 'JAI (加新件號)',  // ← FIX Bug 1: was 'JAI 原檔'

            // Header di Excel row 19 → 0-based index 18
            'header_row'    => 18,

            // ETA TYC row untuk resolve tanggal weekly (Excel row 18 → idx 17)
            // Dipakai oleh TYCMapper sebagai sumber tanggal aktual
            'eta_tyc_row'   => 17,

            // FIRM/FORECAST marker row (Excel row 13 → idx 12)
            'firm_forecast_row' => 12,

            // Baris QTY = header_row + 1 = index 19 (Excel row 20)
            // CATATAN: ExcelReader membaca QTY dari baris tunggal ini.
            // TYCMapper (yang lebih baru) membaca QTY per-baris data langsung.
            'qty_row_offset' => 1,

            // Mapping kolom (0-based)
            'columns' => [
                'model'       => 0,  // A - MODEL
                'family'      => 1,  // B - FAMILY
                'no'          => 2,  // C - No.
                'assy_number' => 3,  // D - PRODUCT NO
                // col E (idx 4) = kosong
                'sfx'         => 5,  // F - SFX  ← FIX: was 4
                // col G (idx 6) = kosong
                'qty_label'   => 6,  // G - QTY/CUM label
                'type'        => 7,  // H ke atas = kolom data tanggal  ← FIX: was 5
            ],

            'firm_keyword'    => 'FIRM',
            'forecast_keyword' => 'FORECAST',

            // 'firm' & 'forecast' DIHAPUS dari skip_keywords ← FIX Bug 4
            'skip_keywords' => [
                'qty', 'cum', 'total', 'subtotal',
                'type', 'model', 'family', 'product',
                'note', 'balance',
            ],

            // Format tanggal yang valid di header row 19
            // Weekly: 1W, 2W, 3W, 4W, 5W
            // Monthly lama: 3,4,...,12 dan 2023/1, 2024/2 dst
            'date_formats' => [
                'numeric'         => '/^\d{1,2}$/',           // 3,4,...,12 (monthly lama)
                'month_day'       => '/^\d{1,2}\/\d{1,2}$/', // 1/1, 12/31
                'year_month'      => '/^\d{4}\/\d{1,2}$/',   // 2023/1
                'year_month_dash' => '/^\d{4}-\d{1,2}$/',    // 2023-1
                'week'            => '/^\d+W$/i',              // 1W, 2W, 3W, 4W, 5W ← ini yang dominan
                'ymd'             => '/^\d{4}-\d{2}-\d{2}$/', // 2024-01-01
            ],
        ],

    ],
];