import { useState, useEffect } from 'react';

export function useCountUp(end: number, duration = 2000, startOnMount = false) {
  const [count, setCount] = useState(startOnMount ? 0 : end);
  const [started, setStarted] = useState(startOnMount);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return { count, start: () => setStarted(true) };
}
