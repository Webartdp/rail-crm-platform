<?php

namespace App\Support\Pdf;

use RuntimeException;

/**
 * Reads the parts of a TrueType font a PDF needs: glyph ids for Unicode
 * characters (cmap 4/12), advance widths (hmtx) and vertical metrics.
 */
class TrueTypeFont
{
    public string $data;
    public string $postScriptName;
    public int $unitsPerEm;
    public int $ascent;
    public int $descent;
    public int $capHeight;
    /** @var array{0:int,1:int,2:int,3:int} */
    public array $bbox;
    /** @var array<int, int> unicode => glyph id */
    private array $cmap = [];
    /** @var array<int, int> glyph id => advance width (font units) */
    private array $widths = [];

    public function __construct(string $path)
    {
        $data = @file_get_contents($path);
        if ($data === false) {
            throw new RuntimeException("Font not found: {$path}");
        }
        $this->data = $data;
        $tables = $this->tables();

        $head = $tables['head'];
        $this->unitsPerEm = $this->u16($head + 18);
        $this->bbox = [$this->s16($head + 36), $this->s16($head + 38), $this->s16($head + 40), $this->s16($head + 42)];

        $hhea = $tables['hhea'];
        $this->ascent = $this->s16($hhea + 4);
        $this->descent = $this->s16($hhea + 6);
        $numberOfHMetrics = $this->u16($hhea + 34);

        $this->capHeight = $this->ascent;
        if (isset($tables['OS/2']) && $this->u16($tables['OS/2']) >= 2) {
            $this->capHeight = $this->s16($tables['OS/2'] + 88);
        }

        $numGlyphs = $this->u16($tables['maxp'] + 4);
        $hmtx = $tables['hmtx'];
        $last = 0;
        for ($glyph = 0; $glyph < $numGlyphs; $glyph++) {
            if ($glyph < $numberOfHMetrics) {
                $last = $this->u16($hmtx + $glyph * 4);
            }
            $this->widths[$glyph] = $last;
        }

        $this->readCmap($tables['cmap']);
        $this->postScriptName = $this->readName($tables['name'] ?? null) ?: 'EmbeddedFont';
    }

    public function glyph(int $codepoint): int
    {
        return $this->cmap[$codepoint] ?? 0;
    }

    /** Width in 1/1000 em, the unit PDF uses for glyph widths. */
    public function width(int $glyph): int
    {
        return (int) round(($this->widths[$glyph] ?? 0) * 1000 / $this->unitsPerEm);
    }

    public function scale(int $value): int
    {
        return (int) round($value * 1000 / $this->unitsPerEm);
    }

    /** @return array<string, int> table tag => offset */
    private function tables(): array
    {
        $count = $this->u16(4);
        $tables = [];
        for ($i = 0; $i < $count; $i++) {
            $record = 12 + $i * 16;
            $tables[substr($this->data, $record, 4)] = $this->u32($record + 8);
        }
        foreach (['head', 'hhea', 'hmtx', 'maxp', 'cmap'] as $required) {
            if (!isset($tables[$required])) {
                throw new RuntimeException("Font table {$required} missing");
            }
        }

        return $tables;
    }

    private function readCmap(int $offset): void
    {
        $count = $this->u16($offset + 2);
        $best = null;
        $bestFormat = 0;
        for ($i = 0; $i < $count; $i++) {
            $record = $offset + 4 + $i * 8;
            $platform = $this->u16($record);
            $encoding = $this->u16($record + 2);
            $sub = $offset + $this->u32($record + 4);
            $format = $this->u16($sub);
            if ($platform === 3 && $encoding === 10 && $format === 12) {
                $best = $sub;
                $bestFormat = 12;
                break;
            }
            if ((($platform === 3 && $encoding === 1) || $platform === 0) && $format === 4 && $bestFormat < 4) {
                $best = $sub;
                $bestFormat = 4;
            }
        }

        if ($best === null) {
            throw new RuntimeException('No Unicode cmap in font');
        }

        if ($bestFormat === 12) {
            $groups = $this->u32($best + 12);
            for ($g = 0; $g < $groups; $g++) {
                $p = $best + 16 + $g * 12;
                $start = $this->u32($p);
                $end = $this->u32($p + 4);
                $glyph = $this->u32($p + 8);
                for ($c = $start; $c <= $end && $c <= 0x10FFFF; $c++) {
                    $this->cmap[$c] = $glyph + ($c - $start);
                }
            }

            return;
        }

        $segX2 = $this->u16($best + 6);
        $segments = $segX2 / 2;
        $endCodes = $best + 14;
        $startCodes = $endCodes + $segX2 + 2;
        $deltas = $startCodes + $segX2;
        $rangeOffsets = $deltas + $segX2;

        for ($s = 0; $s < $segments; $s++) {
            $end = $this->u16($endCodes + $s * 2);
            $start = $this->u16($startCodes + $s * 2);
            $delta = $this->s16($deltas + $s * 2);
            $rangeOffset = $this->u16($rangeOffsets + $s * 2);
            for ($c = $start; $c <= $end && $c !== 0xFFFF; $c++) {
                if ($rangeOffset === 0) {
                    $glyph = ($c + $delta) & 0xFFFF;
                } else {
                    $address = $rangeOffsets + $s * 2 + $rangeOffset + ($c - $start) * 2;
                    $glyph = $this->u16($address);
                    if ($glyph !== 0) {
                        $glyph = ($glyph + $delta) & 0xFFFF;
                    }
                }
                if ($glyph !== 0) {
                    $this->cmap[$c] = $glyph;
                }
            }
        }
    }

    private function readName(?int $offset): ?string
    {
        if ($offset === null) {
            return null;
        }
        $count = $this->u16($offset + 2);
        $strings = $offset + $this->u16($offset + 4);
        for ($i = 0; $i < $count; $i++) {
            $record = $offset + 6 + $i * 12;
            if ($this->u16($record + 6) !== 6) {
                continue;
            }
            $length = $this->u16($record + 8);
            $raw = substr($this->data, $strings + $this->u16($record + 10), $length);
            $platform = $this->u16($record);
            $name = $platform === 3 || $platform === 0 ? mb_convert_encoding($raw, 'UTF-8', 'UTF-16BE') : $raw;
            $name = preg_replace('/[^A-Za-z0-9\-]/', '', $name);
            if ($name !== '') {
                return $name;
            }
        }

        return null;
    }

    private function u16(int $offset): int
    {
        return unpack('n', $this->data, $offset)[1];
    }

    private function s16(int $offset): int
    {
        $value = $this->u16($offset);

        return $value >= 0x8000 ? $value - 0x10000 : $value;
    }

    private function u32(int $offset): int
    {
        return unpack('N', $this->data, $offset)[1];
    }
}
