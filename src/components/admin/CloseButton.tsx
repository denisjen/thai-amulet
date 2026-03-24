"use client";

interface Props {
  className?: string;
  children?: React.ReactNode;
  href?: string;
}

export default function CloseButton({ className, children, href = "/admin/ceremonies" }: Props) {
  const handleClose = () => {
    window.close();
    setTimeout(() => {
      window.location.href = href;
    }, 200);
  };

  return (
    <button onClick={handleClose} className={className}>
      {children ?? "關閉"}
    </button>
  );
}
