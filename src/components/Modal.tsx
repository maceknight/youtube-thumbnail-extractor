"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    <div className="modal-top"><h2 id="modal-title">{title}</h2><button onClick={onClose} aria-label="閉じる" className="icon-button"><X size={20}/></button></div>
    {children}
  </dialog>;
}
