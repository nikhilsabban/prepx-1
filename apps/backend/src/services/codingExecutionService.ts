import vm from 'vm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(execFile);

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  statusLabel: string;
  runtime: string;
  runtimeMs: number;
}

// ── OnlineCompiler.io config ──
const OC_API_URL = 'https://api.onlinecompiler.io/api/run-code-sync/';
const OC_COMPILERS: Record<string, string> = {
  javascript: 'nodejs-24',
  python:     'python-3.14',
  cpp:        'g++-15',
  java:       'openjdk-25',
  c:          'gcc-15',
};

const ocApiKey = () => process.env.ONLINE_COMPILER_API_KEY || '';

export const fixInput = (s: string) => (s || '').replace(/\\n/g, '\n');

export const applyWrapper = (userCode: string, wrapper?: string) => {
  if (!wrapper || !wrapper.trim()) return userCode;
  return wrapper.replace('__USER_CODE__', userCode);
};

// ── Extract function names from user code using regex ──
function extractFunctionNames(code: string): string[] {
  const names: string[] = [];
  const patterns = [
    /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,                      // function trap(...)
    /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/g, // var trap = function(...)
    /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(/g,       // const trap = (...) =>
    /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[a-zA-Z_$]/g, // const trap = async ...
  ];
  for (const pat of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pat.exec(code)) !== null) {
      if (m[1] && !names.includes(m[1])) names.push(m[1]);
    }
  }
  return names;
}

// ── Node.js built-in globals to ignore when scanning globalThis ──
const BUILTIN_GLOBALS = new Set([
  'console', 'require', 'globalThis', 'stdin',
  'clearInterval', 'clearTimeout', 'setInterval', 'setTimeout',
  'queueMicrotask', 'structuredClone', 'atob', 'btoa', 'fetch',
  'performance', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder',
  'AbortController', 'AbortSignal', 'Event', 'EventTarget', 'MessageChannel',
  'MessagePort', 'MessageEvent', 'DOMException', 'Headers', 'Request', 'Response',
  'FormData', 'Blob', 'File', 'ReadableStream', 'WritableStream', 'TransformStream',
  'CompressionStream', 'DecompressionStream', 'ByteLengthQueuingStrategy',
  'CountQueuingStrategy', 'BroadcastChannel', 'WebSocket',
  'Object', 'Function', 'Array', 'Number', 'Boolean', 'String', 'Symbol',
  'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef',
  'Promise', 'Proxy', 'Reflect', 'JSON', 'Math', 'parseInt', 'parseFloat',
  'isNaN', 'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI',
  'encodeURIComponent', 'eval', 'undefined', 'NaN', 'Infinity',
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Float32Array', 'Float64Array',
  'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array', 'Uint8ClampedArray',
  'Uint16Array', 'Uint32Array', 'BigInt', 'BigInt64Array', 'BigUint64Array',
  'FinalizationRegistry', 'AggregateError', 'EvalError', 'RangeError',
  'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
  'escape', 'unescape',
]);

// ── Local JS execution via Node vm (fallback) ──
async function runLocalJS(code: string, stdin: string): Promise<ExecutionResult> {
  const start = Date.now();
  const logs: string[] = [];
  const sandbox: any = {
    console: {
      log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    },
    stdin,
    require: () => {},
  };
  sandbox.globalThis = sandbox;

  // Extract candidate function names from user code
  const candidateNames = extractFunctionNames(code);
  const candidateJSON = JSON.stringify(candidateNames);

  try {
    const jsRunner = `
; (function() {
  const rawInput = (typeof stdin !== 'undefined' ? String(stdin) : '').trim();
  let args = [];
  if (rawInput.length > 0) {
    const lines = rawInput.split('\\n').filter(l => l.length > 0);
    args = lines.map(line => {
      const trimmed = line.trim();
      try { 
        return JSON.parse(trimmed); 
      } catch (e) {
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
          return trimmed.slice(1, -1);
        }
        return trimmed; 
      }
    });
  }

  let fn = null;

  // 1. Check for Solution class
  if (typeof Solution !== 'undefined') {
    try {
      const sol = typeof Solution === 'function' ? new Solution() : Solution;
      const proto = Object.getPrototypeOf(sol) || sol;
      const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor' && typeof sol[m] === 'function');
      if (methods.length > 0) fn = sol[methods[0]].bind(sol);
    } catch(e) {}
  }

  // 2. Check for 'solve' function
  if (!fn && typeof solve === 'function') fn = solve;

  // 3. Dynamically check candidate names extracted from user code
  if (!fn) {
    const candidates = ${candidateJSON};
    for (const name of candidates) {
      try {
        const f = eval(name);
        if (typeof f === 'function') { fn = f; break; }
      } catch(e) {}
    }
  }

  // 4. Fallback: scan globalThis but skip all known builtins
  if (!fn) {
    const IGNORE = new Set(${JSON.stringify([...BUILTIN_GLOBALS])});
    for (const key of Object.keys(globalThis)) {
      if (IGNORE.has(key)) continue;
      try {
        if (typeof globalThis[key] === 'function') { fn = globalThis[key]; break; }
      } catch(e) {}
    }
  }

  if (fn) {
    const res = fn(...args);
    if (res !== undefined) {
      console.log(typeof res === 'object' ? JSON.stringify(res) : String(res));
    }
  }
})();
`;
    const fullCode = `${code}\n${jsRunner}`;
    const script = new vm.Script(fullCode);
    const context = vm.createContext(sandbox);
    script.runInContext(context, { timeout: 5000 });
    const elapsed = Date.now() - start;
    return {
      stdout: logs.join('\n').trim(),
      stderr: '',
      exitCode: 0,
      statusLabel: 'Accepted',
      runtime: `${elapsed}ms`,
      runtimeMs: elapsed,
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      stdout: logs.join('\n').trim(),
      stderr: err.message || 'Runtime Error',
      exitCode: 1,
      statusLabel: 'Runtime Error',
      runtime: `${elapsed}ms`,
      runtimeMs: elapsed,
    };
  }
}

// ── Local Python execution via child_process (fallback) ──
async function runLocalPython(code: string, stdin: string): Promise<ExecutionResult> {
  const start = Date.now();
  try {
    const pyRunner = `
import sys, json
from typing import List, Dict, Tuple, Optional, Set, Any

${code}

if __name__ == '__main__':
    lines = """${stdin.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}""".strip().split('\\n')
    args = []
    for line in lines:
        if line.strip():
            try:
                args.append(json.loads(line))
            except:
                args.append(line.strip())
    fn = None
    if 'Solution' in globals():
        sol = Solution()
        methods = [m for m in dir(sol) if not m.startswith('_')]
        if methods:
            fn = getattr(sol, methods[0])
    if not fn:
        _skip = {'sys', 'json', 'List', 'Dict', 'Tuple', 'Optional', 'Set', 'Any'}
        funcs = [v for k, v in globals().items() if callable(v) and not k.startswith('_') and k not in _skip and k != 'Solution']
        if funcs:
            fn = funcs[-1]
    if fn:
        res = fn(*args)
        if res is not None:
            print(json.dumps(res) if isinstance(res, (bool, list, dict)) else res)
`;
    const { stdout, stderr } = await execAsync('python', ['-c', pyRunner], { timeout: 5000 });
    const elapsed = Date.now() - start;
    return {
      stdout: (stdout || '').trim(),
      stderr: (stderr || '').trim(),
      exitCode: 0,
      statusLabel: 'Accepted',
      runtime: `${elapsed}ms`,
      runtimeMs: elapsed,
    };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    return {
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || err.message || '').trim(),
      exitCode: 1,
      statusLabel: 'Runtime Error',
      runtime: `${elapsed}ms`,
      runtimeMs: elapsed,
    };
  }
}

// ── Local batch fallback (JS + Python via local VM / child_process) ──
export async function runLocalBatch(code: string, language: string, inputs: string[]): Promise<ExecutionResult[]> {
  const langName = language === 'c++' ? 'cpp' : language;

  return Promise.all(inputs.map(async (stdin) => {
    if (langName === 'javascript') return runLocalJS(code, stdin);
    if (langName === 'python')     return runLocalPython(code, stdin);

    // Unsupported language locally
    const start = Date.now();
    const elapsed = Date.now() - start;
    return {
      stdout: '',
      stderr: 'Execution unsupported for this language in local offline mode',
      exitCode: 1,
      statusLabel: 'Runtime Error',
      runtime: `${elapsed}ms`,
      runtimeMs: elapsed,
    };
  }));
}

// ── Execute code via OnlineCompiler.io API ──
// Returns null if the API hit a rate-limit or infra error (caller should fallback to local)
async function runOnlineCompiler(code: string, compiler: string, stdin: string, timeLimit: number = 10): Promise<ExecutionResult | null> {
  const start = Date.now();
  try {
    const response = await axios.post(
      OC_API_URL,
      {
        compiler,
        code,
        input: stdin,
        time_limit: timeLimit,
      },
      {
        headers: {
          'Authorization': ocApiKey(),
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    const elapsed = Date.now() - start;

    // Detect rate-limit or infra errors returned inside the response body
    const output = (data.output || '').trim();
    const error = (data.error || '').trim();
    if (output.includes('Too many runs') || error.includes('Too many runs') ||
        output.includes('limit') && output.includes('at once')) {
      return null; // signal caller to fallback
    }

    const exitCode = data.exit_code ?? (data.status === 'success' ? 0 : 1);

    let statusLabel = 'Accepted';
    if (exitCode !== 0) {
      if (error.includes('Compilation') || error.includes('SyntaxError')) {
        statusLabel = 'Compilation Error';
      } else if (data.signal === 'SIGKILL' || data.signal === 'SIGXCPU') {
        statusLabel = 'Time Limit Exceeded';
      } else {
        statusLabel = 'Runtime Error';
      }
    }

    return {
      stdout: output,
      stderr: error,
      exitCode,
      statusLabel,
      runtime: data.time ? `${Math.round(parseFloat(data.time) * 1000)}ms` : `${elapsed}ms`,
      runtimeMs: data.time ? parseFloat(data.time) * 1000 : elapsed,
    };
  } catch (err: any) {
    // HTTP-level errors (429, 503, network errors) → return null to trigger fallback
    const status = err.response?.status;
    if (status === 429 || status === 503 || status === 502 || !err.response) {
      return null;
    }
    // Other API errors (auth, bad request) → also fallback
    return null;
  }
}

// ── Main entry: tries OnlineCompiler.io first, falls back to local ──
export async function runBatch(code: string, language: string, inputs: string[]): Promise<ExecutionResult[]> {
  const langKey = language === 'c++' ? 'cpp' : language;
  const compiler = OC_COMPILERS[langKey];
  const apiKey = ocApiKey();

  // If no API key or unsupported language, go straight to local
  if (!apiKey || !compiler) {
    return await runLocalBatch(code, language, inputs);
  }

  // Run test cases SEQUENTIALLY to respect API concurrency limits
  const results: ExecutionResult[] = [];
  let useLocal = false; // once we hit a rate-limit, switch all remaining to local

  for (const stdin of inputs) {
    if (useLocal) {
      // Already hit rate-limit, run remaining locally
      const localResults = await runLocalBatch(code, language, [stdin]);
      results.push(localResults[0] ?? { stdout: '', stderr: 'Execution failed', exitCode: 1, statusLabel: 'Runtime Error', runtime: '0ms', runtimeMs: 0 });
      continue;
    }

    const result = await runOnlineCompiler(code, compiler, stdin);
    if (result === null) {
      // API failed (rate-limit / infra error) → fallback to local for this + all remaining
      useLocal = true;
      const localResults = await runLocalBatch(code, language, [stdin]);
      results.push(localResults[0] ?? { stdout: '', stderr: 'Execution failed', exitCode: 1, statusLabel: 'Runtime Error', runtime: '0ms', runtimeMs: 0 });
    } else {
      results.push(result);
    }
  }

  return results;
}
