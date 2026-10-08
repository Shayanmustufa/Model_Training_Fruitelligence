import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  clean?: boolean;
}

export default function Container({
  children,
  className = "",
  clean = false,
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full ${
        clean ? "" : "max-w-7xl px-4 sm:px-6 lg:px-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}
