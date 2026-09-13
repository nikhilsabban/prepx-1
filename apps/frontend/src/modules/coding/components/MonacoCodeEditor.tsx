import React from "react";
import Editor from "@monaco-editor/react";

interface MonacoCodeEditorProps {
  language: string;
  value: string;
  onChange: (val: string) => void;
  fontSize?: number;
  readOnly?: boolean;
}

export function MonacoCodeEditor({
  language,
  value,
  onChange,
  fontSize = 14,
  readOnly = false,
}: MonacoCodeEditorProps) {
  return (
    <div className="h-full w-full bg-[#1e1e1e] rounded-b-xl overflow-hidden">
      <Editor
        height="100%"
        language={language === "cpp" ? "cpp" : language === "csharp" ? "csharp" : language}
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val || "")}
        options={{
          fontSize,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}
