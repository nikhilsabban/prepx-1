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

const JUDGE0_BATCH_URL = 'https://judge0-ce.p.rapidapi.com/submissions/batch';
const JUDGE0_LANG: Record<string, number> = { cpp: 54, python: 71, java: 62, c: 50, javascript: 63 };

const judge0Headers = () => ({
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': process.env.JUDGE0_API_KEY || 'c25291f0c0msh4d4997be035c3b0p1f9b1djsnb6e749b944e6',
  'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
});

export const fixInput = (s: string) => (s || '').replace(/\\n/g, '\n');

export const applyWrapper = (userCode: string, wrapper?: string) => {
  if (!wrapper || !wrapper.trim()) return userCode;
  return wrapper.replace('__USER_CODE__', userCode);
};

export async function runLocalBatch(code: string, language: string, inputs: string[]): Promise<ExecutionResult[]> {
  const langName = language === 'c++' ? 'cpp' : language;

  return Promise.all(inputs.map(async (stdin) => {
    const start = Date.now();

    if (langName === 'javascript') {
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
  if (typeof solve === 'function') fn = solve;
  else if (typeof Solution !== 'undefined') {
    const sol = typeof Solution === 'function' ? new Solution() : Solution;
    const proto = Object.getPrototypeOf(sol) || sol;
    const methods = Object.getOwnPropertyNames(proto).filter(m => m !== 'constructor' && typeof sol[m] === 'function');
    if (methods.length > 0) fn = sol[methods[0]].bind(sol);
  }

  if (!fn && typeof isValid === 'function') fn = isValid;
  if (!fn && typeof twoSum === 'function') fn = twoSum;
  if (!fn && typeof mergeTwoLists === 'function') fn = mergeTwoLists;
  if (!fn && typeof maxProfit === 'function') fn = maxProfit;
  if (!fn && typeof isAnagram === 'function') fn = isAnagram;
  if (!fn && typeof search === 'function') fn = search;
  if (!fn && typeof maxSubArray === 'function') fn = maxSubArray;

  if (!fn) {
    for (const key of Object.keys(globalThis)) {
      if (typeof globalThis[key] === 'function' && !['console', 'require', 'isValid'].includes(key)) {
        fn = globalThis[key];
        break;
      }
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
        script.runInContext(context, { timeout: 4000 });
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

    if (langName === 'python') {
      try {
        const pyRunner = `
import sys, json

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
        funcs = [v for k, v in globals().items() if callable(v) and not k.startswith('_') and k not in ('sys', 'json')]
        if funcs:
            fn = funcs[0]
    if fn:
        res = fn(*args)
        if res is not None:
            print(json.dumps(res) if isinstance(res, (bool, list, dict)) else res)
`;
        const { stdout, stderr } = await execAsync('python', ['-c', pyRunner], { timeout: 4000 });
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

    // Default fallback
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

export async function runBatch(code: string, language: string, inputs: string[]): Promise<ExecutionResult[]> {
  try {
    const start = Date.now();
    const langKey = language === 'c++' ? 'cpp' : language;
    const langId = JUDGE0_LANG[langKey];

    if (!langId) {
      return await runLocalBatch(code, language, inputs);
    }

    const response = await axios.post(
      `${JUDGE0_BATCH_URL}?base64_encoded=false`,
      {
        submissions: inputs.map(stdin => ({
          source_code: code,
          language_id: langId,
          stdin,
          cpu_time_limit: 5,
          wall_time_limit: 10,
        })),
      },
      { headers: judge0Headers(), timeout: 5000 }
    );

    const tokens = response.data;
    if (!Array.isArray(tokens) || tokens.some((t: any) => t.message?.includes('not subscribed'))) {
      return await runLocalBatch(code, language, inputs);
    }

    const tokenList = tokens.map((t: any) => t.token).join(',');

    let results: any[] | null = null;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 800));
      const getResp = await axios.get(
        `${JUDGE0_BATCH_URL}?tokens=${tokenList}&base64_encoded=false&fields=stdout,stderr,compile_output,status`,
        { headers: judge0Headers(), timeout: 5000 }
      );
      const data = getResp.data;
      const allDone = data.submissions?.every((s: any) => s.status?.id >= 3);
      if (allDone) {
        results = data.submissions;
        break;
      }
    }

    if (!results) return await runLocalBatch(code, language, inputs);

    const elapsed = Date.now() - start;
    return results.map((s: any) => {
      const id = s.status?.id;
      const statusLabel =
        id === 3  ? 'Accepted' :
        id === 4  ? 'Wrong Answer' :
        id === 5  ? 'Time Limit Exceeded' :
        id === 6  ? 'Compilation Error' :
        'Runtime Error';
      return {
        stdout:      (s.stdout || '').trim(),
        stderr:      (s.stderr || s.compile_output || '').trim(),
        exitCode:    id === 3 ? 0 : 1,
        statusLabel,
        runtime:     `${elapsed}ms`,
        runtimeMs:   elapsed,
      };
    });
  } catch (err) {
    return await runLocalBatch(code, language, inputs);
  }
}
