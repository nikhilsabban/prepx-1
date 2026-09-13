export interface LanguageConfig {
  id: string;
  name: string;
  monacoLanguage: string;
  extension: string;
  command: string;
  compileCommand?: string;
  dockerImage: string;
  defaultCode: string;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  javascript: {
    id: "javascript",
    name: "JavaScript (Node.js)",
    monacoLanguage: "javascript",
    extension: "js",
    command: "node solution.js",
    dockerImage: "node:18-alpine",
    defaultCode: `// Write your solution here
function solution(input) {
  return input;
}
`,
  },
  python: {
    id: "python",
    name: "Python 3",
    monacoLanguage: "python",
    extension: "py",
    command: "python3 solution.py",
    dockerImage: "python:3.10-alpine",
    defaultCode: `# Write your solution here
def solution(input_val):
    return input_val
`,
  },
  java: {
    id: "java",
    name: "Java 17",
    monacoLanguage: "java",
    extension: "java",
    compileCommand: "javac Solution.java",
    command: "java Solution",
    dockerImage: "openjdk:17-alpine",
    defaultCode: `public class Solution {
    public static void main(String[] args) {
        // Solution implementation
    }
}
`,
  },
  cpp: {
    id: "cpp",
    name: "C++ 17",
    monacoLanguage: "cpp",
    extension: "cpp",
    compileCommand: "g++ -O3 solution.cpp -o solution",
    command: "./solution",
    dockerImage: "gcc:latest",
    defaultCode: `#include <iostream>
using namespace std;

int main() {
    // Solution implementation
    return 0;
}
`,
  },
  csharp: {
    id: "csharp",
    name: "C# (.NET)",
    monacoLanguage: "csharp",
    extension: "cs",
    compileCommand: "csc solution.cs",
    command: "mono solution.exe",
    dockerImage: "mono:latest",
    defaultCode: `using System;

public class Solution {
    public static void Main() {
        // Solution implementation
    }
}
`,
  },
};
