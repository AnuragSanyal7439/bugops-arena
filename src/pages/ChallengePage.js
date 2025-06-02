import { useState } from "react";
import CodeEditor from "../components/CodeEditor";
import HintBox from "../components/HintBox";

function ChallengePage() {
  const [code, setCode] = useState(`def sum_list(lst):\n    result = 0\n    for i in lst\n        result += i\n    return result`);
  const [hint, setHint] = useState("");

  const getHint = async () => {
    // call backend later
    alert("Hint: Check the loop syntax.");
  };

  return (
    <div>
      <h2>🛠 Debug This Code</h2>
      <CodeEditor code={code} onChange={setCode} />
      <button onClick={getHint}>Get Hint</button>
      <HintBox hint={hint} />
    </div>
  );
}

export default ChallengePage;
