<?php

namespace App\Support\Pdf;

/**
 * Small PDF writer for invoices and protocols: A4 pages, Unicode text with an
 * embedded TrueType font (German umlauts, Cyrillic, €), lines, rectangles and
 * JPEG images. Coordinates are in points from the top-left corner.
 */
class PdfDocument
{
    public const WIDTH = 595.28;
    public const HEIGHT = 841.89;

    /** @var array<string, array{font: TrueTypeFont, used: array<int, int>}> */
    private array $fonts = [];
    /** @var array<int, string> page content streams */
    private array $pages = [];
    /** @var array<int, array{data: string, width: int, height: int}> */
    private array $images = [];
    private string $current = 'regular';
    private float $size = 10;
    private string $title = '';

    public function __construct(?string $fontDir = null)
    {
        $dir = $fontDir ?? (function_exists('resource_path') ? resource_path('fonts') : __DIR__.'/../../../resources/fonts');
        $this->fonts['regular'] = ['font' => new TrueTypeFont($dir.'/LiberationSans-Regular.ttf'), 'used' => []];
        $this->fonts['bold'] = ['font' => new TrueTypeFont($dir.'/LiberationSans-Bold.ttf'), 'used' => []];
        $this->addPage();
    }

    public function setTitle(string $title): void
    {
        $this->title = $title;
    }

    public function addPage(): void
    {
        $this->pages[] = '';
    }

    public function pageCount(): int
    {
        return count($this->pages);
    }

    public function font(string $style = 'regular', float $size = 10): self
    {
        $this->current = isset($this->fonts[$style]) ? $style : 'regular';
        $this->size = $size;

        return $this;
    }

    public function textWidth(string $text, ?string $style = null, ?float $size = null): float
    {
        $font = $this->fonts[$style ?? $this->current]['font'];
        $width = 0;
        foreach ($this->codepoints($text) as $codepoint) {
            $width += $font->width($font->glyph($codepoint));
        }

        return $width * ($size ?? $this->size) / 1000;
    }

    /** Text with its baseline at $y. $align: left | right | center (relative to $x). */
    public function text(float $x, float $y, string $text, string $align = 'left', array $color = [0.06, 0.11, 0.18]): void
    {
        if ($text === '') {
            return;
        }
        $width = $this->textWidth($text);
        if ($align === 'right') {
            $x -= $width;
        } elseif ($align === 'center') {
            $x -= $width / 2;
        }

        $entry = &$this->fonts[$this->current];
        $hex = '';
        foreach ($this->codepoints($text) as $codepoint) {
            $glyph = $entry['font']->glyph($codepoint);
            $entry['used'][$glyph] = $codepoint;
            $hex .= sprintf('%04X', $glyph);
        }

        $this->write(sprintf(
            "BT %s rg /F%s %.2F Tf %.2F %.2F Td <%s> Tj ET\n",
            $this->rgb($color),
            $this->current === 'bold' ? '2' : '1',
            $this->size,
            $x,
            self::HEIGHT - $y,
            $hex,
        ));
    }

    /**
     * Wraps text into lines that fit $width and draws them. Returns the y below the last line.
     */
    public function paragraph(float $x, float $y, float $width, string $text, float $leading = 1.35, array $color = [0.06, 0.11, 0.18]): float
    {
        foreach ($this->wrap($text, $width) as $line) {
            $this->text($x, $y, $line, 'left', $color);
            $y += $this->size * $leading;
        }

        return $y;
    }

    /** @return string[] */
    public function wrap(string $text, float $width): array
    {
        $lines = [];
        foreach (preg_split('/\R/u', $text) as $rawLine) {
            $line = '';
            foreach (preg_split('/\s+/u', trim($rawLine)) as $word) {
                $candidate = $line === '' ? $word : $line.' '.$word;
                if ($line !== '' && $this->textWidth($candidate) > $width) {
                    $lines[] = $line;
                    $line = $word;
                } else {
                    $line = $candidate;
                }
            }
            $lines[] = $line;
        }

        return $lines;
    }

    public function line(float $x1, float $y1, float $x2, float $y2, float $width = 0.5, array $color = [0.86, 0.89, 0.92]): void
    {
        $this->write(sprintf("%s RG %.2F w %.2F %.2F m %.2F %.2F l S\n", $this->rgb($color), $width, $x1, self::HEIGHT - $y1, $x2, self::HEIGHT - $y2));
    }

    public function rect(float $x, float $y, float $w, float $h, ?array $fill = null, ?array $stroke = null, float $lineWidth = 0.5): void
    {
        $ops = sprintf('%.2F %.2F %.2F %.2F re', $x, self::HEIGHT - $y - $h, $w, $h);
        if ($fill && $stroke) {
            $this->write(sprintf("%s rg %s RG %.2F w %s B\n", $this->rgb($fill), $this->rgb($stroke), $lineWidth, $ops));
        } elseif ($fill) {
            $this->write(sprintf("%s rg %s f\n", $this->rgb($fill), $ops));
        } elseif ($stroke) {
            $this->write(sprintf("%s RG %.2F w %s S\n", $this->rgb($stroke), $lineWidth, $ops));
        }
    }

    /** Draws a JPEG (raw file bytes). Returns false when the data is not a JPEG. */
    public function jpeg(string $data, float $x, float $y, float $width): bool
    {
        $info = @getimagesizefromstring($data);
        if (!$info || ($info[2] ?? null) !== IMAGETYPE_JPEG) {
            return false;
        }
        $index = count($this->images);
        $this->images[] = ['data' => $data, 'width' => (int) $info[0], 'height' => (int) $info[1], 'channels' => (int) ($info['channels'] ?? 3)];
        $height = $width * $info[1] / max(1, $info[0]);
        $this->write(sprintf("q %.2F 0 0 %.2F %.2F %.2F cm /Im%d Do Q\n", $width, $height, $x, self::HEIGHT - $y - $height, $index + 1));

        return true;
    }

    /** PNG/JPEG data URL (e.g. a canvas signature) → JPEG on white, needs the GD extension. */
    public function imageFromDataUrl(string $dataUrl, float $x, float $y, float $width): bool
    {
        if (!preg_match('#^data:image/(png|jpe?g);base64,(.+)$#', $dataUrl, $match)) {
            return false;
        }
        $bytes = base64_decode($match[2], true);
        if ($bytes === false) {
            return false;
        }
        if ($match[1] !== 'png') {
            return $this->jpeg($bytes, $x, $y, $width);
        }
        if (!function_exists('imagecreatefromstring')) {
            return false;
        }
        $source = @imagecreatefromstring($bytes);
        if (!$source) {
            return false;
        }
        $canvas = imagecreatetruecolor(imagesx($source), imagesy($source));
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopy($canvas, $source, 0, 0, 0, 0, imagesx($source), imagesy($source));
        ob_start();
        imagejpeg($canvas, null, 90);
        $jpeg = (string) ob_get_clean();

        return $this->jpeg($jpeg, $x, $y, $width);
    }

    public function output(): string
    {
        $objects = [];
        $add = function (string $body) use (&$objects): int {
            $objects[] = $body;

            return count($objects);
        };

        // 1 catalog, 2 pages: reserved, filled at the end.
        $add('');
        $add('');

        $fontRefs = [];
        foreach (['regular' => 1, 'bold' => 2] as $style => $number) {
            $fontRefs[$number] = $this->embedFont($this->fonts[$style], $add);
        }

        $imageRefs = [];
        foreach ($this->images as $index => $image) {
            $space = $image['channels'] === 1 ? '/DeviceGray' : ($image['channels'] === 4 ? '/DeviceCMYK' : '/DeviceRGB');
            $imageRefs[$index + 1] = $add(sprintf(
                "<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace %s /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\nstream\n%s\nendstream",
                $image['width'], $image['height'], $space, strlen($image['data']), $image['data'],
            ));
        }

        $resources = '<< /Font << /F1 '.$fontRefs[1].' 0 R /F2 '.$fontRefs[2].' 0 R >>';
        if ($imageRefs) {
            $resources .= ' /XObject << '.implode(' ', array_map(fn ($number, $ref) => "/Im{$number} {$ref} 0 R", array_keys($imageRefs), $imageRefs)).' >>';
        }
        $resources .= ' >>';

        $kids = [];
        foreach ($this->pages as $content) {
            $stream = gzcompress($content, 6);
            $contentRef = $add(sprintf("<< /Length %d /Filter /FlateDecode >>\nstream\n%s\nendstream", strlen($stream), $stream));
            $kids[] = $add(sprintf('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2F %.2F] /Resources %s /Contents %d 0 R >>', self::WIDTH, self::HEIGHT, $resources, $contentRef));
        }

        $objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[1] = '<< /Type /Pages /Kids ['.implode(' ', array_map(fn ($ref) => "{$ref} 0 R", $kids)).'] /Count '.count($kids).' >>';
        $info = $add('<< /Producer (Rail CRM) /Title '.$this->pdfString($this->title).' /CreationDate (D:'.date('YmdHis').') >>');

        $pdf = "%PDF-1.6\n%\xE2\xE3\xCF\xD3\n";
        $offsets = [];
        foreach ($objects as $index => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n{$body}\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= 'xref'."\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer'."\n<< /Size ".(count($objects) + 1)." /Root 1 0 R /Info {$info} 0 R >>\nstartxref\n{$xref}\n%%EOF\n";

        return $pdf;
    }

    /** @param array{font: TrueTypeFont, used: array<int, int>} $entry */
    private function embedFont(array $entry, callable $add): int
    {
        $font = $entry['font'];
        $used = $entry['used'] + [0 => 0];
        ksort($used);

        $fontData = gzcompress($font->data, 9);
        $fileRef = $add(sprintf("<< /Length %d /Length1 %d /Filter /FlateDecode >>\nstream\n%s\nendstream", strlen($fontData), strlen($font->data), $fontData));

        $name = 'RCRM+'.$font->postScriptName;
        $descriptorRef = $add(sprintf(
            '<< /Type /FontDescriptor /FontName /%s /Flags 32 /FontBBox [%d %d %d %d] /ItalicAngle 0 /Ascent %d /Descent %d /CapHeight %d /StemV 80 /FontFile2 %d 0 R >>',
            $name,
            $font->scale($font->bbox[0]), $font->scale($font->bbox[1]), $font->scale($font->bbox[2]), $font->scale($font->bbox[3]),
            $font->scale($font->ascent), $font->scale($font->descent), $font->scale($font->capHeight),
            $fileRef,
        ));

        $widths = '';
        foreach (array_keys($used) as $glyph) {
            $widths .= $glyph.' ['.$font->width($glyph).'] ';
        }

        $cidRef = $add(sprintf(
            '<< /Type /Font /Subtype /CIDFontType2 /BaseFont /%s /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor %d 0 R /DW 500 /W [%s] /CIDToGIDMap /Identity >>',
            $name, $descriptorRef, trim($widths),
        ));

        $map = '';
        $count = 0;
        $blocks = '';
        foreach ($used as $glyph => $codepoint) {
            if ($glyph === 0 || $codepoint === 0) {
                continue;
            }
            $map .= sprintf("<%04X> <%s>\n", $glyph, strtoupper(bin2hex(mb_convert_encoding(mb_chr($codepoint, 'UTF-8'), 'UTF-16BE', 'UTF-8'))));
            if (++$count === 100) {
                $blocks .= "100 beginbfchar\n{$map}endbfchar\n";
                $map = '';
                $count = 0;
            }
        }
        if ($count > 0) {
            $blocks .= "{$count} beginbfchar\n{$map}endbfchar\n";
        }
        $cmap = "/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /Adobe-Identity-UCS def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n{$blocks}endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend";
        $toUnicodeRef = $add(sprintf("<< /Length %d >>\nstream\n%s\nendstream", strlen($cmap), $cmap));

        return $add(sprintf('<< /Type /Font /Subtype /Type0 /BaseFont /%s /Encoding /Identity-H /DescendantFonts [%d 0 R] /ToUnicode %d 0 R >>', $name, $cidRef, $toUnicodeRef));
    }

    private function write(string $operators): void
    {
        $this->pages[count($this->pages) - 1] .= $operators;
    }

    /** @return int[] */
    private function codepoints(string $text): array
    {
        $text = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $text);

        return array_map(fn ($char) => mb_ord($char, 'UTF-8'), mb_str_split($text, 1, 'UTF-8'));
    }

    private function rgb(array $color): string
    {
        return sprintf('%.3F %.3F %.3F', $color[0], $color[1], $color[2]);
    }

    private function pdfString(string $text): string
    {
        return '<FEFF'.strtoupper(bin2hex(mb_convert_encoding($text, 'UTF-16BE', 'UTF-8'))).'>';
    }
}
