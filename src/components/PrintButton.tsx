"use client";

type PrintButtonProps = {
  className?: string;
  label?: string;
};

export default function PrintButton({ className, label }: PrintButtonProps) {
  const handleClick = () => {
    window.print();
  };

  return (
    <button className={className} type="button" onClick={handleClick}>
      {label ?? "Print / Save as PDF"}
    </button>
  );
}
