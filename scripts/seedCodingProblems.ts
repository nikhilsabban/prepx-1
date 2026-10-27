import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../apps/backend/.env") });

import { Problem } from "../apps/backend/src/modules/coding/models/Problem";
import { TestCase } from "../apps/backend/src/modules/coding/models/TestCase";

async function connectDB() {
  const URIs = [
    process.env.MONGO_URI,
    "mongodb://127.0.0.1:27017/ai-interviewer",
    "mongodb://localhost:27017/ai-interviewer",
  ].filter(Boolean) as string[];

  for (const uri of URIs) {
    try {
      console.log(`Connecting to MongoDB (${uri.split('@').pop()})...`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log("Connected successfully!");
      return;
    } catch (err: any) {
      console.warn(`Failed to connect to ${uri.split('@').pop()}: ${err.message}`);
    }
  }
  throw new Error("Could not connect to any MongoDB instance.");
}

const sampleProblems = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.`,
    inputFormat: "First line contains array nums. Second line contains target integer.",
    outputFormat: "Return indices array [i, j]",
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Write your code here\n  \n}`,
      python: `def two_sum(nums, target):\n    # Write your code here\n    pass`
    },
    topics: ["Array", "Hash Table"],
    companies: ["Amazon", "Microsoft", "Google", "TCS"],
    points: 10,
    testCases: [
      { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0,1]", isHidden: false },
      { input: "[3, 2, 4]\n6", expectedOutput: "[1,2]", isHidden: false },
    ],
  },
  {
    title: "Valid Parentheses",
    slug: "valid-parentheses",
    difficulty: "Easy",
    description: `Given a string s containing characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`,
    inputFormat: "String s",
    outputFormat: "Boolean true/false",
    constraints: ["1 <= s.length <= 10^4"],
    examples: [{ input: "s = \"()[]{}\"", output: "true" }],
    starterCode: {
      javascript: `function isValid(s) {\n  // Write your code here\n  \n}`,
      python: `def is_valid(s):\n    # Write your code here\n    pass`
    },
    topics: ["String", "Stack"],
    companies: ["Amazon", "Infosys", "Accenture"],
    points: 10,
    testCases: [{ input: "()[]{}", expectedOutput: "true", isHidden: false }],
  },
  {
    title: "TACO-101: Maximum Subarray Sum (Kadane's Algorithm)",
    slug: "taco-101-maximum-subarray-sum",
    difficulty: "Medium",
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum. (TACO Algorithmic Benchmark)`,
    inputFormat: "Array nums",
    outputFormat: "Integer max sum",
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
    examples: [{ input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "The subarray [4,-1,2,1] has the largest sum 6." }],
    starterCode: {
      javascript: `function maxSubArray(nums) {\n  // Write your code here\n  \n}`,
      python: `def max_sub_array(nums):\n    # Write your code here\n    pass`
    },
    topics: ["Array", "Dynamic Programming", "Divide and Conquer"],
    companies: ["Google", "Amazon", "Microsoft", "Flipkart"],
    points: 25,
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", isHidden: false },
      { input: "[1]", expectedOutput: "1", isHidden: false },
      { input: "[5,4,-1,7,8]", expectedOutput: "23", isHidden: true },
    ],
  },
  {
    title: "TACO-102: Product of Array Except Self",
    slug: "taco-102-product-of-array-except-self",
    difficulty: "Medium",
    description: `Given an integer array \`nums\`, return an array \`answer\` such that \`answer[i]\` is equal to the product of all the elements of \`nums\` except \`nums[i]\`. Solve without division in O(N) time.`,
    inputFormat: "Array nums",
    outputFormat: "Array answer",
    constraints: ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30"],
    examples: [{ input: "nums = [1,2,3,4]", output: "[24,12,8,6]" }],
    starterCode: {
      javascript: `function productExceptSelf(nums) {\n  // Write your code here\n  \n}`,
      python: `def product_except_self(nums):\n    # Write your code here\n    pass`
    },
    topics: ["Array", "Prefix Sum"],
    companies: ["Amazon", "Apple", "Uber"],
    points: 25,
    testCases: [
      { input: "[1,2,3,4]", expectedOutput: "[24,12,8,6]", isHidden: false },
      { input: "[-1,1,0,-3,3]", expectedOutput: "[0,0,9,0,0]", isHidden: true },
    ],
  },
  {
    title: "TACO-103: Merge Intervals",
    slug: "taco-103-merge-intervals",
    difficulty: "Medium",
    description: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    inputFormat: "2D Array intervals",
    outputFormat: "2D Array merged intervals",
    constraints: ["1 <= intervals.length <= 10^4", "0 <= start_i <= end_i <= 10^4"],
    examples: [{ input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" }],
    starterCode: {
      javascript: `function merge(intervals) {\n  // Write your code here\n  \n}`,
      python: `def merge(intervals):\n    # Write your code here\n    pass`
    },
    topics: ["Array", "Sorting"],
    companies: ["Google", "Meta", "Microsoft"],
    points: 25,
    testCases: [
      { input: "[[1,3],[2,6],[8,10],[15,18]]", expectedOutput: "[[1,6],[8,10],[15,18]]", isHidden: false },
    ],
  },
  {
    title: "TACO-104: Longest Increasing Subsequence",
    slug: "taco-104-longest-increasing-subsequence",
    difficulty: "Hard",
    description: `Given an integer array \`nums\`, return the length of the longest strictly increasing subsequence. (TACO Benchmark Problem)`,
    inputFormat: "Array nums",
    outputFormat: "Integer length",
    constraints: ["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"],
    examples: [{ input: "nums = [10,9,2,5,3,7,101,18]", output: "4", explanation: "The longest increasing subsequence is [2,3,7,101], length 4." }],
    starterCode: {
      javascript: `function lengthOfLIS(nums) {\n  // Write your code here\n  \n}`,
      python: `def length_of_lis(nums):\n    # Write your code here\n    pass`
    },
    topics: ["Array", "Binary Search", "Dynamic Programming"],
    companies: ["Google", "Amazon", "TCS"],
    points: 50,
    testCases: [
      { input: "[10,9,2,5,3,7,101,18]", expectedOutput: "4", isHidden: false },
    ],
  }
];

async function seed() {
  try {
    await connectDB();
    console.log("Connected to MongoDB for seeding...");

    for (const prob of sampleProblems) {
      const { testCases, ...probData } = prob;
      const existing = await Problem.findOne({ slug: probData.slug });
      let createdProb;
      if (existing) {
        createdProb = await Problem.findByIdAndUpdate(existing._id, probData, { new: true });
      } else {
        createdProb = await Problem.create(probData);
      }
      if (!createdProb) continue;
      console.log(`✅ Saved problem: ${createdProb.title}`);

      await TestCase.deleteMany({ problemId: createdProb._id });
      for (const tc of testCases) {
        await TestCase.create({
          problemId: createdProb._id,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
        });
      }
    }

    console.log(`Successfully seeded ${sampleProblems.length} coding problems and test cases!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
