import { CodingProblem } from '../models/CodingProblem';

export const INITIAL_PROBLEMS = [
  {
    "number": 1,
    "title": "Two Sum",
    "slug": "two-sum",
    "difficulty": "Easy",
    "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    "examples": [
      {
        "input": "nums = [2,7,11,15], target = 9",
        "output": "[0,1]",
        "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        "input": "nums = [3,2,4], target = 6",
        "output": "[1,2]",
        "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    "testCases": [
      {
        "input": "[2,7,11,15]\n9",
        "expected": "[0,1]"
      },
      {
        "input": "[3,2,4]\n6",
        "expected": "[1,2]"
      },
      {
        "input": "[3,3]\n6",
        "expected": "[0,1]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass",
      "javascript": "var twoSum = function(nums, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        return new int[]{};\n    }\n}",
      "c": "int* twoSum(int* nums, int numsSize, int target, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta",
      "Apple"
    ],
    "acceptance": 52.4,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 2,
    "title": "Valid Parentheses",
    "slug": "valid-parentheses",
    "difficulty": "Easy",
    "description": "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    "examples": [
      {
        "input": "s = \"()\"",
        "output": "true",
        "explanation": "Simple pair matches."
      },
      {
        "input": "s = \"()[]{}\"",
        "output": "true",
        "explanation": "All pairs match correctly."
      },
      {
        "input": "s = \"(]\"",
        "output": "false",
        "explanation": "Mismatched closing bracket."
      }
    ],
    "constraints": [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'."
    ],
    "testCases": [
      {
        "input": "\"()\"",
        "expected": "true"
      },
      {
        "input": "\"()[]{}\"",
        "expected": "true"
      },
      {
        "input": "\"(]\"",
        "expected": "false"
      },
      {
        "input": "\"{[]}\"",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isValid(self, s: str) -> bool:\n        pass",
      "javascript": "var isValid = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isValid(String s) {\n        return false;\n    }\n}",
      "c": "bool isValid(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Stack"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Google"
    ],
    "acceptance": 40.5,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 3,
    "title": "Merge Two Sorted Lists",
    "slug": "merge-two-sorted-lists",
    "difficulty": "Easy",
    "description": "You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.",
    "examples": [
      {
        "input": "list1 = [1,2,4], list2 = [1,3,4]",
        "output": "[1,1,2,3,4,4]",
        "explanation": "Merged sorted list."
      },
      {
        "input": "list1 = [], list2 = []",
        "output": "[]",
        "explanation": "Both lists empty."
      }
    ],
    "constraints": [
      "The number of nodes in both lists is in the range [0, 50].",
      "-100 <= Node.val <= 100",
      "Both list1 and list2 are sorted in non-decreasing order."
    ],
    "testCases": [
      {
        "input": "[1,2,4]\n[1,3,4]",
        "expected": "[1,1,2,3,4,4]"
      },
      {
        "input": "[]\n[]",
        "expected": "[]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def mergeTwoLists(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
      "javascript": "var mergeTwoLists = function(list1, list2) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n        \n    }\n};",
      "java": "class Solution {\n    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {\n        return null;\n    }\n}",
      "c": "struct ListNode* mergeTwoLists(struct ListNode* list1, struct ListNode* list2) {\n    \n}"
    },
    "tags": [
      "Linked List",
      "Recursion"
    ],
    "companies": [
      "Amazon",
      "Apple",
      "Meta"
    ],
    "acceptance": 63.1,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 4,
    "title": "Best Time to Buy and Sell Stock",
    "slug": "best-time-to-buy-and-sell-stock",
    "difficulty": "Easy",
    "description": "You are given an array `prices` where `prices[i]` is the price of a given stock on the `i-th` day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.",
    "examples": [
      {
        "input": "prices = [7,1,5,3,6,4]",
        "output": "5",
        "explanation": "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
      },
      {
        "input": "prices = [7,6,4,3,1]",
        "output": "0",
        "explanation": "In this case, no transactions are done and max profit = 0."
      }
    ],
    "constraints": [
      "1 <= prices.length <= 10^5",
      "0 <= prices[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[7,1,5,3,6,4]",
        "expected": "5"
      },
      {
        "input": "[7,6,4,3,1]",
        "expected": "0"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxProfit(self, prices: List[int]) -> int:\n        pass",
      "javascript": "var maxProfit = function(prices) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxProfit(vector<int>& prices) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxProfit(int[] prices) {\n        return 0;\n    }\n}",
      "c": "int maxProfit(int* prices, int pricesSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Google"
    ],
    "acceptance": 54.2,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 5,
    "title": "Valid Anagram",
    "slug": "valid-anagram",
    "difficulty": "Easy",
    "description": "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    "examples": [
      {
        "input": "s = \"anagram\", t = \"nagaram\"",
        "output": "true"
      },
      {
        "input": "s = \"rat\", t = \"car\"",
        "output": "false"
      }
    ],
    "constraints": [
      "1 <= s.length, t.length <= 5 * 10^4",
      "s and t consist of lowercase English letters."
    ],
    "testCases": [
      {
        "input": "\"anagram\"\n\"nagaram\"",
        "expected": "true"
      },
      {
        "input": "\"rat\"\n\"car\"",
        "expected": "false"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        pass",
      "javascript": "var isAnagram = function(s, t) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isAnagram(String s, String t) {\n        return false;\n    }\n}",
      "c": "bool isAnagram(char* s, char* t) {\n    \n}"
    },
    "tags": [
      "Hash Table",
      "String",
      "Sorting"
    ],
    "companies": [
      "Uber",
      "Google",
      "Amazon"
    ],
    "acceptance": 63.5,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 6,
    "title": "Binary Search",
    "slug": "binary-search",
    "difficulty": "Easy",
    "description": "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    "examples": [
      {
        "input": "nums = [-1,0,3,5,9,12], target = 9",
        "output": "4",
        "explanation": "9 exists in nums and its index is 4"
      },
      {
        "input": "nums = [-1,0,3,5,9,12], target = 2",
        "output": "-1",
        "explanation": "2 does not exist in nums so return -1"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^4",
      "-10^4 < nums[i], target < 10^4",
      "All integers in nums are unique.",
      "nums is sorted in ascending order."
    ],
    "testCases": [
      {
        "input": "[-1,0,3,5,9,12]\n9",
        "expected": "4"
      },
      {
        "input": "[-1,0,3,5,9,12]\n2",
        "expected": "-1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      "javascript": "var search = function(nums, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}",
      "c": "int search(int* nums, int numsSize, int target) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search"
    ],
    "companies": [
      "Apple",
      "Microsoft",
      "Google"
    ],
    "acceptance": 56.8,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 7,
    "title": "Maximum Subarray",
    "slug": "maximum-subarray",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
    "examples": [
      {
        "input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "output": "6",
        "explanation": "The subarray [4,-1,2,1] has the largest sum 6."
      },
      {
        "input": "nums = [1]",
        "output": "1"
      },
      {
        "input": "nums = [5,4,-1,7,8]",
        "output": "23"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[-2,1,-3,4,-1,2,1,-5,4]",
        "expected": "6"
      },
      {
        "input": "[1]",
        "expected": "1"
      },
      {
        "input": "[5,4,-1,7,8]",
        "expected": "23"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxSubArray(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var maxSubArray = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxSubArray(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int maxSubArray(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Divide and Conquer",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Apple",
      "LinkedIn"
    ],
    "acceptance": 50.3,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 8,
    "title": "Container With Most Water",
    "slug": "container-with-most-water",
    "difficulty": "Medium",
    "description": "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
    "examples": [
      {
        "input": "height = [1,8,6,2,5,4,8,3,7]",
        "output": "49",
        "explanation": "The vertical lines are [1,8,6,2,5,4,8,3,7]. In this case, max area of water is 49."
      },
      {
        "input": "height = [1,1]",
        "output": "1"
      }
    ],
    "constraints": [
      "n == height.length",
      "2 <= n <= 10^5",
      "0 <= height[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[1,8,6,2,5,4,8,3,7]",
        "expected": "49"
      },
      {
        "input": "[1,1]",
        "expected": "1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxArea(self, height: List[int]) -> int:\n        pass",
      "javascript": "var maxArea = function(height) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxArea(int[] height) {\n        return 0;\n    }\n}",
      "c": "int maxArea(int* height, int heightSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Two Pointers",
      "Greedy"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptance": 54.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 9,
    "title": "Longest Substring Without Repeating Characters",
    "slug": "longest-substring-without-repeating-characters",
    "difficulty": "Medium",
    "description": "Given a string `s`, find the length of the **longest substring** without repeating characters.",
    "examples": [
      {
        "input": "s = \"abcabcbb\"",
        "output": "3",
        "explanation": "The answer is \"abc\", with the length of 3."
      },
      {
        "input": "s = \"bbbbb\"",
        "output": "1",
        "explanation": "The answer is \"b\", with the length of 1."
      },
      {
        "input": "s = \"pwwkew\"",
        "output": "3",
        "explanation": "The answer is \"wke\", with the length of 3."
      }
    ],
    "constraints": [
      "0 <= s.length <= 5 * 10^4",
      "s consists of English letters, digits, symbols and spaces."
    ],
    "testCases": [
      {
        "input": "\"abcabcbb\"",
        "expected": "3"
      },
      {
        "input": "\"bbbbb\"",
        "expected": "1"
      },
      {
        "input": "\"pwwkew\"",
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass",
      "javascript": "var lengthOfLongestSubstring = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public int lengthOfLongestSubstring(String s) {\n        return 0;\n    }\n}",
      "c": "int lengthOfLongestSubstring(char* s) {\n    \n}"
    },
    "tags": [
      "Hash Table",
      "String",
      "Sliding Window"
    ],
    "companies": [
      "Amazon",
      "Bloomberg",
      "Google"
    ],
    "acceptance": 34.7,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 10,
    "title": "Trapping Rain Water",
    "slug": "trapping-rain-water",
    "difficulty": "Hard",
    "description": "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.",
    "examples": [
      {
        "input": "height = [0,1,0,2,1,0,1,3,2,1,2,1]",
        "output": "6",
        "explanation": "The above elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are trapped."
      },
      {
        "input": "height = [4,2,0,3,2,5]",
        "output": "9",
        "explanation": "Traps 9 units of water."
      }
    ],
    "constraints": [
      "n == height.length",
      "1 <= n <= 2 * 10^4",
      "0 <= height[i] <= 10^5"
    ],
    "testCases": [
      {
        "input": "[0,1,0,2,1,0,1,3,2,1,2,1]",
        "expected": "6"
      },
      {
        "input": "[4,2,0,3,2,5]",
        "expected": "9"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def trap(self, height: List[int]) -> int:\n        pass",
      "javascript": "var trap = function(height) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int trap(vector<int>& height) {\n        \n    }\n};",
      "java": "class Solution {\n    public int trap(int[] height) {\n        return 0;\n    }\n}",
      "c": "int trap(int* height, int heightSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Two Pointers",
      "Dynamic Programming",
      "Stack"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta",
      "Goldman Sachs"
    ],
    "acceptance": 61.2,
    "points": 400,
    "premium": true,
    "hidden": false
  },
  {
    "number": 11,
    "title": "3Sum",
    "slug": "3sum",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i != j`, `i != k`, and `j != k`, and `nums[i] + nums[j] + nums[k] == 0`.\n\nNotice that the solution set must not contain duplicate triplets.",
    "examples": [
      {
        "input": "nums = [-1,0,1,2,-1,-4]",
        "output": "[[-1,-1,2],[-1,0,1]]",
        "explanation": "Distinct triplets that sum to zero."
      },
      {
        "input": "nums = [0,1,1]",
        "output": "[]",
        "explanation": "The only possible triplet does not sum up to 0."
      },
      {
        "input": "nums = [0,0,0]",
        "output": "[[\"0\",\"0\",\"0\"]]",
        "explanation": "The only possible triplet sums up to 0."
      }
    ],
    "constraints": [
      "3 <= nums.length <= 3000",
      "-10^5 <= nums[i] <= 10^5"
    ],
    "testCases": [
      {
        "input": "[-1,0,1,2,-1,-4]",
        "expected": "[[-1,-1,2],[-1,0,1]]"
      },
      {
        "input": "[0,1,1]",
        "expected": "[]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def threeSum(self, nums: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var threeSum = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> threeSum(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** threeSum(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Two Pointers",
      "Sorting"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Microsoft",
      "Google"
    ],
    "acceptance": 34.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 12,
    "title": "Climbing Stairs",
    "slug": "climbing-stairs",
    "difficulty": "Easy",
    "description": "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?",
    "examples": [
      {
        "input": "n = 2",
        "output": "2",
        "explanation": "1. 1 step + 1 step\n2. 2 steps"
      },
      {
        "input": "n = 3",
        "output": "3",
        "explanation": "1. 1 + 1 + 1\n2. 1 + 2\n3. 2 + 1"
      }
    ],
    "constraints": [
      "1 <= n <= 45"
    ],
    "testCases": [
      {
        "input": "2",
        "expected": "2"
      },
      {
        "input": "3",
        "expected": "3"
      },
      {
        "input": "5",
        "expected": "8"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass",
      "javascript": "var climbStairs = function(n) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int climbStairs(int n) {\n        \n    }\n};",
      "java": "class Solution {\n    public int climbStairs(int n) {\n        return 0;\n    }\n}",
      "c": "int climbStairs(int n) {\n    \n}"
    },
    "tags": [
      "Math",
      "Dynamic Programming",
      "Memoization"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Apple"
    ],
    "acceptance": 52.8,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 13,
    "title": "Product of Array Except Self",
    "slug": "product-of-array-except-self",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.\n\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.\n\nYou must write an algorithm that runs in `O(n)` time and without using the division operation.",
    "examples": [
      {
        "input": "nums = [1,2,3,4]",
        "output": "[24,12,8,6]"
      },
      {
        "input": "nums = [-1,1,0,-3,3]",
        "output": "[0,0,9,0,0]"
      }
    ],
    "constraints": [
      "2 <= nums.length <= 10^5",
      "-30 <= nums[i] <= 30"
    ],
    "testCases": [
      {
        "input": "[1,2,3,4]",
        "expected": "[24,12,8,6]"
      },
      {
        "input": "[-1,1,0,-3,3]",
        "expected": "[0,0,9,0,0]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def productExceptSelf(self, nums: List[int]) -> List[int]:\n        pass",
      "javascript": "var productExceptSelf = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> productExceptSelf(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] productExceptSelf(int[] nums) {\n        return new int[]{};\n    }\n}",
      "c": "int* productExceptSelf(int* nums, int numsSize, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Prefix Sum"
    ],
    "companies": [
      "Amazon",
      "Apple",
      "Meta",
      "Microsoft"
    ],
    "acceptance": 65.4,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 14,
    "title": "Search in Rotated Sorted Array",
    "slug": "search-in-rotated-sorted-array",
    "difficulty": "Medium",
    "description": "There is an integer array `nums` sorted in ascending order (with distinct values).\n\nPrior to being passed to your function, `nums` is possibly rotated at an unknown pivot index `k`.\n\nGiven the array `nums` after the possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
    "examples": [
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 0",
        "output": "4"
      },
      {
        "input": "nums = [4,5,6,7,0,1,2], target = 3",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 <= nums.length <= 5000",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[4,5,6,7,0,1,2]\n0",
        "expected": "4"
      },
      {
        "input": "[4,5,6,7,0,1,2]\n3",
        "expected": "-1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def search(self, nums: List[int], target: int) -> int:\n        pass",
      "javascript": "var search = function(nums, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int search(vector<int>& nums, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}",
      "c": "int search(int* nums, int numsSize, int target) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "LinkedIn"
    ],
    "acceptance": 40.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 15,
    "title": "Coin Change",
    "slug": "coin-change",
    "difficulty": "Medium",
    "description": "You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.\n\nYou may assume that you have an infinite number of each kind of coin.",
    "examples": [
      {
        "input": "coins = [1,2,5], amount = 11",
        "output": "3",
        "explanation": "11 = 5 + 5 + 1"
      },
      {
        "input": "coins = [2], amount = 3",
        "output": "-1"
      }
    ],
    "constraints": [
      "1 <= coins.length <= 12",
      "1 <= coins[i] <= 2^31 - 1",
      "0 <= amount <= 10^4"
    ],
    "testCases": [
      {
        "input": "[1,2,5]\n11",
        "expected": "3"
      },
      {
        "input": "[2]\n3",
        "expected": "-1"
      },
      {
        "input": "[1]\n0",
        "expected": "0"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def coinChange(self, coins: List[int], amount: int) -> int:\n        pass",
      "javascript": "var coinChange = function(coins, amount) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        \n    }\n};",
      "java": "class Solution {\n    public int coinChange(int[] coins, int amount) {\n        return -1;\n    }\n}",
      "c": "int coinChange(int* coins, int coinsSize, int amount) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming",
      "Breadth-First Search"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Walmart"
    ],
    "acceptance": 43.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 16,
    "title": "Group Anagrams",
    "slug": "group-anagrams",
    "difficulty": "Medium",
    "description": "Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\nAn Anagram is a word or phrase formed by rearranging the letters of a different word or phrase, typically using all the original letters exactly once.",
    "examples": [
      {
        "input": "strs = [\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "output": "[[\"bat\"],[\"nat\",\"tan\"],[\"ate\",\"eat\",\"tea\"]]"
      },
      {
        "input": "strs = [\"\"]",
        "output": "[[\"\"]]",
        "explanation": "Single empty string."
      },
      {
        "input": "strs = [\"a\"]",
        "output": "[[\"a\"]]",
        "explanation": "Single character string."
      }
    ],
    "constraints": [
      "1 <= strs.length <= 10^4",
      "0 <= strs[i].length <= 100",
      "strs[i] consists of lowercase English letters."
    ],
    "testCases": [
      {
        "input": "[\"eat\",\"tea\",\"tan\",\"ate\",\"nat\",\"bat\"]",
        "expected": "[[\"eat\",\"tea\",\"ate\"],[\"tan\",\"nat\"],[\"bat\"]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:\n        pass",
      "javascript": "var groupAnagrams = function(strs) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<string>> groupAnagrams(vector<string>& strs) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        return new ArrayList<>();\n    }\n}",
      "c": "char*** groupAnagrams(char** strs, int strsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "String",
      "Sorting"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Uber"
    ],
    "acceptance": 67.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 17,
    "title": "Reverse Linked List",
    "slug": "reverse-linked-list",
    "difficulty": "Easy",
    "description": "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    "examples": [
      {
        "input": "head = [1,2,3,4,5]",
        "output": "[5,4,3,2,1]"
      },
      {
        "input": "head = [1,2]",
        "output": "[2,1]",
        "explanation": "Two nodes reversed."
      },
      {
        "input": "head = []",
        "output": "[]",
        "explanation": "Empty list remains empty."
      }
    ],
    "constraints": [
      "The number of nodes in the list is the range [0, 5000].",
      "-5000 <= Node.val <= 5000"
    ],
    "testCases": [
      {
        "input": "[1,2,3,4,5]",
        "expected": "[5,4,3,2,1]"
      },
      {
        "input": "[1,2]",
        "expected": "[2,1]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        pass",
      "javascript": "var reverseList = function(head) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};",
      "java": "class Solution {\n    public ListNode reverseList(ListNode head) {\n        return null;\n    }\n}",
      "c": "struct ListNode* reverseList(struct ListNode* head) {\n    \n}"
    },
    "tags": [
      "Linked List",
      "Recursion"
    ],
    "companies": [
      "Amazon",
      "Apple",
      "Google",
      "Meta"
    ],
    "acceptance": 75.6,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 18,
    "title": "Longest Palindromic Substring",
    "slug": "longest-palindromic-substring",
    "difficulty": "Medium",
    "description": "Given a string `s`, return the longest palindromic substring in `s`.",
    "examples": [
      {
        "input": "s = \"babad\"",
        "output": "\"bab\"",
        "explanation": "\"aba\" is also a valid answer."
      },
      {
        "input": "s = \"cbbd\"",
        "output": "\"bb\"",
        "explanation": "The longest palindromic substring is \"bb\"."
      }
    ],
    "constraints": [
      "1 <= s.length <= 1000",
      "s consist of only digits and English letters."
    ],
    "testCases": [
      {
        "input": "\"babad\"",
        "expected": "\"bab\""
      },
      {
        "input": "\"cbbd\"",
        "expected": "\"bb\""
      }
    ],
    "starter": {
      "python": "class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        pass",
      "javascript": "var longestPalindrome = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    string longestPalindrome(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public String longestPalindrome(String s) {\n        return \"\";\n    }\n}",
      "c": "char* longestPalindrome(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Adobe"
    ],
    "acceptance": 33.7,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 19,
    "title": "Word Break",
    "slug": "word-break",
    "difficulty": "Medium",
    "description": "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\nNote that the same word in the dictionary may be reused multiple times in the segmentation.",
    "examples": [
      {
        "input": "s = \"leetcode\", wordDict = [\"leet\",\"code\"]",
        "output": "true"
      },
      {
        "input": "s = \"applepenapple\", wordDict = [\"apple\",\"pen\"]",
        "output": "true",
        "explanation": "Return true because \"applepenapple\" can be segmented as \"apple pen apple\"."
      },
      {
        "input": "s = \"catsandog\", wordDict = [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]",
        "output": "false",
        "explanation": "Cannot be segmented."
      }
    ],
    "constraints": [
      "1 <= s.length <= 300",
      "1 <= wordDict.length <= 1000"
    ],
    "testCases": [
      {
        "input": "\"leetcode\"\n[\"leet\",\"code\"]",
        "expected": "true"
      },
      {
        "input": "\"applepenapple\"\n[\"apple\",\"pen\"]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def wordBreak(self, s: str, wordDict: List[str]) -> bool:\n        pass",
      "javascript": "var wordBreak = function(s, wordDict) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool wordBreak(string s, vector<string>& wordDict) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        return false;\n    }\n}",
      "c": "bool wordBreak(char* s, char** wordDict, int wordDictSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "String",
      "Dynamic Programming",
      "Trie"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Bloomberg"
    ],
    "acceptance": 46.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 20,
    "title": "Number of Islands",
    "slug": "number-of-islands",
    "difficulty": "Medium",
    "description": "Given an `m x n` 2D binary grid `grid` which represents a map of `'1'`s (land) and `'0'`s (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.",
    "examples": [
      {
        "input": "grid = [[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]",
        "output": "1"
      },
      {
        "input": "grid = [[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"1\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"1\",\"1\"]]",
        "output": "3",
        "explanation": "Three separate connected land groups."
      }
    ],
    "constraints": [
      "m == grid.length",
      "n == grid[i].length",
      "1 <= m, n <= 300"
    ],
    "testCases": [
      {
        "input": "[[\"1\",\"1\",\"1\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"1\",\"0\"],[\"1\",\"1\",\"0\",\"0\",\"0\"],[\"0\",\"0\",\"0\",\"0\",\"0\"]]",
        "expected": "1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def numIslands(self, grid: List[List[str]]) -> int:\n        pass",
      "javascript": "var numIslands = function(grid) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int numIslands(vector<vector<char>>& grid) {\n        \n    }\n};",
      "java": "class Solution {\n    public int numIslands(char[][] grid) {\n        return 0;\n    }\n}",
      "c": "int numIslands(char** grid, int gridSize, int* gridColSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Depth-First Search",
      "Breadth-First Search",
      "Union Find",
      "Matrix"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Microsoft",
      "Bloomberg"
    ],
    "acceptance": 58.4,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 21,
    "title": "Rotate Image",
    "slug": "rotate-image",
    "difficulty": "Medium",
    "description": "You are given an `n x n` 2D matrix representing an image, rotate the image by **90 degrees (clockwise)** in-place.",
    "examples": [
      {
        "input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        "output": "[[7,4,1],[8,5,2],[9,6,3]]"
      },
      {
        "input": "matrix = [[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]",
        "output": "[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]",
        "explanation": "Matrix rotated 90 degrees clockwise."
      }
    ],
    "constraints": [
      "n == matrix.length == matrix[i].length",
      "1 <= n <= 20"
    ],
    "testCases": [
      {
        "input": "[[1,2,3],[4,5,6],[7,8,9]]",
        "expected": "[[7,4,1],[8,5,2],[9,6,3]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def rotate(self, matrix: List[List[int]]) -> None:\n        pass",
      "javascript": "var rotate = function(matrix) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    void rotate(vector<vector<int>>& matrix) {\n        \n    }\n};",
      "java": "class Solution {\n    public void rotate(int[][] matrix) {\n    }\n}",
      "c": "void rotate(int** matrix, int matrixSize, int* matrixColSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Math",
      "Matrix"
    ],
    "companies": [
      "Amazon",
      "Microsoft",
      "Apple"
    ],
    "acceptance": 72.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 22,
    "title": "Spiral Matrix",
    "slug": "spiral-matrix",
    "difficulty": "Medium",
    "description": "Given an `m x n` matrix, return all elements of the matrix in spiral order.",
    "examples": [
      {
        "input": "matrix = [[1,2,3],[4,5,6],[7,8,9]]",
        "output": "[1,2,3,6,9,8,7,4,5]"
      },
      {
        "input": "matrix = [[1,2,3,4],[5,6,7,8],[9,10,11,12]]",
        "output": "[1,2,3,4,8,12,11,10,9,5,6,7]",
        "explanation": "Spiral order traversal."
      }
    ],
    "constraints": [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 10"
    ],
    "testCases": [
      {
        "input": "[[1,2,3],[4,5,6],[7,8,9]]",
        "expected": "[1,2,3,6,9,8,7,4,5]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:\n        pass",
      "javascript": "var spiralOrder = function(matrix) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> spiralOrder(vector<vector<int>>& matrix) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<Integer> spiralOrder(int[][] matrix) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int* spiralOrder(int** matrix, int matrixSize, int* matrixColSize, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Matrix",
      "Simulation"
    ],
    "companies": [
      "Microsoft",
      "Amazon",
      "Apple"
    ],
    "acceptance": 48.3,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 23,
    "title": "Merge Intervals",
    "slug": "merge-intervals",
    "difficulty": "Medium",
    "description": "Given an array of intervals where `intervals[i] = [starti, endi]`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.",
    "examples": [
      {
        "input": "intervals = [[1,3],[2,6],[8,10],[15,18]]",
        "output": "[[1,6],[8,10],[15,18]]"
      },
      {
        "input": "intervals = [[1,4],[4,5]]",
        "output": "[[1,5]]",
        "explanation": "Intervals [1,4] and [4,5] are considered overlapping."
      }
    ],
    "constraints": [
      "1 <= intervals.length <= 10^4",
      "intervals[i].length == 2"
    ],
    "testCases": [
      {
        "input": "[[1,3],[2,6],[8,10],[15,18]]",
        "expected": "[[1,6],[8,10],[15,18]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def merge(self, intervals: List[List[int]]) -> List[List[int]]:\n        pass",
      "javascript": "var merge = function(intervals) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[][] merge(int[][] intervals) {\n        return new int[][]{};\n    }\n}",
      "c": "int** merge(int** intervals, int intervalsSize, int* intervalsColSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Sorting"
    ],
    "companies": [
      "Meta",
      "Amazon",
      "Google"
    ],
    "acceptance": 46.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 24,
    "title": "Insert Interval",
    "slug": "insert-interval",
    "difficulty": "Medium",
    "description": "You are given an array of non-overlapping intervals sorted by start time, insert `newInterval` into `intervals` such that intervals is still sorted and non-overlapping.",
    "examples": [
      {
        "input": "intervals = [[1,3],[6,9]], newInterval = [2,5]",
        "output": "[[1,5],[6,9]]"
      },
      {
        "input": "intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]",
        "output": "[[1,2],[3,10],[12,16]]",
        "explanation": "Because the new interval [4,8] overlaps with [3,5],[6,7],[8,10]."
      }
    ],
    "constraints": [
      "0 <= intervals.length <= 10^4",
      "newInterval.length == 2"
    ],
    "testCases": [
      {
        "input": "[[1,3],[6,9]]\n[2,5]",
        "expected": "[[1,5],[6,9]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var insert = function(intervals, newInterval) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[][] insert(int[][] intervals, int[] newInterval) {\n        return new int[][]{};\n    }\n}",
      "c": "int** insert(int** intervals, int intervalsSize, int* intervalsColSize, int* newInterval, int newIntervalSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array"
    ],
    "companies": [
      "Google",
      "Meta",
      "Amazon"
    ],
    "acceptance": 40.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 25,
    "title": "Combination Sum",
    "slug": "combination-sum",
    "difficulty": "Medium",
    "description": "Given an array of distinct integers `candidates` and a target integer `target`, return a list of all unique combinations of candidates where the chosen numbers sum to target.",
    "examples": [
      {
        "input": "candidates = [2,3,6,7], target = 7",
        "output": "[[2,2,3],[7]]"
      },
      {
        "input": "candidates = [2,3,5], target = 8",
        "output": "[[2,2,2,2],[2,3,3],[3,5]]",
        "explanation": "2, 3, and 5 can form target 8 in multiple combinations."
      },
      {
        "input": "candidates = [2], target = 1",
        "output": "[]",
        "explanation": "Target cannot be formed."
      }
    ],
    "constraints": [
      "1 <= candidates.length <= 30",
      "2 <= candidates[i] <= 40"
    ],
    "testCases": [
      {
        "input": "[2,3,6,7]\n7",
        "expected": "[[2,2,3],[7]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def combinationSum(self, candidates: List[int], target: int) -> List[List[int]]:\n        pass",
      "javascript": "var combinationSum = function(candidates, target) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> combinationSum(vector<int>& candidates, int target) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> combinationSum(int[] candidates, int target) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** combinationSum(int* candidates, int candidatesSize, int target, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking"
    ],
    "companies": [
      "Amazon",
      "Airbnb",
      "Microsoft"
    ],
    "acceptance": 70.1,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 26,
    "title": "Permutations",
    "slug": "permutations",
    "difficulty": "Medium",
    "description": "Given an array `nums` of distinct integers, return all the possible permutations. You can return the answer in any order.",
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]"
      },
      {
        "input": "nums = [0,1]",
        "output": "[[0,1],[1,0]]",
        "explanation": "All two permutations."
      },
      {
        "input": "nums = [1]",
        "output": "[[1]]",
        "explanation": "Single element array."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 6",
      "-10 <= nums[i] <= 10"
    ],
    "testCases": [
      {
        "input": "[1,2,3]",
        "expected": "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def permute(self, nums: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var permute = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> permute(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> permute(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** permute(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "acceptance": 77.4,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 27,
    "title": "Subsets",
    "slug": "subsets",
    "difficulty": "Medium",
    "description": "Given an integer array `nums` of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets.",
    "examples": [
      {
        "input": "nums = [1,2,3]",
        "output": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]"
      },
      {
        "input": "nums = [0]",
        "output": "[[],[0]]",
        "explanation": "All subsets of [0]."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10",
      "-10 <= nums[i] <= 10"
    ],
    "testCases": [
      {
        "input": "[1,2,3]",
        "expected": "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def subsets(self, nums: List[int]) -> List[List[int]]:\n        pass",
      "javascript": "var subsets = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> subsets(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> subsets(int[] nums) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** subsets(int* nums, int numsSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking",
      "Bit Manipulation"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Bloomberg"
    ],
    "acceptance": 76.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 28,
    "title": "Word Search",
    "slug": "word-search",
    "difficulty": "Medium",
    "description": "Given an `m x n` grid of characters `board` and a string `word`, return `true` if `word` exists in the grid. The word can be constructed from letters of sequentially adjacent cells.",
    "examples": [
      {
        "input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCCED\"",
        "output": "true"
      },
      {
        "input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"SEE\"",
        "output": "true",
        "explanation": "Word \"SEE\" exists in the board."
      },
      {
        "input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCB\"",
        "output": "false",
        "explanation": "Same cell cannot be used twice."
      }
    ],
    "constraints": [
      "m == board.length",
      "n == board[i].length",
      "1 <= m, n <= 6"
    ],
    "testCases": [
      {
        "input": "[[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]]\n\"ABCCED\"",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def exist(self, board: List[List[str]], word: str) -> bool:\n        pass",
      "javascript": "var exist = function(board, word) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool exist(vector<vector<char>>& board, string word) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean exist(char[][] board, String word) {\n        return false;\n    }\n}",
      "c": "bool exist(char** board, int boardSize, int* boardColSize, char* word) {\n    \n}"
    },
    "tags": [
      "Array",
      "Backtracking",
      "Matrix"
    ],
    "companies": [
      "Amazon",
      "Bloomberg",
      "Microsoft"
    ],
    "acceptance": 41.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 29,
    "title": "Validate Binary Search Tree",
    "slug": "validate-binary-search-tree",
    "difficulty": "Medium",
    "description": "Given the root of a binary tree, determine if it is a valid binary search tree (BST).",
    "examples": [
      {
        "input": "root = [2,1,3]",
        "output": "true"
      },
      {
        "input": "root = [5,1,4,null,null,3,6]",
        "output": "false",
        "explanation": "The root node's value is 5 but its right child's value is 4."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [1, 10^4]."
    ],
    "testCases": [
      {
        "input": "[2,1,3]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isValidBST(self, root: Optional[TreeNode]) -> bool:\n        pass",
      "javascript": "var isValidBST = function(root) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isValidBST(TreeNode root) {\n        return false;\n    }\n}",
      "c": "bool isValidBST(struct TreeNode* root) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "Binary Search Tree"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Microsoft"
    ],
    "acceptance": 32.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 30,
    "title": "Maximum Depth of Binary Tree",
    "slug": "maximum-depth-of-binary-tree",
    "difficulty": "Easy",
    "description": "Given the root of a binary tree, return its maximum depth. Maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "3"
      },
      {
        "input": "root = [1,null,2]",
        "output": "2",
        "explanation": "The binary tree has depth 2."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 10^4]."
    ],
    "testCases": [
      {
        "input": "[3,9,20,null,null,15,7]",
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def maxDepth(self, root: Optional[TreeNode]) -> int:\n        pass",
      "javascript": "var maxDepth = function(root) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        \n    }\n};",
      "java": "class Solution {\n    public int maxDepth(TreeNode root) {\n        return 0;\n    }\n}",
      "c": "int maxDepth(struct TreeNode* root) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "Breadth-First Search"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Apple"
    ],
    "acceptance": 74.9,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 31,
    "title": "Same Tree",
    "slug": "same-tree",
    "difficulty": "Easy",
    "description": "Given the roots of two binary trees `p` and `q`, write a function to check if they are the same or not.",
    "examples": [
      {
        "input": "p = [1,2,3], q = [1,2,3]",
        "output": "true"
      },
      {
        "input": "p = [1,2], q = [1,null,2]",
        "output": "false",
        "explanation": "Structures are different."
      },
      {
        "input": "p = [1,2,1], q = [1,1,2]",
        "output": "false",
        "explanation": "Values are different."
      }
    ],
    "constraints": [
      "The number of nodes in both trees is in the range [0, 100]."
    ],
    "testCases": [
      {
        "input": "[1,2,3]\n[1,2,3]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:\n        pass",
      "javascript": "var isSameTree = function(p, q) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool isSameTree(TreeNode* p, TreeNode* q) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean isSameTree(TreeNode p, TreeNode q) {\n        return false;\n    }\n}",
      "c": "bool isSameTree(struct TreeNode* p, struct TreeNode* q) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search"
    ],
    "companies": [
      "Amazon",
      "Google"
    ],
    "acceptance": 60.5,
    "points": 100,
    "premium": false,
    "hidden": false
  },
  {
    "number": 32,
    "title": "Binary Tree Level Order Traversal",
    "slug": "binary-tree-level-order-traversal",
    "difficulty": "Medium",
    "description": "Given the root of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).",
    "examples": [
      {
        "input": "root = [3,9,20,null,null,15,7]",
        "output": "[[3],[9,20],[15,7]]"
      },
      {
        "input": "root = [1]",
        "output": "[[1]]",
        "explanation": "Single level root."
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "Empty tree."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 2000]."
    ],
    "testCases": [
      {
        "input": "[3,9,20,null,null,15,7]",
        "expected": "[[3],[9,20],[15,7]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:\n        pass",
      "javascript": "var levelOrder = function(root) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** levelOrder(struct TreeNode* root, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Breadth-First Search"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Microsoft"
    ],
    "acceptance": 66.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 33,
    "title": "Lowest Common Ancestor of a BST",
    "slug": "lowest-common-ancestor-of-a-bst",
    "difficulty": "Medium",
    "description": "Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST.",
    "examples": [
      {
        "input": "root = [6,2,8,0,4,7,9], p = 2, q = 8",
        "output": "6"
      },
      {
        "input": "root = [6,2,8,0,4,7,9], p = 2, q = 4",
        "output": "2",
        "explanation": "LCA of 2 and 4 is 2 since a node can be an ancestor of itself."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [2, 10^5]."
    ],
    "testCases": [
      {
        "input": "[6,2,8,0,4,7,9]\n2\n8",
        "expected": "6"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':\n        pass",
      "javascript": "var lowestCommonAncestor = function(root, p, q) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n        \n    }\n};",
      "java": "class Solution {\n    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {\n        return null;\n    }\n}",
      "c": "struct TreeNode* lowestCommonAncestor(struct TreeNode* root, struct TreeNode* p, struct TreeNode* q) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "BST"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Google"
    ],
    "acceptance": 63.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 34,
    "title": "Kth Smallest Element in a BST",
    "slug": "kth-smallest-element-in-a-bst",
    "difficulty": "Medium",
    "description": "Given the root of a binary search tree, and an integer `k`, return the `k-th` smallest value (1-indexed) of all the values of the nodes in the tree.",
    "examples": [
      {
        "input": "root = [3,1,4,null,2], k = 1",
        "output": "1"
      },
      {
        "input": "root = [5,3,6,2,4,null,null,1], k = 3",
        "output": "3",
        "explanation": "The 3rd smallest value is 3."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is n.",
      "1 <= k <= n <= 10^4"
    ],
    "testCases": [
      {
        "input": "[3,1,4,null,2]\n1",
        "expected": "1"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def kthSmallest(self, root: Optional[TreeNode], k: int) -> int:\n        pass",
      "javascript": "var kthSmallest = function(root, k) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int kthSmallest(TreeNode* root, int k) {\n        \n    }\n};",
      "java": "class Solution {\n    public int kthSmallest(TreeNode root, int k) {\n        return 0;\n    }\n}",
      "c": "int kthSmallest(struct TreeNode* root, int k) {\n    \n}"
    },
    "tags": [
      "Tree",
      "Depth-First Search",
      "BST"
    ],
    "companies": [
      "Amazon",
      "Uber"
    ],
    "acceptance": 71.9,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 35,
    "title": "Serialize and Deserialize Binary Tree",
    "slug": "serialize-and-deserialize-binary-tree",
    "difficulty": "Hard",
    "description": "Design an algorithm to serialize and deserialize a binary tree. There is no restriction on how your serialization algorithm works.",
    "examples": [
      {
        "input": "root = [1,2,3,null,null,4,5]",
        "output": "[1,2,3,null,null,4,5]"
      },
      {
        "input": "root = []",
        "output": "[]",
        "explanation": "Deserializing an empty tree returns null/empty."
      }
    ],
    "constraints": [
      "The number of nodes in the tree is in the range [0, 10^4]."
    ],
    "testCases": [
      {
        "input": "[1,2,3,null,null,4,5]",
        "expected": "[1,2,3,null,null,4,5]"
      }
    ],
    "starter": {
      "python": "class Codec:\n    def serialize(self, root):\n        pass\n    def deserialize(self, data):\n        pass",
      "javascript": "var serialize = function(root) {}; var deserialize = function(data) {};",
      "cpp": "class Codec {\npublic:\n    string serialize(TreeNode* root) {}\n    TreeNode* deserialize(string data) {}\n};",
      "java": "public class Codec {\n    public String serialize(TreeNode root) { return \"\"; }\n    public TreeNode deserialize(String data) { return null; }\n}",
      "c": "char* serialize(struct TreeNode* root) {}\nstruct TreeNode* deserialize(char* data) {}"
    },
    "tags": [
      "String",
      "Tree",
      "Breadth-First Search",
      "Design"
    ],
    "companies": [
      "Meta",
      "Google",
      "Amazon"
    ],
    "acceptance": 56.1,
    "points": 400,
    "premium": false,
    "hidden": false
  },
  {
    "number": 36,
    "title": "Course Schedule",
    "slug": "course-schedule",
    "difficulty": "Medium",
    "description": "There are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`. Return `true` if you can finish all courses.",
    "examples": [
      {
        "input": "numCourses = 2, prerequisites = [[1,0]]",
        "output": "true"
      },
      {
        "input": "numCourses = 2, prerequisites = [[1,0],[0,1]]",
        "output": "false",
        "explanation": "There is a cycle between course 0 and course 1."
      }
    ],
    "constraints": [
      "1 <= numCourses <= 2000",
      "0 <= prerequisites.length <= 5000"
    ],
    "testCases": [
      {
        "input": "2\n[[1,0]]",
        "expected": "true"
      },
      {
        "input": "2\n[[1,0],[0,1]]",
        "expected": "false"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:\n        pass",
      "javascript": "var canFinish = function(numCourses, prerequisites) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool canFinish(int numCourses, vector<vector<int>>& prerequisites) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean canFinish(int numCourses, int[][] prerequisites) {\n        return false;\n    }\n}",
      "c": "bool canFinish(int numCourses, int** prerequisites, int prerequisitesSize, int* prerequisitesColSize) {\n    \n}"
    },
    "tags": [
      "Depth-First Search",
      "Breadth-First Search",
      "Graph",
      "Topological Sort"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Uber"
    ],
    "acceptance": 46.9,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 37,
    "title": "Graph Valid Tree",
    "slug": "graph-valid-tree",
    "difficulty": "Medium",
    "description": "You have a graph of `n` nodes labeled from `0` to `n - 1`. Given an integer `n` and a list of `edges`, write a function to check whether these edges make up a valid tree.",
    "examples": [
      {
        "input": "n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]",
        "output": "true"
      },
      {
        "input": "n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]",
        "output": "false",
        "explanation": "Cycle exists between nodes 1, 2, 3."
      }
    ],
    "constraints": [
      "1 <= n <= 2000",
      "0 <= edges.length <= 5000"
    ],
    "testCases": [
      {
        "input": "5\n[[0,1],[0,2],[0,3],[1,4]]",
        "expected": "true"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def validTree(self, n: int, edges: List[List[int]]) -> bool:\n        pass",
      "javascript": "var validTree = function(n, edges) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    bool validTree(int n, vector<vector<int>>& edges) {\n        \n    }\n};",
      "java": "class Solution {\n    public boolean validTree(int n, int[][] edges) {\n        return false;\n    }\n}",
      "c": "bool validTree(int n, int** edges, int edgesSize, int* edgesColSize) {\n    \n}"
    },
    "tags": [
      "Depth-First Search",
      "Breadth-First Search",
      "Graph",
      "Union Find"
    ],
    "companies": [
      "LinkedIn",
      "Google",
      "Amazon"
    ],
    "acceptance": 47.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 38,
    "title": "Pacific Atlantic Water Flow",
    "slug": "pacific-atlantic-water-flow",
    "difficulty": "Medium",
    "description": "There is an `m x n` rectangular island that borders both the Pacific Ocean and Atlantic Ocean. Return a 2D list of grid coordinates result where `result[i] = [ri, ci]` denotes that rain water can flow from cell `(ri, ci)` to both oceans.",
    "examples": [
      {
        "input": "heights = [[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        "output": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]"
      },
      {
        "input": "heights = [[1]]",
        "output": "[[0,0]]",
        "explanation": "Water from single cell reaches both oceans."
      }
    ],
    "constraints": [
      "m == heights.length",
      "n == heights[r].length",
      "1 <= m, n <= 200"
    ],
    "testCases": [
      {
        "input": "[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]]",
        "expected": "[[0,4],[1,3],[1,4],[2,2],[3,0],[3,1],[4,0]]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:\n        pass",
      "javascript": "var pacificAtlantic = function(heights) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<vector<int>> pacificAtlantic(vector<vector<int>>& heights) {\n        \n    }\n};",
      "java": "class Solution {\n    public List<List<Integer>> pacificAtlantic(int[][] heights) {\n        return new ArrayList<>();\n    }\n}",
      "c": "int** pacificAtlantic(int** heights, int heightsSize, int* heightsColSize, int* returnSize, int** returnColumnSizes) {\n    \n}"
    },
    "tags": [
      "Array",
      "Depth-First Search",
      "Breadth-First Search",
      "Matrix"
    ],
    "companies": [
      "Google",
      "Amazon"
    ],
    "acceptance": 55,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 39,
    "title": "Longest Consecutive Sequence",
    "slug": "longest-consecutive-sequence",
    "difficulty": "Medium",
    "description": "Given an unsorted array of integers `nums`, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in `O(n)` time.",
    "examples": [
      {
        "input": "nums = [100,4,200,1,3,2]",
        "output": "4",
        "explanation": "The longest consecutive elements sequence is [1, 2, 3, 4]. Its length is 4."
      },
      {
        "input": "nums = [0,3,7,2,5,8,4,6,0,1]",
        "output": "9",
        "explanation": "Sequence is [0,1,2,3,4,5,6,7,8], length 9."
      }
    ],
    "constraints": [
      "0 <= nums.length <= 10^5",
      "-10^9 <= nums[i] <= 10^9"
    ],
    "testCases": [
      {
        "input": "[100,4,200,1,3,2]",
        "expected": "4"
      },
      {
        "input": "[0,3,7,2,5,8,4,6,0,1]",
        "expected": "9"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def longestConsecutive(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var longestConsecutive = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int longestConsecutive(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int longestConsecutive(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int longestConsecutive(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "Union Find"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Spotify"
    ],
    "acceptance": 47.2,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 40,
    "title": "Alien Dictionary",
    "slug": "alien-dictionary",
    "difficulty": "Hard",
    "description": "There is a new alien language that uses the Latin alphabet. However, the order among the letters is unknown to you. Given a list of strings `words` from the alien language's dictionary, return a string of the unique letters in the new alien language sorted in lexicographically increasing order by the new language's rules.",
    "examples": [
      {
        "input": "words = [\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]",
        "output": "\"wertf\""
      },
      {
        "input": "words = [\"z\",\"x\"]",
        "output": "\"zx\"",
        "explanation": "Simple two letter order."
      },
      {
        "input": "words = [\"z\",\"x\",\"z\"]",
        "output": "\"\"",
        "explanation": "Invalid order cycle."
      }
    ],
    "constraints": [
      "1 <= words.length <= 100",
      "1 <= words[i].length <= 100"
    ],
    "testCases": [
      {
        "input": "[\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]",
        "expected": "\"wertf\""
      }
    ],
    "starter": {
      "python": "class Solution:\n    def alienOrder(self, words: List[str]) -> str:\n        pass",
      "javascript": "var alienOrder = function(words) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    string alienOrder(vector<string>& words) {\n        \n    }\n};",
      "java": "class Solution {\n    public String alienOrder(String[] words) {\n        return \"\";\n    }\n}",
      "c": "char* alienOrder(char** words, int wordsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "String",
      "Depth-First Search",
      "Topological Sort"
    ],
    "companies": [
      "Facebook",
      "Google",
      "Amazon"
    ],
    "acceptance": 35.8,
    "points": 400,
    "premium": false,
    "hidden": false
  },
  {
    "number": 41,
    "title": "House Robber",
    "slug": "house-robber",
    "difficulty": "Medium",
    "description": "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Determine the maximum amount of money you can rob tonight without alerting the police.",
    "examples": [
      {
        "input": "nums = [1,2,3,1]",
        "output": "4",
        "explanation": "Rob house 1 (money = 1) and rob house 3 (money = 3). Total = 4."
      },
      {
        "input": "nums = [2,7,9,3,1]",
        "output": "12",
        "explanation": "Rob house 1 (money = 2), house 3 (money = 9), and house 5 (money = 1). Total = 12."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 400"
    ],
    "testCases": [
      {
        "input": "[1,2,3,1]",
        "expected": "4"
      },
      {
        "input": "[2,7,9,3,1]",
        "expected": "12"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var rob = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int rob(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int rob(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Microsoft"
    ],
    "acceptance": 50.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 42,
    "title": "House Robber II",
    "slug": "house-robber-ii",
    "difficulty": "Medium",
    "description": "You are a professional robber planning to rob houses along a street. All houses at this place are arranged in a circle. Return the maximum amount of money you can rob tonight without alerting the police.",
    "examples": [
      {
        "input": "nums = [2,3,2]",
        "output": "3"
      },
      {
        "input": "nums = [1,2,3,1]",
        "output": "4",
        "explanation": "Rob house 1 (money = 1) and house 3 (money = 3)."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 1000"
    ],
    "testCases": [
      {
        "input": "[2,3,2]",
        "expected": "3"
      },
      {
        "input": "[1,2,3,1]",
        "expected": "4"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def rob(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var rob = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int rob(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int rob(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int rob(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Microsoft"
    ],
    "acceptance": 41.6,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 43,
    "title": "Decode Ways",
    "slug": "decode-ways",
    "difficulty": "Medium",
    "description": "A message containing letters from A-Z can be encoded into numbers using the mapping 'A' -> \"1\" ... 'Z' -> \"26\". Given a string `s` containing only digits, return the number of ways to decode it.",
    "examples": [
      {
        "input": "s = \"12\"",
        "output": "2",
        "explanation": "It could be decoded as \"AB\" (1 2) or \"L\" (12)."
      },
      {
        "input": "s = \"226\"",
        "output": "3",
        "explanation": "Decoded as \"BZ\" (2 26), \"VF\" (22 6), or \"BBF\" (2 2 6)."
      },
      {
        "input": "s = \"06\"",
        "output": "0",
        "explanation": "\"06\" cannot be mapped to \"F\" because of leading zero."
      }
    ],
    "constraints": [
      "1 <= s.length <= 100",
      "s contains only digits and may contain leading zero(s)."
    ],
    "testCases": [
      {
        "input": "\"12\"",
        "expected": "2"
      },
      {
        "input": "\"226\"",
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def numDecodings(self, s: str) -> int:\n        pass",
      "javascript": "var numDecodings = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int numDecodings(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public int numDecodings(String s) {\n        return 0;\n    }\n}",
      "c": "int numDecodings(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "acceptance": 34.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 44,
    "title": "Unique Paths",
    "slug": "unique-paths",
    "difficulty": "Medium",
    "description": "There is a robot on an `m x n` grid. The robot is initially located at the top-left corner. The robot tries to move to the bottom-right corner. The robot can only move either down or right at any point in time. Given the two integers `m` and `n`, return the number of possible unique paths.",
    "examples": [
      {
        "input": "m = 3, n = 7",
        "output": "28"
      },
      {
        "input": "m = 3, n = 2",
        "output": "3",
        "explanation": "From top-left to bottom-right: Right -> Down -> Down, Down -> Down -> Right, Down -> Right -> Down."
      }
    ],
    "constraints": [
      "1 <= m, n <= 100"
    ],
    "testCases": [
      {
        "input": "3\n7",
        "expected": "28"
      },
      {
        "input": "3\n2",
        "expected": "3"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        pass",
      "javascript": "var uniquePaths = function(m, n) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        \n    }\n};",
      "java": "class Solution {\n    public int uniquePaths(int m, int n) {\n        return 0;\n    }\n}",
      "c": "int uniquePaths(int m, int n) {\n    \n}"
    },
    "tags": [
      "Math",
      "Dynamic Programming",
      "Combinatorics"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptance": 63.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 45,
    "title": "Longest Increasing Subsequence",
    "slug": "longest-increasing-subsequence",
    "difficulty": "Medium",
    "description": "Given an integer array `nums`, return the length of the longest strictly increasing subsequence.",
    "examples": [
      {
        "input": "nums = [10,9,2,5,3,7,101,18]",
        "output": "4",
        "explanation": "The longest increasing subsequence is [2,3,7,101], length = 4."
      },
      {
        "input": "nums = [0,1,0,3,2,3]",
        "output": "4",
        "explanation": "The longest increasing subsequence is [0,1,2,3], length 4."
      },
      {
        "input": "nums = [7,7,7,7,7,7,7]",
        "output": "1",
        "explanation": "Strictly increasing requirement means max length is 1."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 2500",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[10,9,2,5,3,7,101,18]",
        "expected": "4"
      },
      {
        "input": "[0,1,0,3,2,3]",
        "expected": "4"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def lengthOfLIS(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var lengthOfLIS = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int lengthOfLIS(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int lengthOfLIS(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int lengthOfLIS(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search",
      "Dynamic Programming"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Microsoft"
    ],
    "acceptance": 54.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 46,
    "title": "Palindromic Substrings",
    "slug": "palindromic-substrings",
    "difficulty": "Medium",
    "description": "Given a string `s`, return the number of palindromic substrings in it. A string is a palindrome when it reads the same backward as forward.",
    "examples": [
      {
        "input": "s = \"abc\"",
        "output": "3",
        "explanation": "Three palindromic strings: \"a\", \"b\", \"c\"."
      },
      {
        "input": "s = \"aaa\"",
        "output": "6",
        "explanation": "Palindromic strings: \"a\", \"a\", \"a\", \"aa\", \"aa\", \"aaa\"."
      }
    ],
    "constraints": [
      "1 <= s.length <= 1000"
    ],
    "testCases": [
      {
        "input": "\"abc\"",
        "expected": "3"
      },
      {
        "input": "\"aaa\"",
        "expected": "6"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def countSubstrings(self, s: str) -> int:\n        pass",
      "javascript": "var countSubstrings = function(s) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int countSubstrings(string s) {\n        \n    }\n};",
      "java": "class Solution {\n    public int countSubstrings(String s) {\n        return 0;\n    }\n}",
      "c": "int countSubstrings(char* s) {\n    \n}"
    },
    "tags": [
      "String",
      "Dynamic Programming"
    ],
    "companies": [
      "Meta",
      "Amazon"
    ],
    "acceptance": 67.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 47,
    "title": "Find Minimum in Rotated Sorted Array",
    "slug": "find-minimum-in-rotated-sorted-array",
    "difficulty": "Medium",
    "description": "Given the sorted rotated array `nums` of unique elements, return the minimum element of this array. You must write an algorithm that runs in `O(log n)` time.",
    "examples": [
      {
        "input": "nums = [3,4,5,1,2]",
        "output": "1"
      },
      {
        "input": "nums = [4,5,6,7,0,1,2]",
        "output": "0",
        "explanation": "The original array was [0,1,2,4,5,6,7] rotated 4 times."
      },
      {
        "input": "nums = [11,13,15,17]",
        "output": "11",
        "explanation": "The array was not rotated."
      }
    ],
    "constraints": [
      "n == nums.length",
      "1 <= n <= 5000",
      "-5000 <= nums[i] <= 5000"
    ],
    "testCases": [
      {
        "input": "[3,4,5,1,2]",
        "expected": "1"
      },
      {
        "input": "[4,5,6,7,0,1,2]",
        "expected": "0"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def findMin(self, nums: List[int]) -> int:\n        pass",
      "javascript": "var findMin = function(nums) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int findMin(vector<int>& nums) {\n        \n    }\n};",
      "java": "class Solution {\n    public int findMin(int[] nums) {\n        return 0;\n    }\n}",
      "c": "int findMin(int* nums, int numsSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search"
    ],
    "companies": [
      "Amazon",
      "Google",
      "Meta"
    ],
    "acceptance": 49.5,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 48,
    "title": "Top K Frequent Elements",
    "slug": "top-k-frequent-elements",
    "difficulty": "Medium",
    "description": "Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.",
    "examples": [
      {
        "input": "nums = [1,1,1,2,2,3], k = 2",
        "output": "[1,2]"
      },
      {
        "input": "nums = [1], k = 1",
        "output": "[1]",
        "explanation": "Single element array."
      }
    ],
    "constraints": [
      "1 <= nums.length <= 10^5",
      "k is in the range [1, the number of unique elements in the array]."
    ],
    "testCases": [
      {
        "input": "[1,1,1,2,2,3]\n2",
        "expected": "[1,2]"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def topKFrequent(self, nums: List[int], k: int) -> List[int]:\n        pass",
      "javascript": "var topKFrequent = function(nums, k) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    vector<int> topKFrequent(vector<int>& nums, int k) {\n        \n    }\n};",
      "java": "class Solution {\n    public int[] topKFrequent(int[] nums, int k) {\n        return new int[]{};\n    }\n}",
      "c": "int* topKFrequent(int* nums, int numsSize, int k, int* returnSize) {\n    \n}"
    },
    "tags": [
      "Array",
      "Hash Table",
      "Divide and Conquer",
      "Heap",
      "Bucket Sort"
    ],
    "companies": [
      "Amazon",
      "Meta",
      "Google"
    ],
    "acceptance": 62.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 49,
    "title": "Kth Largest Element in an Array",
    "slug": "kth-largest-element-in-an-array",
    "difficulty": "Medium",
    "description": "Given an integer array `nums` and an integer `k`, return the `k-th` largest element in the array. Note that it is the `k-th` largest element in the sorted order, not the `k-th` distinct element.",
    "examples": [
      {
        "input": "nums = [3,2,1,5,6,4], k = 2",
        "output": "5"
      },
      {
        "input": "nums = [3,2,3,1,2,4,5,5,6], k = 4",
        "output": "4",
        "explanation": "4th largest element is 4."
      }
    ],
    "constraints": [
      "1 <= k <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    "testCases": [
      {
        "input": "[3,2,1,5,6,4]\n2",
        "expected": "5"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def findKthLargest(self, nums: List[int], k: int) -> int:\n        pass",
      "javascript": "var findKthLargest = function(nums, k) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    int findKthLargest(vector<int>& nums, int k) {\n        \n    }\n};",
      "java": "class Solution {\n    public int findKthLargest(int[] nums, int k) {\n        return 0;\n    }\n}",
      "c": "int findKthLargest(int* nums, int numsSize, int k) {\n    \n}"
    },
    "tags": [
      "Array",
      "Divide and Conquer",
      "Sorting",
      "Heap",
      "Quickselect"
    ],
    "companies": [
      "Meta",
      "Amazon",
      "Google"
    ],
    "acceptance": 66.8,
    "points": 200,
    "premium": false,
    "hidden": false
  },
  {
    "number": 50,
    "title": "Median of Two Sorted Arrays",
    "slug": "median-of-two-sorted-arrays",
    "difficulty": "Hard",
    "description": "Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays. The overall run time complexity should be `O(log (m+n))`.",
    "examples": [
      {
        "input": "nums1 = [1,3], nums2 = [2]",
        "output": "2.0"
      },
      {
        "input": "nums1 = [1,2], nums2 = [3,4]",
        "output": "2.5",
        "explanation": "Merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5."
      }
    ],
    "constraints": [
      "nums1.length == m",
      "nums2.length == n",
      "0 <= m, n <= 1000"
    ],
    "testCases": [
      {
        "input": "[1,3]\n[2]",
        "expected": "2.0"
      },
      {
        "input": "[1,2]\n[3,4]",
        "expected": "2.5"
      }
    ],
    "starter": {
      "python": "class Solution:\n    def findMedianSortedArrays(self, nums1: List[int], nums2: List[int]) -> float:\n        pass",
      "javascript": "var findMedianSortedArrays = function(nums1, nums2) {\n    \n};",
      "cpp": "class Solution {\npublic:\n    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n        \n    }\n};",
      "java": "class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        return 0.0;\n    }\n}",
      "c": "double findMedianSortedArrays(int* nums1, int nums1Size, int* nums2, int nums2Size) {\n    \n}"
    },
    "tags": [
      "Array",
      "Binary Search",
      "Divide and Conquer"
    ],
    "companies": [
      "Google",
      "Amazon",
      "Meta"
    ],
    "acceptance": 39.5,
    "points": 400,
    "premium": false,
    "hidden": false
  }
];

export async function seedCodingProblems() {
  try {
    console.log('🌱 Syncing initial coding problems...');
    for (const p of INITIAL_PROBLEMS) {
      await CodingProblem.updateOne({ slug: p.slug }, { $set: p }, { upsert: true });
    }
    console.log(`✅ Successfully synced ${INITIAL_PROBLEMS.length} problems!`);
  } catch (err: any) {
    console.error('❌ Failed to seed initial problems:', err.message);
  }
}
