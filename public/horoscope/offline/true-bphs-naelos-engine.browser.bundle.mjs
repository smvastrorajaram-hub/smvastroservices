var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// public/horoscope/offline/vendor/wasm/swisseph.mjs
async function Swisseph(moduleArg = {}) {
  var Module = moduleArg;
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
  if (ENVIRONMENT_IS_NODE) {
    const { createRequire } = await import("node:module");
    var require2 = createRequire(import.meta.url);
  }
  if (!Module["expectedDataFileDownloads"]) Module["expectedDataFileDownloads"] = 0;
  Module["expectedDataFileDownloads"]++;
  (() => {
    var isPthread = typeof ENVIRONMENT_IS_PTHREAD != "undefined" && ENVIRONMENT_IS_PTHREAD;
    var isWasmWorker = typeof ENVIRONMENT_IS_WASM_WORKER != "undefined" && ENVIRONMENT_IS_WASM_WORKER;
    if (isPthread || isWasmWorker) return;
    var isNode = globalThis.process && globalThis.process.versions && globalThis.process.versions.node && globalThis.process.type != "renderer";
    async function loadPackage(metadata) {
      var PACKAGE_PATH = "";
      if (typeof window === "object") {
        PACKAGE_PATH = window["encodeURIComponent"](window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/")) + "/");
      } else if (typeof process === "undefined" && typeof location !== "undefined") {
        PACKAGE_PATH = encodeURIComponent(location.pathname.substring(0, location.pathname.lastIndexOf("/")) + "/");
      }
      var PACKAGE_NAME = "wasm/swisseph.data";
      var REMOTE_PACKAGE_BASE = "swisseph.data";
      var REMOTE_PACKAGE_NAME = Module["locateFile"] ? Module["locateFile"](REMOTE_PACKAGE_BASE, "") : REMOTE_PACKAGE_BASE;
      var REMOTE_PACKAGE_SIZE = metadata["remote_package_size"];
      async function fetchRemotePackage(packageName, packageSize) {
        if (isNode) {
          var contents = require2("fs").readFileSync(packageName);
          return new Uint8Array(contents).buffer;
        }
        if (!Module["dataFileDownloads"]) Module["dataFileDownloads"] = {};
        try {
          var response = await fetch(packageName);
        } catch (e) {
          throw new Error(`Network Error: ${packageName}`, { e });
        }
        if (!response.ok) {
          throw new Error(`${response.status}: ${response.url}`);
        }
        const chunks = [];
        const headers = response.headers;
        const total = Number(headers.get("Content-Length") || packageSize);
        let loaded = 0;
        Module["setStatus"] && Module["setStatus"]("Downloading data...");
        const reader = response.body.getReader();
        while (1) {
          var { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          Module["dataFileDownloads"][packageName] = { loaded, total };
          let totalLoaded = 0;
          let totalSize = 0;
          for (const download of Object.values(Module["dataFileDownloads"])) {
            totalLoaded += download.loaded;
            totalSize += download.total;
          }
          Module["setStatus"] && Module["setStatus"](`Downloading data... (${totalLoaded}/${totalSize})`);
        }
        const packageData = new Uint8Array(chunks.map((c) => c.length).reduce((a, b) => a + b, 0));
        let offset = 0;
        for (const chunk of chunks) {
          packageData.set(chunk, offset);
          offset += chunk.length;
        }
        return packageData.buffer;
      }
      var fetchPromise;
      var fetched = Module["getPreloadedPackage"] && Module["getPreloadedPackage"](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
      if (!fetched) {
        fetchPromise = fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE);
      }
      async function runWithFS(Module2) {
        function assert(check, msg) {
          if (!check) throw new Error(msg);
        }
        Module2["FS_createPath"]("/", "sweph", true, true);
        async function processPackageData(arrayBuffer) {
          assert(arrayBuffer, "Loading data file failed.");
          assert(arrayBuffer.constructor.name === ArrayBuffer.name, "bad input to processPackageData " + arrayBuffer.constructor.name);
          var byteArray = new Uint8Array(arrayBuffer);
          for (var file of metadata["files"]) {
            var name = file["filename"];
            var data = byteArray.subarray(file["start"], file["end"]);
            Module2["FS_createDataFile"](name, null, data, true, true, true);
          }
          Module2["removeRunDependency"]("datafile_wasm/swisseph.data");
        }
        Module2["addRunDependency"]("datafile_wasm/swisseph.data");
        if (!Module2["preloadResults"]) Module2["preloadResults"] = {};
        Module2["preloadResults"][PACKAGE_NAME] = { fromCache: false };
        if (!fetched) {
          fetched = await fetchPromise;
        }
        await processPackageData(fetched);
      }
      if (Module["FS_createPath"]) {
        runWithFS(Module);
      } else {
        if (!Module["preRun"]) Module["preRun"] = [];
        Module["preRun"].push(runWithFS);
      }
    }
    loadPackage({ files: [{ filename: "/sweph/semo_18.se1", start: 0, end: 1304771 }, { filename: "/sweph/sepl_18.se1", start: 1304771, end: 1788832 }, { filename: "/sweph/semo_24.se1", start: 1788832, end: 3096960 }, { filename: "/sweph/sepl_24.se1", start: 3096960, end: 3580374 }], remote_package_size: 3580374 });
  })();
  var programArgs = [];
  var thisProgram = "./this.program";
  var quit_ = (status, toThrow) => {
    throw toThrow;
  };
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile(path) {
    if (Module["locateFile"]) {
      return Module["locateFile"](path, scriptDirectory);
    }
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_NODE) {
    var fs = require2("node:fs");
    if (_scriptName.startsWith("file:")) {
      scriptDirectory = require2("node:path").dirname(require2("node:url").fileURLToPath(_scriptName)) + "/";
    }
    readBinary = (filename) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename);
      return ret;
    };
    readAsync = async (filename, binary = true) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename, binary ? void 0 : "utf8");
      return ret;
    };
    if (process.argv.length > 1) {
      thisProgram = process.argv[1].replace(/\\/g, "/");
    }
    programArgs = process.argv.slice(2);
    quit_ = (status, toThrow) => {
      process.exitCode = status;
      throw toThrow;
    };
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    {
      readAsync = async (url) => {
        var response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      };
    }
  } else {
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  var wasmBinary;
  var ABORT = false;
  var isFileURI = (filename) => filename.startsWith("file://");
  class EmscriptenEH {
  }
  class EmscriptenSjLj extends EmscriptenEH {
  }
  var runtimeInitialized = false;
  function getMemoryBuffer() {
    return wasmMemory.buffer;
  }
  function updateMemoryViews() {
    if (HEAP8?.buffer?.resizable) return;
    var b = getMemoryBuffer();
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    Module["HEAP32"] = HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
    HEAP64 = new BigInt64Array(b);
    HEAPU64 = new BigUint64Array(b);
  }
  function preRun() {
    var preRun2 = Module["preRun"];
    if (preRun2) {
      if (typeof preRun2 == "function") preRun2 = [preRun2];
      onPreRuns.push(...preRun2);
    }
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    runtimeInitialized = true;
    if (!Module["noFSInit"] && !FS.initialized) FS.init();
    TTY.init();
    wasmExports["m"]();
    FS.ignorePermissions = false;
  }
  function postRun() {
    var postRun2 = Module["postRun"];
    if (postRun2) {
      if (typeof postRun2 == "function") postRun2 = [postRun2];
      onPostRuns.push(...postRun2);
    }
    callRuntimeCallbacks(onPostRuns);
  }
  function abort(what) {
    Module["onAbort"]?.(what);
    what = `Aborted(${what})`;
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    throw e;
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module["locateFile"]) {
      return locateFile("swisseph.wasm");
    }
    return new URL("swisseph.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
      try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      var instance2 = await WebAssembly.instantiate(binary, imports);
      return instance2;
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary && !ENVIRONMENT_IS_NODE) {
      try {
        var response = fetch(binaryFile, { credentials: "same-origin" });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    var imports = { a: wasmImports };
    return imports;
  }
  async function createWasm() {
    function receiveInstance(instance2) {
      wasmExports = instance2.exports;
      assignWasmExports(wasmExports);
      updateMemoryViews();
      return wasmExports;
    }
    function receiveInstantiationResult(result2) {
      return receiveInstance(result2["instance"]);
    }
    var info = getWasmImports();
    var instantiateWasm = Module["instantiateWasm"];
    if (instantiateWasm) {
      return new Promise((resolve) => {
        instantiateWasm(info, (inst) => resolve(receiveInstance(inst)));
      });
    }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    var exports = receiveInstantiationResult(result);
    return exports;
  }
  class ExitStatus {
    name = "ExitStatus";
    constructor(status) {
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
  }
  var HEAP16;
  var HEAP32;
  var HEAP64;
  var HEAP8;
  var HEAPF32;
  var HEAPF64;
  var HEAPU16;
  var HEAPU32;
  var HEAPU64;
  var HEAPU8;
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) {
      callbacks.shift()(Module);
    }
  };
  var onPostRuns = [];
  var onPreRuns = [];
  var noExitRuntime = true;
  var stackRestore = (val) => __emscripten_stack_restore(val);
  var stackSave = () => _emscripten_stack_get_current();
  var syscallGetVarargI = () => {
    var ret = HEAP32[+SYSCALLS.varargs >> 2];
    SYSCALLS.varargs += 4;
    return ret;
  };
  var syscallGetVarargP = syscallGetVarargI;
  var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
    var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
    return splitPathRe.exec(filename).slice(1);
  }, normalizeArray: (parts, allowAboveRoot) => {
    var up = 0;
    for (var i = parts.length - 1; i >= 0; i--) {
      var last = parts[i];
      if (last === ".") {
        parts.splice(i, 1);
      } else if (last === "..") {
        parts.splice(i, 1);
        up++;
      } else if (up) {
        parts.splice(i, 1);
        up--;
      }
    }
    if (allowAboveRoot) {
      for (; up; up--) {
        parts.unshift("..");
      }
    }
    return parts;
  }, normalize: (path) => {
    var isAbsolute = PATH.isAbs(path), trailingSlash = path.slice(-1) === "/";
    path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
    if (!path && !isAbsolute) {
      path = ".";
    }
    if (path && trailingSlash) {
      path += "/";
    }
    return (isAbsolute ? "/" : "") + path;
  }, dirname: (path) => {
    var result = PATH.splitPath(path), root2 = result[0], dir = result[1];
    if (!root2 && !dir) {
      return ".";
    }
    if (dir) {
      dir = dir.slice(0, -1);
    }
    return root2 + dir;
  }, basename: (path) => path && path.match(/([^\/]+|\/)\/*$/)[1], join: (...paths) => PATH.normalize(paths.join("/")), join2: (l, r) => PATH.normalize(l + "/" + r) };
  var initRandomFill = () => {
    if (ENVIRONMENT_IS_NODE) {
      var nodeCrypto = require2("node:crypto");
      return (view) => (nodeCrypto.randomFillSync(view), 0);
    }
    return (view) => (crypto.getRandomValues(view), 0);
  };
  var randomFill = (view) => (randomFill = initRandomFill())(view);
  var PATH_FS = { resolve: (...args) => {
    var resolvedPath = "", resolvedAbsolute = false;
    for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path = i >= 0 ? args[i] : FS.cwd();
      if (typeof path != "string") {
        throw new TypeError("Arguments to path.resolve must be strings");
      } else if (!path) {
        return "";
      }
      resolvedPath = path + "/" + resolvedPath;
      resolvedAbsolute = PATH.isAbs(path);
    }
    resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
    return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
  }, relative: (from, to) => {
    from = PATH_FS.resolve(from).slice(1);
    to = PATH_FS.resolve(to).slice(1);
    function trim(arr) {
      var start = 0;
      for (; start < arr.length; start++) {
        if (arr[start] !== "") break;
      }
      var end = arr.length - 1;
      for (; end >= 0; end--) {
        if (arr[end] !== "") break;
      }
      if (start > end) return [];
      return arr.slice(start, end - start + 1);
    }
    var fromParts = trim(from.split("/"));
    var toParts = trim(to.split("/"));
    var length = Math.min(fromParts.length, toParts.length);
    var samePartsLength = length;
    for (var i = 0; i < length; i++) {
      if (fromParts[i] !== toParts[i]) {
        samePartsLength = i;
        break;
      }
    }
    var outputParts = [];
    for (var i = samePartsLength; i < fromParts.length; i++) {
      outputParts.push("..");
    }
    outputParts = outputParts.concat(toParts.slice(samePartsLength));
    return outputParts.join("/");
  } };
  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
      return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = "";
    while (idx < endPtr) {
      var u0 = heapOrArray[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heapOrArray[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }
      var u2 = heapOrArray[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
    return str;
  };
  var FS_stdin_getChar_buffer = [];
  var lengthBytesUTF8 = (str) => {
    var len3 = 0;
    for (var i = 0; i < str.length; ++i) {
      var c = str.charCodeAt(i);
      if (c <= 127) {
        len3++;
      } else if (c <= 2047) {
        len3 += 2;
      } else if (c >= 55296 && c <= 57343) {
        len3 += 4;
        ++i;
      } else {
        len3 += 3;
      }
    }
    return len3;
  };
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.codePointAt(i);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++] = 192 | u >> 6;
        heap[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++] = 224 | u >> 12;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++] = 240 | u >> 18;
        heap[outIdx++] = 128 | u >> 12 & 63;
        heap[outIdx++] = 128 | u >> 6 & 63;
        heap[outIdx++] = 128 | u & 63;
        i++;
      }
    }
    heap[outIdx] = 0;
    return outIdx - startIdx;
  };
  var intArrayFromString = (stringy, dontAddNull, length) => {
    var len3 = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len3);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  };
  var FS_stdin_getChar = () => {
    if (!FS_stdin_getChar_buffer.length) {
      var result = null;
      if (ENVIRONMENT_IS_NODE) {
        var BUFSIZE = 256;
        var buf = Buffer.alloc(BUFSIZE);
        var bytesRead = 0;
        var fd = process.stdin.fd;
        try {
          bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
        } catch (e) {
          if (e.toString().includes("EOF")) bytesRead = 0;
          else throw e;
        }
        if (bytesRead > 0) {
          result = buf.slice(0, bytesRead).toString("utf-8");
        }
      } else if (globalThis.window?.prompt) {
        result = window.prompt("Input: ");
        if (result !== null) {
          result += "\n";
        }
      } else {
      }
      if (!result) {
        return null;
      }
      FS_stdin_getChar_buffer = intArrayFromString(result, true);
    }
    return FS_stdin_getChar_buffer.shift();
  };
  var TTY = { ttys: [], init() {
  }, shutdown() {
  }, register(dev, ops) {
    TTY.ttys[dev] = { input: [], output: [], ops };
    FS.registerDevice(dev, TTY.stream_ops);
  }, stream_ops: { open(stream) {
    var tty = TTY.ttys[stream.node.rdev];
    if (!tty) {
      throw new FS.ErrnoError(43);
    }
    stream.tty = tty;
    stream.seekable = false;
  }, close(stream) {
    stream.tty.ops.fsync(stream.tty);
  }, fsync(stream) {
    stream.tty.ops.fsync(stream.tty);
  }, read(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.get_char) {
      throw new FS.ErrnoError(60);
    }
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
      var result;
      try {
        result = stream.tty.ops.get_char(stream.tty);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (result === void 0 && bytesRead === 0) {
        throw new FS.ErrnoError(6);
      }
      if (result === null || result === void 0) break;
      bytesRead++;
      buffer[offset + i] = result;
    }
    if (bytesRead) {
      stream.node.atime = Date.now();
    }
    return bytesRead;
  }, write(stream, buffer, offset, length, pos) {
    if (!stream.tty || !stream.tty.ops.put_char) {
      throw new FS.ErrnoError(60);
    }
    try {
      for (var i = 0; i < length; i++) {
        stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
      }
    } catch (e) {
      throw new FS.ErrnoError(29);
    }
    if (length) {
      stream.node.mtime = stream.node.ctime = Date.now();
    }
    return i;
  } }, default_tty_ops: { get_char(tty) {
    return FS_stdin_getChar();
  }, put_char(tty, val) {
    if (val === null || val === 10) {
      out(UTF8ArrayToString(tty.output));
      tty.output = [];
    } else {
      if (val != 0) tty.output.push(val);
    }
  }, fsync(tty) {
    if (tty.output?.length > 0) {
      out(UTF8ArrayToString(tty.output));
      tty.output = [];
    }
  }, ioctl_tcgets(tty) {
    return { c_iflag: 25856, c_oflag: 5, c_cflag: 191, c_lflag: 35387, c_cc: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
  }, ioctl_tcsets(tty, optional_actions, data) {
    return 0;
  }, ioctl_tiocgwinsz(tty) {
    return [24, 80];
  } }, default_tty1_ops: { put_char(tty, val) {
    if (val === null || val === 10) {
      err(UTF8ArrayToString(tty.output));
      tty.output = [];
    } else {
      if (val != 0) tty.output.push(val);
    }
  }, fsync(tty) {
    if (tty.output?.length > 0) {
      err(UTF8ArrayToString(tty.output));
      tty.output = [];
    }
  } } };
  var mmapAlloc = (size) => {
    abort();
  };
  var MEMFS = { ops_table: null, mount(mount) {
    return MEMFS.createNode(null, "/", 16895, 0);
  }, createNode(parent, name, mode, dev) {
    if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
      throw new FS.ErrnoError(63);
    }
    MEMFS.ops_table ||= { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } };
    var node = FS.createNode(parent, name, mode, dev);
    if (FS.isDir(node.mode)) {
      node.node_ops = MEMFS.ops_table.dir.node;
      node.stream_ops = MEMFS.ops_table.dir.stream;
      node.contents = {};
    } else if (FS.isFile(node.mode)) {
      node.node_ops = MEMFS.ops_table.file.node;
      node.stream_ops = MEMFS.ops_table.file.stream;
      node.usedBytes = 0;
      node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
    } else if (FS.isLink(node.mode)) {
      node.node_ops = MEMFS.ops_table.link.node;
      node.stream_ops = MEMFS.ops_table.link.stream;
    } else if (FS.isChrdev(node.mode)) {
      node.node_ops = MEMFS.ops_table.chrdev.node;
      node.stream_ops = MEMFS.ops_table.chrdev.stream;
    }
    node.atime = node.mtime = node.ctime = Date.now();
    if (parent) {
      parent.contents[name] = node;
      parent.atime = parent.mtime = parent.ctime = node.atime;
    }
    return node;
  }, getFileDataAsTypedArray(node) {
    return node.contents.subarray(0, node.usedBytes);
  }, expandFileStorage(node, newCapacity) {
    var prevCapacity = node.contents.length;
    if (prevCapacity >= newCapacity) return;
    var CAPACITY_DOUBLING_MAX = 1024 * 1024;
    newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
    if (prevCapacity) newCapacity = Math.max(newCapacity, 256);
    var oldContents = MEMFS.getFileDataAsTypedArray(node);
    node.contents = new Uint8Array(newCapacity);
    node.contents.set(oldContents);
  }, resizeFileStorage(node, newSize) {
    if (node.usedBytes == newSize) return;
    var oldContents = node.contents;
    node.contents = new Uint8Array(newSize);
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
    node.usedBytes = newSize;
  }, node_ops: { getattr(node) {
    var attr = {};
    attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
    attr.ino = node.id;
    attr.mode = node.mode;
    attr.nlink = 1;
    attr.uid = 0;
    attr.gid = 0;
    attr.rdev = node.rdev;
    if (FS.isDir(node.mode)) {
      attr.size = 4096;
    } else if (FS.isFile(node.mode)) {
      attr.size = node.usedBytes;
    } else if (FS.isLink(node.mode)) {
      attr.size = node.link.length;
    } else {
      attr.size = 0;
    }
    attr.atime = new Date(node.atime);
    attr.mtime = new Date(node.mtime);
    attr.ctime = new Date(node.ctime);
    attr.blksize = 4096;
    attr.blocks = Math.ceil(attr.size / attr.blksize);
    return attr;
  }, setattr(node, attr) {
    for (const key of ["mode", "atime", "mtime", "ctime"]) {
      if (attr[key] != null) {
        node[key] = attr[key];
      }
    }
    if (attr.size !== void 0) {
      MEMFS.resizeFileStorage(node, attr.size);
    }
  }, lookup(parent, name) {
    if (!MEMFS.doesNotExistError) {
      MEMFS.doesNotExistError = new FS.ErrnoError(44);
      MEMFS.doesNotExistError.stack = "<generic error, no stack>";
    }
    throw MEMFS.doesNotExistError;
  }, mknod(parent, name, mode, dev) {
    return MEMFS.createNode(parent, name, mode, dev);
  }, rename(old_node, new_dir, new_name) {
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {
    }
    if (new_node) {
      if (FS.isDir(old_node.mode)) {
        for (var i in new_node.contents) {
          throw new FS.ErrnoError(55);
        }
      }
      FS.hashRemoveNode(new_node);
    }
    delete old_node.parent.contents[old_node.name];
    new_dir.contents[new_name] = old_node;
    old_node.name = new_name;
    new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
  }, unlink(parent, name) {
    delete parent.contents[name];
    parent.ctime = parent.mtime = Date.now();
  }, rmdir(parent, name) {
    var node = FS.lookupNode(parent, name);
    for (var i in node.contents) {
      throw new FS.ErrnoError(55);
    }
    delete parent.contents[name];
    parent.ctime = parent.mtime = Date.now();
  }, readdir(node) {
    return [".", "..", ...Object.keys(node.contents)];
  }, symlink(parent, newname, oldpath) {
    var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
    node.link = oldpath;
    return node;
  }, readlink(node) {
    if (!FS.isLink(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    return node.link;
  } }, stream_ops: { read(stream, buffer, offset, length, position) {
    var contents = stream.node.contents;
    if (position >= stream.node.usedBytes) return 0;
    var size = Math.min(stream.node.usedBytes - position, length);
    buffer.set(contents.subarray(position, position + size), offset);
    return size;
  }, write(stream, buffer, offset, length, position, canOwn) {
    if (buffer.buffer === HEAP8.buffer) {
      canOwn = false;
    }
    if (!length) return 0;
    var node = stream.node;
    node.mtime = node.ctime = Date.now();
    if (canOwn) {
      node.contents = buffer.subarray(offset, offset + length);
      node.usedBytes = length;
    } else if (node.usedBytes === 0 && position === 0) {
      node.contents = buffer.slice(offset, offset + length);
      node.usedBytes = length;
    } else {
      MEMFS.expandFileStorage(node, position + length);
      node.contents.set(buffer.subarray(offset, offset + length), position);
      node.usedBytes = Math.max(node.usedBytes, position + length);
    }
    return length;
  }, llseek(stream, offset, whence) {
    var position = offset;
    if (whence === 1) {
      position += stream.position;
    } else if (whence === 2) {
      if (FS.isFile(stream.node.mode)) {
        position += stream.node.usedBytes;
      }
    }
    if (position < 0) {
      throw new FS.ErrnoError(28);
    }
    return position;
  }, mmap(stream, length, position, prot, flags) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    var ptr;
    var allocated;
    var contents = stream.node.contents;
    if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
      allocated = false;
      ptr = contents.byteOffset;
    } else {
      allocated = true;
      ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      if (contents) {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        HEAP8.set(contents, ptr);
      }
    }
    return { ptr, allocated };
  }, msync(stream, buffer, offset, length, mmapFlags) {
    MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
    return 0;
  } } };
  var FS_modeStringToFlags = (str) => {
    if (typeof str != "string") return str;
    var flagModes = { r: 0, "r+": 2, w: 512 | 64 | 1, "w+": 512 | 64 | 2, a: 1024 | 64 | 1, "a+": 1024 | 64 | 2 };
    var flags = flagModes[str];
    if (typeof flags == "undefined") {
      throw new Error(`Unknown file open mode: ${str}`);
    }
    return flags;
  };
  var FS_fileDataToTypedArray = (data) => {
    if (typeof data == "string") {
      data = intArrayFromString(data, true);
    }
    if (!data.subarray) {
      data = new Uint8Array(data);
    }
    return data;
  };
  var FS_getMode = (canRead, canWrite) => {
    var mode = 0;
    if (canRead) mode |= 292 | 73;
    if (canWrite) mode |= 146;
    return mode;
  };
  var asyncLoad = async (url) => {
    var arrayBuffer = await readAsync(url);
    return new Uint8Array(arrayBuffer);
  };
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  var getUniqueRunDependency = (id) => id;
  var dependenciesPromise = null;
  var resolveRunDependencies = async () => dependenciesPromise;
  var runDependencies = 0;
  var dependenciesPromiseResolve = null;
  var removeRunDependency = (id) => {
    runDependencies--;
    Module["monitorRunDependencies"]?.(runDependencies);
    if (!runDependencies) {
      dependenciesPromiseResolve();
    }
  };
  var addRunDependency = (id) => {
    if (!runDependencies) {
      dependenciesPromise = new Promise((resolve) => dependenciesPromiseResolve = resolve);
    }
    runDependencies++;
    Module["monitorRunDependencies"]?.(runDependencies);
  };
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
    if (typeof Browser != "undefined") Browser.init();
    for (var plugin of preloadPlugins) {
      if (plugin["canHandle"](fullname)) {
        return plugin["handle"](byteArray, fullname);
      }
    }
    return byteArray;
  };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
    var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
    var dep = getUniqueRunDependency(`cp ${fullname}`);
    addRunDependency(dep);
    try {
      var byteArray = url;
      if (typeof url == "string") {
        byteArray = await asyncLoad(url);
      }
      byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
      preFinish?.();
      if (!dontCreateFile) {
        FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
      }
    } finally {
      removeRunDependency(dep);
    }
  };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
    FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
  };
  var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, filesystems: null, syncFSRequests: 0, ErrnoError: class {
    name = "ErrnoError";
    constructor(errno) {
      this.errno = errno;
    }
  }, FSStream: class {
    shared = {};
    get object() {
      return this.node;
    }
    set object(val) {
      this.node = val;
    }
    get isRead() {
      return (this.flags & 2097155) !== 1;
    }
    get isWrite() {
      return (this.flags & 2097155) !== 0;
    }
    get isAppend() {
      return this.flags & 1024;
    }
    get flags() {
      return this.shared.flags;
    }
    set flags(val) {
      this.shared.flags = val;
    }
    get position() {
      return this.shared.position;
    }
    set position(val) {
      this.shared.position = val;
    }
  }, FSNode: class {
    node_ops = {};
    stream_ops = {};
    readMode = 292 | 73;
    writeMode = 146;
    mounted = null;
    constructor(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.rdev = rdev;
      this.atime = this.mtime = this.ctime = Date.now();
    }
    get read() {
      return (this.mode & this.readMode) === this.readMode;
    }
    set read(val) {
      val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
    }
    get write() {
      return (this.mode & this.writeMode) === this.writeMode;
    }
    set write(val) {
      val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
    }
    get isFolder() {
      return FS.isDir(this.mode);
    }
    get isDevice() {
      return FS.isChrdev(this.mode);
    }
    addListener(cb, exclusive = false) {
      var entry = { cb, exclusive };
      var listeners = this.listeners ??= /* @__PURE__ */ new Set();
      listeners.add(entry);
      return { listeners, entry };
    }
    notifyListeners(flags) {
      if (!this.listeners) return;
      var excl;
      for (var entry of this.listeners) {
        if (entry.exclusive) (excl ||= []).push(entry);
        else entry.cb(flags);
      }
      if (excl) {
        var i = (this.exclTurn || 0) % excl.length;
        this.exclTurn = i + 1;
        excl[i].cb(flags);
      }
    }
  }, lookupPath(path, opts = {}) {
    if (!path) {
      throw new FS.ErrnoError(44);
    }
    opts.follow_mount ??= true;
    if (!PATH.isAbs(path)) {
      path = FS.cwd() + "/" + path;
    }
    linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
      var parts = path.split("/").filter((p) => !!p);
      var current = FS.root;
      var current_path = "/";
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        if (parts[i] === ".") {
          continue;
        }
        if (parts[i] === "..") {
          current_path = PATH.dirname(current_path);
          if (FS.isRoot(current)) {
            path = current_path + "/" + parts.slice(i + 1).join("/");
            nlinks--;
            continue linkloop;
          } else {
            current = current.parent;
          }
          continue;
        }
        current_path = PATH.join2(current_path, parts[i]);
        try {
          current = FS.lookupNode(current, parts[i]);
        } catch (e) {
          if (e?.errno === 44 && islast && opts.noent_okay) {
            return { path: current_path };
          }
          throw e;
        }
        if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
          current = current.mounted.root;
        }
        if (FS.isLink(current.mode) && (!islast || opts.follow)) {
          if (!current.node_ops.readlink) {
            throw new FS.ErrnoError(52);
          }
          var link = current.node_ops.readlink(current);
          if (!PATH.isAbs(link)) {
            link = PATH.dirname(current_path) + "/" + link;
          }
          path = link + "/" + parts.slice(i + 1).join("/");
          continue linkloop;
        }
      }
      return { path: current_path, node: current };
    }
    throw new FS.ErrnoError(32);
  }, getPath(node) {
    var path;
    while (true) {
      if (FS.isRoot(node)) {
        var mount = node.mount.mountpoint;
        if (!path) return mount;
        return mount[mount.length - 1] !== "/" ? `${mount}/${path}` : mount + path;
      }
      path = path ? `${node.name}/${path}` : node.name;
      node = node.parent;
    }
  }, hashName(parentid, name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
    }
    return (parentid + hash >>> 0) % FS.nameTable.length;
  }, hashAddNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    node.name_next = FS.nameTable[hash];
    FS.nameTable[hash] = node;
  }, hashRemoveNode(node) {
    var hash = FS.hashName(node.parent.id, node.name);
    if (FS.nameTable[hash] === node) {
      FS.nameTable[hash] = node.name_next;
    } else {
      var current = FS.nameTable[hash];
      while (current) {
        if (current.name_next === node) {
          current.name_next = node.name_next;
          break;
        }
        current = current.name_next;
      }
    }
  }, lookupNode(parent, name) {
    var errCode = FS.mayLookup(parent);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    var hash = FS.hashName(parent.id, name);
    for (var node = FS.nameTable[hash]; node; node = node.name_next) {
      var nodeName = node.name;
      if (node.parent.id === parent.id && nodeName === name) {
        return node;
      }
    }
    return FS.lookup(parent, name);
  }, createNode(parent, name, mode, rdev) {
    var node = new FS.FSNode(parent, name, mode, rdev);
    FS.hashAddNode(node);
    return node;
  }, destroyNode(node) {
    FS.hashRemoveNode(node);
  }, isRoot(node) {
    return node === node.parent;
  }, isMountpoint(node) {
    return !!node.mounted;
  }, isFile(mode) {
    return (mode & 61440) === 32768;
  }, isDir(mode) {
    return (mode & 61440) === 16384;
  }, isLink(mode) {
    return (mode & 61440) === 40960;
  }, isChrdev(mode) {
    return (mode & 61440) === 8192;
  }, isBlkdev(mode) {
    return (mode & 61440) === 24576;
  }, isFIFO(mode) {
    return (mode & 61440) === 4096;
  }, isSocket(mode) {
    return (mode & 49152) === 49152;
  }, flagsToPermissionString(flag) {
    var perms = ["r", "w", "rw"][flag & 3];
    if (flag & 512) {
      perms += "w";
    }
    return perms;
  }, nodePermissions(node, perms) {
    if (FS.ignorePermissions) {
      return 0;
    }
    if (perms.includes("r") && !(node.mode & 292)) {
      return 2;
    }
    if (perms.includes("w") && !(node.mode & 146)) {
      return 2;
    }
    if (perms.includes("x") && !(node.mode & 73)) {
      return 2;
    }
    return 0;
  }, mayLookup(dir) {
    if (!FS.isDir(dir.mode)) return 54;
    var errCode = FS.nodePermissions(dir, "x");
    if (errCode) return errCode;
    if (!dir.node_ops.lookup) return 2;
    return 0;
  }, mayCreate(dir, name) {
    if (!FS.isDir(dir.mode)) {
      return 54;
    }
    try {
      var node = FS.lookupNode(dir, name);
      return 20;
    } catch (e) {
    }
    return FS.nodePermissions(dir, "wx");
  }, mayDelete(dir, name, isdir) {
    var node;
    try {
      node = FS.lookupNode(dir, name);
    } catch (e) {
      return e.errno;
    }
    var errCode = FS.nodePermissions(dir, "wx");
    if (errCode) {
      return errCode;
    }
    if (isdir) {
      if (!FS.isDir(node.mode)) {
        return 54;
      }
      if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
        return 10;
      }
    } else if (FS.isDir(node.mode)) {
      return 31;
    }
    return 0;
  }, mayOpen(node, flags) {
    if (!node) {
      return 44;
    }
    if (FS.isLink(node.mode)) {
      return 32;
    }
    var mode = FS.flagsToPermissionString(flags);
    if (FS.isDir(node.mode)) {
      if (mode !== "r" || flags & (512 | 64)) {
        return 31;
      }
    }
    return FS.nodePermissions(node, mode);
  }, checkOpExists(op, err2) {
    if (!op) {
      throw new FS.ErrnoError(err2);
    }
    return op;
  }, MAX_OPEN_FDS: 4096, nextfd() {
    for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
      if (!FS.streams[fd]) {
        return fd;
      }
    }
    throw new FS.ErrnoError(33);
  }, getStreamChecked(fd) {
    var stream = FS.getStream(fd);
    if (!stream) {
      throw new FS.ErrnoError(8);
    }
    return stream;
  }, getStream: (fd) => FS.streams[fd], createStream(stream, fd = -1) {
    stream = Object.assign(new FS.FSStream(), stream);
    if (fd == -1) {
      fd = FS.nextfd();
    }
    stream.fd = fd;
    FS.streams[fd] = stream;
    return stream;
  }, closeStream(fd) {
    FS.streams[fd] = null;
  }, dupStream(origStream, fd = -1) {
    var stream = FS.createStream(origStream, fd);
    stream.stream_ops?.dup?.(stream);
    return stream;
  }, doSetAttr(stream, node, attr) {
    var setattr = stream?.stream_ops.setattr;
    var arg = setattr ? stream : node;
    setattr ??= node.node_ops.setattr;
    FS.checkOpExists(setattr, 63);
    try {
      setattr(arg, attr);
    } catch (e) {
      if (e instanceof RangeError) {
        throw new FS.ErrnoError(22);
      }
      throw e;
    }
  }, chrdev_stream_ops: { open(stream) {
    var device = FS.getDevice(stream.node.rdev);
    stream.stream_ops = device.stream_ops;
    stream.stream_ops.open?.(stream);
  }, llseek() {
    throw new FS.ErrnoError(70);
  } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice(dev, ops) {
    FS.devices[dev] = { stream_ops: ops };
  }, getDevice: (dev) => FS.devices[dev], getMounts(mount) {
    var mounts = [];
    var check = [mount];
    while (check.length) {
      var m = check.pop();
      mounts.push(m);
      check.push(...m.mounts);
    }
    return mounts;
  }, syncfs(populate, callback) {
    if (typeof populate == "function") {
      callback = populate;
      populate = false;
    }
    FS.syncFSRequests++;
    if (FS.syncFSRequests > 1) {
      err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
    }
    var mounts = FS.getMounts(FS.root.mount);
    var completed = 0;
    function doCallback(errCode) {
      FS.syncFSRequests--;
      return callback(errCode);
    }
    function done(errCode) {
      if (errCode) {
        if (!done.errored) {
          done.errored = true;
          return doCallback(errCode);
        }
        return;
      }
      if (++completed >= mounts.length) {
        doCallback(null);
      }
    }
    for (var mount of mounts) {
      if (mount.type.syncfs) {
        mount.type.syncfs(mount, populate, done);
      } else {
        done(null);
      }
    }
  }, mount(type, opts, mountpoint) {
    var root2 = mountpoint === "/";
    var pseudo = !mountpoint;
    var node;
    if (root2 && FS.root) {
      throw new FS.ErrnoError(10);
    } else if (!root2 && !pseudo) {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      mountpoint = lookup.path;
      node = lookup.node;
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      if (!FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
    }
    var mount = { type, opts, mountpoint, mounts: [] };
    var mountRoot = type.mount(mount);
    mountRoot.mount = mount;
    mount.root = mountRoot;
    if (root2) {
      FS.root = mountRoot;
    } else if (node) {
      node.mounted = mount;
      if (node.mount) {
        node.mount.mounts.push(mount);
      }
    }
    return mountRoot;
  }, unmount(mountpoint) {
    var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
    if (!FS.isMountpoint(lookup.node)) {
      throw new FS.ErrnoError(28);
    }
    var node = lookup.node;
    var mount = node.mounted;
    var mounts = FS.getMounts(mount);
    for (var [hash, current] of Object.entries(FS.nameTable)) {
      while (current) {
        var next = current.name_next;
        if (mounts.includes(current.mount)) {
          FS.destroyNode(current);
        }
        current = next;
      }
    }
    node.mounted = null;
    var idx = node.mount.mounts.indexOf(mount);
    node.mount.mounts.splice(idx, 1);
  }, lookup(parent, name) {
    return parent.node_ops.lookup(parent, name);
  }, mknod(path, mode, dev) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    var name = PATH.basename(path);
    if (!name) {
      throw new FS.ErrnoError(28);
    }
    if (name === "." || name === "..") {
      throw new FS.ErrnoError(20);
    }
    var errCode = FS.mayCreate(parent, name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.mknod) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.mknod(parent, name, mode, dev);
  }, statfs(path) {
    return FS.statfsNode(FS.lookupPath(path, { follow: true }).node);
  }, statfsStream(stream) {
    return FS.statfsNode(stream.node);
  }, statfsNode(node) {
    var rtn = { bsize: 4096, frsize: 4096, blocks: 1e6, bfree: 5e5, bavail: 5e5, files: FS.nextInode, ffree: FS.nextInode - 1, fsid: 42, flags: 2, namelen: 255 };
    if (node.node_ops.statfs) {
      Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
    }
    return rtn;
  }, create(path, mode = 438) {
    mode &= 4095;
    mode |= 32768;
    return FS.mknod(path, mode, 0);
  }, mkdir(path, mode = 511) {
    mode &= 511 | 512;
    mode |= 16384;
    return FS.mknod(path, mode, 0);
  }, mkdirTree(path, mode) {
    var dirs = path.split("/");
    var d = "";
    for (var dir of dirs) {
      if (!dir) continue;
      if (d || PATH.isAbs(path)) d += "/";
      d += dir;
      try {
        FS.mkdir(d, mode);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
    }
  }, mkdev(path, mode, dev) {
    if (typeof dev == "undefined") {
      dev = mode;
      mode = 438;
    }
    mode |= 8192;
    return FS.mknod(path, mode, dev);
  }, symlink(oldpath, newpath) {
    if (!PATH_FS.resolve(oldpath)) {
      throw new FS.ErrnoError(44);
    }
    var lookup = FS.lookupPath(newpath, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.symlink) {
      throw new FS.ErrnoError(63);
    }
    return parent.node_ops.symlink(parent, newname, oldpath);
  }, link(oldpath, newpath, flags) {
    var lookup = FS.lookupPath(newpath, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var newname = PATH.basename(newpath);
    var errCode = FS.mayCreate(parent, newname);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.link) {
      throw new FS.ErrnoError(34);
    }
    return parent.node_ops.link(parent, newname, oldpath, flags);
  }, rename(old_path, new_path) {
    var old_dirname = PATH.dirname(old_path);
    var new_dirname = PATH.dirname(new_path);
    var old_name = PATH.basename(old_path);
    var new_name = PATH.basename(new_path);
    var lookup, old_dir, new_dir;
    lookup = FS.lookupPath(old_path, { parent: true });
    old_dir = lookup.node;
    lookup = FS.lookupPath(new_path, { parent: true });
    new_dir = lookup.node;
    if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
    if (old_dir.mount !== new_dir.mount) {
      throw new FS.ErrnoError(75);
    }
    var old_node = FS.lookupNode(old_dir, old_name);
    var relative = PATH_FS.relative(old_path, new_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(28);
    }
    relative = PATH_FS.relative(new_path, old_dirname);
    if (relative.charAt(0) !== ".") {
      throw new FS.ErrnoError(55);
    }
    var new_node;
    try {
      new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {
    }
    if (old_node === new_node) {
      return;
    }
    var isdir = FS.isDir(old_node.mode);
    var errCode = FS.mayDelete(old_dir, old_name, isdir);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!old_dir.node_ops.rename) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
      throw new FS.ErrnoError(10);
    }
    if (new_dir !== old_dir) {
      errCode = FS.nodePermissions(old_dir, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    FS.hashRemoveNode(old_node);
    try {
      old_dir.node_ops.rename(old_node, new_dir, new_name);
      old_node.parent = new_dir;
    } catch (e) {
      throw e;
    } finally {
      FS.hashAddNode(old_node);
    }
  }, rmdir(path) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, true);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.rmdir) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.rmdir(parent, name);
    FS.destroyNode(node);
  }, readdir(path) {
    var lookup = FS.lookupPath(path, { follow: true });
    var node = lookup.node;
    var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
    return readdir(node);
  }, unlink(path) {
    var lookup = FS.lookupPath(path, { parent: true });
    var parent = lookup.node;
    if (!parent) {
      throw new FS.ErrnoError(44);
    }
    var name = PATH.basename(path);
    var node = FS.lookupNode(parent, name);
    var errCode = FS.mayDelete(parent, name, false);
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    if (!parent.node_ops.unlink) {
      throw new FS.ErrnoError(63);
    }
    if (FS.isMountpoint(node)) {
      throw new FS.ErrnoError(10);
    }
    parent.node_ops.unlink(parent, name);
    FS.destroyNode(node);
  }, readlink(path) {
    var lookup = FS.lookupPath(path);
    var link = lookup.node;
    if (!link) {
      throw new FS.ErrnoError(44);
    }
    if (!link.node_ops.readlink) {
      throw new FS.ErrnoError(28);
    }
    return link.node_ops.readlink(link);
  }, stat(path, dontFollow) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow });
    var node = lookup.node;
    var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
    return getattr(node);
  }, fstat(fd) {
    var stream = FS.getStreamChecked(fd);
    var node = stream.node;
    var getattr = stream.stream_ops.getattr;
    var arg = getattr ? stream : node;
    getattr ??= node.node_ops.getattr;
    FS.checkOpExists(getattr, 63);
    return getattr(arg);
  }, lstat(path) {
    return FS.stat(path, true);
  }, doChmod(stream, node, mode, dontFollow) {
    FS.doSetAttr(stream, node, { mode: mode & 4095 | node.mode & ~4095, ctime: Date.now(), dontFollow });
  }, chmod(path, mode, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChmod(null, node, mode, dontFollow);
  }, lchmod(path, mode) {
    FS.chmod(path, mode, true);
  }, fchmod(fd, mode) {
    var stream = FS.getStreamChecked(fd);
    FS.doChmod(stream, stream.node, mode, false);
  }, doChown(stream, node, dontFollow) {
    FS.doSetAttr(stream, node, { timestamp: Date.now(), dontFollow });
  }, chown(path, uid, gid, dontFollow) {
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doChown(null, node, dontFollow);
  }, lchown(path, uid, gid) {
    FS.chown(path, uid, gid, true);
  }, fchown(fd, uid, gid) {
    var stream = FS.getStreamChecked(fd);
    FS.doChown(stream, stream.node, false);
  }, doTruncate(stream, node, len3) {
    if (FS.isDir(node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!FS.isFile(node.mode)) {
      throw new FS.ErrnoError(28);
    }
    var errCode = FS.nodePermissions(node, "w");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.doSetAttr(stream, node, { size: len3, timestamp: Date.now() });
  }, truncate(path, len3) {
    if (len3 < 0) {
      throw new FS.ErrnoError(28);
    }
    var node;
    if (typeof path == "string") {
      var lookup = FS.lookupPath(path, { follow: true });
      node = lookup.node;
    } else {
      node = path;
    }
    FS.doTruncate(null, node, len3);
  }, ftruncate(fd, len3) {
    var stream = FS.getStreamChecked(fd);
    if (len3 < 0 || (stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(28);
    }
    FS.doTruncate(stream, stream.node, len3);
  }, utime(path, atime, mtime, dontFollow) {
    var lookup = FS.lookupPath(path, { follow: !dontFollow });
    FS.doSetAttr(null, lookup.node, { atime, mtime, dontFollow });
  }, open(path, flags, mode = 438) {
    if (path === "") {
      throw new FS.ErrnoError(44);
    }
    flags = FS_modeStringToFlags(flags);
    if (flags & 64) {
      mode = mode & 4095 | 32768;
    } else {
      mode = 0;
    }
    var node;
    var isDirPath;
    if (typeof path == "object") {
      node = path;
    } else {
      isDirPath = path.endsWith("/");
      var lookup = FS.lookupPath(path, { follow: !(flags & 131072), noent_okay: true });
      node = lookup.node;
      path = lookup.path;
    }
    var created = false;
    if (flags & 64) {
      if (node) {
        if (flags & 128) {
          throw new FS.ErrnoError(20);
        }
      } else if (isDirPath) {
        throw new FS.ErrnoError(31);
      } else {
        node = FS.mknod(path, mode | 511, 0);
        created = true;
      }
    }
    if (!node) {
      throw new FS.ErrnoError(44);
    }
    if (FS.isChrdev(node.mode)) {
      flags &= ~512;
    }
    if (flags & 65536 && !FS.isDir(node.mode)) {
      throw new FS.ErrnoError(54);
    }
    if (!created) {
      var errCode = FS.mayOpen(node, flags);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
    }
    if (flags & 512 && !created) {
      FS.truncate(node, 0);
    }
    flags &= ~(128 | 512 | 131072);
    var stream = FS.createStream({ node, path: FS.getPath(node), flags, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
    if (stream.stream_ops.open) {
      stream.stream_ops.open(stream);
    }
    if (created) {
      FS.chmod(node, mode & 511);
    }
    return stream;
  }, close(stream) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (stream.getdents) stream.getdents = null;
    stream.node?.notifyListeners(32);
    try {
      if (stream.stream_ops.close) {
        stream.stream_ops.close(stream);
      }
    } catch (e) {
      throw e;
    } finally {
      FS.closeStream(stream.fd);
    }
    stream.fd = null;
  }, isClosed(stream) {
    return stream.fd === null;
  }, llseek(stream, offset, whence) {
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if (!stream.seekable || !stream.stream_ops.llseek) {
      throw new FS.ErrnoError(70);
    }
    if (whence != 0 && whence != 1 && whence != 2) {
      throw new FS.ErrnoError(28);
    }
    stream.position = stream.stream_ops.llseek(stream, offset, whence);
    stream.ungotten = [];
    return stream.position;
  }, read(stream, buffer, offset, length, position) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.read) {
      throw new FS.ErrnoError(28);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
    if (!seeking) stream.position += bytesRead;
    return bytesRead;
  }, write(stream, buffer, offset, length, position, canOwn) {
    if (length < 0 || position < 0) {
      throw new FS.ErrnoError(28);
    }
    if (FS.isClosed(stream)) {
      throw new FS.ErrnoError(8);
    }
    if ((stream.flags & 2097155) === 0) {
      throw new FS.ErrnoError(8);
    }
    if (FS.isDir(stream.node.mode)) {
      throw new FS.ErrnoError(31);
    }
    if (!stream.stream_ops.write) {
      throw new FS.ErrnoError(28);
    }
    if (stream.seekable && stream.flags & 1024) {
      FS.llseek(stream, 0, 2);
    }
    var seeking = typeof position != "undefined";
    if (!seeking) {
      position = stream.position;
    } else if (!stream.seekable) {
      throw new FS.ErrnoError(70);
    }
    var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
    if (!seeking) stream.position += bytesWritten;
    return bytesWritten;
  }, mmap(stream, length, position, prot, flags) {
    if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
      throw new FS.ErrnoError(2);
    }
    if ((stream.flags & 2097155) === 1) {
      throw new FS.ErrnoError(2);
    }
    if (!stream.stream_ops.mmap) {
      throw new FS.ErrnoError(43);
    }
    if (!length) {
      throw new FS.ErrnoError(28);
    }
    return stream.stream_ops.mmap(stream, length, position, prot, flags);
  }, msync(stream, buffer, offset, length, mmapFlags) {
    if (!stream.stream_ops.msync) {
      return 0;
    }
    return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
  }, ioctl(stream, cmd, arg) {
    if (!stream.stream_ops.ioctl) {
      throw new FS.ErrnoError(59);
    }
    return stream.stream_ops.ioctl(stream, cmd, arg);
  }, readFile(path, opts = {}) {
    opts.flags = opts.flags ?? 0;
    opts.encoding = opts.encoding ?? "binary";
    if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
      abort(`Invalid encoding type "${opts.encoding}"`);
    }
    var stream = FS.open(path, opts.flags);
    var stat = FS.stat(path);
    var length = stat.size;
    var buf = new Uint8Array(length);
    FS.read(stream, buf, 0, length, 0);
    if (opts.encoding === "utf8") {
      buf = UTF8ArrayToString(buf);
    }
    FS.close(stream);
    return buf;
  }, writeFile(path, data, opts = {}) {
    opts.flags = opts.flags ?? 577;
    var stream = FS.open(path, opts.flags, opts.mode);
    data = FS_fileDataToTypedArray(data);
    FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
    FS.close(stream);
  }, cwd: () => FS.currentPath, chdir(path) {
    var lookup = FS.lookupPath(path, { follow: true });
    if (lookup.node === null) {
      throw new FS.ErrnoError(44);
    }
    if (!FS.isDir(lookup.node.mode)) {
      throw new FS.ErrnoError(54);
    }
    var errCode = FS.nodePermissions(lookup.node, "x");
    if (errCode) {
      throw new FS.ErrnoError(errCode);
    }
    FS.currentPath = lookup.path;
  }, createDefaultDirectories() {
    FS.mkdir("/tmp");
    FS.mkdir("/home");
    FS.mkdir("/home/web_user");
  }, createDefaultDevices() {
    FS.mkdir("/dev");
    FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer, offset, length, pos) => length, llseek: () => 0 });
    FS.mkdev("/dev/null", FS.makedev(1, 3));
    TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
    TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
    FS.mkdev("/dev/tty", FS.makedev(5, 0));
    FS.mkdev("/dev/tty1", FS.makedev(6, 0));
    var randomBuffer = new Uint8Array(1024), randomLeft = 0;
    var randomByte = () => {
      if (randomLeft === 0) {
        randomFill(randomBuffer);
        randomLeft = randomBuffer.byteLength;
      }
      return randomBuffer[--randomLeft];
    };
    FS.createDevice("/dev", "random", randomByte);
    FS.createDevice("/dev", "urandom", randomByte);
    FS.mkdir("/dev/shm");
    FS.mkdir("/dev/shm/tmp");
  }, createSpecialDirectories() {
    FS.mkdir("/proc");
    var proc_self = FS.mkdir("/proc/self");
    FS.mkdir("/proc/self/fd");
    FS.mount({ mount() {
      var node = FS.createNode(proc_self, "fd", 16895, 73);
      node.stream_ops = { llseek: MEMFS.stream_ops.llseek };
      node.node_ops = { lookup(parent, name) {
        var fd = +name;
        var stream = FS.getStreamChecked(fd);
        var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path }, id: fd + 1 };
        ret.parent = ret;
        return ret;
      }, readdir() {
        return Array.from(FS.streams.entries()).filter(([k, v]) => v).map(([k, v]) => k.toString());
      } };
      return node;
    } }, {}, "/proc/self/fd");
  }, createStandardStreams(input, output, error) {
    if (input) {
      FS.createDevice("/dev", "stdin", input);
    } else {
      FS.symlink("/dev/tty", "/dev/stdin");
    }
    if (output) {
      FS.createDevice("/dev", "stdout", null, output);
    } else {
      FS.symlink("/dev/tty", "/dev/stdout");
    }
    if (error) {
      FS.createDevice("/dev", "stderr", null, error);
    } else {
      FS.symlink("/dev/tty1", "/dev/stderr");
    }
    var stdin = FS.open("/dev/stdin", 0);
    var stdout = FS.open("/dev/stdout", 1);
    var stderr = FS.open("/dev/stderr", 1);
  }, staticInit() {
    FS.nameTable = new Array(4096);
    FS.mount(MEMFS, {}, "/");
    FS.createDefaultDirectories();
    FS.createDefaultDevices();
    FS.createSpecialDirectories();
    FS.filesystems = { MEMFS };
  }, init(input, output, error) {
    FS.initialized = true;
    input ??= Module["stdin"];
    output ??= Module["stdout"];
    error ??= Module["stderr"];
    FS.createStandardStreams(input, output, error);
  }, quit() {
    FS.initialized = false;
    for (var stream of FS.streams) {
      if (stream) {
        FS.close(stream);
      }
    }
  }, findObject(path, dontResolveLastLink) {
    var ret = FS.analyzePath(path, dontResolveLastLink);
    if (!ret.exists) {
      return null;
    }
    return ret.object;
  }, analyzePath(path, dontResolveLastLink) {
    try {
      var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
      path = lookup.path;
    } catch (e) {
    }
    var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
    try {
      var lookup = FS.lookupPath(path, { parent: true });
      ret.parentExists = true;
      ret.parentPath = lookup.path;
      ret.parentObject = lookup.node;
      ret.name = PATH.basename(path);
      lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
      ret.exists = true;
      ret.path = lookup.path;
      ret.object = lookup.node;
      ret.name = lookup.node.name;
      ret.isRoot = lookup.path === "/";
    } catch (e) {
      ret.error = e.errno;
    }
    return ret;
  }, createPath(parent, path, canRead, canWrite) {
    parent = typeof parent == "string" ? parent : FS.getPath(parent);
    var parts = path.split("/").reverse();
    while (parts.length) {
      var part = parts.pop();
      if (!part) continue;
      var current = PATH.join2(parent, part);
      try {
        FS.mkdir(current);
      } catch (e) {
        if (e.errno != 20) throw e;
      }
      parent = current;
    }
    return current;
  }, createFile(parent, name, properties, canRead, canWrite) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(canRead, canWrite);
    return FS.create(path, mode);
  }, createDataFile(parent, name, data, canRead, canWrite, canOwn) {
    var path = name;
    if (parent) {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      path = name ? PATH.join2(parent, name) : parent;
    }
    var mode = FS_getMode(canRead, canWrite);
    var node = FS.create(path, mode);
    if (data) {
      data = FS_fileDataToTypedArray(data);
      FS.chmod(node, mode | 146);
      var stream = FS.open(node, 577);
      FS.write(stream, data, 0, data.length, 0, canOwn);
      FS.close(stream);
      FS.chmod(node, mode);
    }
  }, createDevice(parent, name, input, output) {
    var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
    var mode = FS_getMode(!!input, !!output);
    FS.createDevice.major ??= 64;
    var dev = FS.makedev(FS.createDevice.major++, 0);
    FS.registerDevice(dev, { open(stream) {
      stream.seekable = false;
    }, close(stream) {
      if (output?.buffer?.length) {
        output(10);
      }
    }, read(stream, buffer, offset, length, pos) {
      var bytesRead = 0;
      for (var i = 0; i < length; i++) {
        var result;
        try {
          result = input();
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer[offset + i] = result;
      }
      if (bytesRead) {
        stream.node.atime = Date.now();
      }
      return bytesRead;
    }, write(stream, buffer, offset, length, pos) {
      for (var i = 0; i < length; i++) {
        try {
          output(buffer[offset + i]);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      }
      if (length) {
        stream.node.mtime = stream.node.ctime = Date.now();
      }
      return i;
    } });
    return FS.mkdev(path, mode, dev);
  }, forceLoadFile(obj) {
    if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
    if (globalThis.XMLHttpRequest) {
      abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
    } else {
      try {
        obj.contents = readBinary(obj.url);
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
    }
  }, createLazyFile(parent, name, url, canRead, canWrite) {
    class LazyUint8Array {
      lengthKnown = false;
      chunks = [];
      get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return void 0;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset];
      }
      setDataGetter(getter) {
        this.getter = getter;
      }
      cacheLength() {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (from, to) => {
          if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
          if (to > datalength - 1) abort(`only ${datalength} bytes available! programmer error!`);
          var xhr2 = new XMLHttpRequest();
          xhr2.open("GET", url, false);
          if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
          xhr2.responseType = "arraybuffer";
          if (xhr2.overrideMimeType) {
            xhr2.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr2.send(null);
          if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr2.status);
          if (xhr2.response !== void 0) {
            return new Uint8Array(xhr2.response || []);
          }
          return intArrayFromString(xhr2.responseText ?? "", true);
        };
        var lazyArray2 = this;
        lazyArray2.setDataGetter((chunkNum) => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
            lazyArray2.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") abort("doXHR failed!");
          return lazyArray2.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      }
      get length() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._length;
      }
      get chunkSize() {
        if (!this.lengthKnown) {
          this.cacheLength();
        }
        return this._chunkSize;
      }
    }
    if (globalThis.XMLHttpRequest) {
      if (!ENVIRONMENT_IS_WORKER) abort("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");
      var lazyArray = new LazyUint8Array();
      var properties = { isDevice: false, contents: lazyArray };
    } else {
      var properties = { isDevice: false, url };
    }
    var node = FS.createFile(parent, name, properties, canRead, canWrite);
    if (properties.contents) {
      node.contents = properties.contents;
    } else if (properties.url) {
      node.contents = null;
      node.url = properties.url;
    }
    Object.defineProperties(node, { usedBytes: { get: function() {
      return this.contents.length;
    } } });
    var stream_ops = {};
    for (const [key, fn] of Object.entries(node.stream_ops)) {
      stream_ops[key] = (...args) => {
        FS.forceLoadFile(node);
        return fn(...args);
      };
    }
    function writeChunks(stream, buffer, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= contents.length) return 0;
      var size = Math.min(contents.length - position, length);
      if (contents.slice) {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents[position + i];
        }
      } else {
        for (var i = 0; i < size; i++) {
          buffer[offset + i] = contents.get(position + i);
        }
      }
      return size;
    }
    stream_ops.read = (stream, buffer, offset, length, position) => {
      FS.forceLoadFile(node);
      return writeChunks(stream, buffer, offset, length, position);
    };
    stream_ops.mmap = (stream, length, position, prot, flags) => {
      FS.forceLoadFile(node);
      var ptr = mmapAlloc(length);
      if (!ptr) {
        throw new FS.ErrnoError(48);
      }
      writeChunks(stream, HEAP8, ptr, length, position);
      return { ptr, allocated: true };
    };
    node.stream_ops = stream_ops;
    return node;
  } };
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";
  var SYSCALLS = { currentUmask: 18, calculateAt(dirfd, path, allowEmpty) {
    if (PATH.isAbs(path)) {
      return path;
    }
    var dir;
    if (dirfd === -100) {
      dir = FS.cwd();
    } else {
      var dirstream = SYSCALLS.getStreamFromFD(dirfd);
      dir = dirstream.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw new FS.ErrnoError(44);
      }
      return dir;
    }
    return dir + "/" + path;
  }, writeStat(buf, stat) {
    HEAPU32[buf >> 2] = stat.dev;
    HEAPU32[buf + 4 >> 2] = stat.mode;
    HEAPU32[buf + 8 >> 2] = stat.nlink;
    HEAPU32[buf + 12 >> 2] = stat.uid;
    HEAPU32[buf + 16 >> 2] = stat.gid;
    HEAPU32[buf + 20 >> 2] = stat.rdev;
    HEAP64[buf + 24 >> 3] = BigInt(stat.size);
    HEAP32[buf + 32 >> 2] = 4096;
    HEAP32[buf + 36 >> 2] = stat.blocks;
    var atime = stat.atime.getTime();
    var mtime = stat.mtime.getTime();
    var ctime = stat.ctime.getTime();
    HEAP64[buf + 40 >> 3] = BigInt(Math.floor(atime / 1e3));
    HEAPU32[buf + 48 >> 2] = atime % 1e3 * 1e3 * 1e3;
    HEAP64[buf + 56 >> 3] = BigInt(Math.floor(mtime / 1e3));
    HEAPU32[buf + 64 >> 2] = mtime % 1e3 * 1e3 * 1e3;
    HEAP64[buf + 72 >> 3] = BigInt(Math.floor(ctime / 1e3));
    HEAPU32[buf + 80 >> 2] = ctime % 1e3 * 1e3 * 1e3;
    HEAP64[buf + 88 >> 3] = BigInt(stat.ino);
    return 0;
  }, writeStatFs(buf, stats) {
    HEAPU32[buf + 4 >> 2] = stats.bsize;
    HEAPU32[buf + 60 >> 2] = stats.bsize;
    HEAP64[buf + 8 >> 3] = BigInt(stats.blocks);
    HEAP64[buf + 16 >> 3] = BigInt(stats.bfree);
    HEAP64[buf + 24 >> 3] = BigInt(stats.bavail);
    HEAP64[buf + 32 >> 3] = BigInt(stats.files);
    HEAP64[buf + 40 >> 3] = BigInt(stats.ffree);
    HEAPU32[buf + 48 >> 2] = stats.fsid;
    HEAPU32[buf + 64 >> 2] = stats.flags;
    HEAPU32[buf + 56 >> 2] = stats.namelen;
  }, doMsync(addr, stream, len3, flags, offset) {
    if (!FS.isFile(stream.node.mode)) {
      throw new FS.ErrnoError(43);
    }
    if (flags & 2) {
      return 0;
    }
    var buffer = HEAPU8.subarray(addr, addr + len3);
    FS.msync(stream, buffer, offset, len3, flags);
  }, getStreamFromFD(fd) {
    var stream = FS.getStreamChecked(fd);
    return stream;
  }, varargs: void 0, getStr(ptr) {
    var ret = UTF8ToString(ptr);
    return ret;
  } };
  function ___syscall_fcntl64(fd, cmd, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = stream.flags & ~mask | arg & mask;
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          HEAP16[arg + offset >> 1] = 2;
          return 0;
        }
        case 13:
        case 14:
          return 0;
      }
      return -28;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_ioctl(fd, op, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[argp >> 2] = termios.c_iflag || 0;
            HEAP32[argp + 4 >> 2] = termios.c_oflag || 0;
            HEAP32[argp + 8 >> 2] = termios.c_cflag || 0;
            HEAP32[argp + 12 >> 2] = termios.c_lflag || 0;
            for (var i = 0; i < 32; i++) {
              HEAP8[argp + i + 17] = termios.c_cc[i] || 0;
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[argp >> 2];
            var c_oflag = HEAP32[argp + 4 >> 2];
            var c_cflag = HEAP32[argp + 8 >> 2];
            var c_lflag = HEAP32[argp + 12 >> 2];
            var c_cc = [];
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[argp + i + 17]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0;
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[argp >> 2] = 0;
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28;
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[argp >> 1] = winsize[0];
            HEAP16[argp + 2 >> 1] = winsize[1];
          }
          return 0;
        }
        case 21524: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default:
          return -28;
      }
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  function ___syscall_openat(dirfd, path, flags, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode).fd;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  function ___syscall_readlinkat(dirfd, path, buf, bufsize) {
    try {
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (bufsize <= 0) return -28;
      var ret = FS.readlink(path);
      var len3 = Math.min(bufsize, lengthBytesUTF8(ret));
      var endChar = HEAP8[buf + len3];
      stringToUTF8(ret, buf, bufsize + 1);
      HEAP8[buf + len3] = endChar;
      return len3;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return -e.errno;
    }
  }
  var getHeapMax = () => 2147483648;
  var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
  var growMemory = (size) => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  };
  var _emscripten_resize_heap = (requestedSize) => {
    var oldSize = HEAPU8.length;
    requestedSize >>>= 0;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
      var replacement = growMemory(newSize);
      if (replacement) {
        return true;
      }
    }
    return false;
  };
  var ENV = {};
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
    if (!getEnvStrings.strings) {
      var lang = (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8";
      var env = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: lang, _: getExecutableName() };
      for (var x in ENV) {
        if (ENV[x] === void 0) delete env[x];
        else env[x] = ENV[x];
      }
      var strings = [];
      for (var x in env) {
        strings.push(`${x}=${env[x]}`);
      }
      getEnvStrings.strings = strings;
    }
    return getEnvStrings.strings;
  };
  var _environ_get = (__environ, environ_buf) => {
    var bufSize = 0;
    var envp = 0;
    for (var string of getEnvStrings()) {
      var ptr = environ_buf + bufSize;
      HEAPU32[__environ + envp >> 2] = ptr;
      bufSize += stringToUTF8(string, ptr, Infinity) + 1;
      envp += 4;
    }
    return 0;
  };
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
    var strings = getEnvStrings();
    HEAPU32[penviron_count >> 2] = strings.length;
    var bufSize = 0;
    for (var string of strings) {
      bufSize += lengthBytesUTF8(string) + 1;
    }
    HEAPU32[penviron_buf_size >> 2] = bufSize;
    return 0;
  };
  function _fd_close(fd) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doReadv = (stream, iov, iovcnt, offset) => {
    var ret = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[iov >> 2];
      var len3 = HEAPU32[iov + 4 >> 2];
      iov += 8;
      try {
        var curr = FS.read(stream, HEAP8, ptr, len3, offset);
      } catch (e) {
        if (ret > 0 && e instanceof FS.ErrnoError && (e.errno == 6 || e.errno == 6)) {
          break;
        }
        throw e;
      }
      if (curr < 0) return -1;
      ret += curr;
      if (curr < len3) break;
      if (typeof offset != "undefined") {
        offset += curr;
      }
    }
    return ret;
  };
  function _fd_read(fd, iov, iovcnt, pnum) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var INT53_MAX = 9007199254740992;
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num);
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
    try {
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[newOffset >> 3] = BigInt(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var doWritev = (stream, iov, iovcnt, offset) => {
    if (iovcnt == 1) {
      return FS.write(stream, HEAP8, HEAPU32[iov >> 2], HEAPU32[iov + 4 >> 2], offset);
    }
    var total = 0;
    for (var i = 0, p = iov; i < iovcnt; i++, p += 8) {
      total += HEAPU32[p + 4 >> 2];
    }
    var view = new Uint8Array(total);
    var voff = 0;
    for (var i = 0; i < iovcnt; i++, iov += 8) {
      var ptr = HEAPU32[iov >> 2];
      var len3 = HEAPU32[iov + 4 >> 2];
      view.set(HEAPU8.subarray(ptr, ptr + len3), voff);
      voff += len3;
    }
    return FS.write(stream, view, 0, total, offset);
  };
  function _fd_write(fd, iov, iovcnt, pnum) {
    try {
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[pnum >> 2] = num;
      return 0;
    } catch (e) {
      if (typeof FS == "undefined" || !(e.name === "ErrnoError")) throw e;
      return e.errno;
    }
  }
  var getCFunc = (ident) => {
    var func = Module["_" + ident];
    return func;
  };
  var writeArrayToMemory = (array, buffer) => {
    HEAP8.set(array, buffer);
  };
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var stringToUTF8OnStack = (str) => {
    var size = lengthBytesUTF8(str) + 1;
    var ret = stackAlloc(size);
    stringToUTF8(str, ret, size);
    return ret;
  };
  var ccall = (ident, returnType, argTypes, args, opts) => {
    var toC = { string: (str) => {
      var ret2 = 0;
      if (str !== null && str !== void 0 && str !== 0) {
        ret2 = stringToUTF8OnStack(str);
      }
      return ret2;
    }, array: (arr) => {
      var ret2 = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret2);
      return ret2;
    } };
    function convertReturnValue(ret2) {
      if (returnType === "string") {
        return UTF8ToString(ret2);
      }
      if (returnType === "boolean") return Boolean(ret2);
      return ret2;
    }
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func(...cArgs);
    function onDone(ret2) {
      if (stack !== 0) stackRestore(stack);
      return convertReturnValue(ret2);
    }
    ret = onDone(ret);
    return ret;
  };
  var cwrap = (ident, returnType, argTypes, opts) => {
    var numericArgs = !argTypes || argTypes.every((type) => type === "number" || type === "boolean");
    var numericRet = returnType !== "string";
    if (numericRet && numericArgs && !opts) {
      return getCFunc(ident);
    }
    return (...args) => ccall(ident, returnType, argTypes, args, opts);
  };
  var FS_createPath = (...args) => FS.createPath(...args);
  var FS_unlink = (...args) => FS.unlink(...args);
  var FS_createLazyFile = (...args) => FS.createLazyFile(...args);
  var FS_createDevice = (...args) => FS.createDevice(...args);
  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();
  {
    if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
    if (Module["print"]) out = Module["print"];
    if (Module["printErr"]) err = Module["printErr"];
    if (Module["arguments"]) programArgs = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    var preInit = Module["preInit"];
    if (preInit) {
      if (typeof preInit == "function") Module["preInit"] = preInit = [preInit];
      while (preInit.length > 0) {
        preInit.shift()();
      }
    }
  }
  Module["addRunDependency"] = addRunDependency;
  Module["removeRunDependency"] = removeRunDependency;
  Module["ccall"] = ccall;
  Module["cwrap"] = cwrap;
  Module["UTF8ToString"] = UTF8ToString;
  Module["stringToUTF8"] = stringToUTF8;
  Module["FS_preloadFile"] = FS_preloadFile;
  Module["FS_unlink"] = FS_unlink;
  Module["FS_createPath"] = FS_createPath;
  Module["FS_createDevice"] = FS_createDevice;
  Module["FS"] = FS;
  Module["FS_createDataFile"] = FS_createDataFile;
  Module["FS_createLazyFile"] = FS_createLazyFile;
  var _swe_sol_eclipse_where, _swe_deltat_ex, _swe_calc, _swe_fixstar, _swe_sidtime, _swe_degnorm, _swe_set_topo, _swe_cotrans, _swe_refrac_extended, _swe_lun_occult_where, _swe_sol_eclipse_how, _swe_calc_ut, _swe_azalt, _swe_sol_eclipse_when_glob, _swe_lun_occult_when_glob, _swe_sol_eclipse_when_loc, _swe_rise_trans, _swe_lun_occult_when_loc, _swe_azalt_rev, _swe_refrac, _swe_set_lapse_rate, _swe_lun_eclipse_how, _swe_lun_eclipse_when, _swe_lun_eclipse_when_loc, _swe_rise_trans_true_hor, _swe_pheno, _swe_pheno_ut, _swe_nod_aps, _swe_nod_aps_ut, _swe_get_orbital_elements, _swe_orbit_max_min_true_distance, _swe_gauquelin_sector, _swe_sidtime0, _swe_house_pos, _swe_date_conversion, _swe_julday, _swe_revjul, _swe_utc_time_zone, _swe_utc_to_jd, _swe_jdet_to_utc, _swe_jdut1_to_utc, _swe_d2l, _swe_close, _swe_vis_limit_mag, _swe_fixstar_mag, _swe_heliacal_pheno_ut, _swe_heliacal_ut, _swe_get_planet_name, _swe_houses, _swe_houses_armc_ex2, _swe_difdeg2n, _swe_houses_ex, _swe_houses_ex2, _swe_set_sid_mode, _swe_get_ayanamsa_ex, _swe_houses_armc, _swe_radnorm, _swe_house_name, _free, _malloc, _swe_version, _swe_get_library_path, _swe_set_tid_acc, _swe_set_ephe_path, _swe_difrad2n, _swe_set_jpl_file, _swe_get_ayanamsa_ex_ut, _swe_get_ayanamsa, _swe_get_ayanamsa_ut, _swe_fixstar2, _swe_fixstar2_ut, _swe_fixstar2_mag, _swe_get_ayanamsa_name, _swe_time_equ, _swe_lmt_to_lat, _swe_lat_to_lmt, _swe_fixstar_ut, _swe_calc_pctr, _swe_get_current_file_data, _swe_solcross, _swe_solcross_ut, _swe_mooncross, _swe_mooncross_ut, _swe_mooncross_node, _swe_mooncross_node_ut, _swe_helio_cross, _swe_helio_cross_ut, _swe_deg_midp, _swe_rad_midp, _swe_cotrans_sp, _swe_deltat, _swe_get_tid_acc, _swe_set_delta_t_userdef, _swe_set_interpolate_nut, _swe_csnorm, _swe_difcsn, _swe_difdegn, _swe_difcs2n, _swe_csroundsec, _swe_day_of_week, _swe_cs2timestr, _swe_cs2lonlatstr, _swe_cs2degstr, _swe_split_deg, _swe_set_astro_models, _swe_get_astro_models, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, memory, __indirect_function_table, wasmMemory;
  function assignWasmExports(wasmExports2) {
    _swe_sol_eclipse_where = Module["_swe_sol_eclipse_where"] = wasmExports2["n"];
    _swe_deltat_ex = Module["_swe_deltat_ex"] = wasmExports2["o"];
    _swe_calc = Module["_swe_calc"] = wasmExports2["p"];
    _swe_fixstar = Module["_swe_fixstar"] = wasmExports2["q"];
    _swe_sidtime = Module["_swe_sidtime"] = wasmExports2["r"];
    _swe_degnorm = Module["_swe_degnorm"] = wasmExports2["s"];
    _swe_set_topo = Module["_swe_set_topo"] = wasmExports2["t"];
    _swe_cotrans = Module["_swe_cotrans"] = wasmExports2["u"];
    _swe_refrac_extended = Module["_swe_refrac_extended"] = wasmExports2["v"];
    _swe_lun_occult_where = Module["_swe_lun_occult_where"] = wasmExports2["w"];
    _swe_sol_eclipse_how = Module["_swe_sol_eclipse_how"] = wasmExports2["x"];
    _swe_calc_ut = Module["_swe_calc_ut"] = wasmExports2["y"];
    _swe_azalt = Module["_swe_azalt"] = wasmExports2["z"];
    _swe_sol_eclipse_when_glob = Module["_swe_sol_eclipse_when_glob"] = wasmExports2["A"];
    _swe_lun_occult_when_glob = Module["_swe_lun_occult_when_glob"] = wasmExports2["B"];
    _swe_sol_eclipse_when_loc = Module["_swe_sol_eclipse_when_loc"] = wasmExports2["C"];
    _swe_rise_trans = Module["_swe_rise_trans"] = wasmExports2["D"];
    _swe_lun_occult_when_loc = Module["_swe_lun_occult_when_loc"] = wasmExports2["E"];
    _swe_azalt_rev = Module["_swe_azalt_rev"] = wasmExports2["F"];
    _swe_refrac = Module["_swe_refrac"] = wasmExports2["G"];
    _swe_set_lapse_rate = Module["_swe_set_lapse_rate"] = wasmExports2["H"];
    _swe_lun_eclipse_how = Module["_swe_lun_eclipse_how"] = wasmExports2["I"];
    _swe_lun_eclipse_when = Module["_swe_lun_eclipse_when"] = wasmExports2["J"];
    _swe_lun_eclipse_when_loc = Module["_swe_lun_eclipse_when_loc"] = wasmExports2["K"];
    _swe_rise_trans_true_hor = Module["_swe_rise_trans_true_hor"] = wasmExports2["L"];
    _swe_pheno = Module["_swe_pheno"] = wasmExports2["M"];
    _swe_pheno_ut = Module["_swe_pheno_ut"] = wasmExports2["N"];
    _swe_nod_aps = Module["_swe_nod_aps"] = wasmExports2["O"];
    _swe_nod_aps_ut = Module["_swe_nod_aps_ut"] = wasmExports2["P"];
    _swe_get_orbital_elements = Module["_swe_get_orbital_elements"] = wasmExports2["Q"];
    _swe_orbit_max_min_true_distance = Module["_swe_orbit_max_min_true_distance"] = wasmExports2["R"];
    _swe_gauquelin_sector = Module["_swe_gauquelin_sector"] = wasmExports2["S"];
    _swe_sidtime0 = Module["_swe_sidtime0"] = wasmExports2["T"];
    _swe_house_pos = Module["_swe_house_pos"] = wasmExports2["U"];
    _swe_date_conversion = Module["_swe_date_conversion"] = wasmExports2["V"];
    _swe_julday = Module["_swe_julday"] = wasmExports2["W"];
    _swe_revjul = Module["_swe_revjul"] = wasmExports2["X"];
    _swe_utc_time_zone = Module["_swe_utc_time_zone"] = wasmExports2["Y"];
    _swe_utc_to_jd = Module["_swe_utc_to_jd"] = wasmExports2["Z"];
    _swe_jdet_to_utc = Module["_swe_jdet_to_utc"] = wasmExports2["_"];
    _swe_jdut1_to_utc = Module["_swe_jdut1_to_utc"] = wasmExports2["$"];
    _swe_d2l = Module["_swe_d2l"] = wasmExports2["aa"];
    _swe_close = Module["_swe_close"] = wasmExports2["ba"];
    _swe_vis_limit_mag = Module["_swe_vis_limit_mag"] = wasmExports2["ca"];
    _swe_fixstar_mag = Module["_swe_fixstar_mag"] = wasmExports2["da"];
    _swe_heliacal_pheno_ut = Module["_swe_heliacal_pheno_ut"] = wasmExports2["ea"];
    _swe_heliacal_ut = Module["_swe_heliacal_ut"] = wasmExports2["fa"];
    _swe_get_planet_name = Module["_swe_get_planet_name"] = wasmExports2["ga"];
    _swe_houses = Module["_swe_houses"] = wasmExports2["ha"];
    _swe_houses_armc_ex2 = Module["_swe_houses_armc_ex2"] = wasmExports2["ia"];
    _swe_difdeg2n = Module["_swe_difdeg2n"] = wasmExports2["ja"];
    _swe_houses_ex = Module["_swe_houses_ex"] = wasmExports2["ka"];
    _swe_houses_ex2 = Module["_swe_houses_ex2"] = wasmExports2["la"];
    _swe_set_sid_mode = Module["_swe_set_sid_mode"] = wasmExports2["ma"];
    _swe_get_ayanamsa_ex = Module["_swe_get_ayanamsa_ex"] = wasmExports2["na"];
    _swe_houses_armc = Module["_swe_houses_armc"] = wasmExports2["oa"];
    _swe_radnorm = Module["_swe_radnorm"] = wasmExports2["pa"];
    _swe_house_name = Module["_swe_house_name"] = wasmExports2["qa"];
    _free = Module["_free"] = wasmExports2["ra"];
    _malloc = Module["_malloc"] = wasmExports2["sa"];
    _swe_version = Module["_swe_version"] = wasmExports2["ta"];
    _swe_get_library_path = Module["_swe_get_library_path"] = wasmExports2["ua"];
    _swe_set_tid_acc = Module["_swe_set_tid_acc"] = wasmExports2["va"];
    _swe_set_ephe_path = Module["_swe_set_ephe_path"] = wasmExports2["wa"];
    _swe_difrad2n = Module["_swe_difrad2n"] = wasmExports2["xa"];
    _swe_set_jpl_file = Module["_swe_set_jpl_file"] = wasmExports2["ya"];
    _swe_get_ayanamsa_ex_ut = Module["_swe_get_ayanamsa_ex_ut"] = wasmExports2["za"];
    _swe_get_ayanamsa = Module["_swe_get_ayanamsa"] = wasmExports2["Aa"];
    _swe_get_ayanamsa_ut = Module["_swe_get_ayanamsa_ut"] = wasmExports2["Ba"];
    _swe_fixstar2 = Module["_swe_fixstar2"] = wasmExports2["Ca"];
    _swe_fixstar2_ut = Module["_swe_fixstar2_ut"] = wasmExports2["Da"];
    _swe_fixstar2_mag = Module["_swe_fixstar2_mag"] = wasmExports2["Ea"];
    _swe_get_ayanamsa_name = Module["_swe_get_ayanamsa_name"] = wasmExports2["Fa"];
    _swe_time_equ = Module["_swe_time_equ"] = wasmExports2["Ga"];
    _swe_lmt_to_lat = Module["_swe_lmt_to_lat"] = wasmExports2["Ha"];
    _swe_lat_to_lmt = Module["_swe_lat_to_lmt"] = wasmExports2["Ia"];
    _swe_fixstar_ut = Module["_swe_fixstar_ut"] = wasmExports2["Ja"];
    _swe_calc_pctr = Module["_swe_calc_pctr"] = wasmExports2["Ka"];
    _swe_get_current_file_data = Module["_swe_get_current_file_data"] = wasmExports2["La"];
    _swe_solcross = Module["_swe_solcross"] = wasmExports2["Ma"];
    _swe_solcross_ut = Module["_swe_solcross_ut"] = wasmExports2["Na"];
    _swe_mooncross = Module["_swe_mooncross"] = wasmExports2["Oa"];
    _swe_mooncross_ut = Module["_swe_mooncross_ut"] = wasmExports2["Pa"];
    _swe_mooncross_node = Module["_swe_mooncross_node"] = wasmExports2["Qa"];
    _swe_mooncross_node_ut = Module["_swe_mooncross_node_ut"] = wasmExports2["Ra"];
    _swe_helio_cross = Module["_swe_helio_cross"] = wasmExports2["Sa"];
    _swe_helio_cross_ut = Module["_swe_helio_cross_ut"] = wasmExports2["Ta"];
    _swe_deg_midp = Module["_swe_deg_midp"] = wasmExports2["Ua"];
    _swe_rad_midp = Module["_swe_rad_midp"] = wasmExports2["Va"];
    _swe_cotrans_sp = Module["_swe_cotrans_sp"] = wasmExports2["Wa"];
    _swe_deltat = Module["_swe_deltat"] = wasmExports2["Xa"];
    _swe_get_tid_acc = Module["_swe_get_tid_acc"] = wasmExports2["Ya"];
    _swe_set_delta_t_userdef = Module["_swe_set_delta_t_userdef"] = wasmExports2["Za"];
    _swe_set_interpolate_nut = Module["_swe_set_interpolate_nut"] = wasmExports2["_a"];
    _swe_csnorm = Module["_swe_csnorm"] = wasmExports2["$a"];
    _swe_difcsn = Module["_swe_difcsn"] = wasmExports2["ab"];
    _swe_difdegn = Module["_swe_difdegn"] = wasmExports2["bb"];
    _swe_difcs2n = Module["_swe_difcs2n"] = wasmExports2["cb"];
    _swe_csroundsec = Module["_swe_csroundsec"] = wasmExports2["db"];
    _swe_day_of_week = Module["_swe_day_of_week"] = wasmExports2["eb"];
    _swe_cs2timestr = Module["_swe_cs2timestr"] = wasmExports2["fb"];
    _swe_cs2lonlatstr = Module["_swe_cs2lonlatstr"] = wasmExports2["gb"];
    _swe_cs2degstr = Module["_swe_cs2degstr"] = wasmExports2["hb"];
    _swe_split_deg = Module["_swe_split_deg"] = wasmExports2["ib"];
    _swe_set_astro_models = Module["_swe_set_astro_models"] = wasmExports2["jb"];
    _swe_get_astro_models = Module["_swe_get_astro_models"] = wasmExports2["kb"];
    __emscripten_stack_restore = wasmExports2["lb"];
    __emscripten_stack_alloc = wasmExports2["mb"];
    _emscripten_stack_get_current = wasmExports2["nb"];
    memory = wasmMemory = wasmExports2["l"];
    __indirect_function_table = wasmExports2["__indirect_function_table"];
  }
  var wasmImports = { c: ___syscall_fcntl64, i: ___syscall_ioctl, k: ___syscall_openat, d: ___syscall_readlinkat, j: _emscripten_resize_heap, f: _environ_get, g: _environ_sizes_get, a: _fd_close, h: _fd_read, e: _fd_seek, b: _fd_write };
  async function run() {
    preRun();
    if (runDependencies) {
      await resolveRunDependencies();
    }
    var setStatus = Module["setStatus"];
    if (setStatus) {
      setStatus("Running...");
      await new Promise((resolve) => setTimeout(resolve, 1));
      setTimeout(setStatus, 1, "");
    }
    if (ABORT) return;
    initRuntime();
    Module["onRuntimeInitialized"]?.();
    postRun();
  }
  var wasmExports;
  wasmExports = await createWasm();
  await run();
  ;
  return Module;
}
var swisseph_default;
var init_swisseph = __esm({
  "public/horoscope/offline/vendor/wasm/swisseph.mjs"() {
    swisseph_default = Swisseph;
  }
});

// public/horoscope/offline/vendor/smv-swisseph-local.mjs
var smv_swisseph_local_exports = {};
__export(smv_swisseph_local_exports, {
  createSMVSwissEph: () => createSMVSwissEph,
  default: () => smv_swisseph_local_default
});
async function createSMVSwissEph() {
  const M = await swisseph_default({ locateFile: (path) => {
    const u = new URL("./wasm/" + path, import.meta.url);
    return typeof process !== "undefined" && process.versions?.node ? decodeURIComponent(u.pathname) : u.href;
  } });
  M.ccall("swe_set_ephe_path", "void", ["string"], ["/sweph"]);
  const malloc = M._malloc, free = M._free;
  const utcToJd = (y, mo, d, h, mi, s) => {
    const p = malloc(16);
    M.ccall("swe_utc_to_jd", "void", ["number", "number", "number", "number", "number", "number", "number", "pointer"], [y, mo, d, h, mi, s, GREG, p]);
    const et = M.HEAPF64[p >> 3], ut = M.HEAPF64[(p >> 3) + 1];
    free(p);
    return { et, ut };
  };
  const calc = (jd, body, flags) => {
    const p = malloc(48), e = malloc(256);
    const ret = M.ccall("swe_calc", "number", ["number", "number", "number", "pointer", "pointer"], [jd, body, flags, p, e]);
    const a = M.HEAPF64.slice(p >> 3, (p >> 3) + 6);
    const msg = M.UTF8ToString(e);
    free(p);
    free(e);
    if (ret < 0) throw new Error(msg || "Swiss Ephemeris calculation failed");
    if ((ret & SWIEPH) !== SWIEPH) throw new Error("Swiss Ephemeris data not used; Moshier/JPL fallback rejected. retFlag=" + ret);
    return { longitude: a[0], latitude: a[1], distance: a[2], speed: a[3], retFlag: ret, ephemeris: "swiss" };
  };
  const orbitalElements = (jdEt, body, flags = SWIEPH) => {
    if (!Number.isFinite(jdEt) || ![2, 3, 4, 5, 6, 14].includes(body) || flags !== SWIEPH)
      throw new RangeError("Swiss heliocentric orbital elements: valid ET, Earth or five planets, SWIEPH flags required");
    const valuesPtr = malloc(50 * 8), errPtr = malloc(256);
    if (!valuesPtr || !errPtr) {
      if (valuesPtr) free(valuesPtr);
      if (errPtr) free(errPtr);
      throw new Error("Swiss orbit element memory allocation failed");
    }
    try {
      const rc = M.ccall(
        "swe_get_orbital_elements",
        "number",
        ["number", "number", "number", "pointer", "pointer"],
        [jdEt, body, flags, valuesPtr, errPtr]
      );
      const err = M.UTF8ToString(errPtr);
      if (rc < 0) throw new Error(err || "Swiss orbital element calculation failed");
      const elements = Array.from(M.HEAPF64.slice(valuesPtr >> 3, (valuesPtr >> 3) + 17));
      if (![elements[0], elements[1], elements[6], elements[9]].every(Number.isFinite))
        throw new Error("Swiss returned non-finite orbital elements");
      const n = (x) => (x % 360 + 360) % 360;
      return {
        body,
        meanLongitude: n(elements[9]),
        meanAnomaly: n(elements[6]),
        semiMajorAxisAU: elements[0],
        eccentricity: elements[1],
        ascendingNode: n(elements[3]),
        perihelionLongitude: n(elements[5]),
        frame: "modern-heliocentric-osculating",
        source: "Swiss Ephemeris WASM swe_get_orbital_elements",
        BPHSClassicalCertified: false,
        canReplaceClassicalMeanLongitude: false
      };
    } finally {
      free(valuesPtr);
      free(errPtr);
    }
  };
  const houses2 = (jd, lat, lon, hs = "S") => {
    const cp = malloc(13 * 8), ap = malloc(10 * 8);
    M.ccall("swe_houses_ex", "number", ["number", "number", "number", "number", "number", "pointer", "pointer"], [jd, SIDEREAL, lat, lon, hs.charCodeAt(0), cp, ap]);
    const c = Array.from(M.HEAPF64.slice(cp >> 3, (cp >> 3) + 13)), a = Array.from(M.HEAPF64.slice(ap >> 3, (ap >> 3) + 10));
    free(cp);
    free(ap);
    return { cusps: c.slice(1, 13), ascendant: a[0], mc: a[1], ascmc: a };
  };
  return {
    ephemerisMode: "SWISS",
    version: "Swiss Ephemeris WASM 2.10.03",
    utcToJd,
    setSiderealLahiri() {
      M.ccall("swe_set_sid_mode", "void", ["number", "number", "number"], [LAHIRI, 0, 0]);
    },
    siderealSpeedFlags() {
      return SWIEPH | SPEED | SIDEREAL;
    },
    calc,
    orbitalElements,
    ayanamsa(jd) {
      return M.ccall("swe_get_ayanamsa_ut", "number", ["number"], [jd]);
    },
    houses: houses2,
    close() {
      M.ccall("swe_close", "void", [], []);
    }
  };
}
var SWIEPH, SPEED, SIDEREAL, LAHIRI, GREG, smv_swisseph_local_default;
var init_smv_swisseph_local = __esm({
  "public/horoscope/offline/vendor/smv-swisseph-local.mjs"() {
    init_swisseph();
    SWIEPH = 2;
    SPEED = 256;
    SIDEREAL = 65536;
    LAHIRI = 1;
    GREG = 1;
    smv_swisseph_local_default = createSMVSwissEph;
  }
});

// node_modules/naelos-ephemeris/dist/tables.js
var MAGIC = 1213220174;
function parseTable(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MAGIC)
    throw new Error("not a Naelos Ephemeris table");
  const version = view.getUint8(4);
  if (version !== 2)
    throw new Error(`unsupported table format ${version}`);
  const count = view.getUint8(5);
  const start = view.getFloat64(6, true);
  const end = view.getFloat64(14, true);
  let pos = 22;
  const series = /* @__PURE__ */ new Map();
  for (let s = 0; s < count; s++) {
    const id = view.getUint16(pos, true);
    const frame = view.getUint8(pos + 2);
    const degree = view.getUint8(pos + 3);
    const knee = view.getUint8(pos + 4);
    const segmentDays = view.getFloat64(pos + 5, true);
    const t0 = view.getFloat64(pos + 13, true);
    const segments = view.getUint32(pos + 21, true);
    const step = view.getFloat64(pos + 25, true);
    const length = view.getUint32(pos + 33, true);
    pos += 37;
    const coeffs = decode(bytes, pos, pos + length, segments, degree, knee, step);
    pos += length;
    series.set(id, { id, frame, degree, segmentDays, t0, segments, coeffs });
  }
  return { start, end, series };
}
function shifts(degree, knee) {
  const out = [];
  for (let k = 0; k <= degree; k++) {
    let s = 0;
    if (knee && k > knee)
      while (2 ** s * knee * knee < k * k)
        s++;
    out.push(s);
  }
  return out;
}
function readZigzag(bytes, at) {
  let value = 0, scale = 1, b;
  do {
    b = bytes[at.pos++];
    value += (b & 127) * scale;
    scale *= 128;
  } while (b & 128);
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}
function decode(bytes, pos, stop, segments, degree, knee, step) {
  const n = degree + 1;
  const sh = shifts(degree, knee);
  const top = Math.max(...sh);
  const toFinest = sh.map((s) => 2 ** (top - s));
  const unit = sh.map((s) => step / 2 ** s);
  const out = new Float64Array(segments * 3 * n);
  const q = new Float64Array(n);
  const prevEnd = [0, 0, 0];
  const nextEnd = [0, 0, 0];
  const at = { pos };
  for (let s = 0; s < segments; s++) {
    for (let a = 0; a < 3; a++) {
      let alternating = 0;
      let tail = 0;
      for (let k = 1; k < n; k++) {
        q[k] = readZigzag(bytes, at);
        const Q = q[k] * toFinest[k];
        tail += Q;
        alternating += k % 2 === 0 ? Q : -Q;
      }
      const d = readZigzag(bytes, at);
      const Q0 = s === 0 ? d * toFinest[0] : prevEnd[a] - alternating + d;
      q[0] = Q0 / toFinest[0];
      nextEnd[a] = Q0 + tail;
      const base = (s * 3 + a) * n;
      for (let k = 0; k < n; k++)
        out[base + k] = q[k] * unit[k];
    }
    prevEnd[0] = nextEnd[0];
    prevEnd[1] = nextEnd[1];
    prevEnd[2] = nextEnd[2];
  }
  if (at.pos !== stop)
    throw new Error("table payload length mismatch");
  return out;
}
function covers(series, t) {
  return t >= series.t0 - 1e-9 && t <= series.t0 + series.segments * series.segmentDays + 1e-9;
}
function evaluate(series, t, pos, vel) {
  const { degree, segmentDays, t0, segments, coeffs } = series;
  if (!covers(series, t)) {
    throw new RangeError(`series ${series.id} covers TDB JD ${t0} to ${t0 + segments * segmentDays}, not ${t}`);
  }
  let i = Math.floor((t - t0) / segmentDays);
  if (i < 0)
    i = 0;
  else if (i >= segments)
    i = segments - 1;
  const x = 2 * (t - (t0 + i * segmentDays)) / segmentDays - 1;
  const n = degree + 1;
  for (let a = 0; a < 3; a++) {
    const base = (i * 3 + a) * n;
    let b1 = 0, b2 = 0;
    for (let k = degree; k >= 1; k--) {
      const b0 = 2 * x * b1 - b2 + coeffs[base + k];
      b2 = b1;
      b1 = b0;
    }
    pos[a] = x * b1 - b2 + coeffs[base];
    if (vel) {
      let u0 = 1, u1 = 2 * x, d = coeffs[base + 1];
      for (let k = 2; k <= degree; k++) {
        d += k * coeffs[base + k] * u1;
        const u2 = 2 * x * u1 - u0;
        u0 = u1;
        u1 = u2;
      }
      vel[a] = d * 2 / segmentDays;
    }
  }
}

// node_modules/naelos-ephemeris/dist/generated/frames.js
var FW_GAMB = [-0.052928, 10.556378, 0.4932044, -31238e-8, -2788e-9, 26e-9];
var FW_PHIB = [84381.412819, -46.811016, 0.0511268, 53289e-8, -44e-8, -176e-10];
var FW_PSIB = [-0.041775, 5038.481484, 1.5584175, -18522e-8, -26452e-9, -148e-10];
var OBL06 = [84381.406, -46.836769, -1831e-7, 20034e-7, -576e-9, -434e-10];
var DELAUNAY = [
  [485868.249036, 17179159232178e-4, 31.8792, 0.051635, -2447e-7],
  [128710479305e-5, 1295965810481e-4, -0.5532, 136e-6, -1149e-8],
  [335779.526232, 17395272628478e-4, -12.7512, -1037e-6, 417e-8],
  [107226070369e-5, 1602961601209e-3, -6.3706, 6593e-6, -3169e-8],
  [450160.398036, -69628905431e-4, 7.4722, 7702e-6, -5939e-8]
];
var NUT_OFFSET_PSI = -1350;
var NUT_OFFSET_EPS = 3880;
var NUT_TERMS = [
  0,
  0,
  0,
  0,
  1,
  -172064161,
  -174666,
  33386,
  92052331,
  9086,
  15377,
  0,
  0,
  2,
  -2,
  2,
  -13170906,
  -1675,
  -13696,
  5730336,
  -3015,
  -4587,
  0,
  0,
  2,
  0,
  2,
  -2276413,
  -234,
  2796,
  978459,
  -485,
  1374,
  0,
  0,
  0,
  0,
  2,
  2074554,
  207,
  -698,
  -897492,
  470,
  -291,
  0,
  1,
  0,
  0,
  0,
  1475877,
  -3633,
  11817,
  73871,
  -184,
  -1924,
  0,
  1,
  2,
  -2,
  2,
  -516821,
  1226,
  -524,
  224386,
  -677,
  -174,
  1,
  0,
  0,
  0,
  0,
  711159,
  73,
  -872,
  -6750,
  0,
  358,
  0,
  0,
  2,
  0,
  1,
  -387298,
  -367,
  380,
  200728,
  18,
  318,
  1,
  0,
  2,
  0,
  2,
  -301461,
  -36,
  816,
  129025,
  -63,
  367,
  0,
  -1,
  2,
  -2,
  2,
  215829,
  -494,
  111,
  -95929,
  299,
  132,
  0,
  0,
  2,
  -2,
  1,
  128227,
  137,
  181,
  -68982,
  -9,
  39,
  -1,
  0,
  2,
  0,
  2,
  123457,
  11,
  19,
  -53311,
  32,
  -4,
  -1,
  0,
  0,
  2,
  0,
  156994,
  10,
  -168,
  -1235,
  0,
  82,
  1,
  0,
  0,
  0,
  1,
  63110,
  63,
  27,
  -33228,
  0,
  -9,
  -1,
  0,
  0,
  0,
  1,
  -57976,
  -63,
  -189,
  31429,
  0,
  -75,
  -1,
  0,
  2,
  2,
  2,
  -59641,
  -11,
  149,
  25543,
  -11,
  66,
  1,
  0,
  2,
  0,
  1,
  -51613,
  -42,
  129,
  26366,
  0,
  78,
  -2,
  0,
  2,
  0,
  1,
  45893,
  50,
  31,
  -24236,
  -10,
  20,
  0,
  0,
  0,
  2,
  0,
  63384,
  11,
  -150,
  -1220,
  0,
  29,
  0,
  0,
  2,
  2,
  2,
  -38571,
  -1,
  158,
  16452,
  -11,
  68,
  0,
  -2,
  2,
  -2,
  2,
  32481,
  0,
  0,
  -13870,
  0,
  0,
  -2,
  0,
  0,
  2,
  0,
  -47722,
  0,
  -18,
  477,
  0,
  -25,
  2,
  0,
  2,
  0,
  2,
  -31046,
  -1,
  131,
  13238,
  -11,
  59,
  1,
  0,
  2,
  -2,
  2,
  28593,
  0,
  -1,
  -12338,
  10,
  -3,
  -1,
  0,
  2,
  0,
  1,
  20441,
  21,
  10,
  -10758,
  0,
  -3,
  2,
  0,
  0,
  0,
  0,
  29243,
  0,
  -74,
  -609,
  0,
  13,
  0,
  0,
  2,
  0,
  0,
  25887,
  0,
  -66,
  -550,
  0,
  11,
  0,
  1,
  0,
  0,
  1,
  -14053,
  -25,
  79,
  8551,
  -2,
  -45,
  -1,
  0,
  0,
  2,
  1,
  15164,
  10,
  11,
  -8001,
  0,
  -1,
  0,
  2,
  2,
  -2,
  2,
  -15794,
  72,
  -16,
  6850,
  -42,
  -5,
  0,
  0,
  -2,
  2,
  0,
  21783,
  0,
  13,
  -167,
  0,
  13,
  1,
  0,
  0,
  -2,
  1,
  -12873,
  -10,
  -37,
  6953,
  0,
  -14,
  0,
  -1,
  0,
  0,
  1,
  -12654,
  11,
  63,
  6415,
  0,
  26,
  -1,
  0,
  2,
  2,
  1,
  -10204,
  0,
  25,
  5222,
  0,
  15,
  0,
  2,
  0,
  0,
  0,
  16707,
  -85,
  -10,
  168,
  -1,
  10,
  1,
  0,
  2,
  2,
  2,
  -7691,
  0,
  44,
  3268,
  0,
  19,
  -2,
  0,
  2,
  0,
  0,
  -11024,
  0,
  -14,
  104,
  0,
  2,
  0,
  1,
  2,
  0,
  2,
  7566,
  -21,
  -11,
  -3250,
  0,
  -5,
  0,
  0,
  2,
  2,
  1,
  -6637,
  -11,
  25,
  3353,
  0,
  14,
  0,
  -1,
  2,
  0,
  2,
  -7141,
  21,
  8,
  3070,
  0,
  4,
  0,
  0,
  0,
  2,
  1,
  -6302,
  -11,
  2,
  3272,
  0,
  4,
  1,
  0,
  2,
  -2,
  1,
  5800,
  10,
  2,
  -3045,
  0,
  -1,
  2,
  0,
  2,
  -2,
  2,
  6443,
  0,
  -7,
  -2768,
  0,
  -4,
  -2,
  0,
  0,
  2,
  1,
  -5774,
  -11,
  -15,
  3041,
  0,
  -5,
  2,
  0,
  2,
  0,
  1,
  -5350,
  0,
  21,
  2695,
  0,
  12,
  0,
  -1,
  2,
  -2,
  1,
  -4752,
  -11,
  -3,
  2719,
  0,
  -3,
  0,
  0,
  0,
  -2,
  1,
  -4940,
  -11,
  -21,
  2720,
  0,
  -9,
  -1,
  -1,
  0,
  2,
  0,
  7350,
  0,
  -8,
  -51,
  0,
  4,
  2,
  0,
  0,
  -2,
  1,
  4065,
  0,
  6,
  -2206,
  0,
  1,
  1,
  0,
  0,
  2,
  0,
  6579,
  0,
  -24,
  -199,
  0,
  2,
  0,
  1,
  2,
  -2,
  1,
  3579,
  0,
  5,
  -1900,
  0,
  1,
  1,
  -1,
  0,
  0,
  0,
  4725,
  0,
  -6,
  -41,
  0,
  3,
  -2,
  0,
  2,
  0,
  2,
  -3075,
  0,
  -2,
  1313,
  0,
  -1,
  3,
  0,
  2,
  0,
  2,
  -2904,
  0,
  15,
  1233,
  0,
  7,
  0,
  -1,
  0,
  2,
  0,
  4348,
  0,
  -10,
  -81,
  0,
  2,
  1,
  -1,
  2,
  0,
  2,
  -2878,
  0,
  8,
  1232,
  0,
  4,
  0,
  0,
  0,
  1,
  0,
  -4230,
  0,
  5,
  -20,
  0,
  -2,
  -1,
  -1,
  2,
  2,
  2,
  -2819,
  0,
  7,
  1207,
  0,
  3,
  -1,
  0,
  2,
  0,
  0,
  -4056,
  0,
  5,
  40,
  0,
  -2,
  0,
  -1,
  2,
  2,
  2,
  -2647,
  0,
  11,
  1129,
  0,
  5,
  -2,
  0,
  0,
  0,
  1,
  -2294,
  0,
  -10,
  1266,
  0,
  -4,
  1,
  1,
  2,
  0,
  2,
  2481,
  0,
  -7,
  -1062,
  0,
  -3,
  2,
  0,
  0,
  0,
  1,
  2179,
  0,
  -2,
  -1129,
  0,
  -2,
  -1,
  1,
  0,
  1,
  0,
  3276,
  0,
  1,
  -9,
  0,
  0,
  1,
  1,
  0,
  0,
  0,
  -3389,
  0,
  5,
  35,
  0,
  -2,
  1,
  0,
  2,
  0,
  0,
  3339,
  0,
  -13,
  -107,
  0,
  1,
  -1,
  0,
  2,
  -2,
  1,
  -1987,
  0,
  -6,
  1073,
  0,
  -2,
  1,
  0,
  0,
  0,
  2,
  -1981,
  0,
  0,
  854,
  0,
  0,
  -1,
  0,
  0,
  1,
  0,
  4026,
  0,
  -353,
  -553,
  0,
  -139,
  0,
  0,
  2,
  1,
  2,
  1660,
  0,
  -5,
  -710,
  0,
  -2,
  -1,
  0,
  2,
  4,
  2,
  -1521,
  0,
  9,
  647,
  0,
  4,
  -1,
  1,
  0,
  1,
  1,
  1314,
  0,
  0,
  -700,
  0,
  0,
  0,
  -2,
  2,
  -2,
  1,
  -1283,
  0,
  0,
  672,
  0,
  0,
  1,
  0,
  2,
  2,
  1,
  -1331,
  0,
  8,
  663,
  0,
  4,
  -2,
  0,
  2,
  2,
  2,
  1383,
  0,
  -2,
  -594,
  0,
  -2,
  -1,
  0,
  0,
  0,
  2,
  1405,
  0,
  4,
  -610,
  0,
  2,
  1,
  1,
  2,
  -2,
  2,
  1290,
  0,
  0,
  -556,
  0,
  0
];

// node_modules/naelos-ephemeris/dist/generated/frames-long.js
var SPAN_START = 22871945e-1;
var SPAN_END = 26886025e-1;
var BLEND_YEARS = 50;
var LTP_ECL_POLY = [
  [5851.607687, -0.1189, -28913e-8, 101e-9],
  [-1600.8863, 1.1689818, -2e-7, -437e-9]
];
var LTP_ECL_PER = [
  [708.15, -5486.751211, -684.66156, 667.66673, -5523.863691],
  [2309, -17.127623, 2446.28388, -2354.886252, -549.74745],
  [1620, -617.517403, 399.671049, -428.152441, -310.998056],
  [492.2, 413.44294, -356.652376, 376.202861, 421.535876],
  [1183, 78.614193, -186.387003, 184.778874, -36.776172],
  [622, -180.732815, -316.80007, 335.321713, -145.278396],
  [882, -87.676083, 198.296701, -185.138669, -34.74445],
  [547, 46.140315, 101.135679, -120.97283, 22.885731]
];
var LTP_EQU_POLY = [
  [5453.282155, 0.4252841, -37173e-8, -152e-9],
  [-73750.93035, -0.7675452, -18725e-8, 231e-9]
];
var LTP_EQU_PER = [
  [256.75, -819.940624, 75004.344875, 81491.287984, 1558.515853],
  [708.15, -8444.676815, 624.033993, 787.163481, 7774.939698],
  [274.2, 2600.009459, 1251.136893, 1251.296102, -2219.534038],
  [241.45, 2755.17563, -1102.212834, -1257.950837, -2523.969396],
  [2309, -167.659835, -2660.66498, -2966.79973, 247.850422],
  [492.2, 871.855056, 699.291817, 639.744522, -846.485643],
  [396.1, 44.769698, 153.16722, 131.600209, -1393.124055],
  [288.9, -512.313065, -950.865637, -445.040117, 368.526116],
  [231.1, -819.415595, 499.754645, 584.522874, 749.045012],
  [1610, -538.071099, -145.18821, -89.756563, 444.704518],
  [620, -189.793622, 558.116553, 524.42963, 235.934465],
  [157.87, -402.922932, -23.923029, -13.549067, 374.049623],
  [220.3, 179.516345, -165.405086, -210.157124, -171.33018],
  [1200, -9.814756, 9.344131, -44.919798, -22.899655]
];
var LTP_EPS0 = 84381.406;
var LTP_BIAS = [-0.016617, -68192e-7, -0.0146];
var EO_FROM_EPOCH = -13260;
var EO_STEP_YEARS = 10;
var EO_MEAN = [-611191.3499, -611642.00096, -612092.62694, -612543.227748, -612993.803432, -613444.354036, -613894.879607, -614345.38019, -614795.855832, -615246.306578, -615696.732475, -616147.133568, -616597.509904, -617047.861529, -617498.188489, -617948.49083, -618398.7686, -618849.021844, -619299.250609, -619749.454941, -620199.634887, -620649.790493, -621099.921807, -621550.028875, -622000.111743, -622450.170459, -622900.205069, -623350.21562, -623800.202159, -624250.164734, -624700.103391, -625150.018177, -625599.90914, -626049.776326, -626499.619783, -626949.439558, -627399.235699, -627849.008252, -628298.757265, -628748.482786, -629198.184862, -629647.86354, -630097.518868, -630547.150895, -630996.759666, -631446.34523, -631895.907635, -632345.446928, -632794.963158, -633244.456371, -633693.926617, -634143.373942, -634592.798394, -635042.200023, -635491.578875, -635940.934999, -636390.268442, -636839.579254, -637288.867481, -637738.133173, -638187.376377, -638636.597141, -639085.795515, -639534.971546, -639984.125282, -640433.256772, -640882.366065, -641331.453208, -641780.518251, -642229.561241, -642678.582227, -643127.581258, -643576.558383, -644025.513649, -644474.447106, -644923.358803, -645372.248787, -645821.117108, -646269.963814, -646718.788954, -647167.592577, -647616.374732, -648065.135468, -648513.874833, -648962.592876, -649411.289647, -649859.965193, -650308.619565, -650757.252811, -651205.86498, -651654.456121, -652103.026283, -652551.575516, -653000.103867, -653448.611388, -653897.098125, -654345.56413, -654794.00945, -655242.434135, -655690.838234, -656139.221797, -656587.584873, -657035.92751, -657484.249759, -657932.551667, -658380.833286, -658829.094664, -659277.33585, -659725.556894, -660173.757845, -660621.938752, -661070.099665, -661518.240633, -661966.361706, -662414.462933, -662862.544364, -663310.606047, -663758.648033, -664206.670371, -664654.67311, -665102.656299, -665550.61999, -665998.564229, -666446.489069, -666894.394557, -667342.280743, -667790.147678, -668237.99541, -668685.823989, -669133.633464, -669581.423886, -670029.195303, -670476.947766, -670924.681324, -671372.396026, -671820.091923, -672267.769063, -672715.427496, -673163.067273, -673610.688441, -674058.291053, -674505.875155, -674953.4408, -675400.988035, -675848.516911, -676296.027477, -676743.519784, -677190.993879, -677638.449814, -678085.887638, -678533.307401, -678980.709151, -679428.092939, -679875.458815, -680322.806827, -680770.137026, -681217.449462, -681664.744183, -682112.021239, -682559.280681, -683006.522558, -683453.746919, -683900.953813, -684348.143292, -684795.315403, -685242.470198, -685689.607724, -686136.728033, -686583.831173, -687030.917194, -687477.986145, -687925.038077, -688372.073039, -688819.09108, -689266.09225, -689713.076598, -690160.044174, -690606.995028, -691053.929208, -691500.846765, -691947.747748, -692394.632206, -692841.500189, -693288.351747, -693735.186928, -694182.005782, -694628.808359, -695075.594708, -695522.364879, -695969.118921, -696415.856882, -696862.578814, -697309.284764, -697755.974783, -698202.64892, -698649.307224, -699095.949744, -699542.576529, -699989.18763, -700435.783095, -700882.362973, -701328.927314, -701775.476167, -702222.009581, -702668.527605, -703115.030289, -703561.517682, -704007.989832, -704454.44679, -704900.888603, -705347.315322, -705793.726995, -706240.123672, -706686.505401, -707132.872231, -707579.224212, -708025.561393, -708471.883822, -708918.191548, -709364.484621, -709810.763089, -710257.027002, -710703.276407, -711149.511355, -711595.731893, -712041.938072, -712488.129939, -712934.307543, -713380.470933, -713826.620158, -714272.755267, -714718.876308, -715164.98333, -715611.076382, -716057.155513, -716503.22077, -716949.272203, -717395.30986, -717841.33379, -718287.344041, -718733.340663, -719179.323702, -719625.293209, -720071.24923, -720517.191816, -720963.121013, -721409.036872, -721854.939439, -722300.828764, -722746.704894, -723192.567878, -723638.417764, -724084.254601, -724530.078436, -724975.889319, -725421.687296, -725867.472417, -726313.244729, -726759.004281, -727204.75112, -727650.485295, -728096.206854, -728541.915844, -728987.612314, -729433.296312, -729878.967885, -730324.627082, -730770.27395, -731215.908538, -731661.530893, -732107.141062, -732552.739095, -732998.325037, -733443.898938, -733889.460845, -734335.010806, -734780.548868, -735226.075079, -735671.589486, -736117.092138, -736562.583081, -737008.062363, -737453.530032, -737898.986135, -738344.43072, -738789.863834, -739235.285524, -739680.695838, -740126.094824, -740571.482527, -741016.858997, -741462.224279, -741907.578422, -742352.921472, -742798.253477, -743243.574484, -743688.884539, -744134.183691, -744579.471985, -745024.74947, -745470.016192, -745915.272198, -746360.517535, -746805.75225, -747250.976391, -747696.190003, -748141.393133, -748586.58583, -749031.768138, -749476.940106, -749922.101779, -750367.253205, -750812.39443, -751257.525501, -751702.646465, -752147.757367, -752592.858256, -753037.949176, -753483.030176, -753928.1013, -754373.162596, -754818.214111, -755263.25589, -755708.28798, -756153.310427, -756598.323278, -757043.326579, -757488.320376, -757933.304716, -758378.279644, -758823.245207, -759268.201451, -759713.148423, -760158.086167, -760603.014731, -761047.934161, -761492.844501, -761937.7458, -762382.638101, -762827.521452, -763272.395898, -763717.261486, -764162.11826, -764606.966267, -765051.805553, -765496.636163, -765941.458143, -766386.27154, -766831.076398, -767275.872763, -767720.660681, -768165.440198, -768610.211358, -769054.974209, -769499.728795, -769944.475161, -770389.213354, -770833.943418, -771278.665399, -771723.379343, -772168.085295, -772612.7833, -773057.473404, -773502.155652, -773946.830088, -774391.496759, -774836.15571, -775280.806986, -775725.450631, -776170.086692, -776614.715213, -777059.336239, -777503.949816, -777948.555988, -778393.1548, -778837.746298, -779282.330527, -779726.907531, -780171.477355, -780616.040044, -781060.595643, -781505.144197, -781949.685751, -782394.22035, -782838.748037, -783283.268859, -783727.782859, -784172.290083, -784616.790575, -785061.284379, -785505.771541, -785950.252105, -786394.726115, -786839.193616, -787283.654653, -787728.10927, -788172.557512, -788616.999422, -789061.435046, -789505.864428, -789950.287612, -790394.704643, -790839.115565, -791283.520422, -791727.919258, -792172.312119, -792616.699047, -793061.080088, -793505.455285, -793949.824683, -794394.188326, -794838.546258, -795282.898523, -795727.245165, -796171.586228, -796615.921757, -797060.251795, -797504.576386, -797948.895575, -798393.209405, -798837.517921, -799281.821166, -799726.119183, -800170.412018, -800614.699714, -801058.982314, -801503.259863, -801947.532404, -802391.799981, -802836.062638, -803280.320419, -803724.573367, -804168.821526, -804613.064939, -805057.303651, -805501.537706, -805945.767145, -806389.992014, -806834.212356, -807278.428215, -807722.639633, -808166.846655, -808611.049323, -809055.247683, -809499.441776, -809943.631647, -810387.817338, -810831.998894, -811276.176358, -811720.349772, -812164.519181, -812608.684628, -813052.846156, -813497.003809, -813941.15763, -814385.307661, -814829.453947, -815273.59653, -815717.735454, -816161.870763, -816606.002498, -817050.130704, -817494.255424, -817938.3767, -818382.494576, -818826.609095, -819270.720301, -819714.828235, -820158.932942, -820603.034464, -821047.132845, -821491.228127, -821935.320354, -822379.409568, -822823.495812, -823267.57913, -823711.659564, -824155.737158, -824599.811954, -825043.883995, -825487.953324, -825932.019984, -826376.084018, -826820.145468, -827264.204379, -827708.260791, -828152.314749, -828596.366295, -829040.415471, -829484.462322, -829928.506888, -830372.549214, -830816.589342, -831260.627314, -831704.663174, -832148.696963, -832592.728726, -833036.758503, -833480.786339, -833924.812276, -834368.836356, -834812.858622, -835256.879117, -835700.897883, -836144.914963, -836588.9304, -837032.944235, -837476.956513, -837920.967274, -838364.976562, -838808.98442, -839252.990889, -839696.996013, -840140.999834, -840585.002394, -841029.003736, -841473.003902, -841917.002935, -842361.000877, -842804.997771, -843248.993659, -843692.988584, -844136.982588, -844580.975713, -845024.968002, -845468.959498, -845912.950241, -846356.940276, -846800.929645, -847244.918389, -847688.906551, -848132.894174, -848576.881299, -849020.867969, -849464.854227, -849908.840115, -850352.825674, -850796.810948, -851240.795979, -851684.780808, -852128.765479, -852572.750033, -853016.734513, -853460.718961, -853904.703419, -854348.687929, -854792.672534, -855236.657276, -855680.642197, -856124.627339, -856568.612745, -857012.598456, -857456.584516, -857900.570965, -858344.557847, -858788.545203, -859232.533076, -859676.521507, -860120.510539, -860564.500214, -861008.490575, -861452.481663, -861896.47352, -862340.466189, -862784.459711, -863228.454129, -863672.449485, -864116.445821, -864560.443179, -865004.441602, -865448.44113, -865892.441807, -866336.443674, -866780.446774, -867224.451148, -867668.456839, -868112.463888, -868556.472338, -869000.482231, -869444.493608, -869888.506512, -870332.520985, -870776.537069, -871220.554806, -871664.574237, -872108.595406, -872552.618353, -872996.643121, -873440.669752, -873884.698288, -874328.728771, -874772.761242, -875216.795745, -875660.83232, -876104.871009, -876548.911856, -876992.954901, -877437.000187, -877881.047755, -878325.097648, -878769.149907, -879213.204575, -879657.261693, -880101.321304, -880545.383448, -880989.448169, -881433.515508, -881877.585506, -882321.658207, -882765.733651, -883209.811882, -883653.892939, -884097.976867, -884542.063705, -884986.153497, -885430.246284, -885874.342109, -886318.441012, -886762.543036, -887206.648223, -887650.756614, -888094.868252, -888538.983178, -888983.101434, -889427.223062, -889871.348104, -890315.476602, -890759.608598, -891203.744133, -891647.883249, -892092.025988, -892536.172392, -892980.322503, -893424.476363, -893868.634013, -894312.795495, -894756.960851, -895201.130123, -895645.303353, -896089.480582, -896533.661853, -896977.847206, -897422.036685, -897866.23033, -898310.428183, -898754.630287, -899198.836683, -899643.047413, -900087.262518, -900531.48204, -900975.706022, -901419.934504, -901864.16753, -902308.405139, -902752.647375, -903196.894278, -903641.145891, -904085.402256, -904529.663414, -904973.929406, -905418.200275, -905862.476062, -906306.75681, -906751.042559, -907195.333351, -907639.629229, -908083.930233, -908528.236407, -908972.54779, -909416.864425, -909861.186354, -910305.513619, -910749.84626, -911194.18432, -911638.52784, -912082.876863, -912527.231429, -912971.59158, -913415.957359, -913860.328806, -914304.705963, -914749.088872, -915193.477575, -915637.872114, -916082.272529, -916526.678862, -916971.091156, -917415.509451, -917859.933789, -918304.364213, -918748.800763, -919193.243481, -919637.692408, -920082.147587, -920526.609059, -920971.076865, -921415.551047, -921860.031647, -922304.518706, -922749.012265, -923193.512367, -923638.019052, -924082.532362, -924527.05234, -924971.579025, -925416.112461, -925860.652687, -926305.199747, -926749.75368, -927194.31453, -927638.882337, -928083.457142, -928528.038988, -928972.627916, -929417.223966, -929861.827181, -930306.437603, -930751.055271, -931195.680229, -931640.312517, -932084.952176, -932529.599249, -932974.253776, -933418.915799, -933863.58536, -934308.262499, -934752.947258, -935197.639679, -935642.339802, -936087.04767, -936531.763322, -936976.486802, -937421.21815, -937865.957407, -938310.704615, -938755.459815, -939200.223048, -939644.994356, -940089.773779, -940534.56136, -940979.357139, -941424.161158, -941868.973457, -942313.794079, -942758.623064, -943203.460453, -943648.306288, -944093.160609, -944538.023459, -944982.894878, -945427.774908, -945872.663589, -946317.560962, -946762.467069, -947207.381951, -947652.30565, -948097.238205, -948542.179658, -948987.130051, -949432.089424, -949877.057818, -950322.035274, -950767.021834, -951212.017539, -951657.022429, -952102.036545, -952547.059929, -952992.092621, -953437.134662, -953882.186094, -954327.246957, -954772.317292, -955217.39714, -955662.486542, -956107.585539, -956552.694172, -956997.812481, -957442.940508, -957888.078292, -958333.225876, -958778.3833, -959223.550604, -959668.72783, -960113.915018, -960559.112209, -961004.319444, -961449.536763, -961894.764207, -962340.001817, -962785.249633, -963230.507697, -963675.776048, -964121.054728, -964566.343777, -965011.643236, -965456.953145, -965902.273544, -966347.604475, -966792.945978, -967238.298094, -967683.660862, -968129.034324, -968574.41852, -969019.81349, -969465.219275, -969910.635915, -970356.063451, -970801.501923, -971246.951372, -971692.411837, -972137.88336, -972583.36598, -973028.859738, -973474.364674, -973919.880828, -974365.408241, -974810.946953, -975256.497004, -975702.058434, -976147.631284, -976593.215594, -977038.811403, -977484.418752, -977930.037681, -978375.66823, -978821.31044, -979266.964349, -979712.629999, -980158.307429, -980603.99668, -981049.69779, -981495.410801, -981941.135752, -982386.872683, -982832.621634, -983278.382645, -983724.155755, -984169.941004, -984615.738433, -985061.548081, -985507.369988, -985953.204193, -986399.050737, -986844.909658, -987290.780998, -987736.664794, -988182.561087, -988628.469917, -989074.391323, -989520.325344, -989966.272021, -990412.231393, -990858.203498, -991304.188378, -991750.18607, -992196.196615, -992642.220052, -993088.25642, -993534.305759, -993980.368108, -994426.443506, -994872.531992, -995318.633607, -995764.748388, -996210.876376, -996657.017609, -997103.172127, -997549.339968, -997995.521172, -998441.715778, -998887.923825, -999334.145352, -999780.380398, -1000226629001e-6, -1000672891202e-6, -1001119167038e-6, -1001565456549e-6, -1002011759773e-6, -1002458076749e-6, -1002904407517e-6, -1003350752115e-6, -1003797110581e-6, -1004243482955e-6, -1004689869274e-6, -1005136269579e-6, -1005582683907e-6, -1006029112297e-6, -1006475554787e-6, -1006922011417e-6, -1007368482224e-6, -1007814967247e-6, -1008261466525e-6, -1008707980096e-6, -1009154507998e-6, -1009601050271e-6, -1010047606951e-6, -1010494178078e-6, -101094076369e-5, -1011387363825e-6, -1011833978521e-6, -1012280607816e-6, -1012727251749e-6, -1013173910358e-6, -1013620583681e-6, -1014067271756e-6, -1014513974621e-6, -1014960692313e-6, -1015407424872e-6, -1015854172335e-6, -1016300934739e-6, -1016747712123e-6, -1017194504525e-6, -1017641311982e-6, -1018088134532e-6, -1018534972213e-6, -1018981825063e-6, -1019428693119e-6, -1019875576419e-6, -1020322475001e-6, -1020769388902e-6, -1021216318159e-6, -1021663262811e-6, -1022110222895e-6, -1022557198448e-6, -1023004189507e-6, -102345119611e-5, -1023898218295e-6, -1024345256098e-6, -1024792309557e-6, -102523937871e-5, -1025686463592e-6, -1026133564243e-6, -1026580680698e-6, -1027027812994e-6, -102747496117e-5, -1027922125261e-6, -1028369305306e-6, -102881650134e-5, -1029263713401e-6, -1029710941525e-6, -103015818575e-5, -1030605446112e-6, -1031052722649e-6, -1031500015396e-6, -103194732439e-5, -1032394649669e-6, -1032841991268e-6, -1033289349225e-6, -1033736723576e-6, -1034184114357e-6, -1034631521605e-6, -1035078945356e-6, -1035526385647e-6, -1035973842515e-6, -1036421315994e-6, -1036868806122e-6, -1037316312935e-6, -1037763836469e-6, -1038211376761e-6, -1038658933846e-6, -103910650776e-5, -103955409854e-5, -1040001706221e-6, -104044933084e-5, -1040896972432e-6, -1041344631033e-6, -104179230668e-5, -1042239999407e-6, -1042687709251e-6, -1043135436248e-6, -1043583180433e-6, -1044030941841e-6, -1044478720508e-6, -1044926516471e-6, -1045374329763e-6, -1045822160422e-6, -1046270008482e-6, -1046717873978e-6, -1047165756946e-6, -1047613657422e-6, -104806157544e-5, -1048509511036e-6, -1048957464245e-6, -1049405435101e-6, -1049853423641e-6, -1050301429899e-6, -105074945391e-5, -105119749571e-5, -1051645555332e-6, -1052093632812e-6, -1052541728185e-6, -1052989841485e-6, -1053437972748e-6, -1053886122007e-6, -1054334289298e-6, -1054782474655e-6, -1055230678113e-6, -1055678899706e-6, -1056127139469e-6, -1056575397435e-6, -1057023673641e-6, -1057471968119e-6, -1057920280904e-6, -105836861203e-5, -1058816961532e-6, -1059265329443e-6, -1059713715798e-6, -1060162120631e-6, -1060610543976e-6, -1061058985867e-6, -1061507446337e-6, -1061955925421e-6, -1062404423152e-6, -1062852939564e-6, -1063301474691e-6, -1063750028566e-6, -1064198601224e-6, -1064647192697e-6, -1065095803019e-6, -1065544432224e-6, -1065993080346e-6, -1066441747417e-6, -106689043347e-5, -106733913854e-5, -106778786266e-5, -1068236605862e-6, -1068685368179e-6, -1069134149646e-6, -1069582950294e-6, -1070031770157e-6, -1070480609268e-6, -107092946766e-5, -1071378345365e-6, -1071827242417e-6, -1072276158848e-6, -107272509469e-5, -1073174049977e-6, -1073623024741e-6, -1074072019015e-6, -107452103283e-5, -107497006622e-5, -1075419119218e-6, -1075868191854e-6, -1076317284162e-6, -1076766396173e-6, -1077215527921e-6, -1077664679436e-6, -1078113850752e-6, -10785630419e-4, -1079012252912e-6, -1079461483821e-6, -1079910734657e-6, -1080360005453e-6, -1080809296241e-6, -1081258607052e-6, -1081707937918e-6, -108215728887e-5, -1082606659941e-6, -1083056051162e-6, -1083505462563e-6, -1083954894177e-6, -1084404346035e-6, -1084853818168e-6, -1085303310607e-6, -1085752823384e-6, -1086202356529e-6, -1086651910075e-6, -1087101484051e-6, -1087551078489e-6, -108800069342e-5, -1088450328874e-6, -1088899984882e-6, -1089349661476e-6, -1089799358685e-6, -1090249076541e-6, -1090698815074e-6, -1091148574315e-6, -1091598354293e-6, -109204815504e-5, -1092497976586e-6, -1092947818961e-6, -1093397682196e-6, -109384756632e-5, -1094297471363e-6, -1094747397357e-6, -109519734433e-5, -1095647312314e-6, -1096097301337e-6, -1096547311429e-6, -1096997342621e-6, -1097447394942e-6, -1097897468422e-6, -1098347563091e-6, -1098797678978e-6, -1099247816112e-6, -1099697974523e-6, -1100148154241e-6, -1100598355294e-6, -1101048577713e-6, -1101498821526e-6, -1101949086762e-6, -1102399373452e-6, -1102849681622e-6, -1103300011304e-6, -1103750362525e-6, -1104200735315e-6, -1104651129702e-6, -1105101545715e-6, -1105551983383e-6, -1106002442734e-6, -1106452923798e-6, -1106903426602e-6, -1107353951175e-6, -1107804497546e-6, -1108255065743e-6, -1108705655793e-6, -1109156267727e-6, -110960690157e-5, -1110057557353e-6, -1110508235102e-6, -1110958934846e-6, -1111409656612e-6, -111186040043e-5, -1112311166325e-6, -1112761954327e-6, -1113212764463e-6, -111366359676e-5, -1114114451246e-6, -1114565327949e-6, -1115016226895e-6, -1115467148114e-6, -1115918091631e-6, -1116369057474e-6, -111682004567e-5, -1117271056247e-6, -1117722089232e-6, -1118173144651e-6, -1118624222531e-6, -11190753229e-4, -1119526445785e-6, -1119977591211e-6, -1120428759206e-6, -1120879949797e-6, -1121331163009e-6, -1121782398871e-6, -1122233657407e-6, -1122684938645e-6, -1123136242611e-6, -112358756933e-5, -1124038918831e-6, -1124490291138e-6, -1124941686277e-6, -1125393104275e-6, -1125844545158e-6, -1126296008951e-6, -1126747495681e-6, -1127199005373e-6, -1127650538053e-6, -1128102093747e-6, -112855367248e-5, -1129005274278e-6, -1129456899165e-6, -1129908547169e-6, -1130360218313e-6, -1130811912624e-6, -1131263630127e-6, -1131715370846e-6, -1132167134806e-6, -1132618922034e-6, -1133070732553e-6, -1133522566389e-6, -1133974423567e-6, -113442630411e-5, -1134878208045e-6, -1135330135395e-6, -1135782086186e-6, -1136234060441e-6, -1136686058186e-6, -1137138079444e-6, -113759012424e-5, -1138042192598e-6, -1138494284542e-6, -1138946400097e-6, -1139398539286e-6, -1139850702134e-6, -1140302888665e-6, -1140755098902e-6, -1141207332869e-6, -114165959059e-5, -1142111872088e-6, -1142564177388e-6, -1143016506512e-6, -1143468859484e-6, -1143921236329e-6, -1144373637068e-6, -1144826061725e-6, -1145278510324e-6, -1145730982887e-6, -1146183479438e-6, -1146636, -1147088544596e-6, -1147541113248e-6, -1147993705979e-6, -1148446322812e-6, -1148898963771e-6, -1149351628877e-6, -1149804318152e-6, -115025703162e-5, -1150709769304e-6, -1151162531224e-6, -1151615317404e-6, -1152068127866e-6, -1152520962631e-6, -1152973821723e-6, -1153426705163e-6, -1153879612972e-6, -1154332545174e-6, -1154785501789e-6, -115523848284e-5, -1155691488348e-6, -1156144518335e-6, -1156597572822e-6, -1157050651831e-6, -1157503755383e-6, -1157956883499e-6, -1158410036202e-6, -1158863213512e-6, -115931641545e-5, -1159769642037e-6, -1160222893294e-6, -1160676169243e-6, -1161129469904e-6, -1161582795299e-6, -1162036145446e-6, -1162489520369e-6, -1162942920086e-6, -1163396344619e-6, -1163849793987e-6, -1164303268213e-6, -1164756767315e-6, -1165210291314e-6, -116566384023e-5, -1166117414084e-6, -1166571012895e-6, -1167024636684e-6, -116747828547e-5, -1167931959273e-6, -1168385658113e-6, -116883938201e-5, -1169293130984e-6, -1169746905053e-6, -1170200704238e-6, -1170654528558e-6, -1171108378032e-6, -117156225268e-5, -1172016152521e-6, -1172470077574e-6, -1172924027858e-6, -1173378003393e-6, -1173832004196e-6, -1174286030288e-6, -1174740081686e-6, -1175194158411e-6, -1175648260479e-6, -1176102387911e-6, -1176556540724e-6, -1177010718938e-6, -1177464922569e-6, -1177919151638e-6, -1178373406162e-6, -1178827686159e-6, -1179281991647e-6, -1179736322645e-6, -1180190679171e-6, -1180645061242e-6, -1181099468876e-6, -1181553902091e-6, -1182008360906e-6, -1182462845336e-6, -1182917355401e-6, -1183371891118e-6, -1183826452503e-6, -1184281039575e-6, -1184735652351e-6, -1185190290848e-6, -1185644955082e-6, -1186099645073e-6, -1186554360835e-6, -1187009102386e-6, -1187463869744e-6, -1187918662925e-6, -1188373481945e-6, -1188828326822e-6, -1189283197572e-6, -1189738094211e-6, -1190193016756e-6, -1190647965224e-6, -119110293963e-5, -1191557939992e-6, -1192012966324e-6, -1192468018644e-6, -1192923096967e-6, -119337820131e-5, -1193833331688e-6, -1194288488117e-6, -1194743670613e-6, -1195198879191e-6, -1195654113868e-6, -1196109374658e-6, -1196564661578e-6, -1197019974642e-6, -1197475313867e-6, -1197930679266e-6, -1198386070857e-6, -1198841488653e-6, -1199296932669e-6, -1199752402922e-6, -1200207899425e-6, -1200663422193e-6, -1201118971242e-6, -1201574546586e-6, -120203014824e-5, -1202485776217e-6, -1202941430534e-6, -1203397111204e-6, -1203852818241e-6, -120430855166e-5, -1204764311476e-6, -1205220097701e-6, -1205675910351e-6, -1206131749439e-6, -120658761498e-5, -1207043506987e-6, -1207499425473e-6, -1207955370454e-6, -1208411341942e-6, -120886733995e-5, -1209323364493e-6, -1209779415585e-6, -1210235493237e-6, -1210691597464e-6, -1211147728279e-6, -1211603885695e-6, -1212060069725e-6, -1212516280382e-6, -1212972517679e-6, -1213428781629e-6, -1213885072245e-6, -121434138954e-5, -1214797733526e-6, -1215254104215e-6, -1215710501621e-6, -1216166925756e-6, -1216623376632e-6, -1217079854262e-6, -1217536358657e-6, -121799288983e-5, -1218449447794e-6, -1218906032559e-6, -1219362644139e-6, -1219819282544e-6, -1220275947788e-6, -1220732639881e-6, -1221189358835e-6, -1221646104662e-6, -1222102877373e-6, -122255967698e-5, -1223016503495e-6, -1223473356928e-6, -1223930237291e-6, -1224387144595e-6, -1224844078851e-6, -1225301040071e-6, -1225758028264e-6, -1226215043443e-6, -1226672085618e-6, -1227129154799e-6, -1227586250998e-6, -1228043374225e-6, -122850052449e-5, -1228957701805e-6, -1229414906179e-6, -1229872137623e-6, -1230329396147e-6, -1230786681761e-6, -1231243994476e-6, -1231701334301e-6, -1232158701246e-6, -1232616095322e-6, -1233073516539e-6, -1233530964905e-6, -1233988440431e-6, -1234445943126e-6, -1234903473e-3, -1235361030063e-6, -1235818614324e-6, -1236276225791e-6, -1236733864476e-6, -1237191530386e-6, -123764922353e-5, -1238106943919e-6, -1238564691561e-6, -1239022466464e-6, -1239480268638e-6, -1239938098092e-6, -1240395954833e-6, -1240853838872e-6, -1241311750216e-6, -1241769688874e-6, -1242227654854e-6, -1242685648166e-6, -1243143668816e-6, -1243601716813e-6, -1244059792166e-6, -1244517894882e-6, -124497602497e-5, -1245434182437e-6, -1245892367292e-6, -1246350579542e-6, -1246808819194e-6, -1247267086257e-6, -1247725380739e-6, -1248183702646e-6, -1248642051986e-6, -1249100428766e-6, -1249558832994e-6, -1250017264677e-6, -1250475723823e-6, -1250934210438e-6, -1251392724529e-6, -1251851266103e-6, -1252309835167e-6, -1252768431729e-6, -1253227055794e-6, -1253685707369e-6, -1254144386462e-6, -1254603093078e-6, -1255061827224e-6, -1255520588907e-6, -1255979378132e-6, -1256438194906e-6, -1256897039236e-6, -1257355911127e-6, -1257814810585e-6, -1258273737616e-6, -1258732692227e-6, -1259191674423e-6, -125965068421e-5, -1260109721593e-6, -1260568786578e-6, -1261027879171e-6, -1261486999377e-6, -1261946147202e-6, -1262405322651e-6, -1262864525729e-6, -1263323756442e-6, -1263783014794e-6, -1264242300791e-6, -1264701614437e-6, -1265160955738e-6, -1265620324699e-6, -1266079721323e-6, -1266539145617e-6, -1266998597584e-6, -126745807723e-5, -1267917584558e-6, -1268377119573e-6, -126883668228e-5, -1269296272682e-6, -1269755890785e-6, -1270215536592e-6, -1270675210107e-6, -1271134911334e-6, -1271594640278e-6, -1272054396942e-6, -1272514181329e-6, -1272973993445e-6, -1273433833292e-6, -1273893700873e-6, -1274353596194e-6, -1274813519256e-6, -1275273470064e-6, -127573344862e-5, -1276193454928e-6, -1276653488992e-6, -1277113550814e-6, -1277573640397e-6, -1278033757744e-6, -1278493902859e-6, -1278954075744e-6, -1279414276401e-6, -1279874504834e-6, -1280334761045e-6, -1280795045037e-6, -1281255356813e-6, -1281715696374e-6, -1282176063723e-6, -1282636458862e-6, -1283096881794e-6, -128355733252e-5, -1284017811044e-6, -1284478317366e-6, -1284938851488e-6, -1285399413414e-6, -1285860003144e-6, -128632062068e-5, -1286781266023e-6, -1287241939177e-6, -1287702640141e-6, -1288163368918e-6, -1288624125508e-6, -1289084909914e-6, -1289545722136e-6, -1290006562175e-6, -1290467430033e-6, -1290928325712e-6, -129138924921e-5, -1291850200531e-6, -1292311179674e-6, -129277218664e-5, -129323322143e-5, -1293694284045e-6, -1294155374485e-6, -1294616492751e-6, -1295077638843e-6, -1295538812761e-6, -1296000014506e-6, -1296461244078e-6, -1296922501478e-6, -1297383786704e-6, -1297845099758e-6, -1298306440639e-6, -1298767809348e-6, -1299229205883e-6, -1299690630245e-6, -1300152082433e-6, -1300613562448e-6, -1301075070288e-6, -1301536605953e-6, -1301998169442e-6, -1302459760755e-6, -1302921379892e-6, -130338302685e-5, -130384470163e-5, -1304306404231e-6, -1304768134651e-6, -1305229892889e-6, -1305691678945e-6, -1306153492817e-6, -1306615334503e-6, -1307077204003e-6, -1307539101315e-6, -1308001026438e-6, -130846297937e-5, -1308924960109e-6, -1309386968654e-6, -1309849005003e-6, -1310311069154e-6, -1310773161105e-6, -1311235280855e-6, -1311697428401e-6, -1312159603742e-6, -1312621806875e-6, -1313084037797e-6, -1313546296508e-6, -1314008583003e-6, -1314470897282e-6, -131493323934e-5, -1315395609177e-6, -1315858006789e-6, -1316320432173e-6, -1316782885327e-6, -1317245366249e-6, -1317707874934e-6, -131817041138e-5, -1318632975584e-6, -1319095567543e-6, -1319558187254e-6, -1320020834714e-6, -1320483509919e-6, -1320946212866e-6, -1321408943551e-6, -1321871701971e-6, -1322334488123e-6, -1322797302002e-6, -1323260143606e-6, -132372301293e-5, -1324185909971e-6, -1324648834724e-6, -1325111787185e-6, -1325574767352e-6, -1326037775219e-6, -1326500810782e-6, -1326963874037e-6, -132742696498e-5, -1327890083607e-6, -1328353229913e-6, -1328816403893e-6, -1329279605543e-6, -1329742834858e-6, -1330206091834e-6, -1330669376466e-6, -1331132688749e-6, -1331596028678e-6, -1332059396248e-6, -1332522791455e-6, -1332986214292e-6, -1333449664755e-6, -1333913142839e-6, -1334376648538e-6, -1334840181847e-6, -1335303742761e-6, -1335767331273e-6, -1336230947379e-6, -1336694591073e-6, -1337158262349e-6, -1337621961201e-6, -1338085687624e-6, -1338549441611e-6, -1339013223157e-6, -1339477032256e-6, -1339940868901e-6, -1340404733087e-6, -1340868624807e-6, -1341332544054e-6, -1341796490824e-6, -1342260465108e-6, -13427244669e-4, -1343188496195e-6, -1343652552985e-6, -1344116637264e-6, -1344580749025e-6, -1345044888261e-6, -1345509054965e-6, -134597324913e-5, -1346437470749e-6, -1346901719816e-6, -1347365996323e-6, -1347830300262e-6, -1348294631627e-6, -134875899041e-5, -1349223376604e-6, -1349687790201e-6, -1350152231193e-6, -1350616699574e-6, -1351081195335e-6, -1351545718469e-6, -1352010268967e-6, -1352474846822e-6, -1352939452027e-6, -1353404084572e-6, -1353868744451e-6, -1354333431654e-6, -1354798146173e-6, -1355262888001e-6, -1355727657129e-6, -1356192453548e-6, -1356657277251e-6, -1357122128228e-6, -135758700647e-5, -135805191197e-5, -1358516844719e-6, -1358981804707e-6, -1359446791927e-6, -1359911806368e-6, -1360376848022e-6, -136084191688e-5, -1361307012932e-6, -1361772136171e-6, -1362237286585e-6, -1362702464167e-6, -1363167668906e-6, -1363632900793e-6, -1364098159819e-6, -1364563445974e-6, -1365028759248e-6, -1365494099632e-6, -1365959467116e-6, -1366424861689e-6, -1366890283343e-6, -1367355732067e-6, -1367821207851e-6, -1368286710686e-6, -136875224056e-5, -1369217797463e-6, -1369683381386e-6, -1370148992318e-6, -1370614630248e-6, -1371080295166e-6, -1371545987062e-6, -1372011705924e-6, -1372477451743e-6, -1372943224507e-6, -1373409024205e-6, -1373874850827e-6, -1374340704362e-6, -1374806584798e-6, -1375272492125e-6, -1375738426331e-6, -1376204387405e-6, -1376670375337e-6, -1377136390114e-6, -1377602431725e-6, -1378068500158e-6, -1378534595403e-6, -1379000717448e-6, -137946686628e-5, -1379933041888e-6, -1380399244261e-6, -1380865473386e-6, -1381331729252e-6, -1381798011846e-6, -1382264321157e-6, -1382730657172e-6, -1383197019879e-6, -1383663409266e-6, -138412982532e-5, -138459626803e-5, -1385062737383e-6, -1385529233365e-6, -1385995755966e-6, -1386462305171e-6, -1386928880969e-6, -1387395483346e-6, -138786211229e-5, -1388328767787e-6, -1388795449826e-6, -1389262158392e-6, -1389728893473e-6, -1390195655055e-6, -1390662443125e-6, -1391129257671e-6, -1391596098678e-6, -1392062966133e-6, -1392529860023e-6, -1392996780334e-6, -1393463727053e-6, -1393930700166e-6, -1394397699658e-6, -1394864725517e-6, -1395331777728e-6, -1395798856278e-6, -1396265961152e-6, -1396733092337e-6, -1397200249817e-6, -139766743358e-5, -1398134643611e-6, -1398601879895e-6, -1399069142418e-6, -1399536431165e-6, -1400003746123e-6, -1400471087276e-6, -140093845461e-5, -140140584811e-5, -1401873267761e-6, -1402340713549e-6, -1402808185459e-6, -1403275683474e-6, -1403743207582e-6, -1404210757766e-6, -1404678334011e-6, -1405145936302e-6, -1405613564623e-6, -1406081218961e-6, -1406548899297e-6, -1407016605619e-6, -1407484337909e-6, -1407952096152e-6, -1408419880333e-6, -1408887690436e-6, -1409355526445e-6, -1409823388343e-6, -1410291276116e-6, -1410759189747e-6, -141122712922e-5, -1411695094518e-6, -1412163085627e-6, -1412631102528e-6, -1413099145207e-6, -1413567213647e-6, -141403530783e-5, -1414503427741e-6, -1414971573364e-6, -141543974468e-5, -1415907941675e-6, -141637616433e-5, -1416844412629e-6, -1417312686555e-6, -1417780986091e-6, -1418249311221e-6, -1418717661926e-6, -141918603819e-5, -1419654439996e-6, -1420122867325e-6, -1420591320162e-6, -1421059798488e-6, -1421528302285e-6, -1421996831537e-6, -1422465386226e-6, -1422933966334e-6, -1423402571843e-6, -1423871202735e-6, -1424339858993e-6, -1424808540598e-6, -1425277247533e-6, -1425745979779e-6, -1426214737318e-6, -1426683520133e-6, -1427152328204e-6, -1427621161514e-6, -1428090020043e-6, -1428558903774e-6, -1429027812689e-6, -1429496746767e-6, -1429965705991e-6, -1430434690342e-6, -1430903699802e-6, -143137273435e-5, -143184179397e-5, -143231087864e-5, -1432779988343e-6, -1433249123059e-6, -1433718282769e-6, -1434187467453e-6, -1434656677093e-6, -1435125911669e-6, -1435595171162e-6, -1436064455552e-6, -1436533764819e-6, -1437003098944e-6, -1437472457908e-6, -1437941841689e-6, -143841125027e-5, -1438880683628e-6, -1439350141746e-6, -1439819624602e-6, -1440289132177e-6, -144075866445e-5, -1441228221401e-6, -144169780301e-5, -1442167409256e-6, -144263704012e-5, -144310669558e-5, -1443576375616e-6, -1444046080207e-6, -1444515809333e-6, -1444985562973e-6, -1445455341107e-6, -1445925143712e-6, -1446394970769e-6, -1446864822256e-6, -1447334698152e-6, -1447804598437e-6, -1448274523088e-6, -1448744472085e-6, -1449214445406e-6, -1449684443031e-6, -1450154464936e-6, -1450624511102e-6, -1451094581505e-6, -1451564676126e-6, -1452034794941e-6, -145250493793e-5, -1452975105069e-6, -1453445296338e-6, -1453915511715e-6, -1454385751176e-6, -1454856014701e-6, -1455326302267e-6, -1455796613852e-6, -1456266949433e-6, -1456737308988e-6, -1457207692495e-6, -1457678099931e-6, -1458148531273e-6, -14586189865e-4, -1459089465587e-6, -1459559968513e-6, -1460030495255e-6, -1460501045789e-6, -1460971620094e-6, -1461442218144e-6, -1461912839919e-6, -1462383485394e-6, -1462854154546e-6, -1463324847352e-6, -1463795563789e-6, -1464266303832e-6, -146473706746e-5, -1465207854647e-6, -1465678665372e-6, -1466149499609e-6, -1466620357335e-6, -1467091238526e-6, -1467562143159e-6, -1468033071209e-6, -1468504022652e-6, -1468974997465e-6, -1469445995623e-6, -1469917017102e-6, -1470388061878e-6, -1470859129926e-6, -1471330221223e-6, -1471801335743e-6, -1472272473461e-6, -1472743634355e-6, -1473214818398e-6, -1473686025566e-6, -1474157255834e-6, -1474628509177e-6, -1475099785571e-6, -1475571084991e-6, -147604240741e-5, -1476513752805e-6, -1476985121151e-6, -1477456512421e-6, -147792792659e-5, -1478399363634e-6, -1478870823526e-6, -1479342306241e-6, -1479813811754e-6, -1480285340039e-6, -1480756891071e-6, -1481228464822e-6, -1481700061268e-6, -1482171680383e-6, -1482643322141e-6, -1483114986515e-6, -148358667348e-5, -148405838301e-5, -1484530115077e-6, -1485001869657e-6, -1485473646722e-6, -1485945446246e-6, -1486417268202e-6, -1486889112565e-6, -1487360979307e-6, -1487832868402e-6, -1488304779822e-6, -1488776713542e-6, -1489248669534e-6, -1489720647772e-6, -1490192648227e-6, -1490664670874e-6, -1491136715685e-6, -1491608782632e-6, -149208087169e-5, -1492552982829e-6, -1493025116023e-6, -1493497271244e-6, -1493969448465e-6, -1494441647659e-6, -1494913868796e-6, -1495386111851e-6, -1495858376794e-6, -1496330663598e-6, -1496802972235e-6, -1497275302678e-6, -1497747654897e-6, -1498220028866e-6, -1498692424555e-6, -1499164841936e-6, -1499637280982e-6, -1500109741663e-6, -1500582223952e-6, -1501054727819e-6, -1501527253236e-6, -1501999800175e-6, -1502472368607e-6, -1502944958502e-6, -1503417569833e-6, -1503890202569e-6, -1504362856683e-6, -1504835532145e-6, -1505308228927e-6, -1505780946998e-6, -1506253686329e-6, -1506726446892e-6, -1507199228657e-6, -1507672031594e-6, -1508144855674e-6, -1508617700868e-6, -1509090567146e-6, -1509563454477e-6, -1510036362833e-6, -1510509292183e-6, -1510982242498e-6, -1511455213747e-6, -1511928205901e-6, -1512401218929e-6, -1512874252802e-6, -1513347307489e-6, -151382038296e-5, -1514293479184e-6, -1514766596131e-6, -1515239733771e-6, -1515712892072e-6, -1516186071005e-6, -1516659270539e-6, -1517132490643e-6, -1517605731285e-6, -1518078992437e-6, -1518552274065e-6, -151902557614e-5, -151949889863e-5, -1519972241504e-6, -1520445604731e-6, -152091898828e-5, -1521392392119e-6, -1521865816217e-6, -1522339260543e-6, -1522812725064e-6, -152328620975e-5, -1523759714569e-6, -1524233239488e-6, -1524706784477e-6, -1525180349504e-6, -1525653934535e-6, -152612753954e-5, -1526601164487e-6, -1527074809343e-6, -1527548474076e-6, -1528022158655e-6, -1528495863045e-6, -1528969587217e-6, -1529443331136e-6, -152991709477e-5, -1530390878087e-6, -1530864681055e-6, -1531338503639e-6, -1531812345809e-6, -1532286207531e-6, -1532760088772e-6, -1533233989499e-6, -1533707909679e-6, -1534181849279e-6, -1534655808266e-6, -1535129786607e-6, -1535603784268e-6, -1536077801217e-6, -1536551837419e-6, -1537025892842e-6, -1537499967451e-6, -1537974061214e-6, -1538448174096e-6, -1538922306064e-6, -1539396457085e-6, -1539870627123e-6, -1540344816146e-6, -154081902412e-5, -154129325101e-5, -1541767496782e-6, -1542241761403e-6, -1542716044837e-6, -1543190347051e-6, -1543664668011e-6, -1544139007681e-6, -1544613366028e-6, -1545087743017e-6, -1545562138613e-6, -1546036552782e-6, -1546510985489e-6, -15469854367e-4, -1547459906378e-6, -154793439449e-5, -1548408901001e-6, -1548883425875e-6, -1549357969078e-6, -1549832530574e-6, -1550307110328e-6, -1550781708304e-6, -1551256324468e-6, -1551730958784e-6, -1552205611217e-6, -155268028173e-5, -1553154970289e-6, -1553629676858e-6, -1554104401401e-6, -1554579143882e-6, -1555053904266e-6, -1555528682516e-6, -1556003478597e-6, -1556478292472e-6, -1556953124106e-6, -1557427973462e-6, -1557902840504e-6, -1558377725197e-6, -1558852627502e-6, -1559327547385e-6, -1559802484809e-6, -1560277439737e-6, -1560752412132e-6, -1561227401959e-6, -1561702409179e-6, -1562177433758e-6, -1562652475657e-6, -156312753484e-5, -156360261127e-5, -156407770491e-5, -1564552815722e-6, -1565027943671e-6, -1565503088718e-6, -1565978250826e-6, -1566453429959e-6, -1566928626078e-6, -1567403839146e-6, -1567879069127e-6, -1568354315981e-6, -1568829579673e-6, -1569304860163e-6, -1569780157415e-6, -157025547139e-5, -1570730802051e-6, -157120614936e-5, -1571681513278e-6, -1572156893769e-6, -1572632290793e-6, -1573107704313e-6, -1573583134291e-6, -1574058580688e-6, -1574534043466e-6, -1575009522586e-6, -1575485018011e-6, -1575960529701e-6, -1576436057619e-6, -1576911601725e-6, -1577387161981e-6, -1577862738349e-6, -1578338330789e-6, -1578813939263e-6, -1579289563731e-6, -1579765204155e-6, -1580240860497e-6, -1580716532716e-6, -1581192220774e-6, -1581667924631e-6, -1582143644249e-6, -1582619379588e-6, -1583095130608e-6, -1583570897272e-6, -1584046679538e-6, -1584522477367e-6, -158499829072e-5, -1585474119558e-6, -158594996384e-5, -1586425823527e-6, -158690169858e-5, -1587377588957e-6, -158785349462e-5, -1588329415529e-6, -1588805351643e-6, -1589281302922e-6, -1589757269327e-6, -1590233250817e-6, -1590709247352e-6, -1591185258891e-6, -1591661285395e-6, -1592137326823e-6, -1592613383135e-6, -159308945429e-5, -1593565540247e-6, -1594041640966e-6, -1594517756407e-6, -1594993886528e-6, -1595470031289e-6, -1595946190649e-6, -1596422364568e-6, -1596898553004e-6, -1597374755916e-6, -1597850973264e-6, -1598327205006e-6, -1598803451101e-6, -1599279711508e-6, -1599755986186e-6, -1600232275094e-6, -160070857819e-5, -1601184895433e-6, -1601661226782e-6, -1602137572194e-6, -1602613931629e-6, -1603090305045e-6, -16035666924e-4, -1604043093653e-6, -1604519508761e-6, -1604995937684e-6, -160547238038e-5, -1605948836805e-6, -160642530692e-5, -160690179068e-5, -1607378288046e-6, -1607854798974e-6, -1608331323422e-6, -1608807861349e-6, -1609284412711e-6, -1609760977468e-6, -1610237555576e-6, -1610714146993e-6, -1611190751677e-6, -1611667369585e-6, -1612144000675e-6, -1612620644904e-6, -161309730223e-5, -161357397261e-5, -1614050656001e-6, -1614527352361e-6, -1615004061647e-6, -1615480783816e-6, -1615957518825e-6, -1616434266631e-6, -1616911027192e-6, -1617387800464e-6, -1617864586404e-6, -161834138497e-5, -1618818196118e-6, -1619295019805e-6, -1619771855987e-6, -1620248704622e-6, -1620725565666e-6, -1621202439076e-6, -1621679324808e-6, -162215622282e-5, -1622633133067e-6, -1623110055506e-6, -1623586990093e-6, -1624063936785e-6, -1624540895538e-6, -1625017866309e-6, -1625494849054e-6, -1625971843729e-6, -162644885029e-5, -1626925868693e-6, -1627402898895e-6, -1627879940852e-6, -1628356994519e-6, -1628834059852e-6, -1629311136809e-6, -1629788225343e-6, -1630265325412e-6, -1630742436972e-6, -1631219559977e-6, -1631696694384e-6, -1632173840148e-6, -1632650997226e-6, -1633128165572e-6, -1633605345143e-6, -1634082535893e-6, -1634559737779e-6, -1635036950757e-6, -163551417478e-5, -1635991409806e-6, -1636468655789e-6, -1636945912684e-6, -1637423180448e-6, -1637900459034e-6, -16383777484e-4, -1638855048499e-6, -1639332359286e-6, -1639809680718e-6, -1640287012749e-6, -1640764355334e-6, -1641241708429e-6, -1641719071988e-6, -1642196445966e-6, -1642673830318e-6, -1643151225e-3, -1643628629965e-6, -1644106045169e-6, -1644583470567e-6, -1645060906114e-6, -1645538351763e-6, -1646015807471e-6, -1646493273191e-6, -1646970748879e-6, -1647448234489e-6, -1647925729975e-6, -1648403235292e-6, -1648880750395e-6, -1649358275238e-6, -1649835809776e-6, -1650313353963e-6, -1650790907754e-6, -1651268471103e-6, -1651746043964e-6, -1652223626291e-6, -165270121804e-5, -1653178819164e-6, -1653656429618e-6, -1654134049356e-6, -1654611678332e-6, -16550893165e-4, -1655566963815e-6, -165604462023e-5, -16565222857e-4, -1656999960179e-6, -165747764362e-5, -1657955335979e-6, -1658433037209e-6, -1658910747263e-6, -1659388466097e-6, -1659866193664e-6, -1660343929917e-6, -1660821674811e-6, -16612994283e-4, -1661777190337e-6, -1662254960877e-6, -1662732739873e-6, -1663210527279e-6, -1663688323049e-6, -1664166127137e-6, -1664643939496e-6, -166512176008e-5, -1665599588842e-6, -1666077425738e-6, -1666555270719e-6, -166703312374e-5, -1667510984755e-6, -1667988853717e-6, -1668466730579e-6, -1668944615296e-6, -166942250782e-5, -1669900408106e-6, -1670378316107e-6, -1670856231777e-6, -1671334155068e-6, -1671812085935e-6, -1672290024331e-6, -1672767970209e-6, -1673245923524e-6, -1673723884227e-6, -1674201852274e-6, -1674679827616e-6, -1675157810208e-6, -1675635800004e-6, -1676113796955e-6, -1676591801016e-6, -1677069812141e-6, -1677547830282e-6, -1678025855392e-6, -1678503887426e-6, -1678981926336e-6, -1679459972076e-6, -1679938024599e-6, -1680416083858e-6, -1680894149807e-6, -1681372222399e-6, -1681850301587e-6, -1682328387324e-6, -1682806479564e-6, -168328457826e-5, -1683762683365e-6, -1684240794833e-6, -1684718912616e-6, -1685197036668e-6, -1685675166942e-6, -1686153303391e-6, -1686631445969e-6, -1687109594628e-6, -1687587749323e-6, -1688065910005e-6, -1688544076629e-6, -1689022249147e-6, -1689500427513e-6, -1689978611679e-6, -16904568016e-4, -1690934997228e-6, -1691413198516e-6, -1691891405418e-6, -1692369617887e-6, -1692847835876e-6, -1693326059338e-6, -1693804288226e-6, -1694282522494e-6, -1694760762094e-6, -1695239006981e-6, -1695717257106e-6, -1696195512424e-6, -1696673772887e-6, -1697152038449e-6, -1697630309064e-6, -1698108584683e-6, -169858686526e-5, -1699065150749e-6, -1699543441103e-6, -1700021736275e-6, -1700500036219e-6, -1700978340886e-6, -1701456650232e-6, -1701934964209e-6, -170241328277e-5, -1702891605868e-6, -1703369933458e-6, -1703848265491e-6, -1704326601923e-6, -1704804942704e-6, -170528328779e-5, -1705761637134e-6, -1706239990688e-6, -1706718348406e-6, -1707196710242e-6, -1707675076149e-6, -170815344608e-5, -1708631819988e-6, -1709110197828e-6, -1709588579552e-6, -1710066965114e-6, -1710545354468e-6, -1711023747566e-6, -1711502144363e-6, -1711980544811e-6, -1712458948865e-6, -1712937356477e-6, -1713415767602e-6, -1713894182193e-6, -1714372600203e-6, -1714851021587e-6, -1715329446297e-6, -1715807874288e-6, -1716286305512e-6, -1716764739924e-6, -1717243177478e-6, -1717721618126e-6, -1718200061823e-6, -1718678508523e-6, -1719156958179e-6, -1719635410745e-6, -1720113866175e-6, -1720592324422e-6, -1721070785441e-6, -1721549249185e-6, -1722027715609e-6, -1722506184666e-6, -1722984656309e-6, -1723463130494e-6, -1723941607174e-6, -1724420086303e-6, -1724898567834e-6, -1725377051723e-6, -1725855537924e-6, -1726334026389e-6, -1726812517074e-6, -1727291009932e-6, -1727769504919e-6, -1728248001987e-6, -1728726501091e-6, -1729205002186e-6, -1729683505226e-6, -1730162010165e-6, -1730640516957e-6, -1731119025557e-6, -1731597535919e-6, -1732076047999e-6, -1732554561749e-6, -1733033077125e-6, -1733511594081e-6, -1733990112572e-6, -1734468632552e-6, -1734947153976e-6, -1735425676799e-6, -1735904200975e-6, -1736382726459e-6, -1736861253206e-6, -1737339781171e-6, -1737818310308e-6, -1738296840572e-6, -1738775371919e-6, -1739253904303e-6, -1739732437679e-6, -1740210972002e-6, -1740689507227e-6, -1741168043309e-6, -1741646580204e-6, -1742125117866e-6, -1742603656251e-6, -1743082195314e-6, -174356073501e-5, -1744039275294e-6, -1744517816122e-6, -1744996357449e-6, -1745474899231e-6, -1745953441423e-6, -1746431983981e-6, -174691052686e-5, -1747389070015e-6, -1747867613403e-6, -1748346156978e-6, -1748824700697e-6, -1749303244516e-6, -174978178839e-5, -1750260332275e-6, -1750738876127e-6, -1751217419902e-6, -1751695963555e-6, -1752174507043e-6, -1752653050322e-6, -1753131593349e-6, -1753610136078e-6, -1754088678466e-6, -175456722047e-5, -1755045762046e-6, -175552430315e-5, -1756002843738e-6, -1756481383767e-6, -1756959923194e-6, -1757438461975e-6, -1757917000066e-6, -1758395537424e-6, -1758874074005e-6, -1759352609767e-6, -1759831144667e-6, -176030967866e-5, -1760788211704e-6, -1761266743756e-6, -1761745274772e-6, -1762223804711e-6, -1762702333528e-6, -176318086118e-5, -1763659387626e-6, -1764137912822e-6, -1764616436725e-6, -1765094959294e-6, -1765573480484e-6, -1766052000254e-6, -1766530518561e-6, -1767009035362e-6, -1767487550616e-6, -176796606428e-5, -176844457631e-5, -1768923086667e-6, -1769401595306e-6, -1769880102185e-6, -1770358607264e-6, -1770837110499e-6, -1771315611849e-6, -1771794111272e-6, -1772272608726e-6, -1772751104169e-6, -1773229597559e-6, -1773708088855e-6, -1774186578015e-6, -1774665064997e-6, -177514354976e-5, -1775622032263e-6, -1776100512463e-6, -177657899032e-5, -1777057465793e-6, -1777535938839e-6, -1778014409419e-6, -177849287749e-5, -1778971343012e-6, -1779449805944e-6, -1779928266244e-6, -1780406723873e-6, -1780885178788e-6, -178136363095e-5, -1781842080318e-6, -178232052685e-5, -1782798970507e-6, -1783277411248e-6, -1783755849033e-6, -178423428382e-5, -178471271557e-5, -1785191144243e-6, -1785669569798e-6, -1786147992195e-6, -1786626411394e-6, -1787104827355e-6, -1787583240039e-6, -1788061649404e-6, -1788540055412e-6, -1789018458023e-6, -1789496857196e-6, -1789975252893e-6, -1790453645074e-6, -1790932033698e-6, -1791410418728e-6, -1791888800123e-6, -1792367177844e-6, -1792845551852e-6, -1793323922108e-6, -1793802288572e-6, -1794280651206e-6, -1794759009971e-6, -1795237364827e-6, -1795715715736e-6, -1796194062659e-6, -1796672405558e-6, -1797150744393e-6, -1797629079126e-6, -1798107409719e-6, -1798585736133e-6, -179906405833e-5, -1799542376271e-6, -1800020689918e-6, -1800498999234e-6, -1800977304179e-6, -1801455604717e-6, -1801933900808e-6, -1802412192416e-6, -1802890479501e-6, -1803368762028e-6, -1803847039956e-6, -180432531325e-5, -1804803581872e-6, -1805281845784e-6, -1805760104948e-6, -1806238359328e-6, -1806716608886e-6, -1807194853585e-6, -1807673093387e-6, -1808151328256e-6, -1808629558154e-6, -1809107783046e-6, -1809586002893e-6, -1810064217659e-6, -1810542427308e-6, -1811020631802e-6, -1811498831105e-6, -1811977025181e-6, -1812455213993e-6, -1812933397505e-6, -181341157568e-5, -1813889748482e-6, -1814367915876e-6, -1814846077825e-6, -1815324234292e-6, -1815802385243e-6, -181628053064e-5, -181675867045e-5, -1817236804634e-6, -1817714933159e-6, -1818193055988e-6, -1818671173086e-6, -1819149284417e-6, -1819627389947e-6, -1820105489639e-6, -1820583583458e-6, -182106167137e-5, -182153975334e-5, -1822017829331e-6, -182249589931e-5, -1822973963241e-6, -1823452021089e-6, -1823930072821e-6, -18244081184e-4, -1824886157794e-6, -1825364190966e-6, -1825842217883e-6, -182632023851e-5, -1826798252814e-6, -1827276260759e-6, -1827754262311e-6, -1828232257437e-6, -1828710246102e-6, -1829188228273e-6, -1829666203916e-6, -1830144172996e-6, -183062213548e-5, -1831100091335e-6, -1831578040527e-6, -1832055983022e-6, -1832533918786e-6, -1833011847788e-6, -1833489769992e-6, -1833967685367e-6, -1834445593878e-6, -1834923495493e-6, -1835401390178e-6, -1835879277901e-6, -1836357158629e-6, -183683503233e-5, -1837312898969e-6, -1837790758515e-6, -1838268610935e-6, -1838746456196e-6, -1839224294267e-6, -1839702125114e-6, -1840179948706e-6, -184065776501e-5, -1841135573993e-6, -1841613375625e-6, -1842091169872e-6, -1842568956703e-6, -1843046736086e-6, -1843524507989e-6, -1844002272381e-6, -1844480029229e-6, -1844957778502e-6, -1845435520169e-6, -1845913254198e-6, -1846390980557e-6, -1846868699216e-6, -1847346410143e-6, -1847824113307e-6, -1848301808676e-6, -184877949622e-5, -1849257175908e-6, -1849734847709e-6, -1850212511591e-6, -1850690167525e-6, -1851167815479e-6, -1851645455422e-6, -1852123087325e-6, -1852600711157e-6, -1853078326886e-6, -1853555934484e-6, -1854033533919e-6, -1854511125161e-6, -1854988708181e-6, -1855466282947e-6, -1855943849431e-6, -1856421407601e-6, -1856898957428e-6, -1857376498883e-6, -1857854031935e-6, -1858331556555e-6, -1858809072713e-6, -185928658038e-5, -1859764079525e-6, -186024157012e-5, -1860719052136e-6, -1861196525542e-6, -1861673990309e-6, -186215144641e-5, -1862628893813e-6, -1863106332491e-6, -1863583762414e-6, -1864061183554e-6, -186453859588e-5, -1865015999366e-6, -1865493393982e-6, -1865970779698e-6, -1866448156488e-6, -1866925524321e-6, -186740288317e-5, -1867880233007e-6, -1868357573802e-6, -1868834905528e-6, -1869312228156e-6, -1869789541658e-6, -1870266846007e-6, -1870744141173e-6, -1871221427129e-6, -1871698703848e-6, -18721759713e-4, -1872653229459e-6, -1873130478297e-6, -1873607717786e-6, -1874084947898e-6, -1874562168606e-6, -1875039379882e-6, -1875516581699e-6, -1875993774029e-6, -1876470956846e-6, -1876948130121e-6, -1877425293828e-6, -187790244794e-5, -1878379592429e-6, -1878856727268e-6, -1879333852431e-6, -187981096789e-5, -1880288073619e-6, -188076516959e-5, -1881242255778e-6, -1881719332155e-6, -1882196398695e-6, -1882673455371e-6, -1883150502156e-6, -1883627539025e-6, -188410456595e-5, -1884581582906e-6, -1885058589866e-6, -1885535586803e-6, -1886012573693e-6, -1886489550507e-6, -1886966517222e-6, -1887443473809e-6, -1887920420244e-6, -18883973565e-4, -1888874282552e-6, -1889351198374e-6, -1889828103939e-6, -1890304999223e-6, -18907818842e-4, -1891258758843e-6, -1891735623128e-6, -1892212477028e-6, -1892689320519e-6, -1893166153575e-6, -1893642976171e-6, -1894119788281e-6, -189459658988e-5, -1895073380943e-6, -1895550161445e-6, -189602693136e-5, -1896503690664e-6, -1896980439331e-6, -1897457177337e-6, -1897933904656e-6, -1898410621264e-6, -1898887327136e-6, -1899364022247e-6, -1899840706573e-6, -1900317380088e-6, -1900794042768e-6, -1901270694588e-6, -1901747335525e-6, -1902223965552e-6, -1902700584647e-6, -1903177192784e-6, -1903653789939e-6, -1904130376088e-6, -1904606951207e-6, -1905083515271e-6, -1905560068255e-6, -1906036610137e-6, -1906513140892e-6, -1906989660495e-6, -1907466168923e-6, -1907942666152e-6, -1908419152157e-6, -1908895626915e-6, -1909372090403e-6, -1909848542595e-6, -1910324983469e-6, -1910801413001e-6, -1911277831166e-6, -1911754237942e-6, -1912230633304e-6, -191270701723e-5, -1913183389695e-6, -1913659750676e-6, -191413610015e-5, -1914612438092e-6, -1915088764481e-6, -1915565079292e-6, -1916041382502e-6, -1916517674088e-6, -1916993954026e-6, -1917470222294e-6, -1917946478868e-6, -1918422723725e-6, -1918898956842e-6, -1919375178196e-6, -1919851387763e-6, -1920327585522e-6, -1920803771448e-6, -1921279945519e-6, -1921756107713e-6, -1922232258005e-6, -1922708396374e-6, -1923184522797e-6, -192366063725e-5, -1924136739712e-6, -1924612830158e-6, -1925088908568e-6, -1925564974918e-6, -1926041029185e-6, -1926517071347e-6, -1926993101381e-6, -1927469119265e-6, -1927945124977e-6, -1928421118494e-6, -1928897099793e-6, -1929373068852e-6, -1929849025649e-6, -1930324970161e-6, -1930800902367e-6, -1931276822243e-6, -1931752729768e-6, -1932228624919e-6, -1932704507674e-6, -1933180378012e-6, -1933656235909e-6, -1934132081344e-6, -1934607914294e-6, -1935083734738e-6, -1935559542654e-6, -1936035338019e-6, -1936511120812e-6, -193698689101e-5, -1937462648592e-6, -1937938393536e-6, -193841412582e-5, -1938889845421e-6, -1939365552319e-6, -1939841246491e-6, -1940316927915e-6, -1940792596571e-6, -1941268252435e-6, -1941743895487e-6, -1942219525704e-6, -1942695143065e-6, -1943170747548e-6, -1943646339132e-6, -1944121917795e-6, -1944597483516e-6, -1945073036272e-6, -1945548576042e-6, -1946024102805e-6, -194649961654e-5, -1946975117224e-6, -1947450604836e-6, -1947926079355e-6, -1948401540759e-6, -1948876989028e-6, -1949352424139e-6, -1949827846071e-6, -1950303254802e-6, -1950778650313e-6, -195125403258e-5, -1951729401583e-6, -1952204757301e-6, -1952680099712e-6, -1953155428794e-6, -1953630744528e-6, -1954106046891e-6, -1954581335862e-6, -1955056611421e-6, -1955531873545e-6, -1956007122214e-6, -1956482357406e-6, -1956957579102e-6, -1957432787278e-6, -1957907981915e-6, -195838316299e-5, -1958858330484e-6, -1959333484375e-6, -1959808624642e-6, -1960283751263e-6, -1960758864219e-6, -1961233963488e-6, -1961709049048e-6, -1962184120879e-6, -196265917896e-5, -1963134223271e-6, -1963609253789e-6, -1964084270494e-6, -1964559273366e-6, -1965034262382e-6, -1965509237524e-6, -1965984198768e-6, -1966459146095e-6, -1966934079484e-6, -1967408998914e-6, -1967883904364e-6, -1968358795813e-6, -1968833673241e-6, -1969308536626e-6, -1969783385947e-6, -1970258221185e-6, -1970733042318e-6, -1971207849326e-6, -1971682642187e-6, -197215742088e-5, -1972632185387e-6, -1973106935684e-6, -1973581671752e-6, -197405639357e-5, -1974531101117e-6, -1975005794373e-6, -1975480473317e-6, -1975955137928e-6, -1976429788185e-6, -1976904424068e-6, -1977379045556e-6, -1977853652629e-6, -1978328245265e-6, -1978802823445e-6, -1979277387147e-6, -1979751936351e-6, -1980226471037e-6, -1980700991183e-6, -1981175496769e-6, -1981649987774e-6, -1982124464178e-6, -1982598925961e-6, -1983073373101e-6, -1983547805578e-6, -1984022223372e-6, -1984496626462e-6, -1984971014827e-6, -1985445388447e-6, -1985919747301e-6, -1986394091369e-6, -198686842063e-5, -1987342735063e-6, -1987817034649e-6, -1988291319367e-6, -1988765589195e-6, -1989239844114e-6, -1989714084103e-6, -1990188309141e-6, -1990662519208e-6, -1991136714284e-6, -1991610894348e-6, -199208505938e-5, -1992559209358e-6, -1993033344263e-6, -1993507464074e-6, -1993981568771e-6, -1994455658332e-6, -1994929732739e-6, -1995403791969e-6, -1995877836003e-6, -1996351864821e-6, -1996825878401e-6, -1997299876724e-6, -1997773859768e-6, -1998247827514e-6, -1998721779941e-6, -1999195717029e-6, -1999669638757e-6, -2000143545104e-6, -2000617436051e-6, -2001091311576e-6, -200156517166e-5, -2002039016283e-6, -2002512845422e-6, -2002986659059e-6, -2003460457173e-6, -2003934239743e-6, -2004408006749e-6, -2004881758171e-6, -2005355493987e-6, -2005829214179e-6, -2006302918725e-6, -2006776607605e-6, -2007250280799e-6, -2007723938285e-6, -2008197580045e-6, -2008671206057e-6, -2009144816302e-6, -2009618410758e-6, -2010091989405e-6, -2010565552223e-6, -2011039099193e-6, -2011512630292e-6, -2011986145501e-6, -20124596448e-4, -2012933128168e-6, -2013406595585e-6, -201388004703e-5, -2014353482484e-6, -2014826901925e-6, -2015300305334e-6, -201577369269e-5, -2016247063973e-6, -2016720419162e-6, -2017193758238e-6, -2017667081179e-6, -2018140387966e-6, -2018613678578e-6, -2019086952842e-6];

// node_modules/naelos-ephemeris/dist/frames.js
var AS2R = Math.PI / 648e3;
var TURNAS = 1296e3;
var J2000 = 2451545;
var U_AS_TENTH = 1e-7 * AS2R;
function poly(c, t) {
  let v = 0;
  for (let i = c.length - 1; i >= 0; i--)
    v = v * t + c[i];
  return v;
}
var centuries = (jdTT) => (jdTT - J2000) / 36525;
function delaunay(t) {
  return DELAUNAY.map((c) => poly(c, t) % TURNAS * AS2R);
}
function nutation(jdTT) {
  const t = centuries(jdTT);
  const fa = delaunay(t);
  let dpsi = 0, deps = 0;
  for (let i = 0; i < NUT_TERMS.length; i += 11) {
    const arg = NUT_TERMS[i] * fa[0] + NUT_TERMS[i + 1] * fa[1] + NUT_TERMS[i + 2] * fa[2] + NUT_TERMS[i + 3] * fa[3] + NUT_TERMS[i + 4] * fa[4];
    const s = Math.sin(arg), c = Math.cos(arg);
    dpsi += (NUT_TERMS[i + 5] + NUT_TERMS[i + 6] * t) * s + NUT_TERMS[i + 7] * c;
    deps += (NUT_TERMS[i + 8] + NUT_TERMS[i + 9] * t) * c + NUT_TERMS[i + 10] * s;
  }
  return { dpsi: (dpsi + NUT_OFFSET_PSI) * U_AS_TENTH, deps: (deps + NUT_OFFSET_EPS) * U_AS_TENTH };
}
function rx(phi, r) {
  const s = Math.sin(phi), c = Math.cos(phi);
  return [
    r[0],
    r[1],
    r[2],
    c * r[3] + s * r[6],
    c * r[4] + s * r[7],
    c * r[5] + s * r[8],
    -s * r[3] + c * r[6],
    -s * r[4] + c * r[7],
    -s * r[5] + c * r[8]
  ];
}
function rz(psi, r) {
  const s = Math.sin(psi), c = Math.cos(psi);
  return [
    c * r[0] + s * r[3],
    c * r[1] + s * r[4],
    c * r[2] + s * r[5],
    -s * r[0] + c * r[3],
    -s * r[1] + c * r[4],
    -s * r[2] + c * r[5],
    r[6],
    r[7],
    r[8]
  ];
}
function iauWeight(jdTT) {
  const outside = jdTT < SPAN_START ? SPAN_START - jdTT : jdTT > SPAN_END ? jdTT - SPAN_END : 0;
  return Math.max(0, 1 - outside / (BLEND_YEARS * 365.25));
}
function frameOfDate(jdTT) {
  const w = iauWeight(jdTT);
  if (w === 1)
    return frameIAU2006(jdTT);
  const long = frameLongTerm(jdTT);
  if (w === 0)
    return long;
  const iau = frameIAU2006(jdTT);
  const d = mul(long.npb, transpose(iau.npb));
  const u = 1 - w;
  const ax = u * (d[5] - d[7]) / 2, ay = u * (d[6] - d[2]) / 2, az = u * (d[1] - d[3]) / 2;
  const turn = [1, az, -ay, -az, 1, ax, ay, -ax, 1];
  const epsA = w * iau.epsA + u * long.epsA;
  return { npb: mul(turn, iau.npb), eps: epsA + iau.deps, dpsi: iau.dpsi, deps: iau.deps, epsA };
}
function mul(a, b) {
  const r = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      r[3 * i + j] = a[3 * i] * b[j] + a[3 * i + 1] * b[3 + j] + a[3 * i + 2] * b[6 + j];
    }
  return r;
}
var transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
function ltpPole(poly2, per, t) {
  let a = 0, b = 0;
  const w = 2 * Math.PI * t;
  for (const [period, ca, cb, sa, sb] of per) {
    const s = Math.sin(w / period), c = Math.cos(w / period);
    a += c * ca + s * sa;
    b += c * cb + s * sb;
  }
  let tk = 1;
  for (let k = 0; k < 4; k++) {
    a += poly2[0][k] * tk;
    b += poly2[1][k] * tk;
    tk *= t;
  }
  return [a * AS2R, b * AS2R];
}
function longTermPrecession(jdTT) {
  const t = (jdTT - J2000) / 36525;
  const [p, q] = ltpPole(LTP_ECL_POLY, LTP_ECL_PER, t);
  const w = Math.sqrt(Math.max(0, 1 - p * p - q * q));
  const s0 = Math.sin(LTP_EPS0 * AS2R), c0 = Math.cos(LTP_EPS0 * AS2R);
  const pecl = [p, -q * c0 - w * s0, -q * s0 + w * c0];
  const [x, y] = ltpPole(LTP_EQU_POLY, LTP_EQU_PER, t);
  const peq = [x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))];
  let ex = peq[1] * pecl[2] - peq[2] * pecl[1], ey = peq[2] * pecl[0] - peq[0] * pecl[2], ez = peq[0] * pecl[1] - peq[1] * pecl[0];
  const n = Math.hypot(ex, ey, ez);
  ex /= n;
  ey /= n;
  ez /= n;
  const mid = [peq[1] * ez - peq[2] * ey, peq[2] * ex - peq[0] * ez, peq[0] * ey - peq[1] * ex];
  const rows = [[ex, ey, ez], mid, peq];
  const [dx, de, dr] = LTP_BIAS.map((v) => v * AS2R);
  const pb = rows.flatMap((r) => [r[0] - r[1] * dr + r[2] * dx, r[0] * dr + r[1] + r[2] * de, -r[0] * dx - r[1] * de + r[2]]);
  const cosEps = peq[0] * pecl[0] + peq[1] * pecl[1] + peq[2] * pecl[2];
  return { pb, epsA: Math.acos(Math.min(1, cosEps)) };
}
function frameLongTerm(jdTT) {
  const { pb, epsA } = longTermPrecession(jdTT);
  const { dpsi, deps } = nutation(jdTT);
  let n = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  n = rx(epsA, n);
  n = rz(-dpsi, n);
  n = rx(-(epsA + deps), n);
  return { npb: mul(n, pb), eps: epsA + deps, dpsi, deps, epsA };
}
function meanEquationOfOrigins(jdTT) {
  const epoch = 2e3 + (jdTT - J2000) / 365.25;
  const last = EO_MEAN.length - 1;
  const x = (epoch - EO_FROM_EPOCH) / EO_STEP_YEARS;
  let i = Math.floor(x);
  if (i < 1)
    i = 1;
  else if (i > last - 2)
    i = last - 2;
  const u = x - i;
  const p0 = EO_MEAN[i - 1], p1 = EO_MEAN[i], p2 = EO_MEAN[i + 1], p3 = EO_MEAN[i + 2];
  const m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2;
  const u2 = u * u, u3 = u2 * u;
  return ((2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2) * AS2R;
}
function frameIAU2006(jdTT) {
  const t = centuries(jdTT);
  const gamb = poly(FW_GAMB, t) * AS2R;
  const phib = poly(FW_PHIB, t) * AS2R;
  const psib = poly(FW_PSIB, t) * AS2R;
  const epsA = poly(OBL06, t) * AS2R;
  const { dpsi, deps } = nutation(jdTT);
  let r = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  r = rz(gamb, r);
  r = rx(phib, r);
  r = rz(-(psib + dpsi), r);
  r = rx(-(epsA + deps), r);
  return { npb: r, eps: epsA + deps, dpsi, deps, epsA };
}
function apply(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
  ];
}
function toEcliptic(v, eps) {
  const s = Math.sin(eps), c = Math.cos(eps);
  return [v[0], c * v[1] + s * v[2], -s * v[1] + c * v[2]];
}

// node_modules/naelos-ephemeris/dist/time.js
var GREGORIAN_CYCLE = { years: 400, days: 146097 };
var JULIAN_CYCLE = { years: 4, days: 1461 };
function meeus(year, month, day, hour, gregorian) {
  let y = year, m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  let b = 0;
  if (gregorian) {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5 + hour / 24;
}
function shifted(year, month, day, hour, gregorian) {
  const cycle = gregorian ? GREGORIAN_CYCLE : JULIAN_CYCLE;
  const n = year < -4e3 ? Math.ceil((-4e3 - year) / cycle.years) : 0;
  return meeus(year + n * cycle.years, month, day, hour, gregorian) - n * cycle.days;
}
function julday(year, month, day, hour = 0) {
  return shifted(year, month, day, hour, true);
}
function tdbMinusTT(jdTT) {
  const g = (357.53 + 0.98560028 * (jdTT - 2451545)) * Math.PI / 180;
  return (1657e-6 * Math.sin(g) + 14e-6 * Math.sin(2 * g)) / 86400;
}

// node_modules/naelos-ephemeris/dist/generated/files.js
var NEAR_SOURCE = "JPL DE440";
var FAR_SOURCE = "JPL DE441";
var FILES = [
  ["ne-m13200.bin", -30990455e-1, -30636165e-1, 1],
  ["ne-m13100.bin", -30636165e-1, -30270925e-1, 1],
  ["ne-m13000.bin", -30270925e-1, -29905685e-1, 1],
  ["ne-m12900.bin", -29905685e-1, -29540445e-1, 1],
  ["ne-m12800.bin", -29540445e-1, -29175195e-1, 1],
  ["ne-m12700.bin", -29175195e-1, -28809955e-1, 1],
  ["ne-m12600.bin", -28809955e-1, -28444715e-1, 1],
  ["ne-m12500.bin", -28444715e-1, -28079475e-1, 1],
  ["ne-m12400.bin", -28079475e-1, -27714225e-1, 1],
  ["ne-m12300.bin", -27714225e-1, -27348985e-1, 1],
  ["ne-m12200.bin", -27348985e-1, -26983745e-1, 1],
  ["ne-m12100.bin", -26983745e-1, -26618505e-1, 1],
  ["ne-m12000.bin", -26618505e-1, -26253255e-1, 1],
  ["ne-m11900.bin", -26253255e-1, -25888015e-1, 1],
  ["ne-m11800.bin", -25888015e-1, -25522775e-1, 1],
  ["ne-m11700.bin", -25522775e-1, -25157535e-1, 1],
  ["ne-m11600.bin", -25157535e-1, -24792285e-1, 1],
  ["ne-m11500.bin", -24792285e-1, -24427045e-1, 1],
  ["ne-m11400.bin", -24427045e-1, -24061805e-1, 1],
  ["ne-m11300.bin", -24061805e-1, -23696565e-1, 1],
  ["ne-m11200.bin", -23696565e-1, -23331315e-1, 1],
  ["ne-m11100.bin", -23331315e-1, -22966075e-1, 1],
  ["ne-m11000.bin", -22966075e-1, -22600835e-1, 1],
  ["ne-m10900.bin", -22600835e-1, -22235595e-1, 1],
  ["ne-m10800.bin", -22235595e-1, -21870345e-1, 1],
  ["ne-m10700.bin", -21870345e-1, -21505105e-1, 1],
  ["ne-m10600.bin", -21505105e-1, -21139865e-1, 1],
  ["ne-m10500.bin", -21139865e-1, -20774625e-1, 1],
  ["ne-m10400.bin", -20774625e-1, -20409375e-1, 1],
  ["ne-m10300.bin", -20409375e-1, -20044135e-1, 1],
  ["ne-m10200.bin", -20044135e-1, -19678895e-1, 1],
  ["ne-m10100.bin", -19678895e-1, -19313655e-1, 1],
  ["ne-m10000.bin", -19313655e-1, -18948405e-1, 1],
  ["ne-m9900.bin", -18948405e-1, -18583165e-1, 1],
  ["ne-m9800.bin", -18583165e-1, -18217925e-1, 1],
  ["ne-m9700.bin", -18217925e-1, -17852685e-1, 1],
  ["ne-m9600.bin", -17852685e-1, -17487435e-1, 1],
  ["ne-m9500.bin", -17487435e-1, -17122195e-1, 1],
  ["ne-m9400.bin", -17122195e-1, -16756955e-1, 1],
  ["ne-m9300.bin", -16756955e-1, -16391715e-1, 1],
  ["ne-m9200.bin", -16391715e-1, -16026465e-1, 1],
  ["ne-m9100.bin", -16026465e-1, -15661225e-1, 1],
  ["ne-m9000.bin", -15661225e-1, -15295985e-1, 1],
  ["ne-m8900.bin", -15295985e-1, -14930745e-1, 1],
  ["ne-m8800.bin", -14930745e-1, -14565495e-1, 1],
  ["ne-m8700.bin", -14565495e-1, -14200255e-1, 1],
  ["ne-m8600.bin", -14200255e-1, -13835015e-1, 1],
  ["ne-m8500.bin", -13835015e-1, -13469775e-1, 1],
  ["ne-m8400.bin", -13469775e-1, -13104525e-1, 1],
  ["ne-m8300.bin", -13104525e-1, -12739285e-1, 1],
  ["ne-m8200.bin", -12739285e-1, -12374045e-1, 1],
  ["ne-m8100.bin", -12374045e-1, -12008805e-1, 1],
  ["ne-m8000.bin", -12008805e-1, -11643555e-1, 1],
  ["ne-m7900.bin", -11643555e-1, -11278315e-1, 1],
  ["ne-m7800.bin", -11278315e-1, -10913075e-1, 1],
  ["ne-m7700.bin", -10913075e-1, -10547835e-1, 1],
  ["ne-m7600.bin", -10547835e-1, -10182585e-1, 1],
  ["ne-m7500.bin", -10182585e-1, -981734.5, 1],
  ["ne-m7400.bin", -981734.5, -945210.5, 1],
  ["ne-m7300.bin", -945210.5, -908686.5, 1],
  ["ne-m7200.bin", -908686.5, -872161.5, 1],
  ["ne-m7100.bin", -872161.5, -835637.5, 1],
  ["ne-m7000.bin", -835637.5, -799113.5, 1],
  ["ne-m6900.bin", -799113.5, -762589.5, 1],
  ["ne-m6800.bin", -762589.5, -726064.5, 1],
  ["ne-m6700.bin", -726064.5, -689540.5, 1],
  ["ne-m6600.bin", -689540.5, -653016.5, 1],
  ["ne-m6500.bin", -653016.5, -616492.5, 1],
  ["ne-m6400.bin", -616492.5, -579967.5, 1],
  ["ne-m6300.bin", -579967.5, -543443.5, 1],
  ["ne-m6200.bin", -543443.5, -506919.5, 1],
  ["ne-m6100.bin", -506919.5, -470395.5, 1],
  ["ne-m6000.bin", -470395.5, -433870.5, 1],
  ["ne-m5900.bin", -433870.5, -397346.5, 1],
  ["ne-m5800.bin", -397346.5, -360822.5, 1],
  ["ne-m5700.bin", -360822.5, -324298.5, 1],
  ["ne-m5600.bin", -324298.5, -287773.5, 1],
  ["ne-m5500.bin", -287773.5, -251249.5, 1],
  ["ne-m5400.bin", -251249.5, -214725.5, 1],
  ["ne-m5300.bin", -214725.5, -178201.5, 1],
  ["ne-m5200.bin", -178201.5, -141676.5, 1],
  ["ne-m5100.bin", -141676.5, -105152.5, 1],
  ["ne-m5000.bin", -105152.5, -68628.5, 1],
  ["ne-m4900.bin", -68628.5, -32104.5, 1],
  ["ne-m4800.bin", -32104.5, 4420.5, 1],
  ["ne-m4700.bin", 4420.5, 40944.5, 1],
  ["ne-m4600.bin", 40944.5, 77468.5, 1],
  ["ne-m4500.bin", 77468.5, 113992.5, 1],
  ["ne-m4400.bin", 113992.5, 150517.5, 1],
  ["ne-m4300.bin", 150517.5, 187041.5, 1],
  ["ne-m4200.bin", 187041.5, 223565.5, 1],
  ["ne-m4100.bin", 223565.5, 260089.5, 1],
  ["ne-m4000.bin", 260089.5, 296614.5, 1],
  ["ne-m3900.bin", 296614.5, 333138.5, 1],
  ["ne-m3800.bin", 333138.5, 369662.5, 1],
  ["ne-m3700.bin", 369662.5, 406186.5, 1],
  ["ne-m3600.bin", 406186.5, 442711.5, 1],
  ["ne-m3500.bin", 442711.5, 479235.5, 1],
  ["ne-m3400.bin", 479235.5, 515759.5, 1],
  ["ne-m3300.bin", 515759.5, 552283.5, 1],
  ["ne-m3200.bin", 552283.5, 588808.5, 1],
  ["ne-m3100.bin", 588808.5, 625332.5, 1],
  ["ne-m3000.bin", 625332.5, 661856.5, 1],
  ["ne-m2900.bin", 661856.5, 698380.5, 1],
  ["ne-m2800.bin", 698380.5, 734905.5, 1],
  ["ne-m2700.bin", 734905.5, 771429.5, 1],
  ["ne-m2600.bin", 771429.5, 807953.5, 1],
  ["ne-m2500.bin", 807953.5, 844477.5, 1],
  ["ne-m2400.bin", 844477.5, 881002.5, 1],
  ["ne-m2300.bin", 881002.5, 917526.5, 1],
  ["ne-m2200.bin", 917526.5, 954050.5, 1],
  ["ne-m2100.bin", 954050.5, 990574.5, 1],
  ["ne-m2000.bin", 990574.5, 10270995e-1, 1],
  ["ne-m1900.bin", 10270995e-1, 10636235e-1, 1],
  ["ne-m1800.bin", 10636235e-1, 11001475e-1, 1],
  ["ne-m1700.bin", 11001475e-1, 11366715e-1, 1],
  ["ne-m1600.bin", 11366715e-1, 11731965e-1, 1],
  ["ne-m1500.bin", 11731965e-1, 12097205e-1, 1],
  ["ne-m1400.bin", 12097205e-1, 12462445e-1, 1],
  ["ne-m1300.bin", 12462445e-1, 12827685e-1, 1],
  ["ne-m1200.bin", 12827685e-1, 13192935e-1, 1],
  ["ne-m1100.bin", 13192935e-1, 13558175e-1, 1],
  ["ne-m1000.bin", 13558175e-1, 13923415e-1, 1],
  ["ne-m0900.bin", 13923415e-1, 14288655e-1, 1],
  ["ne-m0800.bin", 14288655e-1, 14653905e-1, 1],
  ["ne-m0700.bin", 14653905e-1, 15019145e-1, 1],
  ["ne-m0600.bin", 15019145e-1, 15384385e-1, 1],
  ["ne-m0500.bin", 15384385e-1, 15749625e-1, 1],
  ["ne-m0400.bin", 15749625e-1, 16114875e-1, 1],
  ["ne-m0300.bin", 16114875e-1, 16480115e-1, 1],
  ["ne-m0200.bin", 16480115e-1, 16845355e-1, 1],
  ["ne-m0100.bin", 16845355e-1, 17210595e-1, 1],
  ["ne-0.bin", 17210595e-1, 17575845e-1, 1],
  ["ne-100.bin", 17575845e-1, 17941085e-1, 1],
  ["ne-200.bin", 17941085e-1, 18306325e-1, 1],
  ["ne-300.bin", 18306325e-1, 18671565e-1, 1],
  ["ne-400.bin", 18671565e-1, 19036815e-1, 1],
  ["ne-500.bin", 19036815e-1, 19402055e-1, 1],
  ["ne-600.bin", 19402055e-1, 19767295e-1, 1],
  ["ne-700.bin", 19767295e-1, 20132535e-1, 1],
  ["ne-800.bin", 20132535e-1, 20497785e-1, 1],
  ["ne-900.bin", 20497785e-1, 20863025e-1, 1],
  ["ne-1000.bin", 20863025e-1, 21228265e-1, 1],
  ["ne-1100.bin", 21228265e-1, 21593505e-1, 1],
  ["ne-1200.bin", 21593505e-1, 21958755e-1, 1],
  ["ne-1300.bin", 21958755e-1, 22323995e-1, 1],
  ["ne-1400.bin", 22323995e-1, 22689235e-1, 1],
  ["ne-1500.bin", 22689235e-1, 22871945e-1, 1],
  ["ne-1550.bin", 22871945e-1, 23054475e-1, 0],
  ["ne-1600.bin", 23054475e-1, 23419725e-1, 0],
  ["ne-1700.bin", 23419725e-1, 23784965e-1, 0],
  ["ne-1800.bin", 23784965e-1, 24150205e-1, 0],
  ["ne-1900.bin", 24150205e-1, 24515445e-1, 0],
  ["ne-2000.bin", 24515445e-1, 24880695e-1, 0],
  ["ne-2100.bin", 24880695e-1, 25245935e-1, 0],
  ["ne-2200.bin", 25245935e-1, 25611175e-1, 0],
  ["ne-2300.bin", 25611175e-1, 25976415e-1, 0],
  ["ne-2400.bin", 25976415e-1, 26341665e-1, 0],
  ["ne-2500.bin", 26341665e-1, 26706905e-1, 0],
  ["ne-2600.bin", 26706905e-1, 26886025e-1, 0],
  ["ne-2649.bin", 26886025e-1, 27072145e-1, 1],
  ["ne-2700.bin", 27072145e-1, 27437385e-1, 1],
  ["ne-2800.bin", 27437385e-1, 27802635e-1, 1],
  ["ne-2900.bin", 27802635e-1, 28167875e-1, 1],
  ["ne-3000.bin", 28167875e-1, 28533115e-1, 1],
  ["ne-3100.bin", 28533115e-1, 28898355e-1, 1],
  ["ne-3200.bin", 28898355e-1, 29263605e-1, 1],
  ["ne-3300.bin", 29263605e-1, 29628845e-1, 1],
  ["ne-3400.bin", 29628845e-1, 29994085e-1, 1],
  ["ne-3500.bin", 29994085e-1, 30359325e-1, 1],
  ["ne-3600.bin", 30359325e-1, 30724575e-1, 1],
  ["ne-3700.bin", 30724575e-1, 31089815e-1, 1],
  ["ne-3800.bin", 31089815e-1, 31455055e-1, 1],
  ["ne-3900.bin", 31455055e-1, 31820295e-1, 1],
  ["ne-4000.bin", 31820295e-1, 32185545e-1, 1],
  ["ne-4100.bin", 32185545e-1, 32550785e-1, 1],
  ["ne-4200.bin", 32550785e-1, 32916025e-1, 1],
  ["ne-4300.bin", 32916025e-1, 33281265e-1, 1],
  ["ne-4400.bin", 33281265e-1, 33646515e-1, 1],
  ["ne-4500.bin", 33646515e-1, 34011755e-1, 1],
  ["ne-4600.bin", 34011755e-1, 34376995e-1, 1],
  ["ne-4700.bin", 34376995e-1, 34742235e-1, 1],
  ["ne-4800.bin", 34742235e-1, 35107485e-1, 1],
  ["ne-4900.bin", 35107485e-1, 35472725e-1, 1],
  ["ne-5000.bin", 35472725e-1, 35837965e-1, 1],
  ["ne-5100.bin", 35837965e-1, 36203205e-1, 1],
  ["ne-5200.bin", 36203205e-1, 36568455e-1, 1],
  ["ne-5300.bin", 36568455e-1, 36933695e-1, 1],
  ["ne-5400.bin", 36933695e-1, 37298935e-1, 1],
  ["ne-5500.bin", 37298935e-1, 37664175e-1, 1],
  ["ne-5600.bin", 37664175e-1, 38029425e-1, 1],
  ["ne-5700.bin", 38029425e-1, 38394665e-1, 1],
  ["ne-5800.bin", 38394665e-1, 38759905e-1, 1],
  ["ne-5900.bin", 38759905e-1, 39125145e-1, 1],
  ["ne-6000.bin", 39125145e-1, 39490395e-1, 1],
  ["ne-6100.bin", 39490395e-1, 39855635e-1, 1],
  ["ne-6200.bin", 39855635e-1, 40220875e-1, 1],
  ["ne-6300.bin", 40220875e-1, 40586115e-1, 1],
  ["ne-6400.bin", 40586115e-1, 40951365e-1, 1],
  ["ne-6500.bin", 40951365e-1, 41316605e-1, 1],
  ["ne-6600.bin", 41316605e-1, 41681845e-1, 1],
  ["ne-6700.bin", 41681845e-1, 42047085e-1, 1],
  ["ne-6800.bin", 42047085e-1, 42412335e-1, 1],
  ["ne-6900.bin", 42412335e-1, 42777575e-1, 1],
  ["ne-7000.bin", 42777575e-1, 43142815e-1, 1],
  ["ne-7100.bin", 43142815e-1, 43508055e-1, 1],
  ["ne-7200.bin", 43508055e-1, 43873305e-1, 1],
  ["ne-7300.bin", 43873305e-1, 44238545e-1, 1],
  ["ne-7400.bin", 44238545e-1, 44603785e-1, 1],
  ["ne-7500.bin", 44603785e-1, 44969025e-1, 1],
  ["ne-7600.bin", 44969025e-1, 45334275e-1, 1],
  ["ne-7700.bin", 45334275e-1, 45699515e-1, 1],
  ["ne-7800.bin", 45699515e-1, 46064755e-1, 1],
  ["ne-7900.bin", 46064755e-1, 46429995e-1, 1],
  ["ne-8000.bin", 46429995e-1, 46795245e-1, 1],
  ["ne-8100.bin", 46795245e-1, 47160485e-1, 1],
  ["ne-8200.bin", 47160485e-1, 47525725e-1, 1],
  ["ne-8300.bin", 47525725e-1, 47890965e-1, 1],
  ["ne-8400.bin", 47890965e-1, 48256215e-1, 1],
  ["ne-8500.bin", 48256215e-1, 48621455e-1, 1],
  ["ne-8600.bin", 48621455e-1, 48986695e-1, 1],
  ["ne-8700.bin", 48986695e-1, 49351935e-1, 1],
  ["ne-8800.bin", 49351935e-1, 49717185e-1, 1],
  ["ne-8900.bin", 49717185e-1, 50082425e-1, 1],
  ["ne-9000.bin", 50082425e-1, 50447665e-1, 1],
  ["ne-9100.bin", 50447665e-1, 50812905e-1, 1],
  ["ne-9200.bin", 50812905e-1, 51178155e-1, 1],
  ["ne-9300.bin", 51178155e-1, 51543395e-1, 1],
  ["ne-9400.bin", 51543395e-1, 51908635e-1, 1],
  ["ne-9500.bin", 51908635e-1, 52273875e-1, 1],
  ["ne-9600.bin", 52273875e-1, 52639125e-1, 1],
  ["ne-9700.bin", 52639125e-1, 53004365e-1, 1],
  ["ne-9800.bin", 53004365e-1, 53369605e-1, 1],
  ["ne-9900.bin", 53369605e-1, 53734845e-1, 1],
  ["ne-10000.bin", 53734845e-1, 54100095e-1, 1],
  ["ne-10100.bin", 54100095e-1, 54465335e-1, 1],
  ["ne-10200.bin", 54465335e-1, 54830575e-1, 1],
  ["ne-10300.bin", 54830575e-1, 55195815e-1, 1],
  ["ne-10400.bin", 55195815e-1, 55561065e-1, 1],
  ["ne-10500.bin", 55561065e-1, 55926305e-1, 1],
  ["ne-10600.bin", 55926305e-1, 56291545e-1, 1],
  ["ne-10700.bin", 56291545e-1, 56656785e-1, 1],
  ["ne-10800.bin", 56656785e-1, 57022035e-1, 1],
  ["ne-10900.bin", 57022035e-1, 57387275e-1, 1],
  ["ne-11000.bin", 57387275e-1, 57752515e-1, 1],
  ["ne-11100.bin", 57752515e-1, 58117755e-1, 1],
  ["ne-11200.bin", 58117755e-1, 58483005e-1, 1],
  ["ne-11300.bin", 58483005e-1, 58848245e-1, 1],
  ["ne-11400.bin", 58848245e-1, 59213485e-1, 1],
  ["ne-11500.bin", 59213485e-1, 59578725e-1, 1],
  ["ne-11600.bin", 59578725e-1, 59943975e-1, 1],
  ["ne-11700.bin", 59943975e-1, 60309215e-1, 1],
  ["ne-11800.bin", 60309215e-1, 60674455e-1, 1],
  ["ne-11900.bin", 60674455e-1, 61039695e-1, 1],
  ["ne-12000.bin", 61039695e-1, 61404945e-1, 1],
  ["ne-12100.bin", 61404945e-1, 61770185e-1, 1],
  ["ne-12200.bin", 61770185e-1, 62135425e-1, 1],
  ["ne-12300.bin", 62135425e-1, 62500665e-1, 1],
  ["ne-12400.bin", 62500665e-1, 62865915e-1, 1],
  ["ne-12500.bin", 62865915e-1, 63231155e-1, 1],
  ["ne-12600.bin", 63231155e-1, 63596395e-1, 1],
  ["ne-12700.bin", 63596395e-1, 63961635e-1, 1],
  ["ne-12800.bin", 63961635e-1, 64326885e-1, 1],
  ["ne-12900.bin", 64326885e-1, 64692125e-1, 1],
  ["ne-13000.bin", 64692125e-1, 65057365e-1, 1],
  ["ne-13100.bin", 65057365e-1, 65422605e-1, 1],
  ["ne-13200.bin", 65422605e-1, 65787855e-1, 1],
  ["ne-13300.bin", 65787855e-1, 66153095e-1, 1],
  ["ne-13400.bin", 66153095e-1, 66518335e-1, 1],
  ["ne-13500.bin", 66518335e-1, 66883575e-1, 1],
  ["ne-13600.bin", 66883575e-1, 67248825e-1, 1],
  ["ne-13700.bin", 67248825e-1, 67614065e-1, 1],
  ["ne-13800.bin", 67614065e-1, 67979305e-1, 1],
  ["ne-13900.bin", 67979305e-1, 68344545e-1, 1],
  ["ne-14000.bin", 68344545e-1, 68709795e-1, 1],
  ["ne-14100.bin", 68709795e-1, 69075035e-1, 1],
  ["ne-14200.bin", 69075035e-1, 69440275e-1, 1],
  ["ne-14300.bin", 69440275e-1, 69805515e-1, 1],
  ["ne-14400.bin", 69805515e-1, 70170765e-1, 1],
  ["ne-14500.bin", 70170765e-1, 70536005e-1, 1],
  ["ne-14600.bin", 70536005e-1, 70901245e-1, 1],
  ["ne-14700.bin", 70901245e-1, 71266485e-1, 1],
  ["ne-14800.bin", 71266485e-1, 71631735e-1, 1],
  ["ne-14900.bin", 71631735e-1, 71996975e-1, 1],
  ["ne-15000.bin", 71996975e-1, 72362215e-1, 1],
  ["ne-15100.bin", 72362215e-1, 72727455e-1, 1],
  ["ne-15200.bin", 72727455e-1, 73092705e-1, 1],
  ["ne-15300.bin", 73092705e-1, 73457945e-1, 1],
  ["ne-15400.bin", 73457945e-1, 73823185e-1, 1],
  ["ne-15500.bin", 73823185e-1, 74188425e-1, 1],
  ["ne-15600.bin", 74188425e-1, 74553675e-1, 1],
  ["ne-15700.bin", 74553675e-1, 74918915e-1, 1],
  ["ne-15800.bin", 74918915e-1, 75284155e-1, 1],
  ["ne-15900.bin", 75284155e-1, 75649395e-1, 1],
  ["ne-16000.bin", 75649395e-1, 76014645e-1, 1],
  ["ne-16100.bin", 76014645e-1, 76379885e-1, 1],
  ["ne-16200.bin", 76379885e-1, 76745125e-1, 1],
  ["ne-16300.bin", 76745125e-1, 77110365e-1, 1],
  ["ne-16400.bin", 77110365e-1, 77475615e-1, 1],
  ["ne-16500.bin", 77475615e-1, 77840855e-1, 1],
  ["ne-16600.bin", 77840855e-1, 78206095e-1, 1],
  ["ne-16700.bin", 78206095e-1, 78571335e-1, 1],
  ["ne-16800.bin", 78571335e-1, 78936585e-1, 1],
  ["ne-16900.bin", 78936585e-1, 79301825e-1, 1],
  ["ne-17000.bin", 79301825e-1, 79667065e-1, 1],
  ["ne-17100.bin", 79667065e-1, 79990665e-1, 1]
];

// node_modules/naelos-ephemeris/dist/angles.js
function norm360(deg) {
  const r = deg % 360;
  if (r >= 0)
    return r + 0;
  const wrapped = r + 360;
  return wrapped === 360 ? 0 : wrapped;
}

// node_modules/naelos-ephemeris/dist/apparent.js
var C_KM_PER_DAY = 299792.458 * 86400;
var AU_KM = 1495978707e-1;
var EMRAT = 81.3005682214972;
var SRS_AU = 197412574336e-19;
var R_SUN_KM = 695700;
var MASS_R = [0, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1];
var MASS_F = [0, 0.07, 0.34, 0.5, 0.62, 0.8, 0.91, 0.96, 0.985, 0.996, 1];
function enclosedSolarMass(x) {
  if (x >= 1)
    return 1;
  let i = 1;
  while (MASS_R[i] < x)
    i++;
  const u = (x - MASS_R[i - 1]) / (MASS_R[i] - MASS_R[i - 1]);
  return MASS_F[i - 1] + u * (MASS_F[i] - MASS_F[i - 1]);
}
var SUN = 0;
var MOON = 1;
var EMB = 200;
var EARTH = 14;
var HELIOCENTRIC = 2;
var Tables = class {
  files = [];
  a = [0, 0, 0];
  b = [0, 0, 0];
  av = [0, 0, 0];
  bv = [0, 0, 0];
  constructor(files) {
    if (!files.length)
      throw new Error("no tables loaded");
    this.add(files);
  }
  /** Load more century files. One already loaded (the same start) is ignored. */
  add(files) {
    for (const f of files)
      if (!this.files.some((g) => g.start === f.start))
        this.files.push(f);
    this.files.sort((x, y) => x.start - y.start);
  }
  /** The TDB span from the first loaded file to the last (gaps between them are refused). */
  get start() {
    return this.files[0].start;
  }
  get end() {
    return this.files[this.files.length - 1].end;
  }
  /**
   * The file and series that answer for a body at a TDB moment: the file for
   * that moment's century, or — at the edge of what is loaded — any loaded
   * file whose copy of the series reaches it. Each file carries every segment
   * that overlaps its century, so its first and last reach a little past its
   * ends, which is what light-time needs in the first hours of a century.
   */
  find(id, t) {
    const home = this.files.find((f) => t >= f.start && (t < f.end || t === this.end));
    const own = home?.series.get(id);
    if (home && own && covers(own, t))
      return { file: home, series: own };
    for (const file of this.files) {
      const series = file.series.get(id);
      if (series && covers(series, t))
        return { file, series };
    }
    if (!home)
      throw new RangeError(`outside the loaded tables (TDB JD ${t})`);
    if (!own)
      throw new RangeError(`no series ${id} in the tables for TDB JD ${t}`);
    throw new RangeError(`series ${id} covers TDB JD ${own.t0} to ${own.t0 + own.segments * own.segmentDays}, not ${t}`);
  }
  raw(id, t, pos, vel) {
    const { series } = this.find(id, t);
    evaluate(series, t, pos, vel);
    return series.frame;
  }
  /** Which century file and segment serve a series at a TDB moment (for provenance). */
  locate(id, t) {
    try {
      const { file: f, series: s } = this.find(id, t);
      const index = Math.min(s.segments - 1, Math.max(0, Math.floor((t - s.t0) / s.segmentDays)));
      const entry = FILES.find(([, start]) => start === f.start);
      const file = entry ? entry[0] : `a table starting at TDB JD ${f.start}`;
      return { file, index, from: s.t0 + index * s.segmentDays, to: s.t0 + (index + 1) * s.segmentDays };
    } catch {
      return null;
    }
  }
  /** The Moon relative to the Earth: position (km) and velocity (km/day), geometric. */
  moonGeocentric(t, pos, vel) {
    this.raw(MOON, t, pos, vel);
  }
  /** Barycentric position (km) of a body; velocity (km/day) too if asked. */
  bary(body, t, pos, vel) {
    if (body !== MOON && body !== EARTH) {
      if (this.raw(body, t, pos, vel) === HELIOCENTRIC) {
        this.raw(SUN, t, this.a, vel ? this.av : void 0);
        for (let i = 0; i < 3; i++) {
          pos[i] += this.a[i];
          if (vel)
            vel[i] += this.av[i];
        }
      }
      return;
    }
    this.raw(EMB, t, this.a, vel ? this.av : void 0);
    this.raw(MOON, t, this.b, vel ? this.bv : void 0);
    const f = body === MOON ? EMRAT / (1 + EMRAT) : -1 / (1 + EMRAT);
    for (let i = 0; i < 3; i++) {
      pos[i] = this.a[i] + f * this.b[i];
      if (vel)
        vel[i] = this.av[i] + f * this.bv[i];
    }
  }
};
var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var len = (a) => Math.sqrt(dot(a, a));
function retarded(tables, body, t, from, out) {
  let tau = 0;
  for (let i = 0; i < 4; i++) {
    tables.bary(body, t - tau, out);
    const next = Math.hypot(out[0] - from[0], out[1] - from[1], out[2] - from[2]) / C_KM_PER_DAY;
    if (Math.abs(next - tau) < 1e-12) {
      tau = next;
      break;
    }
    tau = next;
  }
  tables.bary(body, t - tau, out);
  out[0] -= from[0];
  out[1] -= from[1];
  out[2] -= from[2];
  return tau;
}
function geocentric(tables, body, tdb, frame) {
  const E = [0, 0, 0], V = [0, 0, 0], S = [0, 0, 0], p = [0, 0, 0];
  tables.bary(EARTH, tdb, E, V);
  tables.bary(SUN, tdb, S);
  retarded(tables, body, tdb, E, p);
  const dist = len(p);
  let u = [p[0] / dist, p[1] / dist, p[2] / dist];
  if (body !== SUN) {
    const e = [E[0] - S[0], E[1] - S[1], E[2] - S[2]];
    const emag = len(e);
    const q = [E[0] + p[0] - S[0], E[1] + p[1] - S[1], E[2] + p[2] - S[2]];
    const qmag = len(q);
    const eh = [e[0] / emag, e[1] / emag, e[2] / emag];
    const qh = [q[0] / qmag, q[1] / qmag, q[2] / qmag];
    const edotp = dot(eh, u);
    if (Math.abs(edotp) < 0.99999999999) {
      let w = SRS_AU / (emag / AU_KM) / (1 + dot(qh, eh));
      const along = -dot(e, u);
      if (along > 0 && along < dist) {
        const b = Math.sqrt(Math.max(0, emag * emag - along * along));
        if (b < R_SUN_KM)
          w *= enclosedSolarMass(b / R_SUN_KM);
      }
      const pdotq = dot(u, qh);
      u = [
        u[0] + w * (pdotq * eh[0] - edotp * qh[0]),
        u[1] + w * (pdotq * eh[1] - edotp * qh[1]),
        u[2] + w * (pdotq * eh[2] - edotp * qh[2])
      ];
    }
  }
  const v = [V[0] / C_KM_PER_DAY, V[1] / C_KM_PER_DAY, V[2] / C_KM_PER_DAY];
  const beta2 = dot(v, v);
  const gi = Math.sqrt(1 - beta2);
  const pv = dot(u, v);
  const qf = 1 + pv / (1 + gi);
  const r = 1 + pv;
  const a = [(gi * u[0] + qf * v[0]) / r, (gi * u[1] + qf * v[1]) / r, (gi * u[2] + qf * v[2]) / r];
  const am = len(a);
  return { u: apply(frame.npb, [a[0] / am, a[1] / am, a[2] / am]), dist: dist / AU_KM };
}
function heliocentric(tables, body, tdb, frame) {
  const S = [0, 0, 0], p = [0, 0, 0];
  tables.bary(SUN, tdb, S);
  retarded(tables, body, tdb, S, p);
  const dist = len(p);
  return { u: apply(frame.npb, [p[0] / dist, p[1] / dist, p[2] / dist]), dist: dist / AU_KM };
}
function spherical(ap, frame, equatorial) {
  const w = equatorial ? ap.u : toEcliptic(ap.u, frame.eps);
  const lon = norm360(Math.atan2(w[1], w[0]) * 180 / Math.PI);
  const lat = Math.atan2(w[2], Math.hypot(w[0], w[1])) * 180 / Math.PI;
  return [lon, lat];
}

// node_modules/naelos-ephemeris/dist/generated/deltat.js
var DELTAT_START = 228682025e-2;
var DELTAT_STEP = 91.3125;
var MEASURED_UNTIL = 24613285e-1;
var PREDICTED_UNTIL = 24616825e-1;
var DELTAT = [198.1631, 197.6942, 197.2255, 196.757, 196.2887, 195.8207, 195.3529, 194.8853, 194.4179, 193.9508, 193.4838, 193.0172, 192.5507, 192.0845, 191.6185, 191.1528, 190.6873, 190.222, 189.757, 189.2922, 188.8276, 188.3633, 187.8993, 187.4355, 186.972, 186.5087, 186.0456, 185.5828, 185.1203, 184.658, 184.196, 183.7343, 183.2728, 182.8116, 182.3506, 181.8899, 181.4295, 180.9693, 180.5095, 180.0499, 179.5905, 179.1315, 178.6727, 178.2142, 177.756, 177.298, 176.8404, 176.383, 175.9259, 175.4691, 175.0126, 174.5564, 174.1005, 173.6449, 173.1896, 172.7345, 172.2798, 171.8254, 171.3713, 170.9174, 170.4639, 170.0107, 169.5578, 169.1052, 168.6529, 168.2009, 167.7493, 167.298, 166.8469, 166.3962, 165.9458, 165.4958, 165.046, 164.5966, 164.1475, 163.6988, 163.2503, 162.8022, 162.3545, 161.907, 161.4599, 161.0132, 160.5668, 160.1207, 159.6749, 159.2295, 158.7845, 158.3398, 157.8954, 157.4514, 157.0078, 156.5645, 156.1215, 155.6789, 155.2367, 154.7948, 154.3533, 153.9121, 153.4713, 153.0309, 152.5908, 152.1511, 151.7118, 151.2728, 150.8342, 150.396, 149.9581, 149.5207, 149.0836, 148.6469, 148.2105, 147.7746, 147.339, 146.9039, 146.4691, 146.0347, 145.6007, 145.1671, 144.7338, 144.301, 143.8686, 143.4365, 143.0049, 142.5737, 142.1428, 141.7124, 141.2824, 140.8528, 140.4235, 139.9947, 139.5664, 139.1384, 138.7108, 138.2837, 137.857, 137.4306, 137.0048, 136.5793, 136.1543, 135.7296, 135.3054, 134.8817, 134.4584, 134.0355, 133.613, 133.1909, 132.7693, 132.3482, 131.9275, 131.5072, 131.0873, 130.6679, 130.249, 129.8305, 129.4124, 128.9948, 128.5777, 128.161, 127.7447, 127.3289, 126.9136, 126.4987, 126.0843, 125.6703, 125.2568, 124.8438, 124.4312, 124.0191, 123.6075, 123.1963, 122.7856, 122.3754, 121.9657, 121.5564, 121.1476, 120.7393, 120.3315, 119.9242, 119.5173, 119.111, 118.7051, 118.2997, 117.8948, 117.4904, 117.0865, 116.683, 116.2801, 115.8777, 115.4758, 115.0743, 114.6734, 114.273, 113.8731, 113.4737, 113.0748, 112.6764, 112.2785, 111.8811, 111.4843, 111.0879, 110.6921, 110.2968, 109.9021, 109.5078, 109.1141, 108.7209, 108.3282, 107.936, 107.5444, 107.1533, 106.7628, 106.3728, 105.9833, 105.5944, 105.206, 104.8182, 104.4309, 104.0442, 103.658, 103.2724, 102.8874, 102.5029, 102.119, 101.7356, 101.3528, 100.9706, 100.5889, 100.2078, 99.8274, 99.4474, 99.0681, 98.6893, 98.3112, 97.9336, 97.5566, 97.1802, 96.8044, 96.4292, 96.0546, 95.6806, 95.3072, 94.9345, 94.5623, 94.1907, 93.8198, 93.4494, 93.0797, 92.7106, 92.3421, 91.9743, 91.6071, 91.2405, 90.8745, 90.5092, 90.1445, 89.7804, 89.417, 89.0543, 88.6921, 88.3307, 87.9698, 87.6097, 87.2501, 86.8913, 86.5331, 86.1755, 85.8187, 85.4624, 85.1069, 84.752, 84.3978, 84.0443, 83.6914, 83.3393, 82.9878, 82.637, 82.2868, 81.9374, 81.5887, 81.2406, 80.8933, 80.5466, 80.2006, 79.8554, 79.5108, 79.167, 78.8239, 78.4814, 78.1397, 77.7987, 77.4584, 77.1189, 76.78, 76.4419, 76.1046, 75.7679, 75.432, 75.0968, 74.7623, 74.4286, 74.0956, 73.7634, 73.4319, 73.1012, 72.7712, 72.4419, 72.1134, 71.7857, 71.4587, 71.1325, 70.8071, 70.4824, 70.1585, 69.8353, 69.513, 69.1914, 68.8705, 68.5505, 68.2312, 67.9127, 67.595, 67.2781, 66.962, 66.6467, 66.3322, 66.0184, 65.7055, 65.3934, 65.082, 64.7715, 64.4618, 64.1529, 63.8448, 63.5375, 63.2311, 62.9254, 62.6206, 62.3166, 62.0135, 61.7111, 61.4096, 61.1089, 60.8091, 60.5101, 60.2119, 59.9146, 59.6181, 59.3225, 59.0277, 58.7338, 58.4407, 58.1485, 57.8572, 57.5667, 57.277, 56.9883, 56.7004, 56.4133, 56.1272, 55.8419, 55.5574, 55.2739, 54.9913, 54.7095, 54.4286, 54.1486, 53.8695, 53.5913, 53.314, 53.0375, 52.762, 52.4874, 52.2136, 51.9408, 51.6689, 51.3979, 51.1278, 50.8587, 50.5904, 50.3231, 50.0567, 49.7912, 49.5266, 49.263, 49.0003, 48.7385, 48.4776, 48.2177, 47.9588, 47.7008, 47.4437, 47.1876, 46.9324, 46.6781, 46.4249, 46.1725, 45.9212, 45.6708, 45.4213, 45.1729, 44.9253, 44.6788, 44.4332, 44.1886, 43.944, 43.7014, 43.4597, 43.219, 42.9793, 42.7405, 42.5027, 42.2659, 42.0301, 41.7953, 41.5614, 41.3285, 41.0965, 40.8656, 40.6356, 40.4065, 40.1785, 39.9514, 39.7253, 39.5001, 39.276, 39.0527, 38.8305, 38.6092, 38.3889, 38.1695, 37.9511, 37.7337, 37.5172, 37.3017, 37.0871, 36.8736, 36.6609, 36.4493, 36.2385, 36.0288, 35.82, 35.6122, 35.4053, 35.1994, 34.9944, 34.7904, 34.5873, 34.3852, 34.184, 33.9838, 33.7846, 33.5863, 33.3889, 33.1925, 32.9971, 32.8026, 32.609, 32.4164, 32.2248, 32.0341, 31.8443, 31.6555, 31.4676, 31.2807, 31.0947, 30.9096, 30.7255, 30.5424, 30.3601, 30.1789, 29.9985, 29.8191, 29.6406, 29.4631, 29.2865, 29.1109, 28.9362, 28.7624, 28.5896, 28.4177, 28.2467, 28.0767, 27.9075, 27.7394, 27.5721, 27.4058, 27.2404, 27.076, 26.9125, 26.7499, 26.5882, 26.4275, 26.2677, 26.1088, 25.9509, 25.7938, 25.6377, 25.4826, 25.3283, 25.175, 25.0226, 24.8711, 24.7205, 24.5709, 24.4221, 24.2743, 24.1275, 23.9815, 23.8364, 23.6923, 23.5491, 23.4068, 23.2654, 23.125, 22.9854, 22.8468, 22.709, 22.5722, 22.4363, 22.3013, 22.1673, 22.0341, 21.9018, 21.7705, 21.6401, 21.5105, 21.3819, 21.2542, 21.1274, 21.0015, 20.8765, 20.7524, 20.6292, 20.5069, 20.3855, 20.265, 20.1454, 20.0268, 19.909, 19.7921, 19.6761, 19.5611, 19.4469, 19.3336, 19.2212, 19.1097, 18.9991, 18.8894, 18.7806, 18.6727, 18.5657, 18.4596, 18.3543, 18.25, 18.1465, 18.044, 17.9423, 17.8415, 17.7416, 17.6426, 17.5445, 17.4473, 17.351, 17.2555, 17.1609, 17.0672, 16.9744, 16.8825, 16.7915, 16.7013, 16.6121, 16.5237, 16.4362, 16.3496, 16.2638, 16.1789, 16.095, 16.0118, 15.9296, 15.8483, 15.7678, 15.6882, 15.6094, 15.5316, 15.4546, 15.3785, 15.3033, 15.2289, 15.1554, 15.0828, 15.011, 14.9401, 14.8701, 14.801, 14.7327, 14.6653, 14.5988, 14.5331, 14.4683, 14.4043, 14.3413, 14.279, 14.2177, 14.1572, 14.0976, 14.0388, 13.9809, 13.9238, 13.8677, 13.8123, 13.7579, 13.7043, 13.6515, 13.5996, 13.5486, 13.4984, 13.4491, 13.4006, 13.353, 13.3062, 13.2603, 13.2152, 13.171, 13.1277, 13.0852, 13.0435, 13.0027, 12.9627, 12.9236, 12.8854, 12.8479, 12.8114, 12.7757, 12.7408, 12.7067, 12.6736, 12.6412, 12.6097, 12.579, 12.5492, 12.5202, 12.4921, 12.4648, 12.4384, 12.4127, 12.388, 12.364, 12.3409, 12.3186, 12.2972, 12.2766, 12.2569, 12.2379, 12.2198, 12.2026, 12.1861, 12.1705, 12.1558, 12.1418, 12.1287, 12.1165, 12.105, 12.0944, 12.0846, 12.0757, 12.0675, 12.0602, 12.0537, 12.0481, 12.0432, 12.0392, 12.036, 12.0337, 12.0321, 12.0314, 12.0315, 12.0324, 12.0342, 12.0367, 12.0401, 12.0443, 12.0493, 12.0551, 12.0618, 12.0683, 12.0765, 12.0856, 12.0955, 12.1061, 12.1176, 12.1298, 12.1429, 12.1566, 12.1712, 12.1865, 12.2025, 12.2193, 12.2368, 12.255, 12.2739, 12.2936, 12.314, 12.335, 12.3568, 12.3792, 12.4023, 12.4261, 12.4505, 12.4756, 12.5013, 12.5277, 12.5547, 12.5824, 12.6106, 12.6395, 12.669, 12.6991, 12.7297, 12.761, 12.7928, 12.8253, 12.8582, 12.8918, 12.9258, 12.9605, 12.9956, 13.0313, 13.0675, 13.1043, 13.1415, 13.1793, 13.2175, 13.2562, 13.2954, 13.3351, 13.3753, 13.4159, 13.457, 13.4985, 13.5404, 13.5828, 13.6256, 13.6688, 13.7125, 13.7565, 13.801, 13.8458, 13.891, 13.9366, 13.9826, 14.0289, 14.0756, 14.1227, 14.17, 14.2177, 14.2658, 14.3142, 14.3628, 14.4118, 14.4611, 14.5107, 14.5606, 14.6107, 14.6611, 14.7118, 14.7628, 14.814, 14.8654, 14.9171, 14.969, 15.0211, 15.0735, 15.126, 15.1788, 15.2318, 15.2849, 15.3383, 15.3918, 15.4455, 15.4993, 15.5533, 15.6075, 15.6617, 15.7162, 15.7707, 15.8254, 15.8802, 15.9351, 15.99, 16.0451, 16.1003, 16.1555, 16.2109, 16.2662, 16.3217, 16.3772, 16.4327, 16.4883, 16.5439, 16.5995, 16.6551, 16.7108, 16.7664, 16.8221, 16.8777, 16.9333, 16.9889, 17.0444, 17.1, 17.1554, 17.2108, 17.2662, 17.3215, 17.3767, 17.4318, 17.4869, 17.5418, 17.5967, 17.6514, 17.706, 17.7605, 17.8149, 17.8691, 17.9232, 17.9771, 18.0309, 18.0845, 18.138, 18.1912, 18.2443, 18.2972, 18.3499, 18.4024, 18.4546, 18.5067, 18.5585, 18.6101, 18.6614, 18.7125, 18.7634, 18.8139, 18.8642, 18.9143, 18.964, 19.0135, 19.0627, 19.1115, 19.1601, 19.2083, 19.2562, 19.3038, 19.351, 19.3979, 19.4445, 19.4906, 19.5365, 19.5819, 19.627, 19.6716, 19.7159, 19.7598, 19.8033, 19.8463, 19.889, 19.9312, 19.973, 20.0143, 20.0552, 20.0956, 20.1356, 20.175, 20.2141, 20.2526, 20.2906, 20.3282, 20.3652, 20.4017, 20.4377, 20.4732, 20.5082, 20.5426, 20.5764, 20.6097, 20.6425, 20.6746, 20.7062, 20.7373, 20.7677, 20.7975, 20.8268, 20.8554, 20.8834, 20.9108, 20.9375, 20.9637, 20.9891, 21.014, 21.0381, 21.0616, 21.0845, 21.1066, 21.1281, 21.1488, 21.1689, 21.1883, 21.2069, 21.2249, 21.2421, 21.2585, 21.2743, 21.2893, 21.3035, 21.3169, 21.3296, 21.3416, 21.3527, 21.363, 21.3726, 21.3813, 21.3893, 21.3964, 21.4027, 21.4081, 21.4128, 21.4165, 21.4195, 21.4215, 21.4227, 21.423, 21.4225, 21.421, 21.4187, 21.4155, 21.4113, 21.4063, 21.4003, 21.3934, 21.3855, 21.3767, 21.367, 21.3563, 21.3446, 21.332, 21.3184, 21.3038, 21.2882, 21.2717, 21.2541, 21.2355, 21.2159, 21.1952, 21.1735, 21.1508, 21.127, 21.1022, 21.0764, 21.0494, 21.0214, 20.9923, 20.9621, 20.9308, 20.8984, 20.8649, 20.8303, 20.7946, 20.7577, 20.7197, 20.6805, 20.6402, 20.5988, 20.5562, 20.5124, 20.4674, 20.4212, 20.3739, 20.3253, 20.2756, 20.2246, 20.1724, 20.119, 20.0643, 20.0084, 19.9513, 19.8929, 19.8332, 19.7723, 19.7101, 19.6466, 19.5818, 19.5157, 19.4483, 19.3796, 19.3096, 19.2383, 19.1656, 19.0916, 19.0162, 18.9395, 18.8615, 18.782, 18.7012, 18.619, 18.5355, 18.4505, 18.3641, 18.2764, 18.1874, 18.0974, 18.0066, 17.915, 17.823, 17.7306, 17.6381, 17.5456, 17.4533, 17.3614, 17.2702, 17.1796, 17.09, 17.0015, 16.9143, 16.8286, 16.7446, 16.6624, 16.5821, 16.5041, 16.4285, 16.3554, 16.2851, 16.2176, 16.1533, 16.0922, 16.0346, 15.9806, 15.9304, 15.8843, 15.8423, 15.8046, 15.7715, 15.7431, 15.7196, 15.7011, 15.6879, 15.6802, 15.678, 15.6816, 15.6905, 15.7045, 15.7233, 15.7463, 15.7734, 15.8041, 15.838, 15.8749, 15.9143, 15.956, 15.9994, 16.0444, 16.0905, 16.1374, 16.1846, 16.232, 16.279, 16.3254, 16.3707, 16.4147, 16.457, 16.4971, 16.5348, 16.5698, 16.6015, 16.6298, 16.6541, 16.6743, 16.6898, 16.7004, 16.7057, 16.7053, 16.6989, 16.6862, 16.6667, 16.6401, 16.6061, 16.5642, 16.5142, 16.4558, 16.3892, 16.3147, 16.2327, 16.1433, 16.047, 15.944, 15.8347, 15.7193, 15.5981, 15.4715, 15.3397, 15.2031, 15.062, 14.9166, 14.7673, 14.6144, 14.4581, 14.2989, 14.1369, 13.9725, 13.8061, 13.6378, 13.468, 13.2971, 13.1253, 12.9529, 12.7802, 12.6076, 12.4353, 12.2637, 12.093, 11.9235, 11.7556, 11.5896, 11.4257, 11.2644, 11.1057, 10.9502, 10.7991, 10.6506, 10.5057, 10.3646, 10.2271, 10.0932, 9.963, 9.8364, 9.7134, 9.594, 9.4783, 9.3661, 9.2575, 9.1524, 9.0509, 8.953, 8.8587, 8.7678, 8.6805, 8.5967, 8.5164, 8.4396, 8.3663, 8.2965, 8.2302, 8.1673, 8.1079, 8.0519, 7.9994, 7.9502, 7.9046, 7.8623, 7.8234, 7.7879, 7.7558, 7.727, 7.7017, 7.6797, 7.661, 7.6457, 7.6337, 7.625, 7.6197, 7.6175, 7.6185, 7.6227, 7.6299, 7.6401, 7.6533, 7.6694, 7.6884, 7.7102, 7.7347, 7.762, 7.7919, 7.8245, 7.8596, 7.8972, 7.9373, 7.9798, 8.0246, 8.0718, 8.1212, 8.1729, 8.2267, 8.2826, 8.3405, 8.4005, 8.4624, 8.5262, 8.5919, 8.6594, 8.7287, 8.7996, 8.8722, 8.9464, 9.0222, 9.0994, 9.1781, 9.2582, 9.3407, 9.4234, 9.5067, 9.5899, 9.6725, 9.7537, 9.8328, 9.9093, 9.9824, 10.0515, 10.1159, 10.175, 10.2281, 10.2745, 10.3136, 10.3447, 10.3671, 10.3803, 10.3834, 10.376, 10.3562, 10.3257, 10.2846, 10.2338, 10.1746, 10.1082, 10.0358, 9.9584, 9.8774, 9.7937, 9.7087, 9.6234, 9.5391, 9.457, 9.3781, 9.3036, 9.2348, 9.1727, 9.1187, 9.0737, 9.039, 9.0152, 9.0009, 8.9943, 8.9934, 8.9964, 9.0016, 9.0069, 9.0106, 9.0108, 9.0056, 8.9932, 8.9717, 8.9393, 8.8941, 8.8343, 8.7579, 8.6632, 8.5483, 8.4113, 8.2493, 8.0632, 7.8534, 7.622, 7.3711, 7.1027, 6.8188, 6.5214, 6.2127, 5.8946, 5.5692, 5.2385, 4.9046, 4.5695, 4.2353, 3.9039, 3.5775, 3.258, 2.9476, 2.6481, 2.3618, 2.0901, 1.8327, 1.5889, 1.3581, 1.1397, 0.9328, 0.7368, 0.5511, 0.3749, 0.2076, 0.0485, -0.1031, -0.248, -0.3867, -0.52, -0.6485, -0.7729, -0.894, -1.0124, -1.1298, -1.2448, -1.3585, -1.4709, -1.582, -1.6919, -1.8006, -1.9081, -2.0145, -2.1198, -2.224, -2.3272, -2.4293, -2.5305, -2.6306, -2.7299, -2.8282, -2.9257, -3.0223, -3.1181, -3.2131, -3.3073, -3.4002, -3.4916, -3.5809, -3.6678, -3.7517, -3.8324, -3.9093, -3.9821, -4.0503, -4.1135, -4.1713, -4.2232, -4.2689, -4.3079, -4.3398, -4.3642, -4.3806, -4.3886, -4.3878, -4.3781, -4.3602, -4.3353, -4.3045, -4.2689, -4.2294, -4.1872, -4.1435, -4.0991, -4.0553, -4.0131, -3.9736, -3.9379, -3.907, -3.8821, -3.8641, -3.8542, -3.8535, -3.863, -3.8849, -3.9178, -3.9616, -4.0149, -4.0763, -4.1445, -4.2179, -4.2953, -4.3751, -4.4561, -4.5368, -4.6157, -4.6915, -4.7628, -4.8282, -4.8863, -4.9357, -4.9749, -5.0026, -5.0174, -5.0168, -5.0017, -4.9712, -4.9253, -4.8643, -4.7883, -4.6974, -4.5919, -4.472, -4.3378, -4.1894, -4.0271, -3.851, -3.6614, -3.4583, -3.2419, -3.0125, -2.7702, -2.5152, -2.2476, -1.9676, -1.6755, -1.3722, -1.0586, -0.7356, -0.4042, -0.0653, 0.2801, 0.631, 0.9867, 1.346, 1.7081, 2.0719, 2.4367, 2.8014, 3.1651, 3.5268, 3.8856, 4.2406, 4.5908, 4.9342, 5.2722, 5.604, 5.9304, 6.2517, 6.5685, 6.8815, 7.191, 7.4977, 7.8021, 8.1047, 8.4061, 8.7068, 9.0073, 9.3082, 9.6101, 9.9135, 10.2188, 10.5268, 10.8378, 11.1524, 11.471, 11.7931, 12.1181, 12.4454, 12.7744, 13.1044, 13.4348, 13.765, 14.0944, 14.4224, 14.7483, 15.0715, 15.3915, 15.7075, 16.019, 16.3254, 16.626, 16.9202, 17.2075, 17.4881, 17.7596, 18.0232, 18.2789, 18.527, 18.7677, 19.0012, 19.2276, 19.4472, 19.6602, 19.8667, 20.067, 20.2612, 20.4496, 20.6323, 20.8096, 20.9816, 21.1485, 21.3106, 21.468, 21.622, 21.7707, 21.9151, 22.0553, 22.1912, 22.3229, 22.4503, 22.5735, 22.6924, 22.8071, 22.9176, 23.0238, 23.1259, 23.2237, 23.3173, 23.4067, 23.492, 23.573, 23.6499, 23.7226, 23.7912, 23.8556, 23.916, 23.9725, 24.025, 24.0738, 24.119, 24.1605, 24.1986, 24.2332, 24.2646, 24.2928, 24.3178, 24.3399, 24.3591, 24.3754, 24.389, 24.4, 24.4084, 24.4144, 24.4181, 24.4195, 24.4188, 24.4161, 24.4114, 24.4049, 24.3967, 24.3869, 24.3757, 24.363, 24.349, 24.3339, 24.3177, 24.3005, 24.2825, 24.2637, 24.2443, 24.2243, 24.204, 24.1832, 24.1633, 24.1424, 24.1219, 24.1024, 24.0844, 24.0684, 24.0549, 24.0445, 24.0376, 24.0349, 24.0369, 24.044, 24.0568, 24.0759, 24.1017, 24.1347, 24.1756, 24.2248, 24.2829, 24.3503, 24.4287, 24.5164, 24.6136, 24.7196, 24.8335, 24.9544, 25.0816, 25.2143, 25.3516, 25.4926, 25.6365, 25.7826, 25.9299, 26.0777, 26.2251, 26.3713, 26.5155, 26.6568, 26.7943, 26.9274, 27.0541, 27.1759, 27.2919, 27.4028, 27.5088, 27.6106, 27.7086, 27.8031, 27.8947, 27.9839, 28.0711, 28.1567, 28.2413, 28.3252, 28.409, 28.4931, 28.5779, 28.664, 28.7517, 28.8416, 28.9351, 29.0305, 29.1279, 29.2264, 29.3251, 29.4229, 29.519, 29.6123, 29.7019, 29.7868, 29.8661, 29.9389, 30.004, 30.0613, 30.1124, 30.1595, 30.2047, 30.2504, 30.2985, 30.3514, 30.4113, 30.4803, 30.5606, 30.6544, 30.7639, 30.8903, 31.0316, 31.1851, 31.348, 31.5175, 31.6909, 31.8653, 32.038, 32.2062, 32.3672, 32.5182, 32.6563, 32.7798, 32.8896, 32.9875, 33.0753, 33.1547, 33.2274, 33.2953, 33.3601, 33.4235, 33.4874, 33.5534, 33.6234, 33.6988, 33.7807, 33.8695, 33.9661, 34.0711, 34.1853, 34.3092, 34.4437, 34.5893, 34.7468, 34.9169, 35.0992, 35.296, 35.5051, 35.7253, 35.955, 36.1929, 36.4374, 36.6871, 36.9407, 37.1967, 37.4535, 37.7099, 37.9643, 38.2156, 38.4642, 38.7109, 38.9563, 39.2012, 39.4463, 39.6923, 39.9398, 40.1896, 40.4424, 40.6988, 40.9606, 41.2539, 41.5515, 41.8525, 42.1562, 42.4617, 42.7683, 43.0751, 43.3805, 43.6897, 43.9684, 44.2077, 44.4924, 44.7542, 45.0061, 45.2173, 45.4865, 45.7503, 45.9911, 46.1968, 46.466, 46.7418, 47.0077, 47.2478, 47.5281, 47.793, 48.0438, 48.2559, 48.5447, 48.8518, 49.109, 49.3194, 49.5971, 49.8684, 50.1126, 50.3093, 50.5465, 50.776, 50.9842, 51.1614, 51.3869, 51.6105, 51.8185, 51.968, 52.1743, 52.3789, 52.5809, 52.7445, 52.9652, 53.2319, 53.4415, 53.5941, 53.7937, 53.9522, 54.0897, 54.1961, 54.3474, 54.4987, 54.6375, 54.7229, 54.876, 55.0055, 55.1155, 55.1982, 55.3271, 55.4689, 55.5861, 55.6727, 55.8236, 55.9747, 56.0968, 56.1641, 56.3034, 56.4359, 56.5714, 56.6791, 56.8618, 57.0563, 57.2282, 57.3749, 57.5728, 57.7806, 57.9647, 58.1136, 58.3154, 58.5514, 58.7476, 58.9048, 59.1291, 59.3695, 59.5912, 59.7669, 59.9928, 60.2147, 60.4058, 60.5682, 60.7946, 61.0394, 61.2535, 61.4139, 61.6346, 61.8226, 62.0023, 62.1259, 62.3005, 62.4863, 62.6598, 62.8001, 62.9711, 63.1542, 63.2866, 63.3481, 63.4702, 63.5739, 63.6651, 63.718, 63.831, 63.9118, 63.9804, 64.011, 64.093, 64.1618, 64.2112, 64.2254, 64.3029, 64.3758, 64.4149, 64.4182, 64.4745, 64.531, 64.5486, 64.5418, 64.5746, 64.6221, 64.6503, 64.6406, 64.6896, 64.7591, 64.7961, 64.7947, 64.8466, 64.9208, 64.9938, 65.0423, 65.1483, 65.2562, 65.3439, 65.3735, 65.4603, 65.5508, 65.6299, 65.6785, 65.7803, 65.8635, 65.95, 65.9886, 66.0726, 66.1722, 66.2407, 66.2474, 66.3252, 66.4019, 66.4755, 66.5097, 66.6068, 66.6986, 66.7701, 66.813, 66.9098, 67.0324, 67.1263, 67.1761, 67.2848, 67.3946, 67.4881, 67.5392, 67.6465, 67.7649, 67.8648, 67.9602, 68.1092, 68.2739, 68.3994, 68.4673, 68.5961, 68.7193, 68.8262, 68.8718, 68.9699, 69.0546, 69.1117, 69.1384, 69.2224, 69.3085, 69.356, 69.3372, 69.3628, 69.4112, 69.4201, 69.3569, 69.3584, 69.3584, 69.3478, 69.2881, 69.2939, 69.2839, 69.2478, 69.1873, 69.2034, 69.2102, 69.216, 69.1718, 69.1765, 69.1976, 69.1827, 69.1253, 69.138, 69.1468, 69.138, 69.0907, 69.1095, 69.1359, 69.1702, 69.2089, 69.3102, 69.3908, 69.4022, 69.3727, 69.4141, 69.4561, 69.4988, 69.542, 69.5859, 69.6304, 69.6755, 69.7213, 69.7676, 69.8146, 69.8622, 69.9104, 69.9593, 70.0087, 70.0588, 70.1095, 70.1608, 70.2127, 70.2652, 70.3184, 70.3721, 70.4265, 70.4815, 70.5372, 70.5934, 70.6503, 70.7077, 70.7658, 70.8245, 70.8839, 70.9438, 71.0043, 71.0655, 71.1273, 71.1897, 71.2527, 71.3164, 71.3806, 71.4455, 71.511, 71.5771, 71.6438, 71.7111, 71.7791, 71.8476, 71.9168, 71.9866, 72.057, 72.1281, 72.1997, 72.272, 72.3448, 72.4183, 72.4924, 72.5671, 72.6424, 72.7184, 72.7949, 72.8721, 72.9499, 73.0283, 73.1073, 73.1869, 73.2672, 73.348, 73.4295, 73.5116, 73.5943, 73.6776, 73.7615, 73.8461, 73.9312, 74.017, 74.1034, 74.1904, 74.278, 74.3662, 74.455, 74.5445, 74.6345, 74.7252, 74.8165, 74.9084, 75.0009, 75.094, 75.1877, 75.2821, 75.377, 75.4726, 75.5688, 75.6656, 75.763, 75.861, 75.9596, 76.0588, 76.1587, 76.2591, 76.3602, 76.4619, 76.5642, 76.6671, 76.7706, 76.8747, 76.9795, 77.0848, 77.1908, 77.2974, 77.4046, 77.5123, 77.6207, 77.7298, 77.8394, 77.9496, 78.0605, 78.1719, 78.284, 78.3967, 78.5099, 78.6238, 78.7383, 78.8534, 78.9692, 79.0855, 79.2024, 79.32, 79.4381, 79.5569, 79.6763, 79.7963, 79.9169, 80.0381, 80.1599, 80.2823, 80.4053, 80.529, 80.6532, 80.7781, 80.9036, 81.0296, 81.1563, 81.2836, 81.4115, 81.54, 81.6691, 81.7988, 81.9292, 82.0601, 82.1916, 82.3238, 82.4565, 82.5899, 82.7239, 82.8584, 82.9936, 83.1294, 83.2658, 83.4028, 83.5404, 83.6787, 83.8175, 83.9569, 84.097, 84.2376, 84.3789, 84.5207, 84.6632, 84.8063, 84.9499, 85.0942, 85.2391, 85.3846, 85.5307, 85.6774, 85.8247, 85.9726, 86.1211, 86.2703, 86.42, 86.5703, 86.7213, 86.8728, 87.025, 87.1777, 87.3311, 87.4851, 87.6396, 87.7948, 87.9506, 88.107, 88.264, 88.4216, 88.5798, 88.7386, 88.898, 89.058, 89.2186, 89.3798, 89.5416, 89.704, 89.8671, 90.0307, 90.1949, 90.3598, 90.5252, 90.6912, 90.8579, 91.0251, 91.193, 91.3614, 91.5305, 91.7002, 91.8704, 92.0413, 92.2128, 92.3848, 92.5575, 92.7308, 92.9046, 93.0791, 93.2542, 93.4299, 93.6062, 93.7831, 93.9605, 94.1386, 94.3173, 94.4966, 94.6765, 94.857, 95.0381, 95.2198, 95.4021, 95.585, 95.7685, 95.9526, 96.1373, 96.3226, 96.5085, 96.695, 96.8821, 97.0698, 97.2581, 97.447, 97.6365, 97.8266, 98.0173, 98.2086, 98.4005, 98.593, 98.7861, 98.9798, 99.1741, 99.369, 99.5645, 99.7606, 99.9573, 100.1546, 100.3525, 100.551, 100.7501, 100.9498, 101.1501, 101.351, 101.5525, 101.7546, 101.9572, 102.1605, 102.3644, 102.5689, 102.774, 102.9796, 103.1859, 103.3928, 103.6003, 103.8083, 104.017, 104.2263, 104.4361, 104.6466, 104.8576, 105.0693, 105.2815, 105.4944, 105.7078, 105.9219, 106.1365, 106.3517, 106.5676, 106.784, 107.001, 107.2186, 107.4369, 107.6557, 107.8751, 108.0951, 108.3157, 108.5369, 108.7587, 108.9811, 109.2041, 109.4276, 109.6518, 109.8766, 110.102, 110.3279, 110.5545, 110.7816, 111.0094, 111.2377, 111.4667, 111.6962, 111.9263, 112.1571, 112.3884, 112.6203, 112.8528, 113.0859, 113.3196, 113.5539, 113.7888, 114.0242, 114.2603, 114.497, 114.7342, 114.9721, 115.2106, 115.4496, 115.6892, 115.9295, 116.1703, 116.4117, 116.6537, 116.8963, 117.1395, 117.3833, 117.6277, 117.8727, 118.1182, 118.3644, 118.6111, 118.8585, 119.1064, 119.3549, 119.6041, 119.8538, 120.1041, 120.355, 120.6065, 120.8586, 121.1112, 121.3645, 121.6184, 121.8728, 122.1279, 122.3835, 122.6397, 122.8965, 123.1539, 123.4119, 123.6705, 123.9297, 124.1895, 124.4499, 124.7108, 124.9724, 125.2345, 125.4972, 125.7605, 126.0244, 126.2889, 126.554, 126.8197, 127.086, 127.3528, 127.6203, 127.8883, 128.1569, 128.4262, 128.696, 128.9664, 129.2374, 129.5089, 129.7811, 130.0539, 130.3272, 130.6011, 130.8756, 131.1508, 131.4265, 131.7027, 131.9796, 132.2571, 132.5351, 132.8138, 133.093, 133.3728, 133.6533, 133.9342, 134.2158, 134.498, 134.7808, 135.0641, 135.348, 135.6326, 135.9177, 136.2034, 136.4897, 136.7765, 137.064, 137.3521, 137.6407, 137.9299, 138.2197, 138.5101, 138.8011, 139.0927, 139.3848, 139.6776, 139.9709, 140.2648, 140.5593, 140.8544, 141.1501, 141.4464, 141.7432, 142.0406, 142.3387, 142.6373, 142.9365, 143.2362, 143.5366, 143.8376, 144.1391, 144.4412, 144.7439, 145.0472, 145.3511, 145.6555, 145.9606, 146.2662, 146.5724, 146.8792, 147.1866, 147.4946, 147.8032, 148.1123, 148.422, 148.7323, 149.0432, 149.3547, 149.6668, 149.9794, 150.2926, 150.6064, 150.9208, 151.2358, 151.5514, 151.8675, 152.1843, 152.5016, 152.8195, 153.138, 153.457, 153.7767, 154.0969, 154.4177, 154.7391, 155.0611, 155.3836, 155.7068, 156.0305, 156.3548, 156.6797, 157.0052, 157.3312, 157.6579, 157.9851, 158.3129, 158.6413, 158.9703, 159.2998, 159.6299, 159.9607, 160.2919, 160.6238, 160.9563, 161.2893, 161.6229, 161.9571, 162.2919, 162.6273, 162.9632, 163.2997, 163.6368, 163.9745, 164.3128, 164.6516, 164.9911, 165.3311, 165.6717, 166.0128, 166.3546, 166.6969, 167.0398, 167.3833, 167.7274, 168.072, 168.4173, 168.7631, 169.1094, 169.4564, 169.804, 170.1521, 170.5008, 170.8501, 171.1999, 171.5504, 171.9014, 172.253, 172.6052, 172.9579, 173.3113, 173.6652, 174.0197, 174.3747, 174.7304, 175.0866, 175.4434, 175.8008, 176.1588, 176.5173, 176.8764, 177.2361, 177.5964, 177.9572, 178.3187, 178.6807, 179.0433, 179.4064, 179.7702, 180.1345, 180.4994, 180.8648, 181.2309, 181.5975, 181.9647, 182.3325, 182.7008, 183.0698, 183.4393, 183.8093, 184.18, 184.5512, 184.9231, 185.2954, 185.6684, 186.0419, 186.4161, 186.7907, 187.166, 187.5419, 187.9183, 188.2953, 188.6728, 189.051, 189.4297, 189.809, 190.1889, 190.5693, 190.9503, 191.3319, 191.7141, 192.0968, 192.4801, 192.864, 193.2485, 193.6335, 194.0192, 194.4054, 194.7921, 195.1795, 195.5674, 195.9559, 196.3449, 196.7345, 197.1248, 197.5155, 197.9069, 198.2988, 198.6913, 199.0844, 199.478, 199.8723, 200.2671, 200.6624, 201.0584, 201.4549, 201.852, 202.2496, 202.6478, 203.0466, 203.446, 203.846, 204.2465, 204.6476, 205.0493, 205.4515, 205.8543, 206.2577, 206.6616, 207.0662, 207.4713, 207.8769, 208.2832, 208.69, 209.0973, 209.5053, 209.9138, 210.3229, 210.7326, 211.1428, 211.5536, 211.965, 212.377, 212.7895, 213.2026, 213.6162, 214.0305, 214.4453, 214.8606, 215.2766, 215.6931, 216.1102, 216.5278, 216.9461, 217.3649, 217.7842, 218.2042, 218.6247, 219.0457, 219.4674, 219.8896, 220.3124, 220.7357, 221.1596, 221.5841, 222.0092, 222.4348, 222.861, 223.2878, 223.7151, 224.143, 224.5715, 225.0005, 225.4301, 225.8603, 226.291, 226.7223, 227.1542, 227.5866, 228.0197, 228.4532, 228.8874, 229.3221, 229.7574, 230.1932, 230.6297, 231.0666, 231.5042, 231.9423, 232.381, 232.8203, 233.2601, 233.7005, 234.1414, 234.583, 235.025, 235.4677, 235.9109, 236.3547, 236.7991, 237.244, 237.6895, 238.1355, 238.5822, 239.0293, 239.4771, 239.9254, 240.3743, 240.8237, 241.2738, 241.7243, 242.1755, 242.6272, 243.0795, 243.5323, 243.9857, 244.4397, 244.8942, 245.3493, 245.805, 246.2612, 246.718, 247.1754, 247.6333, 248.0918, 248.5509, 249.0105, 249.4707, 249.9314, 250.3927, 250.8546, 251.317, 251.78, 252.2436, 252.7077, 253.1724, 253.6377, 254.1035, 254.5699, 255.0368, 255.5043, 255.9724, 256.441, 256.9102, 257.38, 257.8503, 258.3212, 258.7927, 259.2647, 259.7372, 260.2104, 260.6841, 261.1583, 261.6332, 262.1086, 262.5845, 263.061, 263.5381, 264.0157, 264.4939, 264.9727, 265.452, 265.9319, 266.4123, 266.8933, 267.3749, 267.857, 268.3397, 268.8229, 269.3067, 269.7911, 270.276, 270.7615, 271.2476, 271.7342, 272.2214, 272.7091, 273.1974, 273.6863, 274.1757, 274.6656, 275.1562, 275.6473, 276.1389, 276.6311, 277.1239, 277.6172, 278.1111, 278.6056, 279.1006, 279.5962, 280.0923, 280.589, 281.0862, 281.584, 282.0824, 282.5813, 283.0808, 283.5809, 284.0815, 284.5826, 285.0843, 285.5866, 286.0894, 286.5928, 287.0968, 287.6013, 288.1064, 288.612, 289.1182, 289.6249, 290.1322, 290.6401, 291.1485, 291.6575, 292.167, 292.6771, 293.1877, 293.6989, 294.2107, 294.723, 295.2359, 295.7493, 296.2633, 296.7778, 297.2929, 297.8086, 298.3248, 298.8416, 299.3589, 299.8768, 300.3952, 300.9142, 301.4337, 301.9538, 302.4745, 302.9957, 303.5175, 304.0398, 304.5627, 305.0861, 305.6101, 306.1347, 306.6598, 307.1854, 307.7117, 308.2384, 308.7658, 309.2936, 309.8221, 310.3511, 310.8806, 311.4107, 311.9413, 312.4726, 313.0043, 313.5366, 314.0695, 314.6029, 315.1369, 315.6714, 316.2065, 316.7422, 317.2784, 317.8151, 318.3524, 318.8903, 319.4287, 319.9676, 320.5071, 321.0472, 321.5878, 322.129, 322.6707, 323.213, 323.7558, 324.2992, 324.8432, 325.3876, 325.9327, 326.4783, 327.0244, 327.5711, 328.1184, 328.6662, 329.2145, 329.7634, 330.3129, 330.8629, 331.4135, 331.9646, 332.5162, 333.0685, 333.6212, 334.1745, 334.7284, 335.2828, 335.8378, 336.3933, 336.9494, 337.506, 338.0632, 338.6209, 339.1792, 339.738, 340.2974, 340.8573, 341.4178, 341.9789, 342.5404, 343.1026, 343.6652, 344.2285, 344.7923, 345.3566, 345.9215, 346.4869, 347.0529, 347.6194, 348.1865, 348.7541, 349.3223, 349.891, 350.4603, 351.0301, 351.6005, 352.1714, 352.7429, 353.3149, 353.8874, 354.4606, 355.0342, 355.6084, 356.1832, 356.7585, 357.3343, 357.9108, 358.4877, 359.0652, 359.6433, 360.2218, 360.801, 361.3807, 361.9609, 362.5417, 363.123, 363.7049, 364.2873, 364.8703, 365.4538, 366.0379, 366.6225, 367.2077, 367.7934, 368.3797, 368.9665, 369.5538, 370.1417, 370.7301, 371.3191, 371.9087, 372.4987, 373.0894, 373.6805, 374.2723, 374.8645, 375.4573, 376.0507, 376.6446, 377.239, 377.834, 378.4296, 379.0256, 379.6223, 380.2194, 380.8172, 381.4154, 382.0142, 382.6136, 383.2135, 383.8139, 384.4149, 385.0164, 385.6185, 386.2211, 386.8243, 387.428, 388.0323, 388.6371, 389.2424, 389.8483, 390.4547, 391.0617, 391.6692, 392.2773, 392.8859, 393.495, 394.1047, 394.7149, 395.3257, 395.937, 396.5489, 397.1613, 397.7742, 398.3877, 399.0018, 399.6163, 400.2315, 400.8471, 401.4633, 402.0801, 402.6974, 403.3152, 403.9336, 404.5525, 405.1719, 405.7919, 406.4125, 407.0336, 407.6552, 408.2773, 408.9, 409.5233, 410.1471, 410.7714, 411.3963, 412.0217, 412.6477, 413.2742, 413.9012, 414.5288, 415.1569, 415.7855, 416.4147, 417.0445, 417.6748, 418.3056, 418.9369, 419.5688, 420.2013, 420.8343, 421.4678, 422.1018, 422.7364, 423.3716, 424.0073, 424.6435, 425.2802, 425.9175, 426.5554, 427.1937, 427.8327, 428.4721, 429.1121, 429.7526, 430.3937, 431.0353, 431.6775, 432.3202, 432.9634, 433.6071, 434.2514, 434.8963, 435.5417, 436.1876, 436.834, 437.481, 438.1286, 438.7766, 439.4252, 440.0744, 440.7241, 441.3743, 442.025, 442.6763, 443.3282, 443.9805, 444.6335, 445.2869, 445.9409, 446.5954, 447.2505, 447.906, 448.5622, 449.2188, 449.876, 450.5338, 451.1921, 451.8509, 452.5102, 453.1701, 453.8305, 454.4915, 455.153, 455.815, 456.4775, 457.1406, 457.8043, 458.4684, 459.1332, 459.7984, 460.4642, 461.1305, 461.7973, 462.4647, 463.1326, 463.8011, 464.4701, 465.1396, 465.8096, 466.4802, 467.1514, 467.823, 468.4952, 469.1679, 469.8412, 470.515, 471.1893, 471.8642, 472.5396, 473.2155, 473.892, 474.569, 475.2465, 475.9246, 476.6032, 477.2823, 477.962, 478.6422, 479.3229, 480.0042, 480.686, 481.3683, 482.0512, 482.7346, 483.4185, 484.103, 484.788, 485.4735, 486.1596, 486.8461, 487.5333, 488.2209, 488.9091, 489.5978, 490.2871, 490.9769, 491.6672, 492.358, 493.0494, 493.7413, 494.4338, 495.1268, 495.8203, 496.5143, 497.2089, 497.904, 498.5996, 499.2958, 499.9924, 500.6897, 501.3874, 502.0857, 502.7845, 503.4839, 504.1837, 504.8842, 505.5851, 506.2866, 506.9885, 507.6911, 508.3941, 509.0977, 509.8018, 510.5065, 511.2117, 511.9174, 512.6236, 513.3304, 514.0376, 514.7455, 515.4538, 516.1627, 516.8721, 517.582, 518.2925, 519.0035, 519.715, 520.4271, 521.1397, 521.8528, 522.5664, 523.2806, 523.9953, 524.7105, 525.4262, 526.1425, 526.8593, 527.5767, 528.2945, 529.0129, 529.7318, 530.4513, 531.1713, 531.8918, 532.6128, 533.3343, 534.0564, 534.779, 535.5022, 536.2258, 536.95, 537.6747, 538.4, 539.1257, 539.852, 540.5789, 541.3062, 542.0341, 542.7625, 543.4914, 544.2209, 544.9508, 545.6813, 546.4124, 547.1439, 547.876, 548.6086, 549.3418, 550.0754, 550.8096, 551.5443, 552.2795, 553.0153, 553.7516, 554.4884, 555.2257, 555.9636, 556.702, 557.4409, 558.1803, 558.9203, 559.6608, 560.4018, 561.1433, 561.8854, 562.6279, 563.371, 564.1147, 564.8588, 565.6035, 566.3487, 567.0944, 567.8407, 568.5874, 569.3347, 570.0825, 570.8309, 571.5797, 572.3291, 573.079, 573.8295, 574.5804, 575.3319, 576.0839, 576.8364, 577.5895, 578.343, 579.0971, 579.8517, 580.6069, 581.3625, 582.1187, 582.8754, 583.6326, 584.3904, 585.1487, 585.9074, 586.6668, 587.4266, 588.1869, 588.9478, 589.7092, 590.4711, 591.2336, 591.9965, 592.76, 593.524, 594.2885, 595.0536, 595.8191, 596.5852, 597.3518, 598.119, 598.8866, 599.6548, 600.4235, 601.1927, 601.9624, 602.7326, 603.5034, 604.2747, 605.0465, 605.8188, 606.5917, 607.365, 608.1389, 608.9133, 609.6883, 610.4637, 611.2397, 612.0161, 612.7931, 613.5707, 614.3487, 615.1273, 615.9063, 616.6859, 617.466, 618.2467, 619.0278, 619.8095, 620.5917, 621.3744, 622.1576, 622.9413, 623.7256, 624.5104, 625.2957, 626.0815, 626.8678, 627.6547, 628.442, 629.2299, 630.0183, 630.8072, 631.5967, 632.3866, 633.1771, 633.9681, 634.7596, 635.5516, 636.3441, 637.1372, 637.9307, 638.7248, 639.5194, 640.3145, 641.1102, 641.9063, 642.703, 643.5002, 644.2979, 645.0961, 645.8948, 646.6941, 647.4938, 648.2941, 649.0949, 649.8962, 650.698, 651.5004, 652.3032, 653.1066, 653.9105, 654.7149, 655.5198, 656.3252, 657.1312, 657.9376, 658.7446, 659.5521, 660.3601, 661.1686, 661.9776, 662.7872, 663.5972, 664.4078, 665.2189, 666.0305, 666.8426, 667.6552, 668.4684, 669.282, 670.0962, 670.9109, 671.7261, 672.5418, 673.358, 674.1747, 674.992, 675.8097, 676.628, 677.4468, 678.2661, 679.0859, 679.9062, 680.727, 681.5484, 682.3703, 683.1926, 684.0155, 684.8389, 685.6628, 686.4872, 687.3122, 688.1376, 688.9636, 689.79, 690.617, 691.4445, 692.2725, 693.101, 693.9301, 694.7596, 695.5896, 696.4202, 697.2513, 698.0828, 698.9149, 699.7475, 700.5806, 701.4143, 702.2484, 703.083, 703.9182, 704.7539, 705.59, 706.4267, 707.2639, 708.1016, 708.9398, 709.7785, 710.6178, 711.4575, 712.2978, 713.1385, 713.9798, 714.8216, 715.6639, 716.5067, 717.35, 718.1938, 719.0381, 719.883, 720.7283, 721.5742, 722.4205, 723.2674, 724.1148, 724.9626, 725.811, 726.6599, 727.5094, 728.3593, 729.2097, 730.0606, 730.9121, 731.764, 732.6165, 733.4694, 734.3229, 735.1769, 736.0314, 736.8864, 737.7419, 738.5979, 739.4544, 740.3114, 741.169, 742.027, 742.8855, 743.7446, 744.6041, 745.4642, 746.3248, 747.1859, 748.0474, 748.9095, 749.7721, 750.6352, 751.4988, 752.3629, 753.2276, 754.0927, 754.9583, 755.8245, 756.6911, 757.5582, 758.4259, 759.294, 760.1627, 761.0319, 761.9016, 762.7717, 763.6424, 764.5136, 765.3853, 766.2575, 767.1302, 768.0034, 768.8771, 769.7513, 770.626, 771.5013, 772.377, 773.2532, 774.13, 775.0072, 775.8849, 776.7632, 777.6419, 778.5212, 779.4009, 780.2812, 781.162, 782.0432, 782.925, 783.8073, 784.6901, 785.5733, 786.4571, 787.3414, 788.2262, 789.1115, 789.9973, 790.8836, 791.7704, 792.6577, 793.5455, 794.4338, 795.3226, 796.2119, 797.1017, 797.992, 798.8828, 799.7742, 800.666, 801.5583, 802.4511, 803.3444, 804.2383, 805.1326, 806.0274, 806.9227, 807.8186, 808.7149, 809.6117, 810.5091, 811.4069, 812.3052, 813.2041, 814.1034, 815.0032, 815.9036, 816.8044, 817.7057, 818.6076, 819.5099, 820.4127, 821.3161, 822.2199, 823.1242, 824.0291, 824.9344, 825.8402, 826.7466, 827.6534, 828.5607, 829.4686, 830.3769, 831.2857, 832.1951, 833.1049, 834.0152, 834.926, 835.8374, 836.7492, 837.6615, 838.5743, 839.4876, 840.4014, 841.3158, 842.2306, 843.1459, 844.0617, 844.978, 845.8948, 846.8121, 847.7299, 848.6482, 849.567, 850.4863, 851.4061, 852.3263, 853.2471, 854.1684, 855.0902, 856.0125, 856.9352, 857.8585, 858.7823, 859.7065, 860.6313, 861.5565, 862.4823, 863.4085, 864.3353, 865.2625, 866.1902, 867.1185, 868.0472, 868.9764, 869.9061, 870.8363, 871.7671, 872.6983, 873.63, 874.5622, 875.4948, 876.428, 877.3617, 878.2959, 879.2306, 880.1657, 881.1014, 882.0375, 882.9742, 883.9113, 884.849, 885.7871, 886.7257, 887.6649, 888.6045, 889.5446, 890.4852, 891.4263, 892.3679, 893.31, 894.2526, 895.1956, 896.1392, 897.0833, 898.0278, 898.9729, 899.9184, 900.8645, 901.811, 902.758, 903.7055, 904.6535, 905.602, 906.551, 907.5005, 908.4505, 909.401, 910.3519, 911.3034, 912.2553, 913.2078, 914.1607, 915.1141, 916.068, 917.0225, 917.9774, 918.9327, 919.8886, 920.845, 921.8019, 922.7592, 923.7171, 924.6754, 925.6343, 926.5936, 927.5534, 928.5137, 929.4745, 930.4358, 931.3976, 932.3598, 933.3226, 934.2858, 935.2496, 936.2138, 937.1785, 938.1437, 939.1095, 940.0756, 941.0423, 942.0095, 942.9772, 943.9453, 944.914, 945.8831, 946.8527, 947.8228, 948.7934, 949.7645, 950.7361, 951.7081, 952.6807, 953.6537, 954.6273, 955.6013, 956.5758, 957.5508, 958.5263, 959.5023, 960.4787, 961.4557, 962.4331, 963.4111, 964.3895, 965.3684, 966.3478, 967.3277, 968.308, 969.2889, 970.2702, 971.2521, 972.2344, 973.2172, 974.2005, 975.1843, 976.1686, 977.1533, 978.1386, 979.1243, 980.1105, 981.0972, 982.0844, 983.0721, 984.0603, 985.0489, 986.038, 987.0277, 988.0178, 989.0084, 989.9995, 990.991, 991.9831, 992.9756, 993.9687, 994.9622, 995.9562, 996.9506, 997.9456, 998.9411, 999.937, 1000.9334, 1001.9303, 1002.9277, 1003.9256, 1004.924, 1005.9228, 1006.9222, 1007.922, 1008.9223, 1009.9231, 1010.9244, 1011.9261, 1012.9284, 1013.9311, 1014.9343, 1015.938, 1016.9422, 1017.9468, 1018.952, 1019.9576, 1020.9637, 1021.9703, 1022.9774, 1023.985, 1024.993, 1026.0016, 1027.0106, 1028.0201, 1029.0301, 1030.0405, 1031.0515, 1032.0629, 1033.0748, 1034.0872, 1035.1001, 1036.1135, 1037.1273, 1038.1416, 1039.1564, 1040.1717, 1041.1875, 1042.2038, 1043.2205, 1044.2377, 1045.2554, 1046.2736, 1047.2923, 1048.3114, 1049.331, 1050.3512, 1051.3718, 1052.3928, 1053.4144, 1054.4364, 1055.4589, 1056.4819, 1057.5054, 1058.5294, 1059.5538, 1060.5787, 1061.6041, 1062.63, 1063.6564, 1064.6832, 1065.7105, 1066.7383, 1067.7666, 1068.7954, 1069.8246, 1070.8544, 1071.8846, 1072.9152, 1073.9464, 1074.978, 1076.0102, 1077.0428, 1078.0759, 1079.1094, 1080.1435, 1081.178, 1082.213, 1083.2485, 1084.2844, 1085.3208, 1086.3578, 1087.3951, 1088.433, 1089.4714, 1090.5102, 1091.5495, 1092.5893, 1093.6296, 1094.6703, 1095.7115, 1096.7532, 1097.7954, 1098.838, 1099.8812, 1100.9248, 1101.9689, 1103.0134, 1104.0585, 1105.104, 1106.15, 1107.1965, 1108.2434, 1109.2908, 1110.3387, 1111.3871, 1112.436, 1113.4853, 1114.5351, 1115.5854, 1116.6362, 1117.6874, 1118.7392, 1119.7913, 1120.844, 1121.8972, 1122.9508, 1124.0049, 1125.0595, 1126.1145, 1127.17, 1128.226, 1129.2825, 1130.3395, 1131.3969, 1132.4548, 1133.5132, 1134.572, 1135.6314, 1136.6912, 1137.7515, 1138.8122, 1139.8734, 1140.9352, 1141.9973, 1143.06, 1144.1231, 1145.1867, 1146.2508, 1147.3153, 1148.3804, 1149.4459, 1150.5119, 1151.5783, 1152.6452, 1153.7126, 1154.7805, 1155.8488, 1156.9177, 1157.9869, 1159.0567, 1160.1269, 1161.1977, 1162.2688, 1163.3405, 1164.4126, 1165.4852, 1166.5583, 1167.6319, 1168.7059, 1169.7804, 1170.8553, 1171.9308, 1173.0067, 1174.0831, 1175.1599, 1176.2373, 1177.3151, 1178.3933, 1179.4721, 1180.5513, 1181.631, 1182.7112, 1183.7918, 1184.8729, 1185.9545, 1187.0365, 1188.119, 1189.202, 1190.2855, 1191.3694, 1192.4538, 1193.5387, 1194.6241, 1195.7099, 1196.7962, 1197.8829, 1198.9701, 1200.0578, 1201.146, 1202.2347, 1203.3238, 1204.4133, 1205.5034, 1206.5939, 1207.6849, 1208.7764, 1209.8683, 1210.9607, 1212.0536, 1213.1469, 1214.2407, 1215.335, 1216.4297, 1217.525, 1218.6207, 1219.7168, 1220.8134, 1221.9105, 1223.0081, 1224.1061, 1225.2046, 1226.3036, 1227.403, 1228.5029, 1229.6033, 1230.7042, 1231.8055, 1232.9072, 1234.0095, 1235.1122, 1236.2154, 1237.319, 1238.4232, 1239.5277, 1240.6328, 1241.7383, 1242.8443, 1243.9508, 1245.0577, 1246.1651, 1247.273, 1248.3813, 1249.4901, 1250.5993, 1251.7091, 1252.8193, 1253.9299, 1255.041, 1256.1526, 1257.2647, 1258.3772, 1259.4902, 1260.6037, 1261.7176, 1262.832, 1263.9469, 1265.0622, 1266.178, 1267.2942, 1268.4109, 1269.5281, 1270.6458, 1271.7639, 1272.8825, 1274.0015, 1275.1211, 1276.241, 1277.3615, 1278.4824, 1279.6038, 1280.7256, 1281.8479, 1282.9707, 1284.0939, 1285.2176, 1286.3418, 1287.4664, 1288.5915, 1289.7171, 1290.8431, 1291.9696, 1293.0965, 1294.2239, 1295.3518, 1296.4801, 1297.6089, 1298.7382, 1299.8679, 1300.9981, 1302.1288, 1303.2599, 1304.3915, 1305.5236, 1306.6561, 1307.789, 1308.9225, 1310.0564, 1311.1907, 1312.3256, 1313.4609, 1314.5966, 1315.7328, 1316.8695, 1318.0066, 1319.1442, 1320.2823, 1321.4208, 1322.5598, 1323.6993, 1324.8392, 1325.9795, 1327.1204, 1328.2617, 1329.4034, 1330.5457, 1331.6883, 1332.8315, 1333.9751, 1335.1191, 1336.2637, 1337.4087, 1338.5541, 1339.7, 1340.8464, 1341.9932, 1343.1405, 1344.2883, 1345.4365, 1346.5851, 1347.7343, 1348.8839, 1350.0339, 1351.1844, 1352.3354, 1353.4868, 1354.6387, 1355.7911, 1356.9439, 1358.0972, 1359.2509, 1360.4051, 1361.5597, 1362.7149, 1363.8704, 1365.0265, 1366.1829, 1367.3399, 1368.4973, 1369.6552, 1370.8135, 1371.9723, 1373.1315, 1374.2912, 1375.4514, 1376.612, 1377.7731, 1378.9346, 1380.0966, 1381.259, 1382.4219, 1383.5853, 1384.7491, 1385.9134, 1387.0781, 1388.2433, 1389.409, 1390.5751, 1391.7417, 1392.9087, 1394.0762, 1395.2441, 1396.4125, 1397.5814, 1398.7507, 1399.9205, 1401.0907, 1402.2614, 1403.4325, 1404.6041, 1405.7761, 1406.9487, 1408.1216, 1409.295, 1410.4689, 1411.6432, 1412.818, 1413.9933, 1415.169, 1416.3451, 1417.5218, 1418.6988, 1419.8763, 1421.0543, 1422.2328, 1423.4116, 1424.591, 1425.7708, 1426.951, 1428.1318, 1429.3129, 1430.4945, 1431.6766, 1432.8591, 1434.0421, 1435.2256, 1436.4095, 1437.5938, 1438.7786, 1439.9639, 1441.1496, 1442.3357, 1443.5224, 1444.7094, 1445.897, 1447.0849, 1448.2734, 1449.4623, 1450.6516, 1451.8414, 1453.0316, 1454.2223, 1455.4135, 1456.6051, 1457.7972, 1458.9897, 1460.1826, 1461.3761, 1462.5699, 1463.7643, 1464.959, 1466.1543, 1467.35, 1468.5461, 1469.7427, 1470.9397, 1472.1372, 1473.3351, 1474.5335, 1475.7324, 1476.9317, 1478.1314, 1479.3316, 1480.5323, 1481.7334, 1482.935, 1484.137, 1485.3394, 1486.5423, 1487.7457, 1488.9495, 1490.1538, 1491.3585, 1492.5637, 1493.7693, 1494.9754, 1496.1819, 1497.3888, 1498.5963, 1499.8041, 1501.0125, 1502.2212, 1503.4304, 1504.6401, 1505.8502, 1507.0608, 1508.2718, 1509.4833, 1510.6952, 1511.9076, 1513.1204, 1514.3337, 1515.5474, 1516.7616, 1517.9762, 1519.1912, 1520.4068, 1521.6227, 1522.8391, 1524.056, 1525.2733, 1526.4911, 1527.7093, 1528.9279, 1530.147, 1531.3666, 1532.5866, 1533.807, 1535.0279, 1536.2493, 1537.4711, 1538.6933, 1539.916, 1541.1391, 1542.3627, 1543.5868, 1544.8112, 1546.0362, 1547.2615, 1548.4874, 1549.7136, 1550.9404, 1552.1675, 1553.3951, 1554.6232, 1555.8517, 1557.0806, 1558.31, 1559.5399, 1560.7702, 1562.0009, 1563.2321, 1564.4637, 1565.6958, 1566.9283, 1568.1613, 1569.3947, 1570.6286, 1571.8629, 1573.0976, 1574.3328, 1575.5685, 1576.8046, 1578.0411, 1579.2781, 1580.5155, 1581.7534, 1582.9917, 1584.2304, 1585.4696, 1586.7093, 1587.9494, 1589.1899, 1590.4309, 1591.6723, 1592.9142, 1594.1565, 1595.3993, 1596.6425, 1597.8862, 1599.1302, 1600.3748, 1601.6198, 1602.8652, 1604.1111, 1605.3574, 1606.6041, 1607.8513, 1609.099, 1610.3471, 1611.5956, 1612.8446, 1614.094, 1615.3439, 1616.5942, 1617.8449, 1619.0961, 1620.3477, 1621.5998, 1622.8523, 1624.1053, 1625.3587, 1626.6125, 1627.8668, 1629.1216, 1630.3767, 1631.6324, 1632.8884, 1634.1449, 1635.4019, 1636.6592, 1637.9171, 1639.1753, 1640.434, 1641.6932, 1642.9528, 1644.2128, 1645.4733, 1646.7342, 1647.9956, 1649.2573, 1650.5196, 1651.7823, 1653.0454, 1654.3089, 1655.5729, 1656.8374, 1658.1023, 1659.3676, 1660.6334, 1661.8996, 1663.1662, 1664.4333, 1665.7008, 1666.9688, 1668.2372, 1669.506, 1670.7753, 1672.045, 1673.3152, 1674.5858, 1675.8568, 1677.1283, 1678.4002, 1679.6726, 1680.9454, 1682.2186, 1683.4923, 1684.7664, 1686.041, 1687.316, 1688.5914, 1689.8673, 1691.1436, 1692.4203, 1693.6975, 1694.9751, 1696.2532, 1697.5317, 1698.8106, 1700.09, 1701.3698, 1702.6501, 1703.9307, 1705.2119, 1706.4934, 1707.7754, 1709.0579, 1710.3408, 1711.6241, 1712.9078, 1714.192, 1715.4766, 1716.7617, 1718.0472, 1719.3331, 1720.6195, 1721.9063, 1723.1936, 1724.4812, 1725.7694, 1727.0579, 1728.3469, 1729.6363, 1730.9262, 1732.2165, 1733.5072, 1734.7984, 1736.09, 1737.382, 1738.6745, 1739.9674, 1741.2608, 1742.5546, 1743.8488, 1745.1434, 1746.4385, 1747.7341, 1749.03, 1750.3264, 1751.6233, 1752.9205, 1754.2182, 1755.5164, 1756.8149, 1758.1139, 1759.4134, 1760.7132, 1762.0135, 1763.3143, 1764.6155, 1765.9171, 1767.2191, 1768.5216, 1769.8245, 1771.1278, 1772.4316, 1773.7358, 1775.0405, 1776.3456, 1777.6511, 1778.957, 1780.2634, 1781.5702, 1782.8774, 1784.1851, 1785.4932, 1786.8018, 1788.1107, 1789.4202, 1790.73, 1792.0403, 1793.351, 1794.6621, 1795.9737, 1797.2857, 1798.5981, 1799.911, 1801.2243, 1802.538, 1803.8522, 1805.1668, 1806.4818, 1807.7972, 1809.1131, 1810.4295, 1811.7462, 1813.0634, 1814.381, 1815.699, 1817.0175, 1818.3364, 1819.6558, 1820.9755, 1822.2957, 1823.6164, 1824.9374, 1826.2589, 1827.5808, 1828.9032, 1830.226, 1831.5492, 1832.8728, 1834.1969, 1835.5214, 1836.8463, 1838.1717, 1839.4975, 1840.8237, 1842.1503, 1843.4774, 1844.8049, 1846.1329, 1847.4612, 1848.79, 1850.1193, 1851.4489, 1852.779, 1854.1095, 1855.4404, 1856.7718, 1858.1036, 1859.4358, 1860.7685, 1862.1016, 1863.4351, 1864.769, 1866.1034, 1867.4382, 1868.7734, 1870.1091, 1871.4452, 1872.7817, 1874.1186, 1875.456, 1876.7938, 1878.132, 1879.4706, 1880.8097, 1882.1492, 1883.4891, 1884.8295, 1886.1703, 1887.5115, 1888.8531, 1890.1952, 1891.5376, 1892.8806, 1894.2239, 1895.5677, 1896.9119, 1898.2565, 1899.6015, 1900.947, 1902.2929];

// node_modules/naelos-ephemeris/dist/generated/deltat-long.js
var DELTAT_PAST_START = -3101e3;
var DELTAT_PAST_STEP = 1826.25;
var DELTAT_PAST = [733566.476, 733078.181, 732590.048, 732102.078, 731614.27, 731126.625, 730639.142, 730151.822, 729664.664, 729177.669, 728690.836, 728204.166, 727717.658, 727231.313, 726745.13, 726259.11, 725773.252, 725287.556, 724802.024, 724316.653, 723831.446, 723346.4, 722861.517, 722376.797, 721892.239, 721407.844, 720923.611, 720439.541, 719955.633, 719471.888, 718988.305, 718504.885, 718021.627, 717538.532, 717055.599, 716572.828, 716090.221, 715607.775, 715125.492, 714643.372, 714161.414, 713679.619, 713197.986, 712716.516, 712235.208, 711754.063, 711273.08, 710792.259, 710311.602, 709831.106, 709350.773, 708870.603, 708390.595, 707910.75, 707431.067, 706951.547, 706472.189, 705992.993, 705513.96, 705035.09, 704556.382, 704077.837, 703599.454, 703121.234, 702643.176, 702165.28, 701687.548, 701209.977, 700732.569, 700255.324, 699778.241, 699301.321, 698824.563, 698347.967, 697871.535, 697395.264, 696919.156, 696443.211, 695967.428, 695491.808, 695016.35, 694541.054, 694065.921, 693590.951, 693116.143, 692641.498, 692167.015, 691692.694, 691218.537, 690744.541, 690270.708, 689797.038, 689323.53, 688850.184, 688377.002, 687903.981, 687431.123, 686958.428, 686485.895, 686013.525, 685541.317, 685069.271, 684597.388, 684125.668, 683654.11, 683182.714, 682711.482, 682240.411, 681769.503, 681298.758, 680828.175, 680357.754, 679887.496, 679417.401, 678947.468, 678477.698, 678008.09, 677538.644, 677069.361, 676600.241, 676131.283, 675662.487, 675193.854, 674725.384, 674257.076, 673788.931, 673320.948, 672853.127, 672385.469, 671917.974, 671450.641, 670983.47, 670516.462, 670049.617, 669582.934, 669116.413, 668650.055, 668183.86, 667717.827, 667251.957, 666786.249, 666320.703, 665855.32, 665390.1, 664925.042, 664460.146, 663995.413, 663530.843, 663066.435, 662602.189, 662138.106, 661674.186, 661210.428, 660746.832, 660283.399, 659820.129, 659357.021, 658894.075, 658431.292, 657968.672, 657506.214, 657043.918, 656581.785, 656119.815, 655658.007, 655196.361, 654734.878, 654273.558, 653812.4, 653351.404, 652890.571, 652429.901, 651969.392, 651509.047, 651048.864, 650588.843, 650128.985, 649669.29, 649209.757, 648750.386, 648291.178, 647832.133, 647373.25, 646914.529, 646455.971, 645997.576, 645539.342, 645081.272, 644623.364, 644165.618, 643708.035, 643250.615, 642793.357, 642336.261, 641879.328, 641422.558, 640965.949, 640509.504, 640053.221, 639597.1, 639141.142, 638685.347, 638229.714, 637774.243, 637318.935, 636863.789, 636408.806, 635953.986, 635499.328, 635044.832, 634590.499, 634136.328, 633682.32, 633228.475, 632774.792, 632321.271, 631867.913, 631414.717, 630961.684, 630508.814, 630056.106, 629603.56, 629151.177, 628698.956, 628246.898, 627795.003, 627343.27, 626891.699, 626440.291, 625989.045, 625537.962, 625087.042, 624636.283, 624185.688, 623735.255, 623284.984, 622834.876, 622384.93, 621935.147, 621485.527, 621036.069, 620586.773, 620137.64, 619688.669, 619239.861, 618791.215, 618342.732, 617894.412, 617446.253, 616998.258, 616550.425, 616102.754, 615655.246, 615207.9, 614760.717, 614313.697, 613866.838, 613420.143, 612973.61, 612527.239, 612081.031, 611634.985, 611189.102, 610743.381, 610297.823, 609852.428, 609407.194, 608962.124, 608517.216, 608072.47, 607627.887, 607183.466, 606739.208, 606295.112, 605851.179, 605407.408, 604963.8, 604520.355, 604077.071, 603633.951, 603190.993, 602748.197, 602305.564, 601863.093, 601420.785, 600978.639, 600536.656, 600094.835, 599653.177, 599211.681, 598770.348, 598329.178, 597888.169, 597447.324, 597006.64, 596566.12, 596125.762, 595685.566, 595245.533, 594805.662, 594365.954, 593926.408, 593487.025, 593047.804, 592608.746, 592169.85, 591731.117, 591292.546, 590854.138, 590415.892, 589977.809, 589539.888, 589102.13, 588664.535, 588227.101, 587789.831, 587352.722, 586915.777, 586478.993, 586042.373, 585605.914, 585169.619, 584733.485, 584297.515, 583861.707, 583426.061, 582990.578, 582555.257, 582120.099, 581685.103, 581250.27, 580815.599, 580381.091, 579946.745, 579512.562, 579078.541, 578644.683, 578210.987, 577777.454, 577344.083, 576910.875, 576477.829, 576044.946, 575612.225, 575179.667, 574747.271, 574315.037, 573882.967, 573451.058, 573019.313, 572587.729, 572156.309, 571725.05, 571293.955, 570863.021, 570432.251, 570001.642, 569571.197, 569140.913, 568710.792, 568280.834, 567851.038, 567421.405, 566991.934, 566562.626, 566133.48, 565704.497, 565275.676, 564847.018, 564418.522, 563990.189, 563562.018, 563134.01, 562706.164, 562278.481, 561850.96, 561423.601, 560996.406, 560569.372, 560142.502, 559715.793, 559289.247, 558862.864, 558436.643, 558010.585, 557584.689, 557158.956, 556733.385, 556307.977, 555882.731, 555457.648, 555032.727, 554607.968, 554183.373, 553758.939, 553334.668, 552910.56, 552486.614, 552062.831, 551639.21, 551215.752, 550792.456, 550369.323, 549946.352, 549523.543, 549100.898, 548678.414, 548256.093, 547833.935, 547411.939, 546990.106, 546568.435, 546146.927, 545725.581, 545304.397, 544883.377, 544462.518, 544041.822, 543621.289, 543200.918, 542780.71, 542360.664, 541940.781, 541521.06, 541101.501, 540682.105, 540262.872, 539843.801, 539424.893, 539006.147, 538587.564, 538169.143, 537750.884, 537332.788, 536914.855, 536497.084, 536079.476, 535662.03, 535244.747, 534827.626, 534410.667, 533993.871, 533577.238, 533160.767, 532744.459, 532328.313, 531912.329, 531496.508, 531080.85, 530665.354, 530250.021, 529834.85, 529419.841, 529004.996, 528590.312, 528175.791, 527761.433, 527347.237, 526933.204, 526519.333, 526105.624, 525692.078, 525278.695, 524865.474, 524452.416, 524039.52, 523626.786, 523214.215, 522801.807, 522389.561, 521977.478, 521565.557, 521153.798, 520742.202, 520330.769, 519919.498, 519508.389, 519097.443, 518686.66, 518276.039, 517865.581, 517455.285, 517045.151, 516635.18, 516225.372, 515815.726, 515406.243, 514996.922, 514587.763, 514178.767, 513769.934, 513361.263, 512952.754, 512544.408, 512136.225, 511728.204, 511320.345, 510912.65, 510505.116, 510097.745, 509690.537, 509283.491, 508876.607, 508469.886, 508063.328, 507656.932, 507250.698, 506844.627, 506438.719, 506032.973, 505627.389, 505221.968, 504816.71, 504411.614, 504006.681, 503601.91, 503197.301, 502792.855, 502388.572, 501984.451, 501580.492, 501176.696, 500773.063, 500369.592, 499966.283, 499563.137, 499160.154, 498757.333, 498354.674, 497952.178, 497549.845, 497147.674, 496745.665, 496343.819, 495942.136, 495540.615, 495139.256, 494738.06, 494337.027, 493936.156, 493535.447, 493134.901, 492734.518, 492334.296, 491934.238, 491534.342, 491134.608, 490735.037, 490335.629, 489936.383, 489537.299, 489138.378, 488739.62, 488341.024, 487942.59, 487544.319, 487146.211, 486748.265, 486350.481, 485952.86, 485555.402, 485158.105, 484760.972, 484364.001, 483967.192, 483570.546, 483174.063, 482777.742, 482381.583, 481985.587, 481589.754, 481194.082, 480798.574, 480403.228, 480008.044, 479613.023, 479218.165, 478823.469, 478428.935, 478034.564, 477640.355, 477246.309, 476852.426, 476458.705, 476065.146, 475671.75, 475278.517, 474885.445, 474492.537, 474099.791, 473707.207, 473314.786, 472922.528, 472530.432, 472138.498, 471746.727, 471355.118, 470963.672, 470572.389, 470181.268, 469790.309, 469399.513, 469008.879, 468618.408, 468228.1, 467837.953, 467447.97, 467058.149, 466668.49, 466278.994, 465889.661, 465500.489, 465111.481, 464722.635, 464333.951, 463945.43, 463557.071, 463168.875, 462780.842, 462392.971, 462005.262, 461617.716, 461230.332, 460843.111, 460456.052, 460069.156, 459682.423, 459295.852, 458909.443, 458523.197, 458137.113, 457751.192, 457365.434, 456979.837, 456594.404, 456209.133, 455824.024, 455439.078, 455054.294, 454669.673, 454285.214, 453900.918, 453516.785, 453132.814, 452749.005, 452365.359, 451981.875, 451598.554, 451215.395, 450832.399, 450449.566, 450066.894, 449684.386, 449302.04, 448919.856, 448537.835, 448155.976, 447774.28, 447392.746, 447011.375, 446630.167, 446249.12, 445868.237, 445487.516, 445106.957, 444726.561, 444346.327, 443966.256, 443586.347, 443206.601, 442827.017, 442447.596, 442068.338, 441689.241, 441310.308, 440931.536, 440552.928, 440174.482, 439796.198, 439418.077, 439040.118, 438662.322, 438284.688, 437907.217, 437529.908, 437152.762, 436775.778, 436398.957, 436022.299, 435645.802, 435269.469, 434893.297, 434517.289, 434141.443, 433765.759, 433390.238, 433014.879, 432639.683, 432264.649, 431889.778, 431515.069, 431140.523, 430766.139, 430391.918, 430017.859, 429643.963, 429270.229, 428896.658, 428523.249, 428150.003, 427776.92, 427403.998, 427031.24, 426658.643, 426286.21, 425913.938, 425541.83, 425169.884, 424798.1, 424426.479, 424055.02, 423683.724, 423312.59, 422941.619, 422570.81, 422200.164, 421829.68, 421459.359, 421089.2, 420719.204, 420349.37, 419979.699, 419610.19, 419240.844, 418871.66, 418502.639, 418133.78, 417765.084, 417396.55, 417028.179, 416659.97, 416291.924, 415924.04, 415556.319, 415188.76, 414821.364, 414454.13, 414087.059, 413720.15, 413353.404, 412986.82, 412620.399, 412254.14, 411888.044, 411522.11, 411156.339, 410790.73, 410425.284, 410060, 409694.879, 409329.92, 408965.123, 408600.49, 408236.018, 407871.71, 407507.563, 407143.58, 406779.758, 406416.1, 406052.603, 405689.269, 405326.098, 404963.089, 404600.243, 404237.559, 403875.038, 403512.679, 403150.483, 402788.449, 402426.578, 402064.869, 401703.323, 401341.939, 400980.718, 400619.659, 400258.763, 399898.029, 399537.457, 399177.049, 398816.802, 398456.718, 398096.797, 397737.038, 397377.442, 397018.008, 396658.737, 396299.628, 395940.682, 395581.898, 395223.277, 394864.818, 394506.522, 394148.388, 393790.416, 393432.608, 393074.961, 392717.477, 392360.156, 392002.997, 391646.001, 391289.167, 390932.496, 390575.987, 390219.641, 389863.457, 389507.435, 389151.577, 388795.88, 388440.346, 388084.975, 387729.766, 387374.72, 387019.836, 386665.115, 386310.556, 385956.16, 385601.926, 385247.854, 384893.945, 384540.199, 384186.615, 383833.194, 383479.935, 383126.839, 382773.905, 382421.133, 382068.525, 381716.078, 381363.794, 381011.673, 380659.714, 380307.918, 379956.284, 379604.813, 379253.504, 378902.357, 378551.373, 378200.552, 377849.893, 377499.397, 377149.063, 376798.892, 376448.883, 376099.036, 375749.352, 375399.831, 375050.472, 374701.276, 374352.242, 374003.371, 373654.662, 373306.115, 372957.731, 372609.51, 372261.451, 371913.555, 371565.821, 371218.249, 370870.841, 370523.594, 370176.51, 369829.589, 369482.83, 369136.234, 368789.8, 368443.528, 368097.419, 367751.473, 367405.689, 367060.068, 366714.609, 366369.312, 366024.178, 365679.207, 365334.398, 364989.752, 364645.268, 364300.946, 363956.787, 363612.791, 363268.957, 362925.286, 362581.777, 362238.43, 361895.246, 361552.225, 361209.366, 360866.67, 360524.136, 360181.764, 359839.555, 359497.509, 359155.625, 358813.904, 358472.345, 358130.948, 357789.714, 357448.643, 357107.734, 356766.988, 356426.404, 356085.982, 355745.723, 355405.627, 355065.693, 354725.921, 354386.312, 354046.866, 353707.582, 353368.461, 353029.502, 352690.705, 352352.071, 352013.6, 351675.291, 351337.144, 350999.16, 350661.339, 350323.68, 349986.184, 349648.85, 349311.678, 348974.669, 348637.823, 348301.139, 347964.617, 347628.258, 347292.062, 346956.028, 346620.156, 346284.447, 345948.901, 345613.517, 345278.296, 344943.237, 344608.34, 344273.606, 343939.035, 343604.626, 343270.379, 342936.295, 342602.374, 342268.615, 341935.018, 341601.584, 341268.313, 340935.204, 340602.257, 340269.473, 339936.852, 339604.393, 339272.096, 338939.962, 338607.991, 338276.182, 337944.535, 337613.051, 337281.73, 336950.571, 336619.574, 336288.74, 335958.069, 335627.56, 335297.213, 334967.029, 334637.008, 334307.149, 333977.452, 333647.918, 333318.547, 332989.338, 332660.291, 332331.407, 332002.686, 331674.127, 331345.73, 331017.496, 330689.425, 330361.516, 330033.769, 329706.185, 329378.764, 329051.505, 328724.408, 328397.474, 328070.703, 327744.094, 327417.647, 327091.363, 326765.241, 326439.282, 326113.486, 325787.852, 325462.38, 325137.071, 324811.925, 324486.941, 324162.119, 323837.46, 323512.964, 323188.63, 322864.458, 322540.449, 322216.602, 321892.918, 321569.397, 321246.038, 320922.841, 320599.807, 320276.936, 319954.227, 319631.68, 319309.296, 318987.074, 318665.015, 318343.119, 318021.385, 317699.813, 317378.404, 317057.158, 316736.074, 316415.152, 316094.393, 315773.796, 315453.362, 315133.091, 314812.982, 314493.035, 314173.251, 313853.629, 313534.17, 313214.874, 312895.74, 312576.768, 312257.959, 311939.313, 311620.828, 311302.507, 310984.348, 310666.351, 310348.517, 310030.846, 309713.336, 309395.99, 309078.806, 308761.784, 308444.925, 308128.229, 307811.694, 307495.323, 307179.114, 306863.067, 306547.183, 306231.462, 305915.902, 305600.506, 305285.272, 304970.2, 304655.291, 304340.544, 304025.96, 303711.539, 303397.28, 303083.183, 302769.249, 302455.477, 302141.868, 301828.422, 301515.138, 301202.016, 300889.057, 300576.26, 300263.626, 299951.154, 299638.845, 299326.699, 299014.715, 298702.893, 298391.234, 298079.737, 297768.403, 297457.232, 297146.222, 296835.376, 296524.692, 296214.17, 295903.811, 295593.614, 295283.58, 294973.709, 294663.999, 294354.453, 294045.069, 293735.847, 293426.788, 293117.891, 292809.157, 292500.585, 292192.176, 291883.93, 291575.846, 291267.924, 290960.165, 290652.568, 290345.134, 290037.862, 289730.753, 289423.807, 289117.022, 288810.401, 288503.942, 288197.645, 287891.511, 287585.539, 287279.73, 286974.083, 286668.599, 286363.278, 286058.118, 285753.122, 285448.288, 285143.616, 284839.107, 284534.76, 284230.576, 283926.554, 283622.695, 283318.998, 283015.464, 282712.093, 282408.883, 282105.837, 281802.953, 281500.231, 281197.672, 280895.275, 280593.041, 280290.969, 279989.06, 279687.313, 279385.729, 279084.308, 278783.048, 278481.952, 278181.018, 277880.246, 277579.637, 277279.19, 276978.906, 276678.784, 276378.825, 276079.028, 275779.394, 275479.922, 275180.613, 274881.467, 274582.482, 274283.661, 273985.001, 273686.505, 273388.171, 273089.999, 272791.99, 272494.143, 272196.459, 271898.937, 271601.578, 271304.381, 271007.347, 270710.475, 270413.766, 270117.219, 269820.835, 269524.613, 269228.554, 268932.658, 268636.923, 268341.352, 268045.942, 267750.696, 267455.611, 267160.69, 266865.931, 266571.334, 266276.9, 265982.628, 265688.519, 265394.572, 265100.788, 264807.166, 264513.707, 264220.41, 263927.276, 263634.304, 263341.495, 263048.848, 262756.364, 262464.042, 262171.883, 261879.886, 261588.052, 261296.38, 261004.871, 260713.524, 260422.34, 260131.318, 259840.459, 259549.762, 259259.228, 258968.856, 258678.647, 258388.6, 258098.716, 257808.994, 257519.435, 257230.038, 256940.804, 256651.732, 256362.823, 256074.076, 255785.492, 255497.07, 255208.811, 254920.714, 254632.78, 254345.008, 254057.399, 253769.952, 253482.668, 253195.546, 252908.587, 252621.79, 252335.156, 252048.684, 251762.375, 251476.228, 251190.244, 250904.422, 250618.763, 250333.266, 250047.932, 249762.76, 249477.751, 249192.904, 248908.22, 248623.698, 248339.339, 248055.142, 247771.108, 247487.236, 247203.527, 246919.98, 246636.596, 246353.374, 246070.315, 245787.418, 245504.684, 245222.112, 244939.703, 244657.456, 244375.372, 244093.45, 243811.69, 243530.094, 243248.659, 242967.388, 242686.278, 242405.332, 242124.547, 241843.925, 241563.466, 241283.169, 241003.035, 240723.063, 240443.254, 240163.607, 239884.123, 239604.801, 239325.642, 239046.645, 238767.811, 238489.139, 238210.63, 237932.283, 237654.098, 237376.077, 237098.217, 236820.521, 236542.986, 236265.614, 235988.405, 235711.358, 235434.474, 235157.752, 234881.193, 234604.796, 234328.562, 234052.49, 233776.581, 233500.834, 233225.249, 232949.828, 232674.568, 232399.472, 232124.537, 231849.765, 231575.156, 231300.709, 231026.425, 230752.303, 230478.344, 230204.547, 229930.913, 229657.441, 229384.131, 229110.985, 228838, 228565.178, 228292.519, 228020.022, 227747.688, 227475.516, 227203.507, 226931.66, 226659.976, 226388.454, 226117.094, 225845.898, 225574.863, 225303.991, 225033.282, 224762.735, 224492.351, 224222.129, 223952.07, 223682.173, 223412.438, 223142.867, 222873.457, 222604.21, 222335.126, 222066.204, 221797.445, 221528.848, 221260.414, 220992.142, 220724.032, 220456.086, 220188.301, 219920.679, 219653.22, 219385.923, 219118.789, 218851.817, 218585.008, 218318.361, 218051.876, 217785.554, 217519.395, 217253.398, 216987.564, 216721.892, 216456.383, 216191.036, 215925.851, 215660.829, 215395.97, 215131.273, 214866.739, 214602.367, 214338.158, 214074.111, 213810.226, 213546.504, 213282.945, 213019.548, 212756.314, 212493.242, 212230.333, 211967.586, 211705.001, 211442.579, 211180.32, 210918.223, 210656.289, 210394.517, 210132.907, 209871.461, 209610.176, 209349.054, 209088.095, 208827.298, 208566.664, 208306.192, 208045.882, 207785.735, 207525.751, 207265.929, 207006.27, 206746.773, 206487.438, 206228.266, 205969.257, 205710.41, 205451.726, 205193.204, 204934.844, 204676.648, 204418.613, 204160.741, 203903.032, 203645.485, 203388.101, 203130.879, 202873.819, 202616.922, 202360.188, 202103.616, 201847.207, 201590.96, 201334.875, 201078.953, 200823.194, 200567.597, 200312.163, 200056.891, 199801.781, 199546.834, 199292.05, 199037.428, 198782.968, 198528.672, 198274.537, 198020.565, 197766.756, 197513.109, 197259.624, 197006.302, 196753.143, 196500.146, 196247.312, 195994.64, 195742.13, 195489.783, 195237.599, 194985.577, 194733.718, 194482.021, 194230.486, 193979.114, 193727.905, 193476.858, 193225.973, 192975.251, 192724.692, 192474.295, 192224.061, 191973.989, 191724.079, 191474.332, 191224.748, 190975.326, 190726.066, 190476.97, 190228.035, 189979.263, 189730.654, 189482.207, 189233.922, 188985.8, 188737.841, 188490.044, 188242.409, 187994.937, 187747.628, 187500.481, 187253.497, 187006.675, 186760.015, 186513.518, 186267.184, 186021.012, 185775.002, 185529.155, 185283.471, 185037.949, 184792.589, 184547.392, 184302.358, 184057.486, 183812.777, 183568.23, 183323.845, 183079.623, 182835.564, 182591.667, 182347.932, 182104.36, 181860.951, 181617.704, 181374.619, 181131.697, 180888.938, 180646.341, 180403.906, 180161.634, 179919.525, 179677.578, 179435.793, 179194.171, 178952.712, 178711.415, 178470.281, 178229.309, 177988.499, 177747.852, 177507.368, 177267.046, 177026.886, 176786.889, 176547.055, 176307.383, 176067.873, 175828.526, 175589.342, 175350.32, 175111.46, 174872.763, 174634.229, 174395.857, 174157.647, 173919.6, 173681.716, 173443.994, 173206.434, 172969.037, 172731.803, 172494.731, 172257.821, 172021.074, 171784.49, 171548.068, 171311.808, 171075.711, 170839.777, 170604.004, 170368.395, 170132.948, 169897.663, 169662.541, 169427.582, 169192.785, 168958.15, 168723.678, 168489.369, 168255.222, 168021.237, 167787.415, 167553.756, 167320.259, 167086.924, 166853.752, 166620.743, 166387.896, 166155.211, 165922.689, 165690.33, 165458.133, 165226.098, 164994.226, 164762.516, 164530.969, 164299.585, 164068.363, 163837.303, 163606.406, 163375.672, 163145.1, 162914.69, 162684.443, 162454.359, 162224.437, 161994.677, 161765.08, 161535.645, 161306.373, 161077.264, 160848.317, 160619.532, 160390.91, 160162.451, 159934.154, 159706.019, 159478.047, 159250.238, 159022.59, 158795.106, 158567.784, 158340.624, 158113.627, 157886.793, 157660.121, 157433.611, 157207.264, 156981.08, 156755.057, 156529.198, 156303.501, 156077.966, 155852.594, 155627.385, 155402.338, 155177.453, 154952.731, 154728.171, 154503.774, 154279.54, 154055.468, 153831.558, 153607.811, 153384.227, 153160.804, 152937.545, 152714.448, 152491.513, 152268.741, 152046.132, 151823.685, 151601.4, 151379.278, 151157.318, 150935.521, 150713.887, 150492.415, 150271.105, 150049.958, 149828.973, 149608.151, 149387.492, 149166.995, 148946.66, 148726.488, 148506.478, 148286.631, 148066.947, 147847.425, 147628.065, 147408.868, 147189.833, 146970.961, 146752.252, 146533.705, 146315.32, 146097.098, 145879.038, 145661.141, 145443.407, 145225.835, 145008.425, 144791.178, 144574.093, 144357.171, 144140.412, 143923.815, 143707.38, 143491.108, 143274.998, 143059.051, 142843.267, 142627.645, 142412.185, 142196.888, 141981.753, 141766.781, 141551.972, 141337.324, 141122.84, 140908.518, 140694.358, 140480.361, 140266.526, 140052.854, 139839.345, 139625.998, 139412.813, 139199.791, 138986.931, 138774.234, 138561.7, 138349.327, 138137.118, 137925.071, 137713.186, 137501.464, 137289.904, 137078.507, 136867.273, 136656.2, 136445.291, 136234.544, 136023.959, 135813.537, 135603.277, 135393.18, 135183.246, 134973.474, 134763.864, 134554.417, 134345.132, 134136.01, 133927.05, 133718.253, 133509.619, 133301.147, 133092.837, 132884.69, 132676.705, 132468.883, 132261.223, 132053.726, 131846.392, 131639.219, 131432.21, 131225.363, 131018.678, 130812.156, 130605.796, 130399.599, 130193.565, 129987.692, 129781.983, 129576.436, 129371.051, 129165.829, 128960.769, 128755.872, 128551.137, 128346.565, 128142.156, 127937.908, 127733.824, 127529.902, 127326.142, 127122.545, 126919.11, 126715.838, 126512.728, 126309.781, 126106.997, 125904.375, 125701.915, 125499.618, 125297.483, 125095.511, 124893.701, 124692.054, 124490.569, 124289.247, 124088.088, 123887.09, 123686.256, 123485.584, 123285.074, 123084.727, 122884.542, 122684.52, 122484.66, 122284.963, 122085.429, 121886.056, 121686.847, 121487.8, 121288.915, 121090.193, 120891.633, 120693.236, 120495.001, 120296.929, 120099.019, 119901.272, 119703.688, 119506.265, 119309.006, 119111.909, 118914.974, 118718.202, 118521.592, 118325.145, 118128.86, 117932.738, 117736.778, 117540.981, 117345.346, 117149.874, 116954.565, 116759.417, 116564.433, 116369.611, 116174.951, 115980.454, 115786.119, 115591.947, 115397.937, 115204.09, 115010.405, 114816.883, 114623.523, 114430.326, 114237.292, 114044.419, 113851.71, 113659.162, 113466.778, 113274.556, 113082.496, 112890.599, 112698.864, 112507.292, 112315.882, 112124.635, 111933.55, 111742.628, 111551.868, 111361.271, 111170.836, 110980.564, 110790.455, 110600.507, 110410.723, 110221.101, 110031.641, 109842.344, 109653.209, 109464.237, 109275.427, 109086.78, 108898.295, 108709.973, 108521.813, 108333.816, 108145.981, 107958.309, 107770.799, 107583.452, 107396.267, 107209.245, 107022.386, 106835.688, 106649.154, 106462.781, 106276.572, 106090.524, 105904.64, 105718.918, 105533.358, 105347.961, 105162.726, 104977.654, 104792.744, 104607.997, 104423.412, 104238.99, 104054.73, 103870.633, 103686.698, 103502.926, 103319.316, 103135.869, 102952.584, 102769.462, 102586.502, 102403.705, 102221.07, 102038.598, 101856.288, 101674.141, 101492.157, 101310.334, 101128.675, 100947.177, 100765.843, 100584.67, 100403.661, 100222.813, 100042.129, 99861.606, 99681.247, 99501.049, 99321.015, 99141.143, 98961.433, 98781.886, 98602.501, 98423.279, 98244.219, 98065.322, 97886.587, 97708.015, 97529.605, 97351.358, 97173.273, 96995.351, 96817.591, 96639.994, 96462.559, 96285.287, 96108.177, 95931.23, 95754.445, 95577.823, 95401.363, 95225.066, 95048.931, 94872.959, 94697.149, 94521.502, 94346.017, 94170.695, 93995.535, 93820.538, 93645.703, 93471.031, 93296.521, 93122.174, 92947.989, 92773.967, 92600.107, 92426.41, 92252.875, 92079.503, 91906.293, 91733.246, 91560.361, 91387.639, 91215.079, 91042.682, 90870.447, 90698.375, 90526.465, 90354.718, 90183.133, 90011.711, 89840.451, 89669.354, 89498.419, 89327.647, 89157.037, 88986.59, 88816.305, 88646.183, 88476.223, 88306.426, 88136.791, 87967.318, 87798.009, 87628.861, 87459.877, 87291.054, 87122.395, 86953.897, 86785.563, 86617.39, 86449.381, 86281.533, 86113.849, 85946.326, 85778.966, 85611.769, 85444.734, 85277.862, 85111.152, 84944.605, 84778.22, 84611.998, 84445.938, 84280.041, 84114.306, 83948.734, 83783.324, 83618.077, 83452.992, 83288.07, 83123.31, 82958.713, 82794.278, 82630.006, 82465.896, 82301.949, 82138.164, 81974.542, 81811.082, 81647.784, 81484.65, 81321.677, 81158.868, 80996.22, 80833.735, 80671.413, 80509.253, 80347.256, 80185.421, 80023.749, 79862.239, 79700.892, 79539.707, 79378.685, 79217.825, 79057.128, 78896.593, 78736.221, 78576.011, 78415.964, 78256.079, 78096.356, 77936.797, 77777.399, 77618.165, 77459.092, 77300.182, 77141.435, 76982.85, 76824.428, 76666.168, 76508.071, 76350.136, 76192.364, 76034.754, 75877.307, 75720.022, 75562.9, 75405.94, 75249.143, 75092.508, 74936.035, 74779.726, 74623.578, 74467.594, 74311.771, 74156.111, 74000.614, 73845.279, 73690.107, 73535.097, 73380.25, 73225.565, 73071.043, 72916.683, 72762.486, 72608.451, 72454.578, 72300.869, 72147.321, 71993.936, 71840.714, 71687.654, 71534.757, 71382.022, 71229.45, 71077.04, 70924.793, 70772.708, 70620.786, 70469.026, 70317.428, 70165.994, 70014.721, 69863.612, 69712.664, 69561.879, 69411.257, 69260.797, 69110.5, 68960.365, 68810.393, 68660.583, 68510.936, 68361.451, 68212.128, 68062.969, 67913.971, 67765.136, 67616.464, 67467.954, 67319.607, 67171.422, 67023.4, 66875.54, 66727.843, 66580.308, 66432.935, 66285.726, 66138.678, 65991.793, 65845.071, 65698.511, 65552.114, 65405.879, 65259.807, 65113.897, 64968.15, 64822.565, 64677.142, 64531.883, 64386.785, 64241.85, 64097.078, 63952.468, 63808.021, 63663.736, 63519.614, 63375.654, 63231.856, 63088.222, 62944.749, 62801.439, 62658.292, 62515.307, 62372.485, 62229.825, 62087.328, 61944.993, 61802.821, 61660.811, 61518.963, 61377.278, 61235.756, 61094.396, 60953.199, 60812.164, 60671.292, 60530.582, 60390.035, 60249.65, 60109.427, 59969.367, 59829.47, 59689.735, 59550.163, 59410.753, 59271.506, 59132.421, 58993.498, 58854.739, 58716.141, 58577.706, 58439.434, 58301.324, 58163.377, 58025.592, 57887.97, 57750.51, 57613.212, 57476.077, 57339.105, 57202.295, 57065.648, 56929.163, 56792.841, 56656.681, 56520.683, 56384.849, 56249.176, 56113.666, 55978.319, 55843.134, 55708.112, 55573.252, 55438.555, 55304.02, 55169.647, 55035.437, 54901.39, 54767.505, 54633.783, 54500.223, 54366.826, 54233.591, 54100.518, 53967.608, 53834.861, 53702.276, 53569.854, 53437.594, 53305.497, 53173.562, 53041.789, 52910.179, 52778.732, 52647.447, 52516.325, 52385.365, 52254.568, 52123.933, 51993.46, 51863.15, 51733.003, 51603.018, 51473.196, 51343.536, 51214.039, 51084.704, 50955.531, 50826.521, 50697.674, 50568.989, 50440.467, 50312.107, 50183.909, 50055.875, 49928.002, 49800.292, 49672.745, 49545.36, 49418.138, 49291.078, 49164.18, 49037.445, 48910.873, 48784.463, 48658.216, 48532.131, 48406.209, 48280.449, 48154.851, 48029.416, 47904.144, 47779.034, 47654.087, 47529.302, 47404.679, 47280.22, 47155.922, 47031.787, 46907.815, 46784.005, 46660.358, 46536.873, 46413.55, 46290.39, 46167.393, 46044.558, 45921.886, 45799.376, 45677.028, 45554.843, 45432.821, 45310.961, 45189.264, 45067.729, 44946.356, 44825.147, 44704.099, 44583.214, 44462.492, 44341.932, 44221.535, 44101.3, 43981.227, 43861.317, 43741.57, 43621.985, 43502.563, 43383.303, 43264.205, 43145.27, 43026.498, 42907.888, 42789.441, 42671.156, 42553.033, 42435.073, 42317.276, 42199.641, 42082.169, 41964.859, 41847.711, 41730.727, 41613.904, 41497.244, 41380.747, 41264.412, 41148.239, 41032.23, 40916.382, 40800.697, 40685.175, 40569.815, 40454.617, 40339.583, 40224.71, 40110, 39995.453, 39881.068, 39766.845, 39652.786, 39538.888, 39425.153, 39311.581, 39198.171, 39084.923, 38971.839, 38858.916, 38746.156, 38633.559, 38521.124, 38408.851, 38296.742, 38184.794, 38073.009, 37961.387, 37849.927, 37738.629, 37627.495, 37516.522, 37405.712, 37295.065, 37184.58, 37074.257, 36964.097, 36854.1, 36744.265, 36634.593, 36525.083, 36415.735, 36306.55, 36197.528, 36088.668, 35979.951, 35871.297, 35762.698, 35654.156, 35545.672, 35437.247, 35328.884, 35220.583, 35112.347, 35004.176, 34896.073, 34788.038, 34680.074, 34572.182, 34464.363, 34356.62, 34248.952, 34141.363, 34033.854, 33926.426, 33819.08, 33711.819, 33604.643, 33497.555, 33390.555, 33283.646, 33176.829, 33070.105, 32963.476, 32856.944, 32750.509, 32644.174, 32537.941, 32431.81, 32325.783, 32219.862, 32114.048, 32008.343, 31902.748, 31797.265, 31691.896, 31586.641, 31481.503, 31376.483, 31271.582, 31166.803, 31062.146, 30957.613, 30853.206, 30748.926, 30644.775, 30540.754, 30436.865, 30333.109, 30229.489, 30126.004, 30022.658, 29919.451, 29816.385, 29713.462, 29610.683, 29508.049, 29405.563, 29303.225, 29201.038, 29099.002, 28997.12, 28895.392, 28793.821, 28692.408, 28591.154, 28490.062, 28389.132, 28288.365, 28187.765, 28087.332, 27987.067, 27886.972, 27787.05, 27687.3, 27587.726, 27488.327, 27389.107, 27290.066, 27191.206, 27092.528, 26994.035, 26895.727, 26797.606, 26699.674, 26601.932, 26504.382, 26407.025, 26309.862, 26212.896, 26116.128, 26019.559, 25923.192, 25827.026, 25731.065, 25635.309, 25539.76, 25444.42, 25349.29, 25254.371, 25159.666, 25065.176, 24970.902, 24876.845, 24783.008, 24689.392, 24595.998, 24502.829, 24409.884, 24317.167, 24224.678, 24132.42, 24040.393, 23948.599, 23857.04, 23765.717, 23674.632, 23583.786, 23493.181, 23402.819, 23312.7, 23222.827, 23133.201, 23043.823, 22954.695, 22865.819, 22777.196, 22688.828, 22600.716, 22512.862, 22425.267, 22337.932, 22250.86, 22164.052, 22077.51, 21991.234, 21905.227, 21819.49, 21734.024, 21648.832, 21563.914, 21479.272, 21394.908, 21310.823, 21227.019, 21143.498, 21060.26, 20977.307, 20894.642, 20812.265, 20730.177, 20648.382, 20566.879, 20485.671, 20404.759, 20324.111, 20243.58, 20163.152, 20082.829, 20002.611, 19922.5, 19842.497, 19762.604, 19682.822, 19603.151, 19523.594, 19444.152, 19364.825, 19285.615, 19206.524, 19127.553, 19048.703, 18969.975, 18891.371, 18812.891, 18734.538, 18656.313, 18578.216, 18500.249, 18422.413, 18344.711, 18267.142, 18189.708, 18112.411, 18035.251, 17958.231, 17881.351, 17804.612, 17728.017, 17651.566, 17575.26, 17499.101, 17423.09, 17347.229, 17271.518, 17195.959, 17120.554, 17045.302, 16970.207, 16895.269, 16820.489, 16745.869, 16671.41, 16597.113, 16522.98, 16449.011, 16375.209, 16301.573, 16228.107, 16154.811, 16081.686, 16008.733, 15935.954, 15863.351, 15790.923, 15718.674, 15646.603, 15574.713, 15503.004, 15431.479, 15360.137, 15288.981, 15218.011, 15147.229, 15076.637, 15006.235, 14936.026, 14866.009, 14796.187, 14726.56, 14657.131, 14587.899, 14518.868, 14450.037, 14381.408, 14312.983, 14244.763, 14176.749, 14108.941, 14041.343, 13973.954, 13906.777, 13839.812, 13773.061, 13706.525, 13640.205, 13574.103, 13508.219, 13442.556, 13377.115, 13311.896, 13246.901, 13182.132, 13117.589, 13053.274, 12989.188, 12925.333, 12861.709, 12798.319, 12735.163, 12672.243, 12609.559, 12547.114, 12484.908, 12422.943, 12361.22, 12299.741, 12238.506, 12177.517, 12116.775, 12056.282, 11996.039, 11936.046, 11876.306, 11816.82, 11757.589, 11698.614, 11639.896, 11581.438, 11523.238, 11465.298, 11407.614, 11350.183, 11293.001, 11236.066, 11179.375, 11122.925, 11066.712, 11010.734, 10954.988, 10899.47, 10844.178, 10789.109, 10734.259, 10679.625, 10625.206, 10570.996, 10516.994, 10463.197, 10409.601, 10356.204, 10303.002, 10249.992, 10197.172, 10144.538, 10092.087, 10039.817, 9987.724, 9935.805, 9884.058, 9832.478, 9781.064, 9729.812, 9678.719, 9627.783, 9576.999, 9526.366, 9475.88, 9425.537, 9375.336, 9325.273, 9275.345, 9225.549, 9175.881, 9126.34, 9076.922, 9027.623, 8978.441, 8929.374, 8880.417, 8831.567, 8782.823, 8734.18, 8685.637, 8637.189, 8588.833, 8540.567, 8492.388, 8444.293, 8396.278, 8348.341, 8300.478, 8252.687, 8204.965, 8157.308, 8109.714, 8062.179, 8014.7, 7967.275, 7919.9, 7872.573, 7825.29, 7778.049, 7730.846, 7683.678, 7636.542, 7589.436, 7542.356, 7495.299, 7448.263, 7401.243, 7354.238, 7307.244, 7260.258, 7213.277, 7166.298, 7119.319, 7072.335, 7025.345, 6978.344, 6931.33, 6884.301, 6837.252, 6790.181, 6743.086, 6695.962, 6648.807, 6601.617, 6554.391, 6507.125, 6459.819, 6412.478, 6365.106, 6317.705, 6270.281, 6222.836, 6175.374, 6127.9, 6080.416, 6032.927, 5985.437, 5937.949, 5890.467, 5842.995, 5795.536, 5748.095, 5700.675, 5653.279, 5605.913, 5558.578, 5511.28, 5464.022, 5416.807, 5369.64, 5322.524, 5275.463, 5228.461, 5181.521, 5134.648, 5087.844, 5041.115, 4994.463, 4947.892, 4901.407, 4855.011, 4808.707, 4762.499, 4716.392, 4670.389, 4624.494, 4578.71, 4533.041, 4487.491, 4442.065, 4396.764, 4351.594, 4306.559, 4261.661, 4216.905, 4172.294, 4127.832, 4083.523, 4039.371, 3995.38, 3951.553, 3907.894, 3864.406, 3821.094, 3777.962, 3735.012, 3692.25, 3649.678, 3607.3, 3565.121, 3523.143, 3481.372, 3439.809, 3398.46, 3357.328, 3316.417, 3275.73, 3235.272, 3195.045, 3155.055, 3115.304, 3075.796, 3036.536, 2997.527, 2958.772, 2920.275, 2882.041, 2844.073, 2806.375, 2768.95, 2731.802, 2694.936, 2658.354, 2622.061, 2586.06, 2550.355, 2514.95, 2479.849, 2445.056, 2410.573, 2376.406, 2342.557, 2309.03, 2275.83, 2242.96, 2210.424, 2178.226, 2146.368, 2114.856, 2083.693, 2052.882, 2022.428, 1992.334, 1962.603, 1933.241, 1904.25, 1875.634, 1847.397, 1819.543, 1792.076, 1764.999, 1738.316, 1712.031, 1686.147, 1660.669, 1635.6, 1610.938, 1586.677, 1562.813, 1539.339, 1516.25, 1493.54, 1471.204, 1449.236, 1427.63, 1406.38, 1385.482, 1364.929, 1344.716, 1324.837, 1305.287, 1286.059, 1267.149, 1248.55, 1230.257, 1212.264, 1194.567, 1177.158, 1160.033, 1143.185, 1126.61, 1110.301, 1094.253, 1078.461, 1062.918, 1047.618, 1032.558, 1017.73, 1003.13, 988.752, 974.591, 960.641, 946.896, 933.352, 920.002, 906.841, 893.864, 881.066, 868.44, 855.981, 843.684, 831.544, 819.554, 807.71, 796.006, 784.436, 772.995, 761.677, 750.478, 739.391, 728.411, 717.533, 706.751, 696.059, 685.453, 674.926, 664.475, 654.097, 643.79, 633.55, 623.375, 613.262, 603.208, 593.21, 583.267, 573.374, 563.53, 553.731, 543.975, 534.258, 524.579, 514.935, 505.322, 495.738, 486.18, 476.646, 467.132, 457.636, 448.155, 438.687, 429.228, 419.777, 410.329, 400.883, 391.435, 381.983, 372.524, 363.056, 353.575, 344.079, 334.565, 325.03, 315.472, 305.887, 296.274, 286.629, 276.959, 267.275, 257.59, 247.916, 238.264, 228.648, 219.079, 209.569, 200.131, 190.776, 181.518];
var DELTAT_FUTURE_START = 2685e3;
var DELTAT_FUTURE_STEP = 9131.25;
var DELTAT_FUTURE = [1832.379, 1966.886, 2105.616, 2248.492, 2395.436, 2546.373, 2701.223, 2859.954, 3022.725, 3189.558, 3360.454, 3535.412, 3714.432, 3897.516, 4084.661, 4275.869, 4471.14, 4670.473, 4873.869, 5081.327, 5292.847, 5508.431, 5728.076, 5951.784, 6179.555, 6411.388, 6647.284, 6887.242, 7131.263, 7379.346, 7631.491, 7887.7, 8147.97, 8412.304, 8680.699, 8953.157, 9229.678, 9510.261, 9794.907, 10083.615, 10376.386, 10673.219, 10974.115, 11279.073, 11588.094, 11901.177, 12218.323, 12539.531, 12864.802, 13194.135, 13527.531, 13864.989, 14206.51, 14552.093, 14901.739, 15255.447, 15613.218, 15975.051, 16340.947, 16710.906, 17084.926, 17463.01, 17845.155, 18231.364, 18621.635, 19015.968, 19414.364, 19816.822, 20223.343, 20633.926, 21048.572, 21467.281, 21890.052, 22316.885, 22747.781, 23182.739, 23621.76, 24064.844, 24511.99, 24963.198, 25418.469, 25877.802, 26341.198, 26808.657, 27280.178, 27755.761, 28235.407, 28719.116, 29206.887, 29698.72, 30194.616, 30694.575, 31198.596, 31706.68, 32218.826, 32735.034, 33255.305, 33779.639, 34308.035, 34840.493, 35377.015, 35917.598, 36462.244, 37010.953, 37563.724, 38120.558, 38681.454, 39246.412, 39815.434, 40388.517, 40965.664, 41546.872, 42132.143, 42721.477, 43314.873, 43912.332, 44513.853, 45119.437, 45729.083, 46342.792, 46960.563, 47582.397, 48208.293, 48838.252, 49472.274, 50110.357, 50752.504, 51398.713, 52048.984, 52703.318, 53361.714, 54024.173, 54690.695, 55361.278, 56035.925, 56714.634, 57397.405, 58084.239, 58775.136, 59470.095, 60169.116, 60872.2, 61579.347, 62290.556, 63005.827, 63725.161, 64448.558, 65176.017, 65907.538, 66643.122, 67382.769, 68126.478, 68874.25, 69626.084, 70381.98, 71141.94, 71905.961, 72674.045, 73446.192, 74222.401, 75002.673, 75787.007, 76575.404, 77367.863, 78164.385, 78964.969, 79769.616, 80578.325, 81391.097, 82207.932, 83028.828, 83853.788, 84682.81, 85515.894, 86353.041, 87194.25, 88039.522, 88888.857, 89742.254, 90599.713, 91461.235, 92326.819, 93196.466, 94070.176, 94947.948, 95829.782, 96715.679, 97605.639, 98499.661, 99397.746, 100299.893, 101206.102, 102116.375, 103030.709, 103949.106, 104871.566, 105798.088, 106728.673, 107663.32, 108602.03, 109544.802, 110491.637, 111442.534, 112397.494, 113356.516, 114319.601, 115286.748, 116257.958, 117233.231, 118212.565, 119195.963, 120183.423, 121174.945, 122170.53, 123170.178, 124173.888, 125181.66, 126193.495, 127209.393, 128229.353, 129253.375, 130281.46, 131313.608, 132349.818, 133390.09, 134434.426, 135482.823, 136535.283, 137591.806, 138652.391, 139717.039, 140785.749, 141858.522, 142935.357, 144016.255, 145101.215, 146190.238, 147283.323, 148380.471, 149481.682, 150586.954, 151696.29, 152809.688, 153927.148, 155048.671, 156174.257, 157303.905, 158437.615, 159575.388, 160717.224, 161863.122, 163013.082, 164167.105, 165325.191, 166487.339, 167653.55, 168823.823, 169998.159, 171176.557, 172359.017, 173545.541, 174736.126, 175930.775, 177129.485, 178332.259, 179539.095, 180749.993, 181964.954, 183183.977, 184407.063, 185634.212, 186865.422, 188100.696, 189340.032, 190583.43, 191830.891, 193082.415, 194338.001, 195597.65, 196861.361, 198129.134, 199400.97, 200676.869, 201956.83, 203240.854, 204528.94, 205821.089, 207117.3, 208417.574, 209721.91, 211030.309, 212342.77, 213659.294, 214979.88, 216304.529, 217633.241, 218966.015, 220302.851, 221643.75, 222988.712, 224337.736, 225690.822, 227047.971, 228409.183, 229774.457, 231143.794, 232517.193, 233894.654, 235276.178, 236661.765, 238051.414, 239445.126, 240842.9, 242244.737, 243650.637, 245060.598, 246474.623, 247892.71, 249314.859, 250741.071, 252171.345, 253605.682, 255044.082, 256486.544, 257933.068, 259383.655, 260838.305, 262297.017, 263759.792, 265226.629, 266697.529, 268172.491, 269651.515, 271134.603, 272621.752, 274112.965, 275608.24, 277107.577, 278610.977, 280118.439, 281629.964, 283145.551, 284665.201, 286188.914, 287716.689, 289248.526, 290784.426, 292324.389, 293868.414, 295416.502, 296968.652, 298524.864, 300085.14, 301649.477, 303217.878, 304790.34, 306366.866, 307947.453, 309532.104, 311120.817, 312713.592, 314310.43, 315911.33, 317516.293, 319125.319, 320738.407, 322355.557, 323976.77, 325602.046, 327231.384, 328864.785, 330502.248, 332143.773, 333789.362, 335439.012, 337092.726, 338750.501, 340412.34, 342078.24, 343748.204, 345422.23, 347100.318, 348782.469, 350468.682, 352158.958, 353853.297, 355551.698, 357254.162, 358960.688, 360671.276, 362385.927, 364104.641, 365827.417, 367554.256, 369285.157, 371020.121, 372759.147, 374502.236, 376249.388, 378000.601, 379755.878, 381515.217, 383278.618, 385046.082, 386817.609, 388593.198, 390372.849, 392156.563, 393944.34, 395736.179, 397532.081, 399332.045, 401136.072, 402944.161, 404756.313, 406572.527, 408392.804, 410217.144, 412045.545, 413878.01, 415714.537, 417555.126, 419399.778, 421248.493, 423101.27, 424958.11, 426819.012, 428683.976, 430553.004, 432426.093, 434303.246, 436184.46, 438069.738, 439959.078, 441852.48, 443749.945, 445651.472, 447557.062, 449466.715, 451380.43, 453298.207, 455220.047, 457145.95, 459075.915, 461009.943, 462948.033, 464890.186, 466836.401, 468786.679, 470741.019, 472699.422, 474661.887, 476628.415, 478599.006, 480573.659, 482552.374, 484535.152, 486521.993, 488512.896, 490507.861, 492506.889, 494509.98, 496517.133, 498528.349, 500543.627, 502562.968, 504586.372, 506613.837, 508645.366, 510680.957, 512720.61, 514764.326, 516812.105, 518863.946, 520919.849, 522979.815, 525043.844, 527111.935, 529184.089, 531260.305, 533340.584, 535424.925, 537513.329, 539605.796, 541702.325, 543802.916, 545907.57, 548016.286, 550129.065, 552245.907, 554366.811, 556491.778, 558620.807, 560753.899, 562891.053, 565032.27, 567177.549, 569326.891, 571480.295, 573637.762, 575799.292, 577964.884, 580134.538, 582308.255, 584486.035, 586667.877, 588853.781, 591043.749, 593237.778, 595435.87, 597638.025, 599844.243, 602054.522, 604268.865, 606487.27, 608709.737, 610936.267, 613166.86, 615401.515, 617640.232, 619883.012, 622129.855, 624380.76, 626635.728, 628894.758, 631157.851, 633425.006, 635696.224, 637971.505, 640250.848, 642534.253, 644821.721, 647113.252, 649408.845, 651708.5, 654012.218, 656319.999, 658631.842, 660947.748, 663267.716, 665591.747, 667919.84, 670251.996, 672588.215, 674928.496, 677272.839, 679621.245, 681973.714, 684330.245, 686690.839, 689055.495, 691424.214, 693796.995, 696173.839, 698554.745, 700939.714, 703328.745, 705721.839, 708118.996, 710520.215, 712925.496, 715334.84, 717748.247, 720165.716, 722587.248, 725012.842, 727442.499, 729876.218, 732314, 734755.844, 737201.751, 739651.721, 742105.753, 744563.847, 747026.004, 749492.224, 751962.506, 754436.851, 756915.258, 759397.728, 761884.26, 764374.855, 766869.512, 769368.232];

// node_modules/naelos-ephemeris/dist/deltat.js
function hermite(values, start, step, jd) {
  const last = values.length - 1;
  const x = (jd - start) / step;
  let i = Math.floor(x);
  if (i < 1)
    i = 1;
  else if (i > last - 2)
    i = last - 2;
  const u = x - i;
  const p0 = values[i - 1], p1 = values[i], p2 = values[i + 1], p3 = values[i + 2];
  const m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
}
var QUARTER_FROM = DELTAT_START + DELTAT_STEP;
var QUARTER_TO = DELTAT_START + (DELTAT.length - 2) * DELTAT_STEP;
function deltaT(jdUT) {
  if (jdUT < QUARTER_FROM)
    return hermite(DELTAT_PAST, DELTAT_PAST_START, DELTAT_PAST_STEP, jdUT);
  if (jdUT > QUARTER_TO)
    return hermite(DELTAT_FUTURE, DELTAT_FUTURE_START, DELTAT_FUTURE_STEP, jdUT);
  return hermite(DELTAT, DELTAT_START, DELTAT_STEP, jdUT);
}
var YEAR = 365.25;
var J2400 = 25976415e-1;
var J1820 = 2385801;
function deltaTUncertainty(jdUT) {
  if (jdUT <= MEASURED_UNTIL) {
    if (jdUT >= 24351085e-1)
      return 1e-3;
    if (jdUT >= 24150205e-1)
      return 0.1;
    if (jdUT >= 24004105e-1)
      return 0.5;
    if (jdUT >= 23784965e-1)
      return 1;
    if (jdUT >= 23419725e-1)
      return 5;
    const t = (jdUT - J1820) / 36525;
    return Math.max(20, 0.8 * t * t);
  }
  const years = (jdUT - MEASURED_UNTIL) / YEAR;
  if (jdUT <= PREDICTED_UNTIL)
    return 1e-3 + 0.03 * years;
  const span = (J2400 - MEASURED_UNTIL) / YEAR;
  return 0.03 * ((PREDICTED_UNTIL - MEASURED_UNTIL) / YEAR) + 240 * (years / span) ** 2;
}

// node_modules/naelos-ephemeris/dist/houses.js
var D2R = Math.PI / 180;
var R2D = 180 / Math.PI;
var AS2R2 = Math.PI / 648e3;
var TWO_PI = 2 * Math.PI;
function earthRotationAngle(jdUT) {
  const t = jdUT - 2451545;
  const f = jdUT % 1;
  const theta = TWO_PI * (f + 0.779057273264 + 0.00273781191135448 * t);
  return (theta % TWO_PI + TWO_PI) % TWO_PI;
}
function apparentSiderealTime(jdUT, jdTT) {
  const t = centuries(jdTT);
  const era = earthRotationAngle(jdUT);
  const w = iauWeight(jdTT);
  let gmst = era + (0.014506 + (4612.156534 + (1.3915817 + (-44e-8 + (-29956e-9 - 368e-10 * t) * t) * t) * t) * t) * AS2R2;
  if (w < 1) {
    const long = era - meanEquationOfOrigins(jdTT);
    let d = (long - gmst) % TWO_PI;
    if (d > Math.PI)
      d -= TWO_PI;
    else if (d < -Math.PI)
      d += TWO_PI;
    gmst += (1 - w) * d;
  }
  const { dpsi, epsA } = frameOfDate(jdTT);
  const om = delaunay(t)[4];
  const eect = (264096e-8 * Math.sin(om) + 6352e-8 * Math.sin(2 * om)) * AS2R2;
  const gast = gmst + dpsi * Math.cos(epsA) + eect;
  return (gast % TWO_PI + TWO_PI) % TWO_PI;
}
var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function sky(theta, phi, eps) {
  const cp = Math.cos(phi), sp = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta);
  const zenith = [cp * ct, cp * st, sp];
  const north = [-sp * ct, -sp * st, cp];
  return { theta, phi, eps, zenith, north, east: cross(north, zenith), pole: [0, -Math.sin(eps), Math.cos(eps)] };
}
function longitudeOf(v, eps) {
  const y = v[1] * Math.cos(eps) + v[2] * Math.sin(eps);
  return norm360(Math.atan2(y, v[0]) * R2D);
}
function eclipticCrossing(s, n, side) {
  const d = cross(n, s.pole);
  return longitudeOf(dot2(d, side) >= 0 ? d : [-d[0], -d[1], -d[2]], s.eps);
}
function longitudeAtRA(ra, eps) {
  return norm360(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) * R2D);
}
var declinationOf = (lon, eps) => Math.asin(Math.sin(eps) * Math.sin(lon * D2R));
function ascendantAt(theta, phi, eps) {
  const s = sky(theta, phi, eps);
  return eclipticCrossing(s, s.zenith, s.east);
}
function poleAscendant(x1, f, eps) {
  const x = norm360(x1);
  const q = Math.floor(x / 90);
  const a2 = (y, g) => {
    const yr = y * D2R;
    let den = -Math.tan(g) * Math.sin(eps) + Math.cos(eps) * Math.cos(yr);
    const num = Math.sin(yr);
    if (Math.abs(den) < 1e-15)
      den = 0;
    if (Math.abs(num) < 1e-15)
      return den < 0 ? 180 : 0;
    if (den === 0)
      return 90;
    const r = Math.atan(num / den) * R2D;
    return r < 0 ? 180 + r : r;
  };
  if (q === 0)
    return norm360(a2(x, f));
  if (q === 1)
    return norm360(180 - a2(180 - x, -f));
  if (q === 2)
    return norm360(180 + a2(x - 180, -f));
  return norm360(360 - a2(360 - x, f));
}
function porphyry(asc, mc) {
  const c = new Array(12);
  const q1 = norm360(asc - mc);
  const q2 = norm360(mc + 180 - asc);
  c[0] = asc;
  c[9] = mc;
  c[10] = norm360(mc + q1 / 3);
  c[11] = norm360(mc + 2 * q1 / 3);
  c[1] = norm360(asc + q2 / 3);
  c[2] = norm360(asc + 2 * q2 / 3);
  return opposite(c);
}
function opposite(c) {
  c[3] = norm360(c[9] + 180);
  c[4] = norm360(c[10] + 180);
  c[5] = norm360(c[11] + 180);
  c[6] = norm360(c[0] + 180);
  c[7] = norm360(c[1] + 180);
  c[8] = norm360(c[2] + 180);
  return c;
}
function placidus(s, asc, mc) {
  const c = new Array(12);
  c[0] = asc;
  c[9] = mc;
  const tp = Math.tan(s.phi);
  const specs = [[10, 1 / 3, true], [11, 2 / 3, true], [1, 2 / 3, false], [2, 1 / 3, false]];
  for (const [idx, f, above] of specs) {
    let lon = norm360(mc + (above ? 30 : 120) + (idx === 11 || idx === 2 ? 30 : 0));
    for (let i = 0; i < 100; i++) {
      const x = -tp * Math.tan(declinationOf(lon, s.eps));
      if (Math.abs(x) > 1)
        return null;
      const sa = Math.acos(x);
      const ra = above ? s.theta + f * sa : s.theta + Math.PI - f * (Math.PI - sa);
      const next = longitudeAtRA(ra, s.eps);
      const step = Math.abs((next - lon + 540) % 360 - 180);
      lon = next;
      if (step < 1e-11)
        break;
    }
    c[idx] = lon;
  }
  return opposite(c);
}
function koch(s, asc, mc) {
  const x = Math.tan(s.phi) * Math.tan(declinationOf(mc, s.eps));
  if (Math.abs(x) > 1)
    return null;
  const dsa = Math.PI / 2 + Math.asin(x);
  const c = new Array(12);
  c[0] = asc;
  c[9] = mc;
  c[10] = ascendantAt(s.theta - 2 * dsa / 3, s.phi, s.eps);
  c[11] = ascendantAt(s.theta - dsa / 3, s.phi, s.eps);
  c[1] = ascendantAt(s.theta + dsa / 3, s.phi, s.eps);
  c[2] = ascendantAt(s.theta + 2 * dsa / 3, s.phi, s.eps);
  return opposite(c);
}
function axial(s, asc, kind) {
  const c = new Array(12);
  c[0] = asc;
  c[9] = eclipticCrossing(s, s.east, s.zenith);
  const point = (a) => {
    if (kind === "C") {
      return [
        Math.cos(a) * s.zenith[0] + Math.sin(a) * s.east[0],
        Math.cos(a) * s.zenith[1] + Math.sin(a) * s.east[1],
        Math.cos(a) * s.zenith[2] + Math.sin(a) * s.east[2]
      ];
    }
    const ra = s.theta + a;
    return [Math.cos(ra), Math.sin(ra), 0];
  };
  if (kind === "R") {
    const t = Math.tan(s.phi);
    const fh1 = Math.atan(t * 0.5), fh2 = Math.atan(t * Math.sqrt(3) / 2);
    const th = s.theta * R2D;
    const below = Math.abs((c[9] - longitudeAtRA(s.theta, s.eps) + 540) % 360 - 180) > 90 ? 180 : 0;
    c[10] = norm360(poleAscendant(th + 30, fh1, s.eps) + below);
    c[11] = norm360(poleAscendant(th + 60, fh2, s.eps) + below);
    c[1] = norm360(poleAscendant(th + 120, fh2, s.eps) + below);
    c[2] = norm360(poleAscendant(th + 150, fh1, s.eps) + below);
    return opposite(c);
  }
  for (const [idx, deg] of [[10, 30], [11, 60], [1, 120], [2, 150]]) {
    const p = point(deg * D2R);
    c[idx] = eclipticCrossing(s, cross(s.north, p), p);
  }
  return opposite(c);
}
function houses(jdUT, deltaTSeconds, lat, lon, system) {
  const jdTT = jdUT + deltaTSeconds / 86400;
  const eps = frameOfDate(jdTT).eps;
  const theta = apparentSiderealTime(jdUT, jdTT) + lon * D2R;
  const phi = lat * D2R;
  const s = sky(theta, phi, eps);
  const mc = longitudeAtRA(theta, eps);
  const asc = eclipticCrossing(s, s.zenith, s.east);
  const vertex = eclipticCrossing(s, s.north, [-s.east[0], -s.east[1], -s.east[2]]);
  const equatorialAscendant = ascendantAt(theta, 0, eps);
  let cusps;
  let used = system;
  switch (system) {
    case "W": {
      const first = Math.floor(asc / 30) * 30;
      cusps = Array.from({ length: 12 }, (_, i) => norm360(first + 30 * i));
      break;
    }
    case "A":
    case "E":
      cusps = Array.from({ length: 12 }, (_, i) => norm360(asc + 30 * i));
      break;
    case "O":
      cusps = porphyry(asc, mc);
      break;
    case "C":
    case "R":
      cusps = axial(s, asc, system);
      break;
    case "X":
      cusps = Array.from({ length: 12 }, (_, i) => longitudeAtRA(theta + (i + 3) % 12 * 30 * D2R, eps));
      break;
    case "M":
      cusps = Array.from({ length: 12 }, (_, i) => {
        const ra = theta + (i + 3) % 12 * 30 * D2R;
        return norm360(Math.atan2(Math.sin(ra) * Math.cos(eps), Math.cos(ra)) * R2D);
      });
      break;
    // Inside the polar circles some ecliptic degrees never rise or set, and
    // Placidus and Koch are undefined there. The rule is the latitude, not
    // whether this moment's cusps happen to compute: a chart must not change
    // system as the sky turns. Porphyry stands in, as in Swiss Ephemeris.
    case "P":
      cusps = Math.abs(phi) > Math.PI / 2 - eps ? null : placidus(s, asc, mc);
      break;
    case "K":
      cusps = Math.abs(phi) > Math.PI / 2 - eps ? null : koch(s, asc, mc);
      break;
    default:
      throw new Error(`unknown house system ${system}`);
  }
  const fallback = cusps === null;
  if (fallback) {
    cusps = porphyry(asc, mc);
    used = "O";
  }
  const shownMc = used === "C" || used === "R" ? cusps[9] : mc;
  return { cusps, ascendant: asc, mc: shownMc, armc: norm360(theta * R2D), vertex, equatorialAscendant, system: used, fallback };
}

// node_modules/naelos-ephemeris/dist/generated/lunar-mean.js
var LUNAR_MEAN_FROM_EPOCH = -13100;
var LUNAR_MEAN_STEP_YEARS = 100;
var MEAN_NODE_CORRECTION = [2.49333, 2.42081, 2.35592, 2.29118, 2.22314, 2.16896, 2.10487, 2.0414, 1.99045, 1.93075, 1.87696, 1.82377, 1.76748, 1.72364, 1.67107, 1.61849, 1.57697, 1.52848, 1.48438, 1.44038, 1.3946, 1.35915, 1.31614, 1.27316, 1.23908, 1.19995, 1.16442, 1.12752, 1.09062, 1.06254, 1.02702, 0.99233, 0.96481, 0.93322, 0.90533, 0.87459, 0.84487, 0.82342, 0.79379, 0.76617, 0.74427, 0.71849, 0.6971, 0.6716, 0.64722, 0.63142, 0.60687, 0.58431, 0.56754, 0.5464, 0.53021, 0.50948, 0.48933, 0.47846, 0.4584, 0.43963, 0.42759, 0.41016, 0.39763, 0.38172, 0.36438, 0.35725, 0.34144, 0.32503, 0.31671, 0.30274, 0.29239, 0.28072, 0.2658, 0.26114, 0.24975, 0.23491, 0.22971, 0.21924, 0.21025, 0.2021, 0.18969, 0.18641, 0.17872, 0.16559, 0.16201, 0.15483, 0.14677, 0.14082, 0.13099, 0.12836, 0.12348, 0.11235, 0.10957, 0.10546, 0.0987, 0.0941, 0.08699, 0.08509, 0.08198, 0.07309, 0.07095, 0.06859, 0.06377, 0.0596, 0.05427, 0.05367, 0.05098, 0.04409, 0.04273, 0.04117, 0.03838, 0.03475, 0.03059, 0.03179, 0.02953, 0.02385, 0.0241, 0.02277, 0.02114, 0.01913, 0.01475, 0.01737, 0.01615, 0.01007, 0.01204, 0.01091, 937e-5, 914e-5, 458e-5, 79e-4, 837e-5, 171e-5, 487e-5, 518e-5, 273e-5, 404e-5, 43e-5, 275e-5, 504e-5, -146e-5, 95e-5, 312e-5, -23e-5, 103e-5, -112e-5, 8e-5, 298e-5, -242e-5, -105e-5, 221e-5, -33e-5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 114e-5, -272e-5, -126e-5, 41e-5, -11e-4, -135e-5, -331e-5, -9e-4, 17e-5, -541e-5, -293e-5, -127e-5, -449e-5, -389e-5, -618e-5, -542e-5, -363e-5, -0.01011, -911e-5, -634e-5, -0.01133, -0.01158, -0.01259, -0.0138, -0.01233, -0.01782, -0.01899, -0.01593, -0.02056, -0.02329, -0.02344, -0.02496, -0.02596, -0.03081, -0.03268, -0.03185, -0.03608, -0.04003, -0.04182, -0.04282, -0.04545, -0.05155, -0.05276, -0.05333, -0.05905, -0.06234, -0.06559, -0.06808, -0.07022, -0.07832, -0.08075, -0.08093, -0.08927, -0.09393, -0.09659, -0.10205, -0.10548, -0.11308, -0.11844, -0.11914, -0.1275, -0.1353, -0.13754, -0.1435, -0.15039, -0.15718, -0.16365, -0.16746, -0.17551, -0.18503, -0.18977, -0.19587, -0.20498, -0.21418, -0.22081, -0.22661, -0.2373, -0.24696, -0.25301, -0.26181, -0.27122, -0.28169, -0.29094, -0.29676, -0.30938, -0.32189, -0.32731, -0.33866, -0.35151, -0.36083, -0.3732, -0.38199, -0.39385, -0.40991, -0.41699, -0.42803, -0.44451, -0.45473, -0.46683, -0.47883, -0.4918, -0.50789, -0.51725, -0.52991, -0.54683, -0.55889, -0.57273, -0.58497, -0.60035, -0.6181, -0.62684, -0.64214, -0.66101, -0.67137, -0.68765, -0.70155, -0.71482, -0.73519, -0.7442, -0.75789, -0.77962, -0.78929, -0.80419, -0.82063, -0.83352, -0.8524, -0.86299, -0.87668, -0.89714, -0.90735, -0.92193, -0.9368, -0.94991, -0.9679, -0.97578, -0.98971, -1.00932, -1.01569, -1.03006, -1.04444, -1.05319, -1.0708, -1.07744, -1.08713, -1.10663];
var MEAN_APOGEE_CORRECTION = [-1.94399, -1.90493, -1.81199, -1.76402, -1.71281, -1.63004, -1.60466, -1.52838, -1.4767, -1.44177, -1.37165, -1.35034, -1.29459, -1.24664, -1.22149, -1.15544, -1.14378, -1.09971, -1.05098, -1.04455, -0.98052, -0.96797, -0.93847, -0.89156, -0.89488, -0.83952, -0.82182, -0.8056, -0.75221, -0.76505, -0.72565, -0.69568, -0.69914, -0.64484, -0.65088, -0.62642, -0.59327, -0.6052, -0.55609, -0.55628, -0.542, -0.50469, -0.52231, -0.48688, -0.47301, -0.46792, -0.43193, -0.44517, -0.41665, -0.40572, -0.40959, -0.36679, -0.38404, -0.35796, -0.33998, -0.35664, -0.31673, -0.32544, -0.30783, -0.28598, -0.30722, -0.26839, -0.27602, -0.27156, -0.23143, -0.25999, -0.22906, -0.22255, -0.23608, -0.19745, -0.21648, -0.19168, -0.182, -0.19935, -0.1631, -0.17981, -0.16539, -0.14427, -0.16428, -0.1362, -0.14522, -0.13886, -0.11753, -0.13503, -0.10091, -0.11622, -0.11648, -0.08712, -0.1149, -0.08248, -0.08646, -0.09285, -0.0642, -0.09403, -0.06743, -0.06255, -0.07932, -0.04133, -0.0713, -0.05965, -0.03995, -0.06419, -0.02982, -0.04869, -0.04067, -0.02707, -0.05368, -0.0198, -0.03534, -0.0307, -0.01164, -0.03925, -0.01528, -0.02647, -0.02261, -274e-5, -0.03383, -203e-5, -0.016, -0.02608, 855e-5, -0.02455, 13e-4, -287e-5, -0.01955, 809e-5, -0.02073, 346e-5, 255e-5, -0.01555, 0.01408, -0.01507, -407e-5, 392e-5, -978e-5, 0.01425, -0.01453, 348e-5, 533e-5, -0.01712, 0.02137, -0.01135, 301e-5, 0.01128, -0.0181, 0.01418, -0.01001, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 796e-5, -0.01665, 0.02042, -999e-5, -109e-5, 0.01155, -0.01914, 0.01445, -916e-5, 256e-5, 0.01347, -0.01841, 0.01325, -769e-5, -246e-5, 0.01325, -789e-5, 0.01688, -694e-5, 521e-5, 0.01326, -878e-5, 0.02844, -315e-5, 92e-4, 0.02012, -639e-5, 0.02893, 268e-5, 0.02024, 0.02644, 163e-5, 0.03343, 0.01116, 0.02781, 0.0324, 0.02276, 0.04841, 0.01803, 0.04419, 0.04374, 0.03204, 0.06843, 0.03571, 0.06018, 0.05989, 0.04882, 0.08177, 0.05548, 0.08626, 0.07878, 0.07571, 0.10192, 0.07939, 0.11569, 0.10141, 0.11491, 0.13599, 0.10725, 0.14866, 0.13551, 0.14786, 0.17105, 0.15444, 0.1885, 0.17222, 0.19397, 0.20852, 0.20185, 0.24271, 0.22065, 0.25264, 0.26028, 0.25801, 0.30282, 0.28127, 0.32313, 0.32644, 0.32964, 0.36667, 0.35528, 0.39972, 0.39468, 0.42273, 0.44893, 0.43706, 0.49008, 0.48269, 0.51837, 0.5452, 0.54698, 0.59766, 0.58996, 0.63267, 0.65425, 0.67256, 0.72048, 0.7164, 0.77185, 0.77991, 0.81065, 0.86075, 0.86145, 0.9276, 0.93454, 0.97576, 1.01756, 1.03482, 1.10045, 1.10891, 1.17591, 1.20272, 1.23459, 1.30269, 1.31134, 1.38835, 1.4156, 1.46728, 1.52707, 1.54972, 1.62817, 1.65455, 1.72765, 1.77786, 1.8236, 1.90782, 1.92905, 2.01751, 2.06872, 2.12864, 2.21261, 2.25333, 2.34716, 2.38944, 2.47434, 2.5487, 2.60553, 2.71326, 2.75449, 2.85791, 2.92699, 3.0007, 3.10617, 3.16479, 3.28261];

// node_modules/naelos-ephemeris/dist/lunar-points.js
var GM = (398600.435507 + 4902.800118) * 86400 * 86400;
var AU_KM2 = 1495978707e-1;
var D2R2 = Math.PI / 180;
var MEAN_DISTANCE_KM = 384400;
var MEAN_ECCENTRICITY = 0.054900489;
var MEAN_INCLINATION = 5.1453964 * D2R2;
var cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
var dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var norm = (a) => Math.sqrt(dot3(a, a));
var eclipticPole = (eps) => [0, -Math.sin(eps), Math.cos(eps)];
function fromEcliptic(lon, lat, eps) {
  const x = Math.cos(lat) * Math.cos(lon), y = Math.cos(lat) * Math.sin(lon), z = Math.sin(lat);
  const c = Math.cos(eps), s = Math.sin(eps);
  return [x, c * y - s * z, s * y + c * z];
}
function osculating(tables, tdb, frame) {
  const r = [0, 0, 0], v = [0, 0, 0];
  tables.moonGeocentric(tdb, r, v);
  const h = cross2(r, v);
  const rv = cross2(v, h);
  const rl = norm(r);
  const e = [rv[0] / GM - r[0] / rl, rv[1] / GM - r[1] / rl, rv[2] / GM - r[2] / rl];
  const p = dot3(h, h) / GM;
  return { hDate: apply(frame.npb, h), eDate: apply(frame.npb, e), p, ecc: norm(e) };
}
function trueNode(tables, tdb, frame) {
  const { hDate, eDate, p } = osculating(tables, tdb, frame);
  const n = cross2(eclipticPole(frame.eps), hDate);
  const nl = norm(n);
  const u = [n[0] / nl, n[1] / nl, n[2] / nl];
  return { u, dist: p / (1 + dot3(eDate, u)) / AU_KM2 };
}
function trueApogee(tables, tdb, frame) {
  const { eDate, p, ecc } = osculating(tables, tdb, frame);
  const u = [-eDate[0] / ecc, -eDate[1] / ecc, -eDate[2] / ecc];
  return { u, dist: p / (1 - ecc) / AU_KM2 };
}
function correction(table, jdTT) {
  const last = table.length - 1;
  const x = (2e3 + (jdTT - 2451545) / 365.25 - LUNAR_MEAN_FROM_EPOCH) / LUNAR_MEAN_STEP_YEARS;
  let i = Math.floor(x);
  if (i < 1)
    i = 1;
  else if (i > last - 2)
    i = last - 2;
  const u = Math.min(Math.max(x - i, -1), 2);
  const p0 = table[i - 1], p1 = table[i], p2 = table[i + 1], p3 = table[i + 2];
  const m1 = (p2 - p0) / 2, m2 = (p3 - p1) / 2;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
}
function meanElements(jdTT) {
  const T = (jdTT - 2451545) / 36525;
  let node = 125.0445479 - 1934.1362891 * T + 20754e-7 * T * T + T * T * T / 467441 - T * T * T * T / 60616e3;
  let perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T * T * T / 80053 + T * T * T * T / 18999e3;
  const c = meanCorrection(jdTT);
  node += c.node;
  perigee += c.apogee;
  return { node, perigee };
}
function meanCorrection(jdTT) {
  const far = 1 - iauWeight(jdTT);
  if (far === 0)
    return { node: 0, apogee: 0 };
  return { node: far * correction(MEAN_NODE_CORRECTION, jdTT), apogee: far * correction(MEAN_APOGEE_CORRECTION, jdTT) };
}
function meanNode(jdTT, frame) {
  const lon = meanElements(jdTT).node * D2R2 + frame.dpsi;
  return { u: fromEcliptic(lon, 0, frame.eps), dist: MEAN_DISTANCE_KM / AU_KM2 };
}
function meanApogee(jdTT, frame) {
  const { node, perigee } = meanElements(jdTT);
  const om = node * D2R2;
  const u = (perigee + 180 - node) * D2R2;
  const lon = om + Math.atan2(Math.sin(u) * Math.cos(MEAN_INCLINATION), Math.cos(u)) + frame.dpsi;
  const lat = Math.asin(Math.sin(u) * Math.sin(MEAN_INCLINATION));
  return { u: fromEcliptic(lon, lat, frame.eps), dist: MEAN_DISTANCE_KM * (1 + MEAN_ECCENTRICITY) / AU_KM2 };
}

// node_modules/naelos-ephemeris/dist/eclipses.js
var SE_ECL_CENTRAL = 1;
var SE_ECL_NONCENTRAL = 2;
var SE_ECL_TOTAL = 4;
var SE_ECL_ANNULAR = 8;
var SE_ECL_PARTIAL = 16;
var SE_ECL_ANNULAR_TOTAL = 32;
var SE_ECL_PENUMBRAL = 64;
var R_EARTH = 6378.137;
var FLATTENING = 1 / 298.257223563;
var R_SUN = 696e3;
var R_MOON = 0.2725076 * R_EARTH;
var SYNODIC = 29.530588853;
var ELONGATION_RATE = 360 / SYNODIC;
var D2R3 = Math.PI / 180;
var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
var dot4 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
var len2 = (a) => Math.sqrt(dot4(a, a));
var signed = (d) => {
  const r = norm360(d);
  return r > 180 ? r - 360 : r;
};
function syzygy(sky2, t, target, backward) {
  const elong = (tt) => {
    const p = sky2.sunMoon(tt);
    return norm360(p.moonLon - p.sunLon);
  };
  const e0 = elong(t);
  let x = backward ? t - norm360(e0 - target) / ELONGATION_RATE : t + norm360(target - e0) / ELONGATION_RATE;
  for (let i = 0; i < 12; i++) {
    const f = signed(elong(x) - target);
    const step = f / ELONGATION_RATE;
    x -= step;
    if (Math.abs(step) < 1e-9)
      break;
  }
  return x;
}
function minimise(f, a, b) {
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a), d = a + g * (b - a);
  let fc = f(c), fd = f(d);
  while (b - a > 5e-7) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}
function moonShadow(sky2, tt, stretch) {
  const { sun, moon } = sky2.sunMoon(tt);
  const k = stretch ? 1 / (1 - FLATTENING) : 1;
  const S = [sun[0], sun[1], sun[2] * k];
  const M = [moon[0], moon[1], moon[2] * k];
  const sm = sub(M, S);
  const L = len2(sub(moon, sun));
  const d = [sm[0] / len2(sm), sm[1] / len2(sm), sm[2] / len2(sm)];
  const s = -dot4(M, d);
  const near = [M[0] + s * d[0], M[1] + s * d[1], M[2] + s * d[2]];
  const D = len2(near);
  const tanUmbra = (R_SUN - R_MOON) / L;
  const tanPenumbra = (R_SUN + R_MOON) / L;
  return { D, s, l1: R_MOON + s * tanPenumbra, l2: R_MOON - s * tanUmbra, tanUmbra };
}
function solarAt(sky2, tt) {
  const best = minimise((x) => moonShadow(sky2, x, false).D, tt - 0.25, tt + 0.25);
  const sphere = moonShadow(sky2, best, false);
  if (sphere.D > R_EARTH + sphere.l1)
    return null;
  const { D, s, l2, tanUmbra } = moonShadow(sky2, best, true);
  const gamma = D / R_EARTH;
  let category, flags;
  if (D < R_EARTH) {
    const sSurface = s - Math.sqrt(R_EARTH * R_EARTH - D * D);
    const umbraThere = R_MOON - sSurface * tanUmbra;
    if (umbraThere > 0 && l2 > 0)
      [category, flags] = ["total", SE_ECL_TOTAL | SE_ECL_CENTRAL];
    else if (umbraThere > 0)
      [category, flags] = ["hybrid", SE_ECL_ANNULAR_TOTAL | SE_ECL_CENTRAL];
    else
      [category, flags] = ["annular", SE_ECL_ANNULAR | SE_ECL_CENTRAL];
  } else if (D < R_EARTH + Math.abs(l2)) {
    [category, flags] = l2 > 0 ? ["total", SE_ECL_TOTAL | SE_ECL_NONCENTRAL] : ["annular", SE_ECL_ANNULAR | SE_ECL_NONCENTRAL];
  } else {
    [category, flags] = ["partial", SE_ECL_PARTIAL];
  }
  return { jd: best, jdTT: best, category, flags, central: D < R_EARTH, gamma };
}
function earthShadow(sky2, tt) {
  const { sun, moon } = sky2.sunMoon(tt);
  const ds = len2(sun), dm = len2(moon);
  const anti = [-sun[0] / ds, -sun[1] / ds, -sun[2] / ds];
  const theta = Math.acos(Math.min(1, dot4(anti, moon) / dm));
  const parallaxMoon = Math.asin(R_EARTH / dm);
  const parallaxSun = Math.asin(R_EARTH / ds);
  const sunRadius = Math.asin(R_SUN / ds);
  const moonRadius = Math.asin(R_MOON / dm);
  const umbra = 1.01 * parallaxMoon + parallaxSun - sunRadius;
  const penumbra = 1.01 * parallaxMoon + parallaxSun + sunRadius;
  return { theta, umbra, penumbra, moonRadius };
}
function lunarAt(sky2, tt) {
  const best = minimise((x) => earthShadow(sky2, x).theta, tt - 0.25, tt + 0.25);
  const { theta, umbra, penumbra, moonRadius } = earthShadow(sky2, best);
  let category, flags;
  if (theta + moonRadius < umbra)
    [category, flags] = ["total", SE_ECL_TOTAL];
  else if (theta - moonRadius < umbra)
    [category, flags] = ["partial", SE_ECL_PARTIAL];
  else if (theta - moonRadius < penumbra)
    [category, flags] = ["penumbral", SE_ECL_PENUMBRAL];
  else
    return null;
  return { jd: best, jdTT: best, category, flags, central: false, gamma: theta / umbra };
}
var SOLAR_LIMIT = 1.8;
var LUNAR_LIMIT = 1.8;
function search(sky2, jdUT, backward, kind) {
  const target = kind === "solar" ? 0 : 180;
  let t = jdUT + sky2.deltaT(jdUT) / 86400 + (backward ? 0.5 : -0.5);
  for (let i = 0; i < 40; i++) {
    const s = syzygy(sky2, t, target, backward);
    const lat = Math.abs(sky2.sunMoon(s).moonLat);
    if (lat < (kind === "solar" ? SOLAR_LIMIT : LUNAR_LIMIT)) {
      const e = kind === "solar" ? solarAt(sky2, s) : lunarAt(sky2, s);
      if (e) {
        const ut = e.jdTT - sky2.deltaT(e.jdTT) / 86400;
        const inOrder = backward ? ut < jdUT : ut > jdUT;
        if (inOrder)
          return { ...e, jd: ut };
      }
    }
    t = s + (backward ? -1 : 1) * (SYNODIC / 2);
  }
  return null;
}
function solarEclipse(sky2, jdUT, backward) {
  return search(sky2, jdUT, backward, "solar");
}
function lunarEclipse(sky2, jdUT, backward) {
  return search(sky2, jdUT, backward, "lunar");
}

// node_modules/naelos-ephemeris/dist/events.js
var MOTION = {
  0: { step: 5, maxSpeed: 1.03, monotone: true },
  1: { step: 4, maxSpeed: 15.5, monotone: true },
  2: { step: 2, maxSpeed: 2.5 },
  3: { step: 4, maxSpeed: 1.3 },
  4: { step: 6, maxSpeed: 0.8 },
  5: { step: 10, maxSpeed: 0.25 },
  6: { step: 10, maxSpeed: 0.17 },
  7: { step: 12, maxSpeed: 0.07 },
  8: { step: 12, maxSpeed: 0.045 },
  9: { step: 12, maxSpeed: 0.045 },
  10: { step: 10, maxSpeed: 0.06, monotone: true },
  11: { step: 0.15, maxSpeed: 0.3 },
  12: { step: 10, maxSpeed: 0.12, monotone: true },
  13: { step: 0.1, maxSpeed: 6.5 },
  15: { step: 10, maxSpeed: 0.15 },
  17: { step: 6, maxSpeed: 0.47 },
  18: { step: 6, maxSpeed: 0.62 },
  19: { step: 6, maxSpeed: 0.6 },
  20: { step: 6, maxSpeed: 0.55 }
};
var MIN_REVERSAL = 1 / 3600;
var TIME_TOL = 1e-7;
var signed2 = (d) => {
  const r = norm360(d);
  return r > 180 ? r - 360 : r;
};
function golden(g, a, b) {
  const r = (Math.sqrt(5) - 1) / 2;
  let c = b - r * (b - a), d = a + r * (b - a), gc = g(c), gd = g(d);
  while (b - a > TIME_TOL) {
    if (gc < gd) {
      b = d;
      d = c;
      gd = gc;
      c = b - r * (b - a);
      gc = g(c);
    } else {
      a = c;
      c = d;
      gc = gd;
      d = a + r * (b - a);
      gd = g(d);
    }
  }
  return (a + b) / 2;
}
function track(f, start, end, step) {
  const n = Math.max(2, Math.ceil((end - start) / step) + 1);
  const h = (end - start) / (n - 1);
  const t = new Float64Array(n), u = new Float64Array(n);
  let prev = f(start);
  t[0] = start;
  u[0] = prev;
  for (let i = 1; i < n; i++) {
    t[i] = start + i * h;
    const v = f(t[i]);
    u[i] = u[i - 1] + signed2(v - prev);
    prev = v;
  }
  return { t, u };
}
var readable = (f, jd) => {
  try {
    return Number.isFinite(f(jd));
  } catch {
    return false;
  }
};
function stations(f, start, end, motion) {
  if (motion.monotone)
    return [];
  const pad = motion.step;
  const a = readable(f, start - pad) ? start - pad : start;
  const b = readable(f, end + pad) ? end + pad : end;
  const { t, u } = track(f, a, b, motion.step);
  const found = [];
  for (let i = 1; i < t.length - 1; i++) {
    const before = u[i] - u[i - 1], after = u[i + 1] - u[i];
    if (before === 0 || after === 0 || Math.sign(before) === Math.sign(after))
      continue;
    const isMax = before > 0;
    const ref = u[i], anchor = f(t[i]);
    const unwrap = (x) => ref + signed2(f(x) - anchor);
    const at = golden((x) => isMax ? -unwrap(x) : unwrap(x), t[i - 1], t[i + 1]);
    found.push({ jdTT: at, longitude: unwrap(at), turning: isMax ? "retrograde" : "direct" });
  }
  for (; ; ) {
    let k = -1, least = MIN_REVERSAL;
    for (let i = 0; i + 1 < found.length; i++) {
      const d = Math.abs(found[i + 1].longitude - found[i].longitude);
      if (d < least) {
        least = d;
        k = i;
      }
    }
    if (k < 0)
      break;
    found.splice(k, 2);
  }
  return found.filter((s) => s.jdTT >= start && s.jdTT <= end);
}
function root(g, a, b, ga, gb) {
  let side = 0;
  for (let i = 0; i < 100 && b - a > TIME_TOL; i++) {
    const c = (a * gb - b * ga) / (gb - ga);
    const gc = g(c);
    if (gc === 0)
      return c;
    if (Math.sign(gc) === Math.sign(gb)) {
      b = c;
      gb = gc;
      if (side === -1)
        ga /= 2;
      side = -1;
    } else {
      a = c;
      ga = gc;
      if (side === 1)
        gb /= 2;
      side = 1;
    }
  }
  return b;
}
var PAST_CROSSING = 1e-6;
function crossings(f, targets, start, end, motion, known) {
  const turns = (known ?? stations(f, start, end, motion)).map((s) => s.jdTT).filter((x) => x > start && x < end);
  const edges = [start, ...turns, end];
  const chunk = Math.min(motion.step, 90 / motion.maxSpeed);
  const wanted = targets.map(norm360);
  const out = [];
  for (let k = 0; k + 1 < edges.length; k++) {
    const a0 = edges[k], b0 = edges[k + 1];
    const pieces = Math.max(1, Math.ceil((b0 - a0) / chunk));
    let a = a0, fa = f(a);
    for (let p = 1; p <= pieces; p++) {
      const b = p === pieces ? b0 : a0 + (b0 - a0) * p / pieces;
      const fb = f(b);
      const move = signed2(fb - fa);
      if (move !== 0) {
        const dir = move > 0 ? 1 : -1;
        for (const target of wanted) {
          const from = signed2(target - fa) * dir;
          const reach = Math.abs(move);
          if (from > 0 && from <= reach) {
            const g = (x) => signed2(f(x) - target) * dir;
            const ga = signed2(fa - target) * dir, gb = signed2(fb - target) * dir;
            const at = gb === 0 ? b : root(g, a, b, ga, gb);
            out.push({ jdTT: at + PAST_CROSSING, target, direction: dir });
          }
        }
      }
      a = b;
      fa = fb;
    }
  }
  return out.sort((x, y) => x.jdTT - y.jdTT);
}
function combined(a, b) {
  return { step: Math.min(a.step, b.step), maxSpeed: a.maxSpeed + b.maxSpeed, monotone: false };
}

// node_modules/naelos-ephemeris/dist/uncertainty.js
var DEFAULT_BODIES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 15];
var DEFAULT_ASPECTS = [
  { angle: 0, orb: 8 },
  { angle: 60, orb: 6 },
  { angle: 90, orb: 8 },
  { angle: 120, orb: 8 },
  { angle: 180, orb: 8 }
];
var CERTAIN = 0.999;
var SECOND = 1 / 86400;
var signOf = (lon) => Math.floor(norm360(lon) / 30) % 12;
var sep = (a, b) => Math.abs((a - b + 540) % 360 - 180);
function houseOf(lon, cusps) {
  const x = norm360(lon);
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const inside = b > a ? x >= a && x < b : x >= a || x < b;
    if (inside)
      return i + 1;
  }
  return 1;
}
function shares(t, cats, cat) {
  const a = t[0], b = t[t.length - 1];
  const total = /* @__PURE__ */ new Map();
  if (b <= a)
    return [{ value: cats[0], probability: 1 }];
  let segStart = a, current = cats[0];
  for (let i = 1; i < t.length; i++) {
    if (cats[i] === current)
      continue;
    let lo = t[i - 1], hi = t[i];
    while (hi - lo > SECOND) {
      const mid = (lo + hi) / 2;
      if (cat(mid) === current)
        lo = mid;
      else
        hi = mid;
    }
    total.set(current, (total.get(current) ?? 0) + (hi - segStart));
    segStart = hi;
    current = cats[i];
  }
  total.set(current, (total.get(current) ?? 0) + (b - segStart));
  return [...total].map(([value, d]) => ({ value, probability: d / (b - a) })).sort((x, y) => y.probability - x.probability);
}
function grid(a, b, n) {
  const t = new Float64Array(n);
  for (let i = 0; i < n; i++)
    t[i] = n === 1 ? a : a + (b - a) * i / (n - 1);
  return t;
}
var unwrapRange = (lons) => {
  let end = lons[0];
  for (let i = 1; i < lons.length; i++)
    end += (lons[i] - lons[i - 1] + 540) % 360 - 180;
  return [lons[0], end];
};
function chartUncertainty(src, input) {
  const { from, to, lat, lon } = input;
  const system = input.houseSystem ?? "P";
  const bodies = input.bodies ?? DEFAULT_BODIES;
  const aspects = input.aspects ?? DEFAULT_ASPECTS;
  const mid = (from + to) / 2;
  const sigma = deltaTUncertainty(mid);
  const exact = to <= from;
  const n = exact ? 1 : Math.max(3, Math.min(2e3, Math.ceil((to - from) * 86400 / 20) + 1));
  const t = grid(from, to, n);
  const houses2 = Array.from(t, (x) => src.houses(x, lat, lon, system));
  const lons = /* @__PURE__ */ new Map();
  const at = /* @__PURE__ */ new Map();
  for (const b of bodies) {
    const key = `body:${b}`;
    lons.set(key, Float64Array.from(t, (x) => src.longitude(b, x)));
    at.set(key, (x) => src.longitude(b, x));
  }
  lons.set("asc", Float64Array.from(houses2, (h) => h.ascendant));
  at.set("asc", (x) => src.houses(x, lat, lon, system).ascendant);
  lons.set("mc", Float64Array.from(houses2, (h) => h.mc));
  at.set("mc", (x) => src.houses(x, lat, lon, system).mc);
  const placements = [];
  const spread = 2 * sigma * SECOND;
  for (const b of bodies) {
    const key = `body:${b}`;
    const L = lons.get(key), f = at.get(key);
    let signs;
    if (spread > SECOND && !exact) {
      const tw = grid(from - spread, to + spread, n);
      signs = shares(tw, Int32Array.from(tw, (x) => signOf(f(x))), (x) => signOf(f(x)));
    } else {
      signs = exact ? [{ value: signOf(L[0]), probability: 1 }] : shares(t, Int32Array.from(L, signOf), (x) => signOf(f(x)));
    }
    const houseShares = exact ? [{ value: houseOf(L[0], houses2[0].cusps), probability: 1 }] : shares(t, Int32Array.from(L, (v, i) => houseOf(v, houses2[i].cusps)), (x) => houseOf(f(x), src.houses(x, lat, lon, system).cusps));
    placements.push({
      key,
      body: b,
      signs,
      houses: houseShares,
      range: unwrapRange(L),
      certain: signs[0].probability >= CERTAIN && houseShares[0].probability >= CERTAIN
    });
  }
  for (const key of ["asc", "mc"]) {
    const L = lons.get(key), f = at.get(key);
    const signs = exact ? [{ value: signOf(L[0]), probability: 1 }] : shares(t, Int32Array.from(L, signOf), (x) => signOf(f(x)));
    placements.push({ key, signs, range: unwrapRange(L), certain: signs[0].probability >= CERTAIN });
  }
  const keys = [...lons.keys()];
  const tests = input.pairs ?? keys.flatMap((a, i) => keys.slice(i + 1).flatMap((b) => aspects.map(({ angle, orb }) => ({ a, b, angle, orb }))));
  const out = [];
  for (const { a, b, angle, orb } of tests) {
    const A = lons.get(a), B = lons.get(b), fa = at.get(a), fb = at.get(b);
    if (!A || !B || !fa || !fb)
      continue;
    const inOrb = (x, y) => Math.abs(sep(x, y) - angle) <= orb ? 1 : 0;
    const cats = Int32Array.from(A, (v, k) => inOrb(v, B[k]));
    if (!cats.some((c) => c === 1))
      continue;
    const s = exact ? [{ value: cats[0], probability: 1 }] : shares(t, cats, (x) => inOrb(fa(x), fb(x)));
    const p = s.find((e) => e.value === 1)?.probability ?? 0;
    if (p > 0)
      out.push({ a, b, angle, probability: p });
  }
  return { from, to, minutes: (to - from) * 1440, placements, aspects: out, deltaT: { seconds: src.deltaT(mid), sigma } };
}

// node_modules/naelos-ephemeris/dist/rectification.js
var TRANSITING = [[9, 1], [8, 0.9], [7, 1], [6, 0.9], [5, 0.6], [4, 0.3]];
var NATAL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
var ASPECTS = [[0, 1], [180, 0.8], [90, 0.7]];
var SIGMA = { transit: 1, "solar arc": 0.33, "progressed Moon": 0.5 };
var TROPICAL_YEAR = 365.2422;
var sep2 = (a, b) => Math.abs((a - b + 540) % 360 - 180);
function closest(a, b) {
  const s = sep2(a, b);
  let best = { aspect: 0, orb: Infinity, weight: 0 };
  for (const [aspect, weight] of ASPECTS) {
    const orb = Math.abs(s - aspect);
    if (orb < best.orb)
      best = { aspect, orb, weight };
  }
  return best;
}
function rectify(src, input) {
  const { from, to, lat, lon, events } = input;
  const system = input.houseSystem ?? "P";
  const step = (input.stepMinutes ?? 1) / 1440;
  const n = Math.max(1, Math.floor((to - from) / step + 1e-9) + 1);
  const transits = events.map((e) => TRANSITING.map(([b, w]) => ({ body: b, weight: w, lon: src.longitude(b, e.jd) })));
  const candidates = [];
  for (let i = 0; i < n; i++) {
    const tb = Math.min(to, from + i * step);
    const { ascendant, mc } = src.angles(tb, lat, lon, system);
    const natal = NATAL.map((b) => ({ body: b, lon: src.longitude(b, tb) }));
    const sunAtBirth = natal[0].lon;
    const evidence = [];
    let score = 0;
    const add = (ev, weight) => {
      const sigma = SIGMA[ev.technique];
      if (ev.orb > 3 * sigma)
        return;
      const contribution = weight * Math.exp(-0.5 * (ev.orb / sigma) ** 2);
      score += contribution;
      evidence.push({ ...ev, contribution });
    };
    events.forEach((e, k) => {
      const w = e.weight ?? 1;
      const angles = [["Asc", ascendant], ["MC", mc]];
      for (const tr of transits[k]) {
        for (const [name, a] of angles) {
          const c = closest(tr.lon, a);
          add({ event: k, technique: "transit", mover: tr.body, point: name, aspect: c.aspect, orb: c.orb }, w * tr.weight * c.weight);
        }
      }
      const tp = tb + (e.jd - tb) / TROPICAL_YEAR;
      const arc = norm360(src.longitude(0, tp) - sunAtBirth);
      for (const p of natal) {
        for (const [name, a] of angles) {
          const c1 = closest(p.lon + arc, a);
          add({ event: k, technique: "solar arc", mover: p.body, point: name, aspect: c1.aspect, orb: c1.orb }, w * c1.weight);
          const c2 = closest(a + arc, p.lon);
          add({ event: k, technique: "solar arc", mover: name, point: p.body, aspect: c2.aspect, orb: c2.orb }, w * c2.weight * 0.8);
        }
      }
      const moon = src.longitude(1, tp);
      for (const [name, a] of angles) {
        const c = closest(moon, a);
        add({ event: k, technique: "progressed Moon", mover: 1, point: name, aspect: c.aspect, orb: c.orb }, w * 0.6 * c.weight);
      }
    });
    candidates.push({ jd: tb, ascendant, mc, score, support: 0, evidence: evidence.sort((x, y) => y.contribution - x.contribution) });
  }
  const top = Math.max(...candidates.map((c) => c.score));
  const weights = candidates.map((c) => Math.exp(c.score - top));
  const sum = weights.reduce((s, x) => s + x, 0);
  candidates.forEach((c, i) => c.support = weights[i] / sum);
  let bestSpan = { from, to }, width = Infinity;
  for (let a = 0, b = 0, acc = 0; a < candidates.length; a++) {
    while (b < candidates.length && acc < 0.68)
      acc += candidates[b++].support;
    if (acc >= 0.68 && candidates[b - 1].jd - candidates[a].jd < width) {
      width = candidates[b - 1].jd - candidates[a].jd;
      bestSpan = { from: candidates[a].jd, to: candidates[b - 1].jd };
    }
    acc -= candidates[a].support;
  }
  return {
    candidates,
    best: [...candidates].sort((x, y) => y.score - x.score).slice(0, 5),
    window68: bestSpan,
    techniques: "transits of Mars\u2013Pluto, solar-arc directions and the secondary-progressed Moon, to and from the Ascendant and Midheaven; conjunction, opposition and square"
  };
}

// node_modules/naelos-ephemeris/dist/provenance.js
var ENGINE = "Naelos Ephemeris 0.1.2";
var SOURCE = {
  0: { name: "Sun", horizons: "10", data: "JPL DE440" },
  1: { name: "Moon", horizons: "301", data: "JPL DE440" },
  2: { name: "Mercury", horizons: "199", data: "JPL DE440" },
  3: { name: "Venus", horizons: "299", data: "JPL DE440" },
  4: { name: "Mars (system barycentre)", horizons: "4", data: "JPL DE440" },
  5: { name: "Jupiter (system barycentre)", horizons: "5", data: "JPL DE440" },
  6: { name: "Saturn (system barycentre)", horizons: "6", data: "JPL DE440" },
  7: { name: "Uranus (system barycentre)", horizons: "7", data: "JPL DE440" },
  8: { name: "Neptune (system barycentre)", horizons: "8", data: "JPL DE440" },
  9: { name: "Pluto (system barycentre)", horizons: "9", data: "JPL DE440" },
  15: { name: "Chiron", horizons: "2060;", data: "JPL Horizons orbit (SPK 20002060)" },
  17: { name: "Ceres", horizons: "1;", data: "JPL Horizons orbit (SPK 20000001)" },
  18: { name: "Pallas", horizons: "2;", data: "JPL Horizons orbit (SPK 20000002)" },
  19: { name: "Juno", horizons: "3;", data: "JPL Horizons orbit (SPK 20000003)" },
  20: { name: "Vesta", horizons: "4;", data: "JPL Horizons orbit (SPK 20000004)" }
};
var DERIVED = {
  10: "Mean North Node: ELP2000-82B mean elements (Meeus, Astronomical Algorithms ch. 47), on the true equinox of date",
  11: "True North Node: node of the Moon's osculating orbit, from the Moon's DE440 position and velocity",
  12: "Mean Lilith: apogee of the ELP2000-82B mean lunar orbit, projected on the ecliptic of date",
  13: "True Lilith: apogee of the Moon's osculating orbit, from its DE440 position and velocity"
};
var RECORDS_BEGIN = 14580855e-1;
function clockBasis(jdUT) {
  if (jdUT < RECORDS_BEGIN)
    return "long-term model";
  if (jdUT < 24413175e-1)
    return "historical reconstruction";
  if (jdUT <= MEASURED_UNTIL)
    return "measured (IERS)";
  if (jdUT <= PREDICTED_UNTIL)
    return "predicted (IERS)";
  return "long-term model";
}
function horizonsUrl(body, jdUT) {
  const s = SOURCE[body];
  if (!s)
    return null;
  const params = [
    ["format", "text"],
    ["COMMAND", `'${s.horizons}'`],
    ["OBJ_DATA", "'NO'"],
    ["MAKE_EPHEM", "'YES'"],
    ["EPHEM_TYPE", "'OBSERVER'"],
    ["CENTER", "'500@399'"],
    // the Earth's centre
    ["TLIST", `'${jdUT.toFixed(8)}'`],
    ["TLIST_TYPE", "'JD'"],
    ["TIME_TYPE", "'UT'"],
    ["QUANTITIES", "'31'"],
    // apparent ecliptic longitude and latitude of date
    ["ANG_FORMAT", "'DEG'"],
    ["EXTRA_PREC", "'YES'"],
    ["CSV_FORMAT", "'YES'"]
  ];
  return "https://ssd.jpl.nasa.gov/api/horizons.api?" + params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}
function provenanceOf(args) {
  const { body, jdUT, deltaT: deltaT2, longitude, latitude, distanceAU, heliocentric: heliocentric2 } = args;
  const jdTT = jdUT + deltaT2 / 86400;
  const derived = DERIVED[body];
  const s = SOURCE[body] ?? (body === 14 ? { name: "Earth", horizons: "399", data: "JPL DE440" } : void 0);
  const name = s?.name ?? derived?.split(":")[0] ?? `body ${body}`;
  const minutes = distanceAU * 499.004784 / 60;
  const steps = derived ? ["the Moon's geometric state (no light-time: a point of an orbit, not a body seen)", "IAU 2006 precession and IAU 2000B nutation to the true equinox of date", "true ecliptic of date"] : heliocentric2 ? [`light-time from the body to the Sun (${minutes.toFixed(1)} min)`, "IAU 2006 precession and IAU 2000B nutation to the true equinox of date", "true ecliptic of date"] : [
    `light-time (${minutes < 1 ? (minutes * 60).toFixed(2) + " s" : minutes.toFixed(1) + " min"}): seen where it was when its light left`,
    "deflection of that light by the Sun's gravity",
    "aberration from the Earth's motion (relativistic)",
    "IAU 2006 precession and IAU 2000B nutation to the true equator of date",
    "true obliquity, to the true ecliptic of date"
  ];
  const far = args.segment ? FILES.some(([n, , , f]) => n === args.segment.file && f === 1) : false;
  const ephemeris = (text) => far ? text.split(NEAR_SOURCE).join(FAR_SOURCE) : text;
  const longTerm = iauWeight(jdTT) < 1;
  const shownSteps = longTerm ? steps.map((x) => x.replace("IAU 2006 precession", "long-term precession (Vondr\xE1k, Capitaine & Wallace 2011)")) : steps;
  const source = ephemeris(derived ?? `${s?.data ?? NEAR_SOURCE}${args.segment ? `, table ${args.segment.file} segment ${args.segment.index}` : ""}`);
  const url = heliocentric2 || derived || jdUT < HORIZONS_FIRST ? null : horizonsUrl(body, jdUT);
  const expect = longTerm ? "the same separations between bodies to 0.01\u2033; its places of date differ by a few arcseconds within 3000 BC \u2013 AD 9000, and by arcminutes before 8000 BC, because Horizons turns DE441 into the sky of date with Owen's (1990) long-term precession, built to match IAU 1976, and Naelos with Vondr\xE1k et al.'s (2011), which matches IAU 2006" : "within about 0.1\u2033 near the present (JPL uses IAU 1976/1980 precession and nutation, and its own \u0394T)";
  return {
    engine: ENGINE,
    body,
    name,
    jdUT,
    jdTT,
    source,
    steps: shownSteps,
    clock: { deltaT: deltaT2, sigma: deltaTUncertainty(jdUT), basis: clockBasis(jdUT) },
    longitude,
    latitude,
    ...url ? { verify: { horizons: url, expect } } : {}
  };
}
var HORIZONS_FIRST = -19306375e-1;

// node_modules/naelos-ephemeris/dist/index.js
var LUNATION_PHASES = ["new", "first quarter", "full", "last quarter"];
var SE_SUN = 0;
var SE_MOON = 1;
var SE_MERCURY = 2;
var SE_VENUS = 3;
var SE_MARS = 4;
var SE_JUPITER = 5;
var SE_SATURN = 6;
var SE_MEAN_NODE = 10;
var SE_TRUE_NODE = 11;
var SE_MEAN_APOG = 12;
var SE_OSCU_APOG = 13;
var SE_ECL_NUT = -1;
var LUNAR_POINTS = /* @__PURE__ */ new Set([10, 11, 12, 13]);
var FIRST_JD = FILES[0][1];
var LAST_JD = FILES[FILES.length - 1][2];
function tablesFor(from, to) {
  const margin = (jd) => 1 + Math.abs(deltaT(jd)) / 86400;
  const lo = Math.min(from, to), hi = Math.max(from, to);
  const a = lo - margin(lo), b = hi + margin(hi);
  const names = FILES.filter(([, start, end], i) => (i === 0 ? -Infinity : start) <= b && (i === FILES.length - 1 ? Infinity : end) > a).map(([n]) => n);
  return names;
}
var SEFLG_HELCTR = 8;
var SEFLG_SPEED = 256;
var SEFLG_EQUATORIAL = 2048;
var BODIES = /* @__PURE__ */ new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, EARTH, 15, 17, 18, 19, 20]);
var H = 1 / 1440;
var NaelosEphemeris = class _NaelosEphemeris {
  tables;
  deltaTFn;
  constructor(files, options = {}) {
    this.tables = new Tables(files);
    this.deltaTFn = options.deltaT ?? deltaT;
  }
  /** Build from the raw century files (any subset, in any order). */
  static fromBuffers(buffers, options = {}) {
    return new _NaelosEphemeris(buffers.map(parseTable), options);
  }
  /**
   * Load more century files, as they are needed: a browser fetches only the
   * centuries a chart falls in (see `tablesFor`). Files already loaded are
   * ignored.
   */
  addTables(buffers) {
    this.tables.add(buffers.map(parseTable));
  }
  /** The TDB span from the first loaded file to the last. */
  get range() {
    return { start: this.tables.start, end: this.tables.end };
  }
  julday(year, month, day, hour = 0) {
    return julday(year, month, day, hour);
  }
  /** ΔT in days, as Swiss Ephemeris's swe_deltat returns it. */
  deltat(jdUT) {
    return this.deltaTFn(jdUT) / 86400;
  }
  /** Position at a UT Julian Day. */
  calc_ut(jdUT, body, flags) {
    return this.calc(jdUT + this.deltaTFn(jdUT) / 86400, body, flags);
  }
  /**
   * House cusps and angles for a UT moment and a place (degrees, east
   * positive). Placidus and Koch fall back to Porphyry where they cannot
   * exist; `fallback` says when that happened.
   */
  houses(jdUT, lat, lon, system) {
    return houses(jdUT, this.deltaTFn(jdUT), lat, lon, system);
  }
  /** Nearest global solar eclipse after (or, `backward`, before) a UT Julian Day. */
  solarEclipse(jdUT, backward = false) {
    return solarEclipse(this.sky, jdUT, backward);
  }
  /** Nearest lunar eclipse after (or, `backward`, before) a UT Julian Day. */
  lunarEclipse(jdUT, backward = false) {
    return lunarEclipse(this.sky, jdUT, backward);
  }
  // ── exact moments ─────────────────────────────────────────────────────────
  longitudeOf(body) {
    return (tt) => {
      const r = this.calc(tt, body, 0);
      if ("error" in r)
        throw new Error(r.error);
      return r.longitude;
    };
  }
  motionOf(body) {
    const m = MOTION[body];
    if (!m)
      throw new Error(`no motion profile for body ${body}`);
    return m;
  }
  toTT(jdUT) {
    return jdUT + this.deltaTFn(jdUT) / 86400;
  }
  toUT(jdTT) {
    return jdTT - this.deltaTFn(jdTT - this.deltaTFn(jdTT) / 86400) / 86400;
  }
  /** Every station of a body between two UT moments: when it turns retrograde or direct. */
  stations(body, startUT, endUT) {
    return stations(this.longitudeOf(body), this.toTT(startUT), this.toTT(endUT), this.motionOf(body)).map((s) => ({ jd: this.toUT(s.jdTT), jdTT: s.jdTT, longitude: norm360(s.longitude), turning: s.turning }));
  }
  /**
   * Every moment a body's longitude reaches any of `targets` (degrees) between
   * two UT moments — all passes, including the three of a retrograde loop.
   * A transit to a natal point at an aspect is a target of natal + angle.
   */
  crossings(body, targets, startUT, endUT) {
    return crossings(this.longitudeOf(body), targets, this.toTT(startUT), this.toTT(endUT), this.motionOf(body)).map((c) => ({ jd: this.toUT(c.jdTT), jdTT: c.jdTT, target: c.target, direction: c.direction }));
  }
  /** Sign ingresses (crossings of each 30° boundary), with the sign entered (0 = Aries). */
  ingresses(body, startUT, endUT) {
    return this.crossings(body, Array.from({ length: 12 }, (_, i) => i * 30), startUT, endUT).map((c) => ({
      ...c,
      // Moving forward the body enters the sign that starts at the boundary;
      // retrograde it re-enters the one before.
      sign: c.direction === 1 ? Math.round(c.target / 30) % 12 : (Math.round(c.target / 30) + 11) % 12
    }));
  }
  /** Returns: every moment a body comes back to a longitude (a solar return is the Sun's). */
  returns(body, longitude, startUT, endUT) {
    return this.crossings(body, [longitude], startUT, endUT);
  }
  /** New, first-quarter, full and last-quarter Moons between two UT moments. */
  lunations(startUT, endUT) {
    const moon = this.longitudeOf(SE_MOON), sun = this.longitudeOf(SE_SUN);
    const elongation = (tt) => norm360(moon(tt) - sun(tt));
    return crossings(elongation, [0, 90, 180, 270], this.toTT(startUT), this.toTT(endUT), { step: 2, maxSpeed: 16, monotone: true }).map((c) => ({ jd: this.toUT(c.jdTT), jdTT: c.jdTT, phase: LUNATION_PHASES[Math.round(c.target / 90) % 4] }));
  }
  /**
   * Exact aspects between two moving bodies (transit to transit): every moment
   * their separation reaches an angle, either way round, between two UT moments.
   */
  aspectsBetween(bodyA, bodyB, angles, startUT, endUT) {
    const a = this.longitudeOf(bodyA), b = this.longitudeOf(bodyB);
    const separation = (tt) => norm360(a(tt) - b(tt));
    const targets = [...new Set(angles.flatMap((x) => [norm360(x), norm360(-x)]))];
    return crossings(separation, targets, this.toTT(startUT), this.toTT(endUT), combined(this.motionOf(bodyA), this.motionOf(bodyB))).map((c) => ({ jd: this.toUT(c.jdTT), jdTT: c.jdTT, target: c.target, direction: c.direction, angle: c.target > 180 ? 360 - c.target : c.target }));
  }
  // ── showing the working ───────────────────────────────────────────────────
  /**
   * Where a position came from: the JPL data and table segment, every
   * correction in order, how certain the clock was, and a JPL Horizons link
   * that computes the same quantity independently.
   */
  provenance(jdUT, body, flags = 0) {
    const r = this.calc_ut(jdUT, body, flags);
    if ("error" in r)
      return r;
    const tdb = this.toTT(jdUT) + tdbMinusTT(this.toTT(jdUT));
    const seg = this.tables.locate(body === EARTH ? 200 : body >= 10 && body <= 13 ? SE_MOON : body, tdb);
    return provenanceOf({
      body,
      jdUT,
      deltaT: this.deltaTFn(jdUT),
      longitude: r.longitude,
      latitude: r.latitude,
      distanceAU: r.distance,
      heliocentric: (flags & SEFLG_HELCTR) !== 0,
      segment: seg ?? void 0
    });
  }
  // ── knowing how sure ──────────────────────────────────────────────────────
  /**
   * What a birth window allows: every body's and angle's possible signs and
   * houses with the share of the window each holds, which aspects hold and for
   * how much of it, and how uncertain the clock itself is.
   */
  chartUncertainty(input) {
    return chartUncertainty({
      longitude: (b, t) => this.longitudeOf(b)(this.toTT(t)),
      houses: (t, lat, lon, sys) => this.houses(t, lat, lon, sys),
      deltaT: (t) => this.deltaTFn(t)
    }, input);
  }
  /**
   * Rectification: support for each candidate birth minute from dated life
   * events, with the contacts behind it (transits, solar arcs and the
   * progressed Moon to and from the angles).
   */
  rectify(input) {
    return rectify({
      longitude: (b, t) => this.longitudeOf(b)(this.toTT(t)),
      angles: (t, lat, lon, sys) => this.houses(t, lat, lon, sys)
    }, input);
  }
  /** The Sun and Moon as the eclipse search needs them. */
  sky = {
    deltaT: (jdUT) => this.deltaTFn(jdUT),
    sunMoon: (jdTT) => {
      const frame = frameOfDate(jdTT);
      const tdb = jdTT + tdbMinusTT(jdTT);
      const s = geocentric(this.tables, SE_SUN, tdb, frame);
      const m = geocentric(this.tables, SE_MOON, tdb, frame);
      const km = 1495978707e-1;
      const [sunLon] = spherical(s, frame, false);
      const [moonLon, moonLat] = spherical(m, frame, false);
      return {
        sun: [s.u[0] * s.dist * km, s.u[1] * s.dist * km, s.u[2] * s.dist * km],
        moon: [m.u[0] * m.dist * km, m.u[1] * m.dist * km, m.u[2] * m.dist * km],
        sunLon,
        moonLon,
        moonLat
      };
    }
  };
  /** Position at a TT Julian Day. */
  calc(jdTT, body, flags) {
    if (body === SE_ECL_NUT) {
      const f = frameOfDate(jdTT);
      const deg = 180 / Math.PI;
      return {
        longitude: f.eps * deg,
        latitude: f.epsA * deg,
        distance: f.dpsi * deg,
        longitudeSpeed: f.deps * deg,
        latitudeSpeed: 0,
        distanceSpeed: 0,
        flags: 0
      };
    }
    if (!BODIES.has(body))
      return { error: `body ${body} is not available yet` };
    const helio = (flags & SEFLG_HELCTR) !== 0;
    if (helio && body === SE_SUN)
      return { error: "the Sun has no heliocentric position" };
    if (!helio && body === EARTH)
      return { error: "the Earth has no geocentric position" };
    if (helio && LUNAR_POINTS.has(body))
      return { error: "the lunar nodes and apogee are geocentric points" };
    const equatorial = (flags & SEFLG_EQUATORIAL) !== 0;
    try {
      const at = (tt) => {
        const frame = frameOfDate(tt);
        const tdb = tt + tdbMinusTT(tt);
        const ap = body === SE_MEAN_NODE ? meanNode(tt, frame) : body === SE_TRUE_NODE ? trueNode(this.tables, tdb, frame) : body === SE_MEAN_APOG ? meanApogee(tt, frame) : body === SE_OSCU_APOG ? trueApogee(this.tables, tdb, frame) : helio ? heliocentric(this.tables, body, tdb, frame) : geocentric(this.tables, body, tdb, frame);
        const [lon, lat] = spherical(ap, frame, equatorial);
        return { lon, lat, dist: ap.dist };
      };
      const p = at(jdTT);
      let lonSpeed = 0, latSpeed = 0, distSpeed = 0;
      if (flags & SEFLG_SPEED) {
        const a = at(jdTT - H), b = at(jdTT + H);
        let dl = b.lon - a.lon;
        if (dl > 180)
          dl -= 360;
        else if (dl < -180)
          dl += 360;
        lonSpeed = dl / (2 * H);
        latSpeed = (b.lat - a.lat) / (2 * H);
        distSpeed = (b.dist - a.dist) / (2 * H);
      }
      return {
        longitude: p.lon,
        latitude: p.lat,
        distance: p.dist,
        longitudeSpeed: lonSpeed,
        latitudeSpeed: latSpeed,
        distanceSpeed: distSpeed,
        flags: flags & (SEFLG_HELCTR | SEFLG_SPEED | SEFLG_EQUATORIAL)
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }
};

// public/horoscope/offline/bphs-sputa-drishti.browser.mjs
var TAMIL = Object.freeze({
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": "Mars",
  "\u0B95\u0BC1\u0BB0\u0BC1": "Jupiter",
  "\u0B9A\u0BA9\u0BBF": "Saturn"
});
var norm3602 = (x) => (x % 360 + 360) % 360;
function ordinary(angle) {
  if (angle < 30 || angle >= 300) return 0;
  if (angle < 60) return (angle - 30) / 2;
  if (angle < 90) return angle - 60 + 15;
  if (angle < 120) return (120 - angle) / 2 + 30;
  if (angle < 150) return 150 - angle;
  if (angle < 180) return (angle - 150) * 2;
  return (300 - angle) / 2;
}
function bphsSputaDrishtiVirupa(angleDegrees, aspector) {
  if (!Number.isFinite(angleDegrees)) throw new TypeError("Finite longitude difference required");
  const a = norm3602(angleDegrees), p = TAMIL[aspector] || aspector;
  let s = ordinary(a), extra = 0;
  if (p === "Mars" && (a >= 90 && a < 120 || a >= 210 && a < 240)) extra = 15;
  else if (p === "Jupiter" && (a >= 120 && a < 150 || a >= 240 && a < 270)) extra = 30;
  else if (p === "Saturn" && (a >= 60 && a < 90 || a >= 270 && a < 300)) extra = 45;
  return Math.max(0, Math.min(60, s + extra));
}

// public/horoscope/offline/bphs-shadbala-rectification.browser.mjs
var BPHS_GRAHA_YUDDHA_REFERENCE = "BPHS I (Santhanam), Chapter 27, sloka 20, printed p.284";
var BPHS_DRIG_REFERENCE = "BPHS I (Santhanam), Chapter 27, sloka 19, printed p.284";
var finite = (x) => typeof x === "number" && Number.isFinite(x);
function bphsDrigBalaFromAspects(aspects) {
  if (!Array.isArray(aspects)) throw new TypeError("aspects must be an array");
  let signedPinda = 0, mercuryJupiterFull = 0;
  const trace = [];
  for (const x of aspects) {
    if (!x || typeof x.name !== "string" || !finite(x.virupa) || x.virupa < 0 || x.virupa > 60 || typeof x.benefic !== "boolean")
      throw new RangeError("Each aspect needs name, strength 0..60 and benefic boolean");
    const sign = x.benefic ? 1 : -1;
    signedPinda += sign * x.virupa;
    const special = x.name === "\u0B95\u0BC1\u0BB0\u0BC1" || x.name === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD";
    if (special) mercuryJupiterFull += sign * x.virupa;
    trace.push({ name: x.name, virupa: x.virupa, benefic: x.benefic, special });
  }
  return {
    virupa: signedPinda / 4 + mercuryJupiterFull,
    quarterPinda: signedPinda / 4,
    mercuryJupiterFull,
    trace,
    reference: BPHS_DRIG_REFERENCE
  };
}
function bphsGrahaYuddhaFromBaselines(encounters, baselineByPlanet) {
  if (!Array.isArray(encounters) || !baselineByPlanet || typeof baselineByPlanet !== "object")
    throw new TypeError("encounters and pre-war Shadbala mapping required");
  const virupaByPlanet = {}, trace = [], used = /* @__PURE__ */ new Set();
  for (const pair of encounters) {
    const winner = pair?.winner, loser = pair?.loser;
    if (!winner || !loser || winner === loser || used.has(winner) || used.has(loser))
      throw new RangeError("Each planet may participate in at most one resolved war");
    const w = baselineByPlanet[winner], l = baselineByPlanet[loser];
    if (!finite(w) || !finite(l)) throw new RangeError("Missing finite pre-war Shadbala");
    used.add(winner);
    used.add(loser);
    const delta = Math.abs(w - l);
    virupaByPlanet[winner] = delta;
    virupaByPlanet[loser] = -delta;
    trace.push({
      winner,
      loser,
      preWarWinner: w,
      preWarLoser: l,
      differenceVirupa: delta,
      rule: "BPHS Ch27 v20 difference of two pre-war Shadbalas"
    });
  }
  return {
    virupaByPlanet,
    trace,
    reference: BPHS_GRAHA_YUDDHA_REFERENCE,
    winnerCriterion: "Uttara Kalamrita II printed p41 ONLY where BPHS Ch27 is silent",
    magnitudeConvention: "bphs-pre-war-difference",
    certified: false
  };
}

// public/horoscope/offline/true-bphs-components.browser.mjs
var norm3603 = (value) => (value % 360 + 360) % 360;
var VARA_LORDS = ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BA9\u0BBF"];
var SIGN_LORDS = ["\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BA9\u0BBF", "\u0B9A\u0BA9\u0BBF", "\u0B95\u0BC1\u0BB0\u0BC1"];
var NATURAL_REL = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": { friends: ["\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0B95\u0BC1\u0BB0\u0BC1"], enemies: ["\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BA9\u0BBF"] },
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": { friends: ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD"], enemies: [] },
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": { friends: ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B95\u0BC1\u0BB0\u0BC1"], enemies: ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD"] },
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": { friends: ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"], enemies: ["\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD"] },
  "\u0B95\u0BC1\u0BB0\u0BC1": { friends: ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD"], enemies: ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"] },
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": { friends: ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BA9\u0BBF"], enemies: ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD"] },
  "\u0B9A\u0BA9\u0BBF": { friends: ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"], enemies: ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD"] }
});
var OWN_SIGNS = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": [4],
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": [3],
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": [0, 7],
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": [2, 5],
  "\u0B95\u0BC1\u0BB0\u0BC1": [8, 11],
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": [1, 6],
  "\u0B9A\u0BA9\u0BBF": [9, 10]
});
var DEBILITATION = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": { rasi: 6, degree: 10 },
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": { rasi: 7, degree: 3 },
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": { rasi: 3, degree: 28 },
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": { rasi: 11, degree: 15 },
  "\u0B95\u0BC1\u0BB0\u0BC1": { rasi: 9, degree: 5 },
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": { rasi: 5, degree: 27 },
  "\u0B9A\u0BA9\u0BBF": { rasi: 0, degree: 20 }
});
var MOOLATRIKONA = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": { rasi: 4, from: 0, to: 20 },
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": { rasi: 1, from: 4, to: 30 },
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": { rasi: 0, from: 0, to: 12 },
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": { rasi: 5, from: 16, to: 20 },
  "\u0B95\u0BC1\u0BB0\u0BC1": { rasi: 8, from: 0, to: 10 },
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": { rasi: 6, from: 0, to: 15 },
  "\u0B9A\u0BA9\u0BBF": { rasi: 10, from: 0, to: 20 }
});
var PLANET_GENDER = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": "male",
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": "male",
  "\u0B95\u0BC1\u0BB0\u0BC1": "male",
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": "neutral",
  "\u0B9A\u0BA9\u0BBF": "neutral",
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": "female",
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": "female"
});
var REQUIRED = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": 390,
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": 360,
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": 300,
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": 420,
  "\u0B95\u0BC1\u0BB0\u0BC1": 390,
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": 330,
  "\u0B9A\u0BA9\u0BBF": 300
});
var SHADBALA_NATURAL = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": 60,
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": 6 * 60 / 7,
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": 2 * 60 / 7,
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": 3 * 60 / 7,
  "\u0B95\u0BC1\u0BB0\u0BC1": 4 * 60 / 7,
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": 5 * 60 / 7,
  "\u0B9A\u0BA9\u0BBF": 60 / 7
});
var finite2 = (value) => typeof value === "number" && Number.isFinite(value);
var round3 = (value) => Number(value.toFixed(3));
function isOddSign(r) {
  return Number(r) % 2 === 0;
}
function vargaSign(lon, division) {
  const q = norm3603(lon), r = Math.floor(q / 30), deg = q - r * 30;
  let idx = 0, start = 0;
  if (division === 1) return r;
  if (division === 2) {
    idx = deg < 15 ? isOddSign(r) ? 4 : 3 : isOddSign(r) ? 3 : 4;
    return idx;
  }
  if (division === 3) {
    idx = Math.min(2, Math.floor(deg / 10));
    return (r + idx * 4) % 12;
  }
  if (division === 7) {
    const part = Math.min(6, Math.floor(deg / (30 / 7)));
    start = isOddSign(r) ? r : (r + 6) % 12;
    return (start + part) % 12;
  }
  if (division === 9) {
    const start9 = r % 3 === 0 ? r : r % 3 === 1 ? (r + 8) % 12 : (r + 4) % 12;
    return (start9 + Math.min(8, Math.floor(deg / (30 / 9))) % 12) % 12;
  }
  if (division === 12) return (r + Math.min(11, Math.floor(deg / 2.5))) % 12;
  if (division === 30) {
    let lord;
    if (isOddSign(r)) {
      if (deg < 5) lord = "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD";
      else if (deg < 10) lord = "\u0B9A\u0BA9\u0BBF";
      else if (deg < 18) lord = "\u0B95\u0BC1\u0BB0\u0BC1";
      else if (deg < 25) lord = "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD";
      else lord = "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD";
    } else {
      if (deg < 5) lord = "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD";
      else if (deg < 12) lord = "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD";
      else if (deg < 20) lord = "\u0B95\u0BC1\u0BB0\u0BC1";
      else if (deg < 25) lord = "\u0B9A\u0BA9\u0BBF";
      else lord = "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD";
    }
    const own = { "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": isOddSign(r) ? 0 : 7, "\u0B9A\u0BA9\u0BBF": isOddSign(r) ? 10 : 9, "\u0B95\u0BC1\u0BB0\u0BC1": isOddSign(r) ? 8 : 11, "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": isOddSign(r) ? 2 : 5, "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": isOddSign(r) ? 6 : 1 };
    return own[lord];
  }
  return r;
}
function naturalRelation(planet, other) {
  if (planet === other) return "own";
  const rel = NATURAL_REL[planet] || { friends: [], enemies: [] };
  if (rel.friends.includes(other)) return "friend";
  if (rel.enemies.includes(other)) return "enemy";
  return "neutral";
}
function temporaryRelation(planet, other, rasiPositions) {
  const a = rasiPositions[planet], b = rasiPositions[other];
  if (a === void 0 || b === void 0) return "neutral";
  const d = (b - a + 12) % 12 + 1;
  return [2, 3, 4, 10, 11, 12].includes(d) ? "friend" : "enemy";
}
function compoundRelation(planet, other, rasiPositions) {
  if (planet === other) return "own";
  const n = naturalRelation(planet, other), t = temporaryRelation(planet, other, rasiPositions);
  if (n === "friend" && t === "friend") return "greatFriend";
  if (n === "friend" && t === "enemy") return "friend";
  if (n === "neutral" && t === "friend") return "friend";
  if (n === "neutral" && t === "enemy") return "enemy";
  if (n === "enemy" && t === "friend") return "neutral";
  if (n === "enemy" && t === "enemy") return "greatEnemy";
  return "neutral";
}
function vargaDignityPoints(planet, sign, rasiPositions) {
  const lord = SIGN_LORDS[sign], mt = MOOLATRIKONA[planet];
  if (mt && mt.rasi === sign) return 45;
  if ((OWN_SIGNS[planet] || []).includes(sign)) return 30;
  const rel = compoundRelation(planet, lord, rasiPositions);
  return { greatFriend: 20, friend: 15, neutral: 10, enemy: 4, greatEnemy: 2 }[rel] ?? 10;
}
function ucchaBala(planet, longitude) {
  const deb = DEBILITATION[planet];
  if (!deb) return 0;
  const debLongitude = deb.rasi * 30 + deb.degree;
  let distance = norm3603(longitude - debLongitude);
  if (distance > 180) distance = 360 - distance;
  return Math.max(0, Math.min(60, distance / 3));
}
function sthanaClassical(planet, longitude, bhava, rasiPositions) {
  const vargas = [1, 2, 3, 7, 9, 12, 30], points = {};
  points.uccha = ucchaBala(planet, longitude);
  points.saptavargaja = vargas.reduce((sum, v) => sum + vargaDignityPoints(planet, vargaSign(longitude, v), rasiPositions), 0);
  const d1 = vargaSign(longitude, 1), d9 = vargaSign(longitude, 9), gender = PLANET_GENDER[planet];
  points.ojayugma = (gender === "female" ? d1 % 2 === 1 ? 15 : 0 : d1 % 2 === 0 ? 15 : 0) + (gender === "female" ? d9 % 2 === 1 ? 15 : 0 : d9 % 2 === 0 ? 15 : 0);
  const house = Number(bhava);
  points.kendradi = [1, 4, 7, 10].includes(house) ? 60 : [2, 5, 8, 11].includes(house) ? 30 : 15;
  const drekkana = Math.min(2, Math.floor(longitude % 30 / 10));
  points.drekkana = gender === "male" && drekkana === 0 || gender === "female" && drekkana === 1 || gender === "neutral" && drekkana === 2 ? 15 : 0;
  points.total = Object.values(points).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(points).map(([key, value]) => [key, round3(value)]));
}
function pakshaBala(planet, sunLongitude, moonLongitude, planets = []) {
  let distance = norm3603(moonLongitude - sunLongitude);
  if (distance > 180) distance = 360 - distance;
  const base = Math.min(60, distance / 3);
  if (planet === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD") return Math.min(120, base * 2);
  const mercury = planets.find((p) => p.name === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD");
  const mercurySign = mercury ? Math.floor(norm3603(mercury.longitude) / 30) : null;
  const joinedMalefic = planet === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD" && mercurySign !== null && planets.some(
    (p) => p.name !== "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD" && ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0B9A\u0BA9\u0BBF", "\u0BB0\u0BBE\u0B95\u0BC1", "\u0B95\u0BC7\u0BA4\u0BC1"].includes(p.name) && Math.floor(norm3603(p.longitude) / 30) === mercurySign
  );
  const benefic = ["\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"].includes(planet) || planet === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD" && !joinedMalefic;
  return benefic ? base : 60 - base;
}
function ayanaBala(declination, planet) {
  if (!finite2(declination)) return null;
  const obliquity = 23 + 27 / 60;
  const signed3 = planet === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD" ? Math.abs(declination) : ["\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BA9\u0BBF"].includes(planet) ? -declination : declination;
  const virupa = (obliquity + signed3) * 60 / (2 * obliquity);
  return Math.max(0, Math.min(
    planet === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD" ? 120 : 60,
    virupa * (planet === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD" ? 2 : 1)
  ));
}
function traditionalAharganaLords(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!match) throw new RangeError("Ahargana requires YYYY-MM-DD");
  const year = +match[1], month = +match[2], day = +match[3];
  const dateValue = /* @__PURE__ */ new Date(0);
  dateValue.setUTCFullYear(year, month - 1, day);
  const ms = dateValue.getTime();
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== date)
    throw new RangeError("Invalid Ahargana calendar date");
  const ahargana = 65142 + Math.round((ms - Date.UTC(1983, 11, 31)) / 864e5);
  const ix = (value) => (value % 7 + 7) % 7;
  const lordFromBook = (value) => VARA_LORDS[ix(value - 1)];
  return {
    ahargana,
    abdaLord: lordFromBook(Math.floor(ahargana / 360) * 3 + 1),
    masaLord: lordFromBook(Math.floor(ahargana / 30) * 2 + 1),
    dinaLord: lordFromBook(ahargana)
  };
}
function drigAspectorBenefic(aspector, planets) {
  if (["\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"].includes(aspector)) return true;
  const sun = planets.find((p) => p.name === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD");
  const moon = planets.find((p) => p.name === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD");
  const elongation = sun && moon ? norm3603(moon.longitude - sun.longitude) : null;
  const waxing = elongation !== null && elongation > 0 && elongation <= 180;
  if (aspector === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD") return waxing;
  if (aspector !== "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD") return false;
  const mercury = planets.find((p) => p.name === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD");
  if (!mercury) return false;
  const sign = Math.floor(norm3603(mercury.longitude) / 30);
  const joinedMalefic = planets.some((p) => p.name !== "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD" && (["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0B9A\u0BA9\u0BBF", "\u0BB0\u0BBE\u0B95\u0BC1", "\u0B95\u0BC7\u0BA4\u0BC1"].includes(p.name) || p.name === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD" && !waxing) && Math.floor(norm3603(p.longitude) / 30) === sign);
  return !joinedMalefic;
}
function drikBalaClassical(planet, planets) {
  const receiver = planets.find((row) => row.name === planet);
  if (!receiver) return 0;
  const aspects = [];
  for (const aspector of planets) {
    if (aspector.name === planet || !Object.hasOwn(REQUIRED, aspector.name)) continue;
    const angle = norm3603(receiver.longitude - aspector.longitude);
    aspects.push({
      name: aspector.name,
      virupa: bphsSputaDrishtiVirupa(angle, aspector.name),
      benefic: drigAspectorBenefic(aspector.name, planets)
    });
  }
  return bphsDrigBalaFromAspects(aspects).virupa;
}
var BPHS_COMPONENT_SOURCE_METADATA = Object.freeze({
  sthana: "BPHS I Chapter 27; seven Varga / Uchcha / Ojayugma / Kendradi / Drekkana helper",
  dig: "BPHS I Chapter 27; 60 Virupa at ideal direction, linearly reduced by angular distance",
  kala: "BPHS I Chapter 27; Natonnatha / Paksha / Tribhaga / Abda / Masa / Dina / Hora / Ayana",
  cheshta: "BPHS I Chapter 27 verses 24\u201325; UK II pp.42\u201343 only selects Mean / Sheeghroccheya pair",
  naisargika: "BPHS I Chapter 27 verse 14; exact 60*n/7 Virupa fractions",
  drik: "BPHS I Chapter 27 verse 19; BPHS Chapter 26 Sputa Drishti",
  yuddha: "BPHS I Chapter 27 verse 20; pre-war Shadbala difference"
});

// public/horoscope/offline/wasm-provider.mjs
var ephemerisMode = "LOCAL-WASM";
var instance = null;
var instancePromise = null;
var factoryPromise = null;
async function loadFactory() {
  if (typeof globalThis.__SMV_CREATE_SWEPH_WASM__ === "function") return globalThis.__SMV_CREATE_SWEPH_WASM__;
  if (factoryPromise) return factoryPromise;
  factoryPromise = (async () => {
    let mod;
    const vendorUrl = new URL("./vendor/smv-swisseph-local.mjs", import.meta.url).href;
    try {
      mod = await import(vendorUrl);
    } catch (firstError) {
      try {
        mod = await Promise.resolve().then(() => (init_smv_swisseph_local(), smv_swisseph_local_exports));
      } catch (secondError) {
        const e = new Error("SMV local Swiss Ephemeris module could not be loaded. Ensure offline/vendor and offline/vendor/wasm files are deployed.");
        e.cause = secondError || firstError;
        throw e;
      }
    }
    const f = mod.createSMVSwissEph || mod.default;
    if (typeof f !== "function") throw new Error("Swiss module loaded without factory export.");
    return f;
  })();
  return factoryPromise;
}
async function getSwe() {
  if (instance) return instance;
  if (instancePromise) return instancePromise;
  instancePromise = (async () => {
    const factory = await loadFactory();
    if (typeof factory !== "function") throw new Error("Invalid local Swiss Ephemeris factory.");
    const candidate = await factory();
    const required = ["utcToJd", "setSiderealLahiri", "siderealSpeedFlags", "calc", "ayanamsa", "houses"];
    for (const k of required) if (typeof candidate?.[k] !== "function") throw new Error("Local WASM provider missing " + k);
    instance = candidate;
    ephemerisMode = instance.ephemerisMode || "LOCAL-SWIEPH-WASM";
    return instance;
  })();
  try {
    return await instancePromise;
  } catch (e) {
    instance = null;
    factoryPromise = null;
    throw e;
  } finally {
    instancePromise = null;
  }
}

// public/horoscope/offline/places/timezone.mjs
var STATUTORY_2026_ZONES = /* @__PURE__ */ new Map([
  ["America/Vancouver", -420],
  ["Canada/Pacific", -420],
  // British Columbia: 2026b
  ["America/Edmonton", -360],
  ["Canada/Mountain", -360],
  // Alberta: 2026c
  ["America/Yellowknife", -360],
  // NWT via Edmonton
  ["America/Inuvik", -360],
  // Northwest Territories: 2026d
  ["America/Winnipeg", -300],
  ["Canada/Central", -300],
  // Manitoba: 2026e
  ["America/Rainy_River", -300]
  // 2026e current assumption
]);
var STATUTORY_MOROCCO_ZONES = /* @__PURE__ */ new Set(["Africa/Casablanca", "Africa/El_Aaiun"]);
var POSIX_LEGACY_BASE = /* @__PURE__ */ new Map([
  ["EST5EDT", -300],
  ["CST6CDT", -360],
  ["MST7MDT", -420],
  ["PST8PDT", -480]
]);
function civilParts(date, time) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  const t = /^(\d{1,2}):([0-5]\d)$/.exec(String(time));
  if (!m || !t) throw new RangeError("Birth date/time must be YYYY-MM-DD and HH:mm");
  const [y, mo, d, h, mi] = [+m[1], +m[2], +m[3], +t[1], +t[2]];
  const utc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const check = new Date(utc);
  if (y < 1800 || y > 2399 || h > 23 || check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d)
    throw new RangeError("Invalid birth date or time");
  return { utc, y, mo, d, h, mi };
}
function zonedSeconds(formatter, milliseconds) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(milliseconds)).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}
function offsetMinutesAt(timeZone, date, time) {
  const zone = String(timeZone || "").trim();
  if (!zone) throw new RangeError("Select a valid birth-place timezone");
  const c = civilParts(date, time);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const localClock = String(date) + "T" + String(time).padStart(5, "0");
  if (POSIX_LEGACY_BASE.has(zone) && String(date) < "1883-11-18")
    return POSIX_LEGACY_BASE.get(zone);
  if (STATUTORY_2026_ZONES.has(zone) && localClock >= "2026-11-01T02:00")
    return STATUTORY_2026_ZONES.get(zone);
  if (STATUTORY_MOROCCO_ZONES.has(zone) && localClock >= "2026-09-20T02:00")
    return 0;
  if ((zone === "Europe/Chisinau" || zone === "Europe/Tiraspol") && String(date) >= "2022-01-01")
    return offsetMinutesAt("Europe/Bucharest", date, time);
  const offsets = /* @__PURE__ */ new Set();
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const probe = c.utc + hours * 36e5;
    offsets.add(zonedSeconds(fmt, probe) - probe);
  }
  const valid = [];
  for (const offsetMs of offsets) {
    const instant = c.utc - offsetMs;
    if (zonedSeconds(fmt, instant) === c.utc) valid.push({ instant, offset: offsetMs / 6e4 });
  }
  if (!valid.length) throw new RangeError("This local birth time did not exist due to a DST clock change; verify the time.");
  valid.sort((a, b) => a.instant - b.instant);
  return valid[0].offset;
}

// public/horoscope/offline/saura-classical-mean-motion.browser.mjs
var YUGA_CIVIL_DAYS = 1577917828;
var KALI_EPOCH_JD_UT = 588465.5;
var UJJAIN_MERIDIAN_DEGREES = 75 + 46 / 60;
var REVOLUTIONS = Object.freeze({
  Sun: 432e4,
  Mars: 2296832,
  Mercury: 17937060,
  Jupiter: 364220,
  Venus: 7022376,
  Saturn: 146568
});
var FIVE = Object.freeze(["Mars", "Mercury", "Jupiter", "Venus", "Saturn"]);
var INNER = /* @__PURE__ */ new Set(["Mercury", "Venus"]);
var TAMIL2 = Object.freeze({
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": "Mars",
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": "Mercury",
  "\u0B95\u0BC1\u0BB0\u0BC1": "Jupiter",
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": "Venus",
  "\u0B9A\u0BA9\u0BBF": "Saturn"
});
var has = Object.prototype.hasOwnProperty;
var norm3604 = (x) => (x % 360 + 360) % 360;
function knownBody(body) {
  const key = TAMIL2[body] || body;
  if (!has.call(REVOLUTIONS, key))
    throw new RangeError("Classical Saura mean motion supports only Sun, Mars, Mercury, Jupiter, Venus, Saturn");
  return key;
}
function validJulian(jdUt) {
  if (!Number.isFinite(jdUt) || jdUt < 0 || jdUt > KALI_EPOCH_JD_UT + YUGA_CIVIL_DAYS + 5e6)
    throw new RangeError("Finite UTC Julian day in supported civil-date range required");
}
function sauraMeanOrbitalLongitude(jdUt, body) {
  validJulian(jdUt);
  const key = knownBody(body);
  const days = jdUt - KALI_EPOCH_JD_UT + UJJAIN_MERIDIAN_DEGREES / 360;
  const turns = days * REVOLUTIONS[key] / YUGA_CIVIL_DAYS;
  return norm3604(turns % 1 * 360);
}
function sauraFivePlanetCheshtaInputs(jdUt, planet) {
  validJulian(jdUt);
  const key = knownBody(planet);
  if (!FIVE.includes(key)) throw new RangeError("Only five planets eligible");
  const meanSun = sauraMeanOrbitalLongitude(jdUt, "Sun");
  const ownMeanOrbit = sauraMeanOrbitalLongitude(jdUt, key);
  return Object.freeze({
    planet: key,
    jdUt,
    meanSunLongitude: meanSun,
    meanLongitude: INNER.has(key) ? meanSun : ownMeanOrbit,
    sheeghrocha: INNER.has(key) ? ownMeanOrbit : meanSun,
    ownMeanOrbitLongitude: ownMeanOrbit,
    isInnerPlanet: INNER.has(key),
    model: "Saura-paksha extant Surya Siddhanta; Ujjain mean-meridian",
    frame: "traditional-Saura-nirayana",
    trueLongitudeAvailable: false,
    liveCheshtaEligible: false,
    fullShadbalaNumericallyCertified: false
  });
}
var SAURA_MEAN_MOTION_METADATA = Object.freeze({
  epochJdUt: KALI_EPOCH_JD_UT,
  civilDaysPerMahayuga: YUGA_CIVIL_DAYS,
  referenceMeridianDegrees: UJJAIN_MERIDIAN_DEGREES,
  orbitalRevolutions: REVOLUTIONS,
  source: "Extant Surya Siddhanta, Saura-paksha mean-motion astronomical constants",
  independentReference: "India Meteorological Department Rashtriya Panchang 2026-27, 2026-03-22 05:30 IST uncorrected Mean Surya Siddhanta Longitude",
  bphsInputSelection: "BPHS I Ch27 24\u201325; Uttara Kalamrita Ch II 42\u201343",
  modernSwissOrbitalElementsEquivalent: false,
  liveCheshtaEligible: false
});

// public/horoscope/offline/bphs-swiss-solar-cheshta.browser.mjs
var RAD = Math.PI / 180;
var norm3605 = (x) => (x % 360 + 360) % 360;
var finite3 = (x) => typeof x === "number" && Number.isFinite(x);
function bphsCheshtaFromOrbitalElements(meanLongitude, trueLongitude, sheeghrocha) {
  if (![meanLongitude, trueLongitude, sheeghrocha].every(finite3))
    throw new TypeError("Three independently computed longitudes required");
  const diff = ((trueLongitude - meanLongitude + 540) % 360 + 360) % 360 - 180;
  const midpoint = norm3605(meanLongitude + diff / 2);
  const angle = norm3605(sheeghrocha - midpoint);
  const kendra = Math.min(angle, 360 - angle);
  return {
    meanTrueMidpoint: midpoint,
    cheshtaKendraDegrees: kendra,
    virupa: kendra / 3,
    reference: "BPHS Santhanam Vol I Chapter 27 verses 24\u201325",
    exactArithmeticGivenInputs: true,
    natalCertified: false,
    note: "Mean longitude and Sheeghrocha MUST come from independent, documented classical ephemerides"
  };
}
function bphsFivePlanetCheshtaFromClassicalMeans(planet, meanSun, meanPlanet, truePlanet) {
  const outer = ["\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BA9\u0BBF"];
  const inner = ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"];
  if (!outer.includes(planet) && !inner.includes(planet))
    throw new RangeError("BPHS separate five-planet Cheshta excludes Sun, Moon, lunar nodes");
  if (![meanSun, meanPlanet, truePlanet].every(finite3))
    throw new TypeError("Three finite longitudes in SAME classical sidereal frame required");
  const outerPlanet = outer.includes(planet);
  const meanLongitude = norm3605(outerPlanet ? meanPlanet : meanSun);
  const sheeghrocha = norm3605(outerPlanet ? meanSun : meanPlanet);
  const trueLongitude = norm3605(truePlanet);
  return {
    planet,
    meanLongitude,
    trueLongitude,
    sheeghrocha,
    ...bphsCheshtaFromOrbitalElements(meanLongitude, trueLongitude, sheeghrocha),
    inputSource: "validated classical sidereal mean-longitude inputs REQUIRED",
    method: "BPHS Ch27 24-25; five-planet mean vs Sheeghrocha selection from Uttara Kalamrita II 42-43",
    natalCertified: false
  };
}

// public/horoscope/offline/effective-lahiri-frame.browser.mjs
var RADIAN_FLAGS = 2 | 256;
var V365_MEAN_SOURCE_REFERENCE_ZERO_POINT_DEGREES = 18 + 5 / 60 + 8.25 / 3600;
var norm3606 = (value) => (value % 360 + 360) % 360;
var TRUE_BPHS_LAHIRI_FRAME_ID = "NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1";
function v365MeanSourceNativeOffsetDegrees(lahiriAyanamsaAtDate, v365ReferenceAyanamsaAt1860) {
  if (!Number.isFinite(lahiriAyanamsaAtDate) || !Number.isFinite(v365ReferenceAyanamsaAt1860)) {
    throw new TypeError("Finite date-specific and 1860 Lahiri ayanamsa values are required");
  }
  return V365_MEAN_SOURCE_REFERENCE_ZERO_POINT_DEGREES + (lahiriAyanamsaAtDate - v365ReferenceAyanamsaAt1860);
}
function effectiveLahiriSiderealOffsetDegrees(swe, jdTt) {
  if (!swe || !Number.isFinite(jdTt) || typeof swe.calc !== "function" || typeof swe.siderealSpeedFlags !== "function") {
    throw new TypeError("Swiss Ephemeris and a finite TT epoch are required for Lahiri frame calibration");
  }
  const tropicalSun = swe.calc(jdTt, 0, RADIAN_FLAGS);
  const siderealSun = swe.calc(jdTt, 0, swe.siderealSpeedFlags());
  if (!Number.isFinite(tropicalSun?.longitude) || !Number.isFinite(siderealSun?.longitude)) {
    throw new Error("Effective Lahiri sidereal offset could not be computed from the same-epoch Sun");
  }
  return norm3606(tropicalSun.longitude - siderealSun.longitude);
}
function transferV365MeanToEffectiveLahiri(longitude, sourceNativeOffsetDegrees, effectiveLahiriOffsetDegrees) {
  if (![longitude, sourceNativeOffsetDegrees, effectiveLahiriOffsetDegrees].every(Number.isFinite)) {
    throw new TypeError("Finite V365 longitude and both frame offsets are required");
  }
  return norm3606(longitude + sourceNativeOffsetDegrees - effectiveLahiriOffsetDegrees);
}
var TRUE_BPHS_LAHIRI_FRAME_METADATA = Object.freeze({
  frameId: TRUE_BPHS_LAHIRI_FRAME_ID,
  coordinateSystem: "effective Lahiri sidereal ecliptic-of-date",
  calibration: "same-epoch Swiss tropical apparent Sun longitude minus Swiss Lahiri sidereal apparent Sun longitude",
  planetPositionProvider: "NAELOS Ephemeris 0.1.3 / NASA-JPL DE440",
  v365MeanInput: "V365 mean-motion source; values rotated into this same effective Lahiri frame",
  noSauraFrame: true,
  absoluteKotiMinusUsed: false
});

// public/horoscope/offline/true-bphs-naelos-engine.browser.mjs
var DAY_MS = 864e5;
var JD_UNIX_EPOCH = 24405875e-1;
var RAD2 = Math.PI / 180;
var DEG = 180 / Math.PI;
var SEFLG_SPEED2 = 256;
var SEFLG_EQUATORIAL2 = 2048;
var V365_MEAN_REFERENCE_EPOCH_JD = julday(1860, 1, 1, 0);
var YEAR_MIN = 1800;
var YEAR_MAX = 2399;
var NAELOS_VERSION = "0.1.3";
var NAELOS_SOURCE = "JPL DE440";
var FRAME_ID = TRUE_BPHS_LAHIRI_FRAME_ID;
var EQUATORIAL_FRAME_ID = "NAELOS_TRUE_EQUATOR_OF_DATE_GAST_V1";
var SOLAR_HORIZON_DEGREES = -0.8333;
var BODY_ROWS = Object.freeze([
  ["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "Sun", SE_SUN],
  ["\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "Moon", SE_MOON],
  ["\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "Mars", SE_MARS],
  ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "Mercury", SE_MERCURY],
  ["\u0B95\u0BC1\u0BB0\u0BC1", "Jupiter", SE_JUPITER],
  ["\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "Venus", SE_VENUS],
  ["\u0B9A\u0BA9\u0BBF", "Saturn", SE_SATURN]
]);
var FIVE_ROWS = Object.freeze([
  ["\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD", "Mars"],
  ["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "Mercury"],
  ["\u0B95\u0BC1\u0BB0\u0BC1", "Jupiter"],
  ["\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "Venus"],
  ["\u0B9A\u0BA9\u0BBF", "Saturn"]
]);
var BPHS_PLANETS = Object.freeze([
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD",
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD",
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD",
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD",
  "\u0B95\u0BC1\u0BB0\u0BC1",
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD",
  "\u0B9A\u0BA9\u0BBF"
]);
var BPHS_REQUIRED_VIRUPA = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": 390,
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": 360,
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": 300,
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": 420,
  "\u0B95\u0BC1\u0BB0\u0BC1": 390,
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": 330,
  "\u0B9A\u0BA9\u0BBF": 300
});
var DIG_IDEAL_HOUSE = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": 10,
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": 10,
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": 4,
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": 4,
  "\u0B95\u0BC1\u0BB0\u0BC1": 1,
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": 1,
  "\u0B9A\u0BA9\u0BBF": 7
});
var DAYTIME_GRAHAS = /* @__PURE__ */ new Set(["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD"]);
var HORA_ORDER = Object.freeze(["\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BA9\u0BBF", "\u0B95\u0BC1\u0BB0\u0BC1", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD"]);
var TRIBHAGA_DAY = Object.freeze(["\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD", "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD", "\u0B9A\u0BA9\u0BBF"]);
var TRIBHAGA_NIGHT = Object.freeze(["\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD", "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD"]);
var TAMIL_TO_ENGLISH = Object.freeze({
  "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD": "Sun",
  "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD": "Moon",
  "\u0B9A\u0BC6\u0BB5\u0BCD\u0BB5\u0BBE\u0BAF\u0BCD": "Mars",
  "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD": "Mercury",
  "\u0B95\u0BC1\u0BB0\u0BC1": "Jupiter",
  "\u0B9A\u0BC1\u0B95\u0BCD\u0B95\u0BBF\u0BB0\u0BA9\u0BCD": "Venus",
  "\u0B9A\u0BA9\u0BBF": "Saturn"
});
var norm3607 = (value) => (value % 360 + 360) % 360;
var norm24 = (value) => (value % 24 + 24) % 24;
var signedAngle = (a, b) => (a - b + 540) % 360 - 180;
var circularDistance = (a, b) => Math.abs(signedAngle(a, b));
var round32 = (value) => Math.round((value + Number.EPSILON) * 1e3) / 1e3;
var finite4 = (value) => typeof value === "number" && Number.isFinite(value);
var jdFromUtcMs = (value) => value / DAY_MS + JD_UNIX_EPOCH;
function fail(message) {
  throw new Error("[TRUE_BPHS_SHADBALA] " + message);
}
function validateCivilInput({ date, time, latitude, longitude, timeZone, utcOffsetMinutes } = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const clock = /^(\d{2}):([0-5]\d)$/.exec(String(time || ""));
  if (!match || !clock) throw new RangeError("Birth date YYYY-MM-DD and local time HH:mm are required");
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(clock[1]), minute = Number(clock[2]);
  const civil = new Date(Date.UTC(year, month - 1, day));
  if (year < YEAR_MIN || year > YEAR_MAX || civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day) {
    throw new RangeError("TRUE BPHS NAELOS engine supports Gregorian natal dates 1800\u20132399");
  }
  if (hour > 23) throw new RangeError("Birth time hour must be 00\u201323");
  if (!finite4(latitude) || latitude < -90 || latitude > 90 || !finite4(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError("Finite latitude and east-positive longitude are required");
  }
  let offset = utcOffsetMinutes;
  if (!finite4(offset)) {
    if (typeof timeZone !== "string" || !timeZone.trim()) {
      throw new TypeError("Supply an IANA timeZone or an exact utcOffsetMinutes");
    }
    offset = offsetMinutesAt(timeZone, date, time);
  }
  if (!finite4(offset) || Math.abs(offset) > 14 * 60) {
    throw new RangeError("UTC offset is outside the supported civil-time range");
  }
  const localMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const utcMs = localMs - offset * 6e4;
  return Object.freeze({
    year,
    date,
    time,
    hour,
    minute,
    latitude,
    longitude,
    timeZone: timeZone || null,
    utcOffsetMinutes: offset,
    utcMs,
    jdUt: jdFromUtcMs(utcMs)
  });
}
function previousCivilDate(date) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - DAY_MS);
  return dt.toISOString().slice(0, 10);
}
function midpointArc(a, b) {
  return norm3607(a + norm3607(b - a) / 2);
}
function housePlacement(longitude, arambhaCusps) {
  const x = norm3607(longitude);
  for (let i = 0; i < 12; i++) {
    const distance = circularDistance(x, arambhaCusps[i]);
    if (distance <= 1e-7) return null;
  }
  for (let i = 0; i < 12; i++) {
    const start = arambhaCusps[i], end = arambhaCusps[(i + 1) % 12];
    const span = norm3607(end - start), position = norm3607(x - start);
    if (position < (span < 1e-10 ? 360 : span)) return i + 1;
  }
  return null;
}
function createSripatiCusps(madhyaCusps) {
  if (!Array.isArray(madhyaCusps) || madhyaCusps.length !== 12 || madhyaCusps.some((value) => !finite4(value))) {
    throw new TypeError("NAELOS Porphyry Bhava Madhya must contain twelve finite cusps");
  }
  const arambha = madhyaCusps.map((current, index) => midpointArc(madhyaCusps[(index + 11) % 12], current));
  return { madhya: [...madhyaCusps].map(norm3607), arambha };
}
function requiredPosition(result, label) {
  if (!result || typeof result !== "object" || "error" in result) {
    fail(label + " unavailable: " + String(result?.error || "NAELOS returned no position"));
  }
  for (const field of ["longitude", "latitude", "distance", "longitudeSpeed", "latitudeSpeed", "distanceSpeed"]) {
    if (!finite4(result[field])) fail(label + " has invalid " + field);
  }
  return result;
}
function localHourAngleDegrees(armc, solarRightAscension) {
  return signedAngle(armc, solarRightAscension);
}
function apparentSolarAltitudeDegrees(jdUt, latitude, naelos) {
  const deltaTSeconds = naelos.eph.deltat(jdUt) * 86400;
  const jdTt = jdUt + deltaTSeconds / 86400;
  const sun = requiredPosition(
    naelos.eph.calc(jdTt, SE_SUN, SEFLG_EQUATORIAL2),
    "Sun equatorial position at JDUT " + jdUt
  );
  const houses2 = naelos.eph.houses(jdUt, latitude, naelos.longitude, "O");
  const hourAngle = localHourAngleDegrees(houses2.armc, sun.longitude) * RAD2;
  const phi = latitude * RAD2, declination = sun.latitude * RAD2;
  const sine = Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle);
  return {
    altitude: Math.asin(Math.max(-1, Math.min(1, sine))) * DEG,
    rightAscension: sun.longitude,
    declination: sun.latitude,
    armc: houses2.armc
  };
}
function rootSolarCrossing(a, b, rising, latitude, naelos) {
  let lo = a, hi = b;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    const value = apparentSolarAltitudeDegrees(mid, latitude, naelos).altitude - SOLAR_HORIZON_DEGREES;
    if (rising && value >= 0 || !rising && value <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
function findSolarEvents(birthJdUt, latitude, naelos) {
  const start = birthJdUt - 1.55, stop = birthJdUt + 1.55, step = 20 / 1440;
  const events = [];
  let previousJd = start;
  let previous = apparentSolarAltitudeDegrees(previousJd, latitude, naelos).altitude - SOLAR_HORIZON_DEGREES;
  for (let currentJd = start + step; currentJd <= stop + step / 2; currentJd += step) {
    const bounded = Math.min(currentJd, stop);
    const current = apparentSolarAltitudeDegrees(bounded, latitude, naelos).altitude - SOLAR_HORIZON_DEGREES;
    if (previous < 0 && current >= 0) {
      events.push({ kind: "sunrise", jdUt: rootSolarCrossing(previousJd, bounded, true, latitude, naelos) });
    } else if (previous > 0 && current <= 0) {
      events.push({ kind: "sunset", jdUt: rootSolarCrossing(previousJd, bounded, false, latitude, naelos) });
    }
    previousJd = bounded;
    previous = current;
    if (bounded >= stop) break;
  }
  events.sort((a, b) => a.jdUt - b.jdUt);
  return events;
}
function calculateTemporalContext(birth, naelos) {
  const events = findSolarEvents(birth.jdUt, birth.latitude, naelos);
  const rises = events.filter((row) => row.kind === "sunrise");
  const sets = events.filter((row) => row.kind === "sunset");
  const lastRise = rises.filter((row) => row.jdUt <= birth.jdUt).at(-1);
  const nextRise = rises.find((row) => row.jdUt > birth.jdUt);
  if (!lastRise || !nextRise) {
    fail("Could not bracket the birth instant with Naelos apparent solar rises; polar/no-rise dates are withheld");
  }
  const sunset = sets.find((row) => row.jdUt > lastRise.jdUt && row.jdUt < nextRise.jdUt);
  if (!sunset) fail("Could not find the sunset between consecutive Naelos sunrises");
  const day = birth.jdUt >= lastRise.jdUt && birth.jdUt < sunset.jdUt;
  const elapsedFromRise = birth.jdUt - lastRise.jdUt;
  const horaLength = (nextRise.jdUt - lastRise.jdUt) / 24;
  const horaStep = Math.max(0, Math.min(23, Math.floor(elapsedFromRise / horaLength)));
  const solarCalendarDay = day || birth.jdUt >= sunset.jdUt ? birth.date : previousCivilDate(birth.date);
  const owners = traditionalAharganaLords(solarCalendarDay);
  let tribhagaIndex;
  if (day) {
    tribhagaIndex = Math.max(0, Math.min(
      2,
      Math.floor(3 * (birth.jdUt - lastRise.jdUt) / (sunset.jdUt - lastRise.jdUt))
    ));
  } else {
    tribhagaIndex = Math.max(0, Math.min(
      2,
      Math.floor(3 * (birth.jdUt - sunset.jdUt) / (nextRise.jdUt - sunset.jdUt))
    ));
  }
  const horaLord = HORA_ORDER[(HORA_ORDER.indexOf(owners.dinaLord) + horaStep) % 7];
  const tribhagaLord = (day ? TRIBHAGA_DAY : TRIBHAGA_NIGHT)[tribhagaIndex];
  const deltaTSeconds = naelos.eph.deltat(birth.jdUt) * 86400;
  const sunEq = requiredPosition(
    naelos.eph.calc(birth.jdUt + deltaTSeconds / 86400, SE_SUN, SEFLG_EQUATORIAL2),
    "Sun equatorial birth position"
  );
  const localHouses = naelos.eph.houses(
    birth.jdUt,
    birth.latitude,
    birth.longitude,
    "O"
  );
  const apparentSolarHour = norm24(
    12 + localHourAngleDegrees(localHouses.armc, sunEq.longitude) / 15
  );
  return Object.freeze({
    solarCalendarDay,
    day,
    night: !day,
    tribhagaIndex,
    horaStep,
    apparentSolarHour,
    abdaLord: owners.abdaLord,
    masaLord: owners.masaLord,
    dinaLord: owners.dinaLord,
    horaLord,
    tribhagaLord,
    ahargana: owners.ahargana,
    sunriseJdUt: lastRise.jdUt,
    sunsetJdUt: sunset.jdUt,
    nextSunriseJdUt: nextRise.jdUt,
    sunriseApprox: true,
    solarTimeMethod: "NAELOS DE440 apparent geocentric Sun RA/Dec + NAELOS apparent sidereal time; horizon \u22120.8333\xB0; 32-step bisection",
    solarTimeFrameId: EQUATORIAL_FRAME_ID,
    epochJdUt: birth.jdUt,
    source: "NAELOS Ephemeris 0.1.3 / JPL DE440",
    sunriseModelUncertainty: "Sea-level \u22120.8333\xB0 standard horizon; local elevation, pressure and weather are not modelled"
  });
}
function natonnathaBala(planet, apparentSolarHour) {
  if (planet === "\u0BAA\u0BC1\u0BA4\u0BA9\u0BCD") return 60;
  const distance = Math.abs(12 - apparentSolarHour) / 12;
  const dayStrength = 60 * (1 - distance);
  return round32(DAYTIME_GRAHAS.has(planet) ? dayStrength : 60 - dayStrength);
}
function calculateKalaBala(planet, planetRows, temporal, declinations) {
  const sun = planetRows.find((row) => row.name === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD");
  const moon = planetRows.find((row) => row.name === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD");
  const natonnatha = natonnathaBala(planet, temporal.apparentSolarHour);
  const paksha = pakshaBala(planet, sun.longitude, moon.longitude, planetRows);
  const tribhaga = planet === "\u0B95\u0BC1\u0BB0\u0BC1" || temporal.tribhagaLord === planet ? 60 : 0;
  const abda = temporal.abdaLord === planet ? 15 : 0;
  const masa = temporal.masaLord === planet ? 30 : 0;
  const vara = temporal.dinaLord === planet ? 45 : 0;
  const hora = temporal.horaLord === planet ? 60 : 0;
  const ayana = ayanaBala(declinations[planet], planet);
  if (!finite4(ayana)) fail("BPHS Ayana Bala unavailable for " + planet);
  const total = natonnatha + paksha + tribhaga + abda + masa + vara + hora + ayana;
  return Object.freeze({
    natonnatha: round32(natonnatha),
    paksha: round32(paksha),
    tribhaga,
    abda,
    masa,
    vara,
    hora,
    ayana: round32(ayana),
    yuddha: 0,
    total: round32(total)
  });
}
function calculateCheshtaBala(planet, planetRows, declinations, cheshtaInputs) {
  if (planet === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD") return ayanaBala(declinations[planet], planet);
  const sun = planetRows.find((row) => row.name === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD");
  const moon = planetRows.find((row) => row.name === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD");
  if (planet === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD") return pakshaBala(planet, sun.longitude, moon.longitude, planetRows);
  const input = cheshtaInputs[planet];
  const cheshta = bphsFivePlanetCheshtaFromClassicalMeans(
    planet,
    input.meanSunLongitude,
    input.meanPlanetLongitude,
    input.truePlanetLongitude
  );
  return cheshta.virupa;
}
function calculateDigBala(planet, longitude, madhyaCusps) {
  const idealHouse = DIG_IDEAL_HOUSE[planet];
  const idealLongitude = madhyaCusps[idealHouse - 1];
  return round32(Math.max(0, Math.min(60, 60 - circularDistance(longitude, idealLongitude) / 3)));
}
function resolveBphsGrahaYuddha(planetRows) {
  const eligible = planetRows.filter((row) => FIVE_ROWS.some(([ta]) => ta === row.name));
  if (eligible.length !== 5) fail("All five eligible grahas are required for Graha Yuddha review");
  const minuteIndex = (value) => Math.floor(norm3607(value) * 60 + 1e-9) % 21600;
  const candidates = [], noWar = [], ambiguous = [];
  for (let i = 0; i < eligible.length; i++) for (let j = i + 1; j < eligible.length; j++) {
    const a = eligible[i], b = eligible[j];
    const degrees = circularDistance(a.longitude, b.longitude);
    if (minuteIndex(a.longitude) !== minuteIndex(b.longitude)) {
      noWar.push({ planetA: a.name, planetB: b.name, separationDegrees: degrees, reason: "not-the-same-degree-and-minute" });
      continue;
    }
    if (a.bhava !== b.bhava) {
      noWar.push({ planetA: a.name, planetB: b.name, separationDegrees: degrees, reason: "different-bhava" });
      continue;
    }
    if (!finite4(a.eclipticLatitude) || !finite4(b.eclipticLatitude)) {
      ambiguous.push({ planetA: a.name, planetB: b.name, separationDegrees: degrees, reason: "missing-ecliptic-latitude" });
      continue;
    }
    if (Math.abs(a.eclipticLatitude - b.eclipticLatitude) < 1e-9) {
      ambiguous.push({ planetA: a.name, planetB: b.name, separationDegrees: degrees, reason: "northern-latitude-tie" });
      continue;
    }
    candidates.push({
      planetA: a.name,
      planetB: b.name,
      winner: a.eclipticLatitude > b.eclipticLatitude ? a.name : b.name,
      loser: a.eclipticLatitude > b.eclipticLatitude ? b.name : a.name,
      separationDegrees: degrees,
      winnerNorthLatitude: a.eclipticLatitude > b.eclipticLatitude ? a.eclipticLatitude : b.eclipticLatitude,
      loserNorthLatitude: a.eclipticLatitude > b.eclipticLatitude ? b.eclipticLatitude : a.eclipticLatitude,
      source: "Uttara Kalamrita II printed p.41 (BPHS-silent winner/eligibility fallback)"
    });
  }
  const counts = /* @__PURE__ */ new Map();
  for (const row of candidates) for (const name of [row.planetA, row.planetB]) counts.set(name, (counts.get(name) || 0) + 1);
  const pairKey = (row) => [row.planetA, row.planetB].sort().join("|");
  const unresolvedByPair = new Map(ambiguous.map((row) => [pairKey(row), row]));
  for (const row of candidates) if (counts.get(row.planetA) > 1 || counts.get(row.planetB) > 1) {
    unresolvedByPair.set(pairKey(row), {
      planetA: row.planetA,
      planetB: row.planetB,
      separationDegrees: row.separationDegrees,
      reason: "overlapping-graha-yuddha-candidates"
    });
  }
  const unresolvedRows = [...unresolvedByPair.values()];
  const ambiguousNames = /* @__PURE__ */ new Set();
  for (const row of unresolvedRows) {
    ambiguousNames.add(row.planetA);
    ambiguousNames.add(row.planetB);
  }
  const resolved = candidates.filter(
    (row) => !ambiguousNames.has(row.planetA) && !ambiguousNames.has(row.planetB)
  );
  const allPairs = [
    ...noWar.map((row) => ({ ...row, status: "NO_WAR", winner: null, loser: null })),
    ...unresolvedRows.map((row) => ({ ...row, status: "UNRESOLVED", winner: null, loser: null })),
    ...resolved.map((row) => ({ ...row, status: "WAR" }))
  ];
  return Object.freeze({
    reviewed: true,
    resolved: unresolvedRows.length === 0,
    encounters: Object.freeze(resolved.map(({ winner, loser }) => Object.freeze({ winner, loser }))),
    unresolved: Object.freeze(unresolvedRows),
    unresolvedGrahas: Object.freeze([...ambiguousNames]),
    pairs: Object.freeze(allPairs),
    evaluatedPairs: allPairs.length,
    eligibilityRule: "same Bhava and same degree+minute bin; northern ecliptic latitude is the winner",
    eligibilitySource: "Uttara Kalamrita II printed p.41, used only where BPHS does not specify the war winner/eligibility detail",
    magnitudeRule: "BPHS I Chapter 27 verse 20: difference of the two pre-war Shadbala totals"
  });
}
function assertCoreInputs(planetRows, bhavas, temporal, declinations, cheshtaInputs, epochJdUt) {
  const byName = /* @__PURE__ */ new Map();
  for (const row of planetRows) {
    if (byName.has(row.name)) fail("Duplicate graha row " + row.name);
    if (row.referenceFrameId !== FRAME_ID) fail(row.name + " is not in the common declared ecliptic frame");
    for (const field of ["longitudeFrameId", "speedFrameId", "eclipticLatitudeFrameId"]) {
      if (row[field] !== FRAME_ID) fail(row.name + " " + field + " does not match the common frame");
    }
    if (row.epochJdUt !== epochJdUt) fail(row.name + " is not at the natal epoch");
    if (!finite4(row.longitude) || row.longitude < 0 || row.longitude >= 360 || !finite4(row.speed) || !finite4(row.eclipticLatitude)) fail(row.name + " has incomplete astronomical input");
    byName.set(row.name, row);
  }
  for (const name of BPHS_PLANETS) if (!byName.has(name)) fail("Missing required BPHS graha " + name);
  if (planetRows.length < 7) fail("Seven grahas are required");
  if (bhavas.length !== 12 || bhavas.some((row, index) => row.house !== index + 1 || row.referenceFrameId !== FRAME_ID || row.epochJdUt !== epochJdUt || !finite4(row.longitude))) fail("All twelve Bhava Madhya cusps must match chart frame and epoch");
  if (!temporal || temporal.epochJdUt !== epochJdUt || temporal.solarTimeFrameId !== EQUATORIAL_FRAME_ID || temporal.sunriseApprox !== true || !finite4(temporal.apparentSolarHour)) fail("Naelos solar-time provenance is incomplete");
  if (declinations.referenceFrameId !== EQUATORIAL_FRAME_ID || declinations.epochJdUt !== epochJdUt)
    fail("Tropical declinations are not in the common Naelos equatorial-of-date frame");
  for (const name of BPHS_PLANETS) if (!finite4(declinations.values[name]))
    fail("Missing Naelos tropical declination for " + name);
  for (const [ta] of FIVE_ROWS) {
    const row = cheshtaInputs[ta];
    if (!row || row.epochJdUt !== epochJdUt || ![row.meanSunFrameId, row.meanPlanetFrameId, row.truePlanetFrameId, row.sheeghroccaFrameId].every((id) => id === FRAME_ID) || ![row.meanSunLongitude, row.meanPlanetLongitude, row.truePlanetLongitude].every(finite4) || circularDistance(row.truePlanetLongitude, byName.get(ta).longitude) > 1e-9) {
      fail("Mean / True / Sheeghroccheya frame/epoch mismatch for " + ta);
    }
  }
  return byName;
}
function calculateBphsIshtaKashta({
  planet,
  uchchaBala,
  sunLongitude,
  moonLongitude,
  cheshtaInputs,
  epochJdUt
}) {
  if (!finite4(uchchaBala) || uchchaBala < 0 || uchchaBala > 60)
    fail("BPHS Chapter 28 Uchcha Bala input is unavailable for " + planet);
  let cheshtaKendraDegrees, cheshtaKendraSource;
  if (planet === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD") {
    cheshtaKendraDegrees = 90;
    cheshtaKendraSource = "BPHS I Ch28 vv3\u20134: Sayana Sun + 3 Rasis";
  } else if (planet === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD") {
    const elongation = norm3607(moonLongitude - sunLongitude);
    cheshtaKendraDegrees = Math.min(elongation, 360 - elongation);
    cheshtaKendraSource = "BPHS I Ch28 v4: Moon \u2212 effective-Lahiri sidereal Sun";
  } else {
    const input = cheshtaInputs?.[planet];
    if (!input || input.epochJdUt !== epochJdUt || ![input.meanSunFrameId, input.meanPlanetFrameId, input.truePlanetFrameId, input.sheeghroccaFrameId].every((id) => id === FRAME_ID))
      fail("BPHS Chapter 28 Cheshta Kendra source/frame/epoch is unavailable for " + planet);
    const cheshta = bphsFivePlanetCheshtaFromClassicalMeans(
      planet,
      input.meanSunLongitude,
      input.meanPlanetLongitude,
      input.truePlanetLongitude
    );
    cheshtaKendraDegrees = cheshta.cheshtaKendraDegrees;
    cheshtaKendraSource = "BPHS I Ch27 vv24\u201325; UK II pp42\u201343 input selection, same effective-Lahiri frame";
  }
  const cheshtaForPhala = cheshtaKendraDegrees / 3;
  if (!finite4(cheshtaForPhala) || cheshtaForPhala < 0 || cheshtaForPhala > 60)
    fail("BPHS Chapter 28 Cheshta-for-Phala outside 0\u201360 Virupas for " + planet);
  const uchchaRasmi = 1 + uchchaBala / 10;
  const cheshtaRasmi = 1 + cheshtaForPhala / 10;
  const subhaRasmi = (uchchaRasmi + cheshtaRasmi) / 2;
  const asubhaRasmi = 8 - subhaRasmi;
  const ishtaPhala = ((uchchaRasmi - 1) * 10 + (cheshtaRasmi - 1) * 10) / 2;
  const kashtaPhala = 60 - ishtaPhala;
  return Object.freeze({
    available: true,
    method: "TRUE_BPHS_CH28_RASMI_ISHTA_KASHTA",
    source: "Brihat Parashara Hora Shastra I, Chapter 28 verses 2\u20136",
    unit: "virupa",
    uchchaBala: round32(uchchaBala),
    cheshtaForPhala: round32(cheshtaForPhala),
    cheshtaKendraDegrees: round32(cheshtaKendraDegrees),
    uchchaRasmi: Number(uchchaRasmi.toFixed(6)),
    cheshtaRasmi: Number(cheshtaRasmi.toFixed(6)),
    subhaRasmi: Number(subhaRasmi.toFixed(6)),
    asubhaRasmi: Number(asubhaRasmi.toFixed(6)),
    ishtaPhala: round32(ishtaPhala),
    kashtaPhala: round32(kashtaPhala),
    cheshtaKendraSource,
    referenceFrameId: FRAME_ID,
    epochJdUt,
    classicalCertified: false,
    provisional: true
  });
}
function assembleBphsShadbala({ planetRows, bhavas, temporal, declinations, cheshtaInputs, yuddha } = {}) {
  const byName = assertCoreInputs(planetRows, bhavas, temporal, declinations, cheshtaInputs, temporal.epochJdUt);
  const rasiPositions = Object.fromEntries(BPHS_PLANETS.map((name) => [name, Math.floor(norm3607(byName.get(name).longitude) / 30)]));
  const preWar = {};
  const rows = {};
  for (const name of BPHS_PLANETS) {
    const planet = byName.get(name);
    const sthana = sthanaClassical(name, planet.longitude, planet.bhava, rasiPositions);
    const dig = calculateDigBala(name, planet.longitude, bhavas.map((x) => x.longitude));
    const kala = calculateKalaBala(name, planetRows, temporal, declinations.values);
    const cheshta = calculateCheshtaBala(name, planetRows, declinations.values, cheshtaInputs);
    const naisargika = SHADBALA_NATURAL[name];
    const drik = drikBalaClassical(name, planetRows);
    const ishtaKashta = calculateBphsIshtaKashta({
      planet: name,
      uchchaBala: sthana.uccha,
      sunLongitude: byName.get("\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD").longitude,
      moonLongitude: byName.get("\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD").longitude,
      cheshtaInputs,
      epochJdUt: temporal.epochJdUt
    });
    if (!finite4(cheshta) || cheshta < 0 || cheshta > (name === "\u0B9A\u0BC2\u0BB0\u0BBF\u0BAF\u0BA9\u0BCD" || name === "\u0B9A\u0BA8\u0BCD\u0BA4\u0BBF\u0BB0\u0BA9\u0BCD" ? 120 : 60))
      fail("BPHS Cheshta Bala outside its source range for " + name);
    if (!finite4(drik)) fail("BPHS Drig Bala unavailable for " + name);
    const preWarTotal = sthana.total + dig + kala.total + cheshta + naisargika + drik;
    preWar[name] = round32(preWarTotal);
    rows[name] = {
      available: true,
      planet: name,
      method: "TRUE_BPHS_SHADBALA_NAELOS_DE440",
      components: { sthana, dig, kala, cheshta: round32(cheshta), naisargika: round32(naisargika), drik: round32(drik) },
      ishtaKashta,
      preWarTotalVirupa: round32(preWarTotal),
      classicalCertified: false,
      provisional: true
    };
  }
  const yuddhaResult = bphsGrahaYuddhaFromBaselines(yuddha.encounters, preWar);
  for (const name of BPHS_PLANETS) {
    const base = rows[name], adjustment = yuddhaResult.virupaByPlanet[name] ?? 0;
    const kala = { ...base.components.kala, yuddha: round32(adjustment) };
    kala.total = round32(base.components.kala.total + adjustment);
    const components = { ...base.components, kala };
    const total = round32(
      components.sthana.total + components.dig + components.kala.total + components.cheshta + components.naisargika + components.drik
    );
    const unresolved = yuddha.unresolvedGrahas.includes(name);
    base.components = Object.freeze(components);
    base.totalVirupa = unresolved ? null : total;
    base.totalRupa = unresolved ? null : round32(total / 60);
    base.requiredVirupa = BPHS_REQUIRED_VIRUPA[name];
    base.ratio = unresolved ? null : round32(total / BPHS_REQUIRED_VIRUPA[name]);
    base.isStrong = unresolved ? null : total >= BPHS_REQUIRED_VIRUPA[name];
    base.warEvidence = Object.freeze({
      unresolvedGraha: unresolved,
      appliedAdjustmentVirupa: round32(adjustment),
      rule: "BPHS I Chapter 27 verse 20, pre-war Shadbala difference"
    });
    Object.freeze(base);
  }
  const finiteTotals = Object.values(rows).filter((row) => finite4(row.totalVirupa)).length;
  return Object.freeze({
    available: true,
    method: "TRUE_BPHS_SHADBALA_NAELOS_DE440",
    source: "Brihat Parashara Hora Shastra, R. Santhanam Vol I, Chapter 27; Chapter 26 Drig source helpers",
    referenceFrameId: FRAME_ID,
    frameConsistent: true,
    epochJdUt: temporal.epochJdUt,
    planets: Object.freeze(rows),
    yuddhaEvidence: yuddha,
    preWarTotals: Object.freeze(preWar),
    finalTotalsComplete: finiteTotals === 7,
    classicalCertified: false,
    provisional: true,
    researchOnly: true,
    productionIntegrationAllowed: false,
    limitations: Object.freeze([
      "NAELOS DE440 provides modern apparent geocentric True Longitude; this does not prove a historical astronomical True Longitude theory.",
      "V365 Mean / Sheeghroccheya source selectors are retained; every returned longitude and BPHS calculation input is expressed in the common effective Lahiri frame.",
      "Sunrise uses the standard \u22120.8333\xB0 sea-level horizon; local elevation, pressure and weather are unavailable.",
      "Uttara Kalamrita II p.41 is used only for Yuddha eligibility / northern-latitude winner where BPHS is silent; BPHS Ch27 v20 supplies the magnitude.",
      "A source-scoped arithmetic result is not independent certification of every Shadbala component for arbitrary natal epochs.",
      "PAC 2026 is a numerical cross-check only and is not an independent historical certificate for every natal epoch."
    ])
  });
}
async function createTrueBphsShadbalaEngine({
  dataBaseUrl = new URL("./naelos-data/", import.meta.url)
} = {}) {
  const dataUrl = dataBaseUrl instanceof URL ? dataBaseUrl : new URL(String(dataBaseUrl), import.meta.url);
  const manifestResponse = await fetch(new URL("manifest.json", dataUrl), { cache: "no-store" });
  if (!manifestResponse.ok) fail("NAELOS manifest download failed: HTTP " + manifestResponse.status);
  const manifest = await manifestResponse.json();
  if (manifest?.source?.name !== NAELOS_SOURCE || manifest?.format !== 2)
    fail("Checked-in NAELOS manifest is not the expected format-2 JPL DE440 manifest");
  const from = julday(1800, 1, 1, 0), to = julday(2400, 1, 1, 0);
  const names = tablesFor(from - 2, to + 2);
  const loaded = [];
  for (const name of names) {
    const meta = manifest.files.find((row) => row.name === name);
    if (!meta) fail("NAELOS manifest is missing " + name);
    const response = await fetch(new URL(name, dataUrl), { cache: "no-store" });
    if (!response.ok) fail(name + " download failed: HTTP " + response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== meta.bytes) fail(name + " byte length does not match NAELOS manifest");
    if (!globalThis.crypto?.subtle) fail("WebCrypto SHA-256 is required to verify NAELOS tables");
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const sha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
    if (sha256 !== meta.sha256) fail(name + " SHA-256 does not match NAELOS manifest");
    loaded.push({ name, bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), bytesLength: bytes.length, sha256 });
  }
  const eph = NaelosEphemeris.fromBuffers(loaded.map((row) => row.bytes));
  const swe = await getSwe();
  swe.setSiderealLahiri();
  const v365MeanReferenceAyanamsaAt1860 = swe.ayanamsa(V365_MEAN_REFERENCE_EPOCH_JD);
  if (!finite4(v365MeanReferenceAyanamsaAt1860)) fail("Swiss Lahiri reference-epoch value is unavailable for V365 mean-input coordinate conversion");
  const naelos = {
    eph,
    latitude: null,
    longitude: null,
    loadedTables: Object.freeze(loaded.map(({ name, bytesLength, sha256 }) => Object.freeze({ name, bytes: bytesLength, sha256 }))),
    manifestSource: manifest.source,
    v365MeanReferenceAyanamsaAt1860,
    swe
  };
  return Object.freeze({
    engine: "TRUE_BPHS_SHADBALA_NAELOS_DE440",
    version: "1.2.0-effective-lahiri",
    supportedCivilYears: Object.freeze([YEAR_MIN, YEAR_MAX]),
    sourceEphemeris: NAELOS_SOURCE,
    naelosPackageVersion: NAELOS_VERSION,
    loadedTables: naelos.loadedTables,
    tableIntegrityVerified: true,
    productionIntegrationAllowed: true,
    researchOnly: false,
    governmentReferenceCertificate: Object.freeze({
      certificateId: "SMV-ASTRO-PAC-NAELOS-SEVEN-GRAHA-EFFECTIVE-LAHIRI-2026",
      publisher: "Positional Astronomy Centre, Kolkata \u2014 India Meteorological Department, Government of India",
      sourcePdfManifest: "tests/fixtures/pac-2026-seven-graha-official-pdf-manifest.json",
      auditPath: "artifacts/pac-2026-seven-graha-naelos-validation.json",
      scope: "2026-01-01 through 2026-12-31; seven official graha PDFs; 365 published daily Nirayana values per graha; 2,555 comparisons total",
      comparisonEpoch: "00:00:00 TT",
      siderealConvention: "Effective Lahiri; inferred from PAC numeric match because PDF headings do not explicitly identify an ayanamsa",
      comparisonFrame: "NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1",
      candidate: "NAELOS Ephemeris 0.1.3 / NASA-JPL DE440 apparent geocentric True Longitude",
      maximumAbsoluteResidualArcseconds: 0.27813725,
      rmsResidualArcseconds: 0.13981181457377317,
      acceptanceGateArcseconds: 0.36,
      status: "PASS_PAC_NAELOS_SEVEN_GRAHA_EFFECTIVE_LAHIRI_2555",
      independentUnderlyingEphemerisProvenanceEstablished: false,
      arbitraryHistoricalEpochsCertified: false,
      classicalCheshtaCertified: false,
      productionIntegrationAllowed: false
    }),
    async trueLongitudesAtTt(jdTt) {
      if (!finite4(jdTt) || jdTt < julday(YEAR_MIN, 1, 1, 0) || jdTt >= julday(YEAR_MAX + 1, 1, 1, 0))
        throw new RangeError("A TT Julian Day within calendar years 1800\u20132399 is required");
      const lahiriAyanamsaDegrees = naelos.swe.ayanamsa(jdTt);
      if (!finite4(lahiriAyanamsaDegrees)) fail("Lahiri ayanamsa at the PAC TT epoch is unavailable");
      const sourceNativeOffsetDegrees = v365MeanSourceNativeOffsetDegrees(
        lahiriAyanamsaDegrees,
        naelos.v365MeanReferenceAyanamsaAt1860
      );
      const effectiveLahiriOffsetDegrees = effectiveLahiriSiderealOffsetDegrees(naelos.swe, jdTt);
      const v365ToEffectiveLahiriRotationDegrees = sourceNativeOffsetDegrees - effectiveLahiriOffsetDegrees;
      const planets = {};
      for (const [tamil, english, body] of BODY_ROWS) {
        const position = requiredPosition(
          eph.calc(jdTt, body, SEFLG_SPEED2),
          "NAELOS PAC validation " + english + " at TT JD " + jdTt
        );
        planets[english] = Object.freeze({
          tropicalApparentTrueLongitude: position.longitude,
          trueLongitudeLahiri: norm3607(position.longitude - effectiveLahiriOffsetDegrees),
          v365ToEffectiveLahiriRotationDegrees,
          eclipticLatitude: position.latitude,
          longitudeSpeed: position.longitudeSpeed,
          referenceFrameId: FRAME_ID,
          epochJdTt: jdTt,
          source: "NAELOS Ephemeris 0.1.3 / NASA-JPL DE440"
        });
      }
      return Object.freeze({
        epochJdTt: jdTt,
        lahiriAyanamsaDegrees,
        effectiveLahiriOffsetDegrees,
        sourceNativeOffsetDegrees,
        v365ToEffectiveLahiriRotationDegrees,
        referenceFrameId: FRAME_ID,
        planets: Object.freeze(planets),
        sourceCertificate: "SMV_ASTRO_PAC_2026_OFFICIAL_SEVEN_GRAHA_NIRAYANA_LONGITUDE"
      });
    },
    async calculate(input = {}) {
      const civilBirth = validateCivilInput(input);
      const utcDate = new Date(civilBirth.utcMs);
      const swissTime = naelos.swe.utcToJd(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth() + 1,
        utcDate.getUTCDate(),
        utcDate.getUTCHours(),
        utcDate.getUTCMinutes(),
        utcDate.getUTCSeconds() + utcDate.getUTCMilliseconds() / 1e3
      );
      if (!finite4(swissTime?.ut) || !finite4(swissTime?.et))
        fail("UTC-to-UT1/TT time conversion did not return finite Julian days");
      const birth = Object.freeze({
        ...civilBirth,
        jdUt: swissTime.ut,
        jdTt: swissTime.et,
        ut1MinusUtcSeconds: (swissTime.ut - jdFromUtcMs(civilBirth.utcMs)) * 86400
      });
      const naelosContext = { ...naelos, latitude: birth.latitude, longitude: birth.longitude };
      const deltaTSeconds = (birth.jdTt - birth.jdUt) * 86400;
      const jdTt = birth.jdTt;
      const ayanamsa = naelos.swe.ayanamsa(birth.jdTt);
      if (!finite4(ayanamsa)) fail("Date-specific Lahiri ayanamsa is unavailable");
      const sourceNativeOffset = v365MeanSourceNativeOffsetDegrees(
        ayanamsa,
        naelos.v365MeanReferenceAyanamsaAt1860
      );
      const effectiveLahiriOffset = effectiveLahiriSiderealOffsetDegrees(
        naelos.swe,
        birth.jdTt
      );
      const offsetBefore = effectiveLahiriSiderealOffsetDegrees(
        naelos.swe,
        birth.jdTt - 0.5
      );
      const offsetAfter = effectiveLahiriSiderealOffsetDegrees(
        naelos.swe,
        birth.jdTt + 0.5
      );
      const effectiveLahiriOffsetRate = signedAngle(offsetAfter, offsetBefore);
      const v365ToEffectiveLahiriRotation = sourceNativeOffset - effectiveLahiriOffset;
      const tropicalByName = {}, equatorialByName = {};
      for (const [tamil, english, body] of BODY_ROWS) {
        const tropical = requiredPosition(eph.calc(jdTt, body, SEFLG_SPEED2), "NAELOS " + english + " ecliptic position");
        const equatorial = requiredPosition(eph.calc(jdTt, body, SEFLG_EQUATORIAL2), "NAELOS " + english + " equatorial position");
        tropicalByName[tamil] = tropical;
        equatorialByName[tamil] = equatorial;
      }
      const nodeTropical = requiredPosition(
        eph.calc(jdTt, SE_TRUE_NODE, SEFLG_SPEED2),
        "NAELOS True Node"
      );
      const planetRows = BODY_ROWS.map(([tamil, english]) => {
        const p = tropicalByName[tamil];
        const longitude = norm3607(p.longitude - effectiveLahiriOffset);
        const speed = p.longitudeSpeed - effectiveLahiriOffsetRate;
        const row = {
          name: tamil,
          englishName: english,
          longitude,
          speed,
          eclipticLatitude: p.latitude,
          bhava: null,
          retrograde: speed < 0,
          tropicalApparentLongitude: p.longitude,
          tropicalApparentLatitude: p.latitude,
          referenceFrameId: FRAME_ID,
          longitudeFrameId: FRAME_ID,
          speedFrameId: FRAME_ID,
          eclipticLatitudeFrameId: FRAME_ID,
          epochJdUt: birth.jdUt,
          positionSource: "NAELOS Ephemeris 0.1.3 / JPL DE440 apparent geocentric true ecliptic of date"
        };
        return row;
      });
      const nodeLongitude = norm3607(nodeTropical.longitude - effectiveLahiriOffset);
      planetRows.push({
        name: "\u0BB0\u0BBE\u0B95\u0BC1",
        englishName: "True Node",
        longitude: nodeLongitude,
        speed: nodeTropical.longitudeSpeed - effectiveLahiriOffsetRate,
        eclipticLatitude: nodeTropical.latitude,
        bhava: null,
        referenceFrameId: FRAME_ID,
        longitudeFrameId: FRAME_ID,
        speedFrameId: FRAME_ID,
        eclipticLatitudeFrameId: FRAME_ID,
        epochJdUt: birth.jdUt,
        positionSource: "NAELOS DE440 true lunar node"
      });
      planetRows.push({
        name: "\u0B95\u0BC7\u0BA4\u0BC1",
        englishName: "South Node",
        longitude: norm3607(nodeLongitude + 180),
        speed: nodeTropical.longitudeSpeed - effectiveLahiriOffsetRate,
        eclipticLatitude: -nodeTropical.latitude,
        bhava: null,
        referenceFrameId: FRAME_ID,
        longitudeFrameId: FRAME_ID,
        speedFrameId: FRAME_ID,
        eclipticLatitudeFrameId: FRAME_ID,
        epochJdUt: birth.jdUt,
        positionSource: "NAELOS DE440 true lunar node + 180\xB0"
      });
      const porphyry2 = eph.houses(birth.jdUt, birth.latitude, birth.longitude, "O");
      const sripati = createSripatiCusps(porphyry2.cusps.map((value) => norm3607(value - effectiveLahiriOffset)));
      for (const row of planetRows) {
        if (!BPHS_PLANETS.includes(row.name)) {
          row.bhava = null;
          continue;
        }
        row.bhava = housePlacement(row.longitude, sripati.arambha);
        if (!Number.isInteger(row.bhava))
          fail(row.name + " is exactly on a Sripati Arambha/Bhava Sandhi boundary; Sthana Bala is withheld");
      }
      const bhavas = sripati.madhya.map((longitude, index) => ({
        house: index + 1,
        longitude,
        referenceFrameId: FRAME_ID,
        epochJdUt: birth.jdUt,
        cuspKind: "SRIPATI_BHAVA_MADHYA_FROM_NAELOS_PORPHYRY"
      }));
      const declinations = {
        referenceFrameId: EQUATORIAL_FRAME_ID,
        epochJdUt: birth.jdUt,
        values: Object.fromEntries(BODY_ROWS.map(([tamil]) => [tamil, equatorialByName[tamil].latitude]))
      };
      const cheshtaInputs = {};
      for (const [tamil, english] of FIVE_ROWS) {
        const inputs = sauraFivePlanetCheshtaInputs(birth.jdUt, english);
        cheshtaInputs[tamil] = {
          meanSunLongitude: transferV365MeanToEffectiveLahiri(
            inputs.meanSunLongitude,
            sourceNativeOffset,
            effectiveLahiriOffset
          ),
          meanPlanetLongitude: transferV365MeanToEffectiveLahiri(
            inputs.ownMeanOrbitLongitude,
            sourceNativeOffset,
            effectiveLahiriOffset
          ),
          truePlanetLongitude: planetRows.find((row) => row.name === tamil).longitude,
          meanSunFrameId: FRAME_ID,
          meanPlanetFrameId: FRAME_ID,
          truePlanetFrameId: FRAME_ID,
          sheeghroccaFrameId: FRAME_ID,
          epochJdUt: birth.jdUt,
          source: {
            meanSheeghroccheya: "V365 mean-motion source / Uttara Kalamrita II pp.42\u201343 input selector",
            trueLongitude: "NAELOS Ephemeris 0.1.3 / NASA-JPL DE440",
            frameTransfer: "All three BPHS Cheshta longitudes rotated into the same effective Lahiri sidereal frame"
          }
        };
      }
      const temporal = calculateTemporalContext(birth, naelosContext);
      const yuddha = resolveBphsGrahaYuddha(planetRows);
      const result = assembleBphsShadbala({
        planetRows,
        bhavas,
        temporal,
        declinations,
        cheshtaInputs,
        yuddha
      });
      return Object.freeze({
        engine: "TRUE_BPHS_SHADBALA_NAELOS_DE440",
        version: "1.2.0-effective-lahiri",
        status: "PROVISIONAL_PRODUCTION",
        researchOnly: false,
        productionIntegrationAllowed: true,
        classicalCertified: false,
        tableIntegrityVerified: true,
        birth: Object.freeze({
          date: birth.date,
          time: birth.time,
          timeZone: birth.timeZone,
          utcOffsetMinutes: birth.utcOffsetMinutes,
          latitude: birth.latitude,
          longitude: birth.longitude,
          utcJd: birth.jdUt,
          ttJd: jdTt,
          ut1MinusUtcSeconds: birth.ut1MinusUtcSeconds,
          deltaTSeconds
        }),
        astronomy: Object.freeze({
          ephemeris: "NAELOS Ephemeris 0.1.3",
          source: "NASA/JPL DE440",
          positionDefinition: "apparent geocentric true ecliptic-of-date",
          timeScale: "Birth civil time resolved to UTC from the supplied IANA timezone / exact offset; Swiss swe_utc_to_jd supplies the exact UT1 + TT epoch used by the prior NAELOS parity audit; Naelos converts TT to TDB internally",
          trueLongitudeFrame: "NAELOS tropical apparent true ecliptic-of-date longitude \u2212 same-epoch effective Lahiri sidereal offset (Swiss tropical Sun \u2212 Swiss Lahiri Sun)",
          effectiveLahiriOffsetDegrees: effectiveLahiriOffset,
          effectiveLahiriOffsetRateDegreesPerDay: effectiveLahiriOffsetRate,
          lahiriAyanamsaDegrees: ayanamsa,
          v365ToEffectiveLahiriRotationDegrees: v365ToEffectiveLahiriRotation,
          loadedTableFiles: naelos.loadedTables
        }),
        bhava: Object.freeze({
          system: "Sripati",
          source: "NAELOS Porphyry Bhava Madhya transformed into the same effective Lahiri sidereal frame; Arambha = midpoint of adjacent Madhya cusps",
          madhya: Object.freeze(sripati.madhya),
          arambha: Object.freeze(sripati.arambha),
          ascendant: norm3607(porphyry2.ascendant - effectiveLahiriOffset),
          midheaven: norm3607(porphyry2.mc - effectiveLahiriOffset),
          vertex: norm3607(porphyry2.vertex - effectiveLahiriOffset),
          referenceFrameId: FRAME_ID
        }),
        solarTime: temporal,
        frame: Object.freeze({
          id: FRAME_ID,
          epochJdUt: birth.jdUt,
          coordinateSystem: "effective Lahiri sidereal ecliptic-of-date",
          trueLongitudeSource: "NAELOS DE440 apparent geocentric True Longitude",
          meanLongitudeSource: "V365 mean-motion model, transformed into effective Lahiri coordinates",
          sheeghroccheyaSource: "V365 mean-motion model, transformed into effective Lahiri coordinates",
          v365ToEffectiveLahiriRotationDegrees: v365ToEffectiveLahiriRotation,
          effectiveLahiriOnly: true,
          noSauraFrame: true,
          noAbsoluteKotiMinus: true
        }),
        planetaryPositions: Object.freeze(planetRows.map((row) => Object.freeze({ ...row }))),
        cheshtaInputs: Object.freeze(cheshtaInputs),
        cheshtaResults: Object.freeze(Object.fromEntries(FIVE_ROWS.map(([tamil]) => {
          const row = cheshtaInputs[tamil];
          const value = bphsFivePlanetCheshtaFromClassicalMeans(
            tamil,
            row.meanSunLongitude,
            row.meanPlanetLongitude,
            row.truePlanetLongitude
          );
          return [tamil, Object.freeze({
            meanLongitude: value.meanLongitude,
            trueLongitude: value.trueLongitude,
            sheeghroccheya: value.sheeghrocha,
            midpoint: value.meanTrueMidpoint,
            cheshtaKendraDegrees: value.cheshtaKendraDegrees,
            virupa: value.virupa,
            source: "BPHS I Ch27 vv24\u201325; UK II pp.42\u201343 input selection"
          })];
        }))),
        ...result
      });
    }
  });
}
var TRUE_BPHS_SHADBALA_METADATA = Object.freeze({
  engine: "TRUE_BPHS_SHADBALA_NAELOS_DE440",
  version: "1.2.0-effective-lahiri",
  authority: "BPHS I Chapter 27; BPHS Ch26 Sputa Drishti",
  trueLongitudeSource: "NAELOS Ephemeris 0.1.3 / NASA-JPL DE440",
  meanSheeghroccheyaSource: "V365 mean-motion model transformed into effective Lahiri coordinates",
  productionIntegrationAllowed: true,
  classicalCertificationDefault: false,
  scope: Object.freeze({ startYear: 1800, endYear: 2399, grahas: 7, components: 6 })
});
export {
  TRUE_BPHS_SHADBALA_METADATA,
  createTrueBphsShadbalaEngine,
  resolveBphsGrahaYuddha
};
