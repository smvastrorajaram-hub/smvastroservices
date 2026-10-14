"""Recover Tamil pages whose PDF text layer omits glyphs."""
import argparse
import hashlib
from pathlib import Path
import re
from types import SimpleNamespace
import fitz
import extract_pages as audit

class RasterOnlyPage:
    def __init__(self, page):
        self.page = page
    def get_text(self, *args, **kwargs):
        return ""
    def __getattr__(self, name):
        return getattr(self.page, name)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-page", type=int, required=True)
    parser.add_argument("--to-page", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    source = Path("books/ஜோதிட லெக்ஷ்மி.pdf")
    digest = audit.sha256_file(source)
    expected = "afa26860de5a2e8e9cc359098bb6627fc9bf9242e54df9a0c9d8b4fb80a558fa"
    if digest != expected:
        raise ValueError("Source PDF changed; reverify the source before repair")
    config = SimpleNamespace(book_id="jothida-lakshmi", dpi=200, max_pixels=12000000,
        max_dimension=16000, ocr_languages="eng+tam", ocr_timeout=60,
        min_text_chars=80, scan_header_threshold=300)
    executable, error = audit.inspect_ocr(config.ocr_languages)
    if not executable:
        raise RuntimeError(error)
    emitter = audit.Emitter(args.output)
    unreadable, low_text, emitted = [], [], 0
    with fitz.open(str(source)) as document:
        if not 1 <= args.from_page <= args.to_page <= document.page_count:
            raise ValueError("Invalid requested page interval")
        emitter.emit("SMV_BOOK_BEGIN", {
            "bookId": config.book_id, "fileName": source.name, "sha256": digest,
            "pageCount": document.page_count, "selectedFrom": args.from_page,
            "selectedTo": args.to_page, "method": "forced-raster-ocr",
            "sourceRun": 38318003698, "nativeLayerBypassed": True,
            "reviewedByAnalyst": False})
        for number in range(args.from_page, args.to_page+1):
            try:
                record = audit.extract_page(RasterOnlyPage(document.load_page(number-1)),
                    number, config, executable, error)
            except Exception as exc:
                record = {"bookId": config.book_id, "pdfPage": number,
                    "method": "unreadable", "status": "unreadable", "text": "",
                    "chars": 0, "errors": [{"stage":"forced-ocr","error":audit.clean_text(exc)}]}
            text = re.sub(r"[ \t]{2,}", " ", record["text"])
            text = re.sub("\u2028{3,}", "\u2028\u2028", text)
            record.update(text=text, chars=len(text),
                tamilChars=sum("\u0b80" <= char <= "\u0bff" for char in text),
                sourceRecordVersion="forced-tamil-ocr-1", nativeLayerBypassed=True)
            emitter.emit("SMV_BOOK_PAGE", record)
            emitted += 1
            if record["status"] == "unreadable":
                unreadable.append(number)
            elif record["status"] == "low-text":
                low_text.append(number)
        emitter.emit("SMV_BOOK_END", {
            "bookId": config.book_id, "sha256": digest, "pageCount": document.page_count,
            "selectedFrom":args.from_page,"selectedTo":args.to_page,"emittedPages":emitted,
            "selectedPageRecordsComplete": emitted == args.to_page-args.from_page+1,
            "unreadablePages":unreadable,"lowTextPages":low_text,
            "reviewedByAnalyst":False,"allPagesRead":False})
    emitter.close()

if __name__ == "__main__":
    main()
