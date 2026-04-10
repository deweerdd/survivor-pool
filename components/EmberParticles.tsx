"use client";

const particles = [
  { left: "20%", size: 4, duration: "3s", delay: "0s" },
  { left: "35%", size: 3, duration: "2.5s", delay: "0.8s" },
  { left: "50%", size: 5, duration: "3.5s", delay: "0.3s" },
  { left: "65%", size: 3, duration: "2.8s", delay: "1.2s" },
  { left: "45%", size: 4, duration: "3.2s", delay: "0.6s" },
  { left: "55%", size: 2, duration: "2.6s", delay: "1.5s" },
  { left: "30%", size: 3, duration: "3s", delay: "2s" },
  { left: "70%", size: 4, duration: "2.4s", delay: "0.4s" },
];

export default function EmberParticles() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: "40%",
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, var(--ember), var(--primary))`,
            animation: `ember-float ${p.duration} ease-out ${p.delay} infinite`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
