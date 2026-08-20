import { useState, useEffect  } from "react";

function App() {
  const [name, setName] = useState("Ann");

  useEffect(() => {
    console.log(name);
  }, [name])

  return (
    <>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

    </>
  );
}

export default App;