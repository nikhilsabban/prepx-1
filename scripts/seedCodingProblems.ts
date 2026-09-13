import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") });

import { Problem } from "../apps/backend/src/modules/coding/models/Problem";
import { TestCase } from "../apps/backend/src/modules/coding/models/TestCase";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ai-interviewer";

const sampleProblems = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.
You may assume that each input would have exactly one solution, and you may not use the same element twice.`,
    inputFormat: "First line contains array nums. Second line contains target integer.",
    outputFormat: "Return indices array [i, j]",
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
    examples: [
      {
        input: "nums = [2,7,11,15], target = 9",
        output: "[0,1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
      },
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {
  // Write solution here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
  return [];
}`,
      python: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`,
    },
    topics: ["Array", "Hash Table"],
    companies: ["Amazon", "Microsoft", "Google", "TCS"],
    points: 10,
    testCases: [
      { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0,1]", isHidden: false },
      { input: "[3, 2, 4]\n6", expectedOutput: "[1,2]", isHidden: false },
      { input: "[3, 3]\n6", expectedOutput: "[0,1]", isHidden: true },
    ],
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    description: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`,
    inputFormat: "String s",
    outputFormat: "Boolean true/false",
    constraints: ["1 <= s.length <= 10^4"],
    examples: [
      { input: "s = \"()[]{}\"", output: "true", explanation: "All brackets matched correctly." },
    ],
    starterCode: {
      javascript: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let char of s) {
    if (char in map) {
      if (stack.pop() !== map[char]) return false;
    } else stack.push(char);
  }
  return stack.length === 0;
}`,
      python: `def is_valid(s):
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            if not stack or stack.pop() != mapping[char]:
                return False
        else:
            stack.append(char)
    return len(stack) == 0`,
    },
    topics: ["String", "Stack"],
    companies: ["Amazon", "Infosys", "Accenture"],
    points: 10,
    testCases: [
      { input: "()[]{}", expectedOutput: "true", isHidden: false },
      { input: "(]", expectedOutput: "false", isHidden: false },
      { input: "([{}])", expectedOutput: "true", isHidden: true },
    ],
  },
  {
    title: "Reverse Linked List",
    slug: "reverse-linked-list",
    difficulty: "Easy",
    description: `Given the head of a singly linked list, reverse the list, and return the reversed list.`,
    inputFormat: "Array representing linked list",
    outputFormat: "Reversed array",
    constraints: ["The number of nodes in the list is in the range [0, 5000]."],
    examples: [{ input: "head = [1,2,3,4,5]", output: "[5,4,3,2,1]" }],
    starterCode: {
      javascript: `function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    let next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
    },
    topics: ["Linked List", "Recursion"],
    companies: ["Microsoft", "Wipro"],
    points: 10,
    testCases: [
      { input: "[1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]", isHidden: false },
    ],
  },
  {
    title: "Binary Tree Inorder Traversal",
    slug: "binary-tree-inorder-traversal",
    difficulty: "Medium",
    description: `Given the root of a binary tree, return the inorder traversal of its nodes' values.`,
    inputFormat: "Root node array",
    outputFormat: "Inorder traversal array",
    constraints: ["Number of nodes is in range [0, 100]."],
    examples: [{ input: "root = [1,null,2,3]", output: "[1,3,2]" }],
    starterCode: {
      javascript: `function inorderTraversal(root) {
  const res = [];
  function dfs(node) {
    if (!node) return;
    dfs(node.left);
    res.push(node.val);
    dfs(node.right);
  }
  dfs(root);
  return res;
}`,
    },
    topics: ["Trees", "Stack", "DFS"],
    companies: ["Amazon", "Google"],
    points: 25,
    testCases: [
      { input: "[1,null,2,3]", expectedOutput: "[1,3,2]", isHidden: false },
    ],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    slug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    description: `Given a string s, find the length of the longest substring without repeating characters.`,
    inputFormat: "String s",
    outputFormat: "Integer length",
    constraints: ["0 <= s.length <= 5 * 10^4"],
    examples: [{ input: "s = \"abcabcbb\"", output: "3", explanation: "Answer is \"abc\" with length 3." }],
    starterCode: {
      javascript: `function lengthOfLongestSubstring(s) {
  let set = new Set(), max = 0, l = 0;
  for (let r = 0; r < s.length; r++) {
    while (set.has(s[r])) {
      set.delete(s[l]);
      l++;
    }
    set.add(s[r]);
    max = Math.max(max, r - l + 1);
  }
  return max;
}`,
    },
    topics: ["Hash Table", "String", "Sliding Window"],
    companies: ["Amazon", "Microsoft", "Meta"],
    points: 25,
    testCases: [
      { input: "abcabcbb", expectedOutput: "3", isHidden: false },
      { input: "bbbbb", expectedOutput: "1", isHidden: false },
    ],
  },
  {
    title: "Trapping Rain Water",
    slug: "trapping-rain-water",
    difficulty: "Hard",
    description: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.`,
    inputFormat: "Array height",
    outputFormat: "Integer water trapped",
    constraints: ["n == height.length", "1 <= n <= 2 * 10^4"],
    examples: [{ input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" }],
    starterCode: {
      javascript: `function trap(height) {
  let l = 0, r = height.length - 1;
  let leftMax = 0, rightMax = 0, res = 0;
  while (l < r) {
    if (height[l] < height[r]) {
      if (height[l] >= leftMax) leftMax = height[l];
      else res += leftMax - height[l];
      l++;
    } else {
      if (height[r] >= rightMax) rightMax = height[r];
      else res += rightMax - height[r];
      r--;
    }
  }
  return res;
}`,
    },
    topics: ["Array", "Two Pointers", "Dynamic Programming", "Stack"],
    companies: ["Google", "Amazon"],
    points: 50,
    testCases: [
      { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expectedOutput: "6", isHidden: false },
    ],
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    await Problem.deleteMany({});
    await TestCase.deleteMany({});

    for (const prob of sampleProblems) {
      const { testCases, ...probData } = prob;
      const createdProb = await Problem.create(probData);

      for (const tc of testCases) {
        await TestCase.create({
          problemId: createdProb._id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        });
      }
      console.log(`Seeded problem: ${createdProb.title}`);
    }

    console.log("Successfully seeded coding problems and test cases!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
