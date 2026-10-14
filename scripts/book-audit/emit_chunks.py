"""Expose bounded page-record chunks from the retained audit artifact."""
import argparse
import json
import os
from pathlib import Path

def record_json(record):
    return json.dumps(record, ensure_ascii=True, allow_nan=False, separators=(",", ":"))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--index", type=int)
    parser.add_argument("--max-bytes", type=int, default=500000)
    args = parser.parse_args()
    files = list(args.input.rglob("jothida-lakshmi.jsonl"))
    if len(files) != 1:
        raise ValueError("Expected exactly one source artifact JSONL file")
    rows = [json.loads(line) for line in files[0].read_text(encoding="utf-8").splitlines() if line.strip()]
    begins = [r for r in rows if r["event"] == "SMV_BOOK_BEGIN"]
    ends = [r for r in rows if r["event"] == "SMV_BOOK_END"]
    pages = [r for r in rows if r["event"] == "SMV_BOOK_PAGE"]
    if len(begins) != 1 or len(ends) != 1:
        raise ValueError("Missing source audit metadata")
    begin, end = begins[0], ends[0]
    if begin["bookId"] != "jothida-lakshmi" or end["fatalError"]:
        raise ValueError("Invalid source book or failed extraction")
    if len(pages) != begin["pageCount"] or any(p["pdfPage"] != i+1 for i,p in enumerate(pages)):
        raise ValueError("Source page sequence incomplete")
    chunks, current, size = [], [], 0
    for page in pages:
        encoded = record_json(page)
        length = len(encoded.encode("utf-8")) + 100
        if length > args.max_bytes:
            raise ValueError("A single page exceeds configured chunk budget")
        if current and size + length > args.max_bytes:
            chunks.append(current)
            current, size = [], 0
        current.append(page)
        size += length
    if current:
        chunks.append(current)
    if args.index is None:
        matrix = {"include":[{"index":i,"from":c[0]["pdfPage"],"to":c[-1]["pdfPage"]} for i,c in enumerate(chunks)]}
        output = os.environ.get("GITHUB_OUTPUT")
        if output:
            with open(output,"a",encoding="utf-8") as sink:
                sink.write("matrix=" + record_json(matrix) + "\n")
        print("SMV_BOOK_BEGIN " + record_json(begin), flush=True)
        print("SMV_BOOK_END " + record_json(end), flush=True)
        print("SMV_BOOK_CHUNKS " + record_json({"chunks":matrix["include"],"sourceRun":38318003698}), flush=True)
        return
    if args.index < 0 or args.index >= len(chunks):
        raise ValueError("Chunk index out of bounds")
    chunk = chunks[args.index]
    print("SMV_BOOK_BEGIN " + record_json({**begin,"chunkIndex":args.index,"chunkCount":len(chunks)}),flush=True)
    for page in chunk:
        print("SMV_BOOK_PAGE " + record_json(page),flush=True)
    print("SMV_BOOK_END " + record_json({**end,"chunkIndex":args.index,
          "chunkFrom":chunk[0]["pdfPage"],"chunkTo":chunk[-1]["pdfPage"],
          "chunkEmittedPages":len(chunk)}),flush=True)

if __name__ == "__main__":
    main()
