"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
};

export default function ScrollReveal({ children, className = "", stagger = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? (stagger ? "stagger-children" : "animate-fade-up") : "opacity-0"}`}
    >
      {children}
    </div>
  );
}
