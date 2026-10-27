import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") });

import { Problem } from "../apps/backend/src/modules/coding/models/Problem";
import { TestCase } from "../apps/backend/src/modules/coding/models/TestCase";
import { codeExecutionService } from "../apps/backend/src/modules/coding/services/codeExecutionService";

// Standard canonical implementations to test for common problem types
const REFERENCE_SOLUTIONS: Record<string, { js: string; py: string }> = {
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

async function testAll() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai-interviewer";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for problem verification...");

    const problems = await Problem.find({});
    console.log(`Found ${problems.length} problems in database.`);

    for (const problem of problems) {
      console.log(`\n--------------------------------------------------`);
      console.log(`Testing Problem: [${problem.slug}] "${problem.title}"`);
      const testCases = await TestCase.find({ problemId: problem._id });
      console.log(`Test Cases Count: ${testCases.length}`);

      if (testCases.length === 0) {
        console.warn(`⚠️ WARNING: No test cases found for problem ${problem.slug}`);
        continue;
      }

      const sol = REFERENCE_SOLUTIONS[problem.slug];
      if (!sol) {
        console.log(`ℹ️ Custom problem ${problem.slug}`);
        for (const tc of testCases) {
          console.log(`  Input: ${JSON.stringify(tc.input)} | Expected: ${JSON.stringify(tc.expectedOutput)}`);
        }
        continue;
      }

      // Test JS
      console.log(`\n  [JS Execution Test]`);
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const res = await codeExecutionService.execute({
          language: "javascript",
          sourceCode: sol.js,
          input: tc.input
        });
        const cleanStdout = res.stdout.replace(/\s+/g, "");
        const cleanExpected = tc.expectedOutput.replace(/\s+/g, "");
        const match = cleanStdout === cleanExpected || res.stdout.trim() === tc.expectedOutput.trim();

        if (match) {
          console.log(`  ✅ TC #${i+1} Passed! Input: "${tc.input.trim()}" -> Output: "${res.stdout.trim()}"`);
        } else {
          console.error(`  ❌ TC #${i+1} FAILED! Input: "${tc.input.trim()}" | Expected: "${tc.expectedOutput.trim()}" | Got: "${res.stdout.trim()}" | Error: "${res.error || res.stderr}"`);
        }
      }

      // Test Python
      console.log(`\n  [Python Execution Test]`);
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const res = await codeExecutionService.execute({
          language: "python",
          sourceCode: sol.py,
          input: tc.input
        });
        const cleanStdout = res.stdout.replace(/\s+/g, "");
        const cleanExpected = tc.expectedOutput.replace(/\s+/g, "");
        const match = cleanStdout === cleanExpected || res.stdout.trim() === tc.expectedOutput.trim();

        if (match) {
          console.log(`  ✅ TC #${i+1} Passed! Input: "${tc.input.trim()}" -> Output: "${res.stdout.trim()}"`);
        } else {
          console.error(`  ❌ TC #${i+1} FAILED! Input: "${tc.input.trim()}" | Expected: "${tc.expectedOutput.trim()}" | Got: "${res.stdout.trim()}" | Error: "${res.error || res.stderr}"`);
        }
      }
    }

    await mongoose.disconnect();
    console.log("\nFinished testing all problems!");
  } catch (err) {
    console.error("Verification script error:", err);
  }
}

testAll();
