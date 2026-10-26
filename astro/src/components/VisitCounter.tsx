import { useState } from 'react';

export default function VisitCounter() {
  const [count, setCount] = useState(0);
  return <p><button onClick={() => setCount((value) => value + 1)}>Hydrated interaction</button>{' '}<span role="status">Clicked {count} times</span></p>;
}
