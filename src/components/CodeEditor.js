import Editor from "@monaco-editor/react";

function CodeEditor({ code, onChange }) {
  return (
    <Editor
      height="300px"
      defaultLanguage="python"
      value={code}
      onChange={onChange}
      theme="vs-dark"
    />
  );
}

export default CodeEditor;
