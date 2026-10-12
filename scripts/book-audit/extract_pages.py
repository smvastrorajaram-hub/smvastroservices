#!/usr/bin/env python3
"""Extract page records for source analysis; never modify books or app files."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata

import fitz

ANSI_ESCAPE = re.compile(r"\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))")
BIDI_CONTROLS = {"\u061c", "\u200e", "\u200f", "\u202a", "\u202b", "\u202c",
                 "\u202d", "\u202e", "\u2066", "\u2067", "\u2068", "\u2069"}

def clean_text(value):
    value = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    value = ANSI_ESCAPE.sub("", value).replace("\n", "\u2028").replace("\t", " ")
    return "".join(c for c in value if unicodedata.category(c) != "Cc"
                   and c not in BIDI_CONTROLS).strip()

def useful_chars(text):
    return sum(c.isalnum() for c in text)

def plausible_text(text):
    if not useful_chars(text):
        return False
    bad = text.count("\ufffd") + sum(unicodedata.category(c) == "Co" for c in text)
    return bad / max(len(text), 1) <= 0.03

def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

class Emitter:
    def __init__(self, output_path=None):
        self.artifact = None
        if output_path:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            self.artifact = path.open("w", encoding="utf-8", newline="\n")
    def emit(self, marker, record):
        data = {"event": marker, **record}
        serialized = json.dumps(data, ensure_ascii=True, allow_nan=False,
                                separators=(",", ":"))
        print(marker + " " + serialized, flush=True)
        if self.artifact:
            self.artifact.write(serialized + "\n")
            self.artifact.flush()
    def close(self):
        if self.artifact:
            self.artifact.close()

def inspect_ocr(languages):
    executable = shutil.which("tesseract")
    if not executable:
        return None, "tesseract executable unavailable"
    try:
        result = subprocess.run([executable, "--list-langs"], capture_output=True,
                                text=True, encoding="utf-8", errors="replace",
                                timeout=15, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        return None, clean_text(error)
    if result.returncode != 0:
        return None, clean_text(result.stderr or result.stdout)
    available = {line.strip() for line in result.stdout.splitlines()
                 if line.strip() and not line.startswith("List of available")}
    missing = [lang for lang in languages.split("+") if lang not in available]
    if missing:
        return None, "Missing OCR languages: " + ", ".join(missing)
    return executable, None

def page_image_info(page):
    images = page.get_image_info()
    area = max(page.rect.width * page.rect.height, 1)
    largest = 0.0
    for image in images:
        box = fitz.Rect(image["bbox"]) & page.rect
        if not box.is_empty:
            largest = max(largest, max(box.width, 0) * max(box.height, 0) / area)
    return len(images), round(min(largest, 1), 4)

def run_ocr(page, executable, args):
    width, height = float(page.rect.width), float(page.rect.height)
    if width <= 0 or height <= 0 or not math.isfinite(width * height):
        raise ValueError("Invalid page dimensions")
    scale = min(args.dpi / 72.0,
                math.sqrt(args.max_pixels / (width * height)) * 0.98,
                args.max_dimension / max(width, height))
    if scale <= 0:
        raise ValueError("Invalid raster scale")
    pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale),
                            colorspace=fitz.csGRAY, alpha=False)
    if pixmap.width * pixmap.height > args.max_pixels:
        raise ValueError("Rendered page exceeds configured pixel cap")
    raster = {"width": pixmap.width, "height": pixmap.height,
              "effectiveDpi": round(scale * 72, 2)}
    with tempfile.TemporaryDirectory(prefix="smv-book-ocr-") as directory:
        image_path = Path(directory) / "page.png"
        output_base = Path(directory) / "ocr"
        pixmap.save(str(image_path))
        del pixmap
        result = subprocess.run(
            [executable, str(image_path), str(output_base), "-l", args.ocr_languages,
             "--oem", "1", "--psm", "3"], capture_output=True, text=True,
            encoding="utf-8", errors="replace", timeout=args.ocr_timeout, check=False)
        if result.returncode != 0:
            raise RuntimeError("tesseract exit {}: {}".format(
                result.returncode, clean_text(result.stderr or result.stdout)[:1500]))
        text_path = output_base.with_suffix(".txt")
        if not text_path.exists():
            raise RuntimeError("tesseract produced no text file")
        return clean_text(text_path.read_text(encoding="utf-8", errors="replace")), raster

def extract_page(page, page_number, args, ocr_executable, ocr_error):
    started = time.monotonic()
    errors, native, ocr = [], "", ""
    image_count, image_coverage, raster = None, None, None
    try:
        native = clean_text(page.get_text("text", sort=True))
    except Exception as error:
        errors.append({"stage": "native-text", "error": clean_text(error)})
    try:
        image_count, image_coverage = page_image_info(page)
    except Exception as error:
        errors.append({"stage": "image-info", "error": clean_text(error)})
    native_useful = useful_chars(native)
    need_ocr = (native_useful < args.min_text_chars or not plausible_text(native)
                or (image_coverage is not None and image_coverage >= 0.60
                    and native_useful < args.scan_header_threshold))
    if need_ocr:
        if not ocr_executable:
            errors.append({"stage": "ocr-unavailable", "error": ocr_error})
        else:
            try:
                ocr, raster = run_ocr(page, ocr_executable, args)
            except subprocess.TimeoutExpired:
                errors.append({"stage": "ocr-timeout",
                               "error": "OCR exceeded {} seconds".format(args.ocr_timeout)})
            except Exception as error:
                errors.append({"stage": "ocr", "error": clean_text(error)})
    if plausible_text(ocr) and (not plausible_text(native)
                               or useful_chars(ocr) > native_useful):
        selected, method = ocr, "ocr"
    elif plausible_text(native):
        selected, method = native, "native-text"
    else:
        selected, method = "", "unreadable"
    selected_useful = useful_chars(selected)
    status = ("unreadable" if not selected else
              "low-text" if selected_useful < args.min_text_chars else "extracted")
    record = {
        "bookId": args.book_id, "pdfPage": page_number, "method": method,
        "status": status, "text": selected, "chars": len(selected),
        "usefulChars": selected_useful, "nativeChars": len(native),
        "ocrChars": len(ocr), "ocrRequested": need_ocr, "imageCount": image_count,
        "largestImageFraction": image_coverage,
        "pageWidthPoints": round(float(page.rect.width), 2),
        "pageHeightPoints": round(float(page.rect.height), 2),
        "elapsedSeconds": round(time.monotonic() - started, 3), "errors": errors,
    }
    if raster:
        record["ocrRaster"] = raster
    if method == "ocr" and native and native != ocr:
        record["nativeText"] = native
    return record

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book", required=True, type=Path)
    parser.add_argument("--book-id", required=True)
    parser.add_argument("--output", help="Analysis artifact JSONL path")
    parser.add_argument("--ocr-languages", default="eng+tam")
    parser.add_argument("--ocr-timeout", type=float, default=60)
    parser.add_argument("--dpi", type=float, default=200)
    parser.add_argument("--max-pixels", type=int, default=12_000_000)
    parser.add_argument("--max-dimension", type=int, default=16000)
    parser.add_argument("--min-text-chars", type=int, default=80)
    parser.add_argument("--scan-header-threshold", type=int, default=300)
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()
    if (args.ocr_timeout <= 0 or args.dpi <= 0
        or not math.isfinite(args.ocr_timeout) or not math.isfinite(args.dpi)
        or args.max_pixels <= 0 or args.max_dimension <= 0
        or args.min_text_chars < 1 or args.scan_header_threshold < 1):
        parser.error("Timeout, raster limits and text thresholds must be positive")
    emitter = Emitter(args.output)
    started = time.monotonic()
    document = None
    counts = {"native-text": 0, "ocr": 0, "unreadable": 0}
    unreadable_pages, low_text_pages, error_pages = [], [], []
    emitted_pages, page_count, digest, fatal = 0, None, None, None
    try:
        digest = sha256_file(args.book)
        document = fitz.open(str(args.book))
        if not document.is_pdf:
            raise ValueError("Input is not a PDF")
        if document.needs_pass:
            raise ValueError("PDF requires a password")
        page_count = document.page_count
        metadata = {clean_text(k): clean_text(v) for k, v in (document.metadata or {}).items()}
        ocr_executable, ocr_error = inspect_ocr(args.ocr_languages)
        emitter.emit("SMV_BOOK_BEGIN", {
            "bookId": args.book_id, "fileName": args.book.name, "sha256": digest,
            "pageCount": page_count, "title": metadata.get("title", ""), "metadata": metadata,
            "pymupdfVersion": getattr(fitz, "VersionBind", "unknown"),
            "ocrAvailable": bool(ocr_executable), "ocrLanguages": args.ocr_languages,
            "ocrAvailabilityError": ocr_error, "dpiTarget": args.dpi,
            "pixelCap": args.max_pixels, "reviewedByAnalyst": False,
        })
        for index in range(page_count):
            page_number = index + 1
            try:
                page = document.load_page(index)
                record = extract_page(page, page_number, args, ocr_executable, ocr_error)
            except Exception as error:
                record = {"bookId": args.book_id, "pdfPage": page_number,
                          "method": "unreadable", "status": "unreadable", "text": "",
                          "chars": 0, "imageCount": None,
                          "errors": [{"stage": "page-load", "error": clean_text(error)}]}
            emitter.emit("SMV_BOOK_PAGE", record)
            emitted_pages += 1
            counts[record["method"]] += 1
            if record["status"] == "unreadable":
                unreadable_pages.append(page_number)
            elif record["status"] == "low-text":
                low_text_pages.append(page_number)
            if record["errors"]:
                error_pages.append(page_number)
    except Exception as error:
        fatal = clean_text(error)
    finally:
        if document:
            document.close()
        emitter.emit("SMV_BOOK_END", {
            "bookId": args.book_id, "fileName": args.book.name, "sha256": digest,
            "pageCount": page_count, "emittedPages": emitted_pages, "methodCounts": counts,
            "unreadablePages": unreadable_pages, "lowTextPages": low_text_pages,
            "pagesWithExtractionErrors": error_pages, "fatalError": fatal,
            "allPageRecordsEmitted": fatal is None and page_count is not None
                                   and emitted_pages == page_count,
            "extractionNeedsReview": bool(fatal or unreadable_pages or low_text_pages or error_pages),
            "reviewedByAnalyst": False, "allPagesRead": False,
            "elapsedSeconds": round(time.monotonic() - started, 3),
        })
        emitter.close()
    if fatal:
        return 2
    if args.strict and (unreadable_pages or low_text_pages):
        return 3
    return 0

if __name__ == "__main__":
    sys.exit(main())
