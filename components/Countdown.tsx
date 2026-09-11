"use client";

import { useState, useEffect } from "react";

export default function Countdown({ targetDate }: { targetDate: string }) {
  const [days, setDays] = useState(0);

  useEffect(() => {
    const calculateDays = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setDays(Math.ceil(difference / (1000 * 60 * 60 * 24)));
      } else {
        setDays(0);
      }
    };

    calculateDays();
    const timer = setInterval(calculateDays, 1000 * 60 * 60); // Update every hour

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="countdown-box">
      <span className="countdown-number glow-text-yellow">{days}</span>
      <span className="countdown-label glow-text-white">Days To Go!</span>
    </div>
  );
}
