const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");

dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") });

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai-interviewer";

const ProblemSchema = new mongoose.Schema({
  title: String,
  slug: String,
  difficulty: String,
  description: String,
}, { timestamps: true });

const TestCaseSchema = new mongoose.Schema({
  problemId: mongoose.Schema.Types.ObjectId,
  input: String,
  expectedOutput: String,
  isHidden: Boolean,
});

const Problem = mongoose.model("Problem", ProblemSchema);
const TestCase = mongoose.model("TestCase", TestCaseSchema);

const REFERENCE_SOLUTIONS = {
  "two-sum": {
    js: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
  return [];
}`,
    py: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`
  },
  "valid-parentheses": {
    js: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else stack.push(char);
  }
  return stack.length === 0;
}`,
    py: `def is_valid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            stack.append(char)
    return len(stack) == 0`
  },
  "climbing-stairs": {
    js: `function climbingStairs(n) { n = Number(n); if (n <= 2) return n; let a = 1, b = 2; for (let i = 3; i <= n; i++) { let c = a + b; a = b; b = c; } return b; }`,
    py: `def climbing_stairs(n):
    n = int(n)
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`
  },
  "taco-101-maximum-subarray-sum": {
    js: `function maxSubArray(nums) {
  let maxCurrent = nums[0], maxGlobal = nums[0];
  for (let i = 1; i < nums.length; i++) {
    maxCurrent = Math.max(nums[i], maxCurrent + nums[i]);
    if (maxCurrent > maxGlobal) maxGlobal = maxCurrent;
  }
  return maxGlobal;
}`,
    py: `def max_sub_array(nums):
    max_curr = max_global = nums[0]
    for x in nums[1:]:
        max_curr = max(x, max_curr + x)
        max_global = max(max_global, max_curr)
    return max_global`
  },
  "taco-102-product-of-array-except-self": {
    js: `function productExceptSelf(nums) {
  const n = nums.length;
  const res = new Array(n).fill(1);
  let prefix = 1;
  for (let i = 0; i < n; i++) {
    res[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= suffix;
    suffix *= nums[i];
  }
  return res;
}`,
    py: `def product_except_self(nums):
    n = len(nums)
    res = [1] * n
    prefix = 1
    for i in range(n):
        res[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        res[i] *= suffix
        suffix *= nums[i]
    return res`
  },
  "taco-103-merge-intervals": {
    js: `function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const res = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    let prev = res[res.length - 1];
    let curr = intervals[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      res.push(curr);
    }
  }
  return res;
}`,
    py: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    res = [intervals[0]]
    for current in intervals[1:]:
        prev = res[-1]
        if current[0] <= prev[1]:
            prev[1] = max(prev[1], current[1])
        else:
            res.append(current)
    return res`
  },
  "taco-104-longest-increasing-subsequence": {
    js: `function lengthOfLIS(nums) {
  if (!nums.length) return 0;
  const dp = new Array(nums.length).fill(1);
  let maxLen = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[i] > nums[j]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
    maxLen = Math.max(maxLen, dp[i]);
  }
  return maxLen;
}`,
    py: `def length_of_lis(nums):
    if not nums: return 0
    dp = [1] * len(nums)
    for i in range(1, len(nums)):
        for j in range(i):
            if nums[i] > nums[j]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`
  }
};

function executeCode(language, sourceCode, input) {
  return new Promise((resolve) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prepx-test-"));
    const fileName = language === "python" ? "solution.py" : "solution.js";
    const filePath = path.join(tempDir, fileName);
    const inputPath = path.join(tempDir, "input.txt");

    let wrappedSourceCode = sourceCode;

    if (language === "javascript") {
      wrappedSourceCode = `
${sourceCode}
const fs = require('fs');
(function() {
  try {
    const raw = fs.readFileSync(0, 'utf-8').trim();
    let fn = typeof twoSum === 'function' ? twoSum :
             typeof isValid === 'function' ? isValid :
             typeof maxSubArray === 'function' ? maxSubArray :
             typeof productExceptSelf === 'function' ? productExceptSelf :
             typeof merge === 'function' ? merge :
             typeof lengthOfLIS === 'function' ? lengthOfLIS :
             typeof climbingStairs === 'function' ? climbingStairs :
             typeof climbStairs === 'function' ? climbStairs : null;

    if (fn) {
      let args = [];
      if (raw) {
        const lines = raw.split('\\n').map(l => l.trim()).filter(Boolean);
        for (const l of lines) {
          if (l.startsWith('[') && l.endsWith(']')) {
            try { args.push(JSON.parse(l)); } catch(e) { args.push(l.slice(1,-1).split(',').map(x => parseInt(x.trim()))); }
          } else if (!isNaN(Number(l))) {
            args.push(Number(l));
          } else {
            args.push(l);
          }
        }
      }
      let res;
      if (fn.length === 1) res = fn(args[0] !== undefined ? args[0] : raw);
      else if (fn.length === 2) res = fn(args[0] !== undefined ? args[0] : [], args[1] !== undefined ? args[1] : 0);
      else res = fn(...args);

      if (res !== undefined) console.log(typeof res === 'object' ? JSON.stringify(res) : res);
    }
  } catch (e) {
    console.error(e);
  }
})();
`;
    } else if (language === "python") {
      wrappedSourceCode = `
import sys, json, re, inspect

${sourceCode}

if __name__ == '__main__':
    try:
        raw = sys.stdin.read().strip()
        funcs = [v for k, v in list(globals().items()) if callable(v) and not k.startswith('_') and k not in ('sys', 'json', 're', 'inspect')]
        user_func = funcs[-1] if funcs else None
            
        if user_func:
            sig = inspect.signature(user_func)
            param_count = len(sig.parameters)
            
            args = []
            if raw:
                lines = [l.strip() for l in raw.split('\\n') if l.strip()]
                for line in lines:
                    if line.startswith('[') and line.endswith(']'):
                        try:
                            args.append(json.loads(line))
                        except:
                            args.append([int(x) for x in line[1:-1].split(',') if x.strip()])
                    elif line.isdigit() or (line.startswith('-') and line[1:].isdigit()):
                        args.append(int(line))
                    else:
                        args.append(line)
            
            if param_count == 1:
                arg_val = args[0] if len(args) >= 1 else (int(raw) if raw.isdigit() else raw)
                res = user_func(arg_val)
            elif param_count == 2:
                arg1 = args[0] if len(args) > 0 else []
                arg2 = args[1] if len(args) > 1 else 0
                res = user_func(arg1, arg2)
            else:
                res = user_func(*args)
                
            if res is not None:
                print(json.dumps(res) if isinstance(res, (dict, list, bool)) else res)
    except Exception as err:
        sys.stderr.write(str(err))
`;
    }

    fs.writeFileSync(filePath, wrappedSourceCode);
    fs.writeFileSync(inputPath, input || "");

    const isWindows = process.platform === "win32";
    const execCmd = language === "python"
      ? (isWindows ? `python "${filePath}" < "${inputPath}"` : `python3 "${filePath}" < "${inputPath}"`)
      : `node "${filePath}" < "${inputPath}"`;

    exec(execCmd, { timeout: 4000, cwd: tempDir }, (err, stdout, stderr) => {
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
      resolve({ stdout: stdout ? stdout.trim() : "", stderr: stderr ? stderr.trim() : "", error: err ? err.message : null });
    });
  });
}

async function verifyAll() {
  try {
    await mongoose.connect(mongoUri);
    console.log("==================================================");
    console.log("VERIFYING ALL DB PROBLEMS & TEST CASES...");
    console.log("==================================================");

    const problems = await Problem.find({});
    console.log(`Total Problems in Database: ${problems.length}\n`);

    let totalPassed = 0;
    let totalTested = 0;

    for (const prob of problems) {
      const testCases = await TestCase.find({ problemId: prob._id });
      console.log(`📌 Problem [${prob.slug}] "${prob.title}" (${testCases.length} test cases)`);

      const sol = REFERENCE_SOLUTIONS[prob.slug];
      if (!sol) {
        console.log(`   ℹ️ No reference solution configured in script. Skipping execution check.\n`);
        continue;
      }

      for (const lang of ["js", "py"]) {
        const langName = lang === "js" ? "JavaScript" : "Python";
        const code = sol[lang];

        for (let i = 0; i < testCases.length; i++) {
          totalTested++;
          const tc = testCases[i];
          const res = await executeCode(lang === "js" ? "javascript" : "python", code, tc.input);

          const cleanStdout = res.stdout.replace(/\s+/g, "");
          const cleanExpected = tc.expectedOutput.replace(/\s+/g, "");
          const isMatch = cleanStdout === cleanExpected || res.stdout.trim() === tc.expectedOutput.trim();

          if (isMatch) {
            totalPassed++;
            console.log(`   ✅ [${langName}] TC #${i+1} Passed! Output: ${res.stdout}`);
          } else {
            console.error(`   ❌ [${langName}] TC #${i+1} FAILED! Input: "${tc.input.replace(/\n/g, ' ')}" | Expected: "${tc.expectedOutput}" | Got: "${res.stdout}" | Error: "${res.stderr || res.error}"`);
          }
        }
      }
      console.log("");
    }

    console.log("==================================================");
    console.log(`RESULTS: ${totalPassed} / ${totalTested} Test Checks Passed!`);
    console.log("==================================================");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verifyAll();
