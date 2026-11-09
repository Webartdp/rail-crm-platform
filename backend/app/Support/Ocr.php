<?php

namespace App\Support;

use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Text recognition with the server's command line tools:
 * pdftotext for PDFs that already contain text, otherwise pdftoppm + tesseract.
 * Install on the server: apt install tesseract-ocr tesseract-ocr-deu tesseract-ocr-rus poppler-utils
 */
class Ocr
{
    private static function binary(string $name): ?string
    {
        return (new ExecutableFinder())->find($name, null, ['/usr/bin', '/usr/local/bin']);
    }

    /** @return array{tesseract: bool, pdftotext: bool, pdftoppm: bool, languages: string[]} */
    public static function capabilities(): array
    {
        if (!self::canRunHere()) {
            return ['tesseract' => false, 'pdftotext' => false, 'pdftoppm' => false, 'languages' => []];
        }
        $tesseract = self::binary('tesseract');

        return [
            'tesseract' => $tesseract !== null,
            'pdftotext' => self::binary('pdftotext') !== null,
            'pdftoppm' => self::binary('pdftoppm') !== null,
            'languages' => $tesseract ? self::languages($tesseract) : [],
        ];
    }

    /**
     * Whether external programs can be started from this PHP process.
     * HestiaCP disables proc_open for the web (FPM) PHP; the CLI usually allows it,
     * so OCR then runs from the scheduler command `documents:ocr`.
     */
    public static function canRunHere(): bool
    {
        return function_exists('proc_open');
    }

    /** Recognised text, or null when no tool can read this file. */
    public static function extract(string $path, ?string $mime): ?string
    {
        if (!self::canRunHere()) {
            return null;
        }

        $isPdf = $mime === 'application/pdf' || str_ends_with(strtolower($path), '.pdf');

        if ($isPdf && ($pdftotext = self::binary('pdftotext'))) {
            $text = self::run([$pdftotext, '-layout', $path, '-']);
            if (mb_strlen(trim((string) $text)) >= 30) {
                return trim((string) $text);
            }
        }

        $tesseract = self::binary('tesseract');
        if (!$tesseract) {
            return null;
        }
        $languages = implode('+', self::languages($tesseract) ?: ['eng']);

        if (!$isPdf) {
            return trim((string) self::run([$tesseract, $path, 'stdout', '-l', $languages]));
        }

        $pdftoppm = self::binary('pdftoppm');
        if (!$pdftoppm) {
            return null;
        }

        $dir = sys_get_temp_dir().'/rail-ocr-'.bin2hex(random_bytes(6));
        @mkdir($dir, 0700, true);
        try {
            self::run([$pdftoppm, '-r', '200', '-png', '-f', '1', '-l', '5', $path, $dir.'/page'], 120);
            $pages = glob($dir.'/page*.png') ?: [];
            sort($pages);
            $text = [];
            foreach ($pages as $page) {
                $text[] = trim((string) self::run([$tesseract, $page, 'stdout', '-l', $languages], 120));
            }

            return trim(implode("\n\n", array_filter($text)));
        } finally {
            array_map('unlink', glob($dir.'/*') ?: []);
            @rmdir($dir);
        }
    }

    /** @return string[] */
    private static function languages(string $tesseract): array
    {
        $output = (string) self::run([$tesseract, '--list-langs']);

        return array_values(array_intersect(['deu', 'eng', 'rus', 'ukr'], preg_split('/\s+/', $output) ?: []));
    }

    private static function run(array $command, int $timeout = 60): ?string
    {
        $process = new Process($command);
        $process->setTimeout($timeout);
        $process->run();

        return $process->isSuccessful() ? $process->getOutput() : null;
    }
}
