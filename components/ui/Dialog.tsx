"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";

// ─── Backdrop + Panel wrapper ───────────────────────────────────────────────
function DialogWrapper({ children, onBackdropClick }: { children: React.ReactNode; onBackdropClick?: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center px-4"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
        onClick={onBackdropClick}
      >
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm bg-white rounded-none overflow-hidden border border-gray-200"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────────────────────
interface ConfirmProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen, title, message, confirmLabel = "確認", cancelLabel = "取消",
  danger = false, onConfirm, onCancel,
}: ConfirmProps) {
  if (!isOpen) return null;
  return (
    <DialogWrapper onBackdropClick={onCancel}>
      <div className="p-7">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${danger ? "bg-red-50" : "bg-neutral-100"}`}>
          <AlertTriangle size={18} className={danger ? "text-red-500" : "text-neutral-600"} />
        </div>

        {title && (
          <h3 className="font-serif font-bold text-base text-neutral-900 mb-1 tracking-tight">{title}</h3>
        )}
        <p className="text-sm text-neutral-500 leading-relaxed">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100">
        <button
          onClick={onCancel}
          className="flex-1 py-4 text-xs font-semibold tracking-widest text-neutral-400 uppercase hover:text-neutral-700 hover:bg-gray-50 transition-colors border-r border-gray-100"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-colors ${
            danger
              ? "text-red-500 hover:bg-red-50"
              : "text-neutral-900 hover:bg-neutral-50"
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </DialogWrapper>
  );
}

// ─── ALERT DIALOG ────────────────────────────────────────────────────────────
interface AlertProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export function AlertDialog({ isOpen, title, message, onClose }: AlertProps) {
  if (!isOpen) return null;
  return (
    <DialogWrapper onBackdropClick={onClose}>
      <div className="p-7">
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 bg-neutral-100">
          <Info size={18} className="text-neutral-600" />
        </div>
        {title && <h3 className="font-serif font-bold text-base text-neutral-900 mb-1">{title}</h3>}
        <p className="text-sm text-neutral-500 leading-relaxed">{message}</p>
      </div>
      <div className="border-t border-gray-100">
        <button
          onClick={onClose}
          className="w-full py-4 text-xs font-bold tracking-widest text-neutral-900 uppercase hover:bg-neutral-50 transition-colors"
        >
          了解
        </button>
      </div>
    </DialogWrapper>
  );
}

// ─── NEW TRIP MODAL (replaces prompt()) ─────────────────────────────────────
interface NewTripProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { title: string; startDate: string; endDate: string }) => void;
}

export function NewTripModal({ isOpen, onClose, onConfirm }: NewTripProps) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(""); setStartDate(""); setEndDate("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    const today = new Date().toISOString().split("T")[0];
    onConfirm({ title: title.trim(), startDate: startDate || today, endDate: endDate || today });
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  if (!isOpen) return null;
  return (
    <DialogWrapper onBackdropClick={onClose}>
      {/* Top strip */}
      <div className="h-[3px] bg-neutral-900" />

      <div className="p-7">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-[9px] tracking-[0.25em] text-gray-400 uppercase mb-1">新增旅程</p>
            <h2 className="font-serif font-bold text-xl text-neutral-900 tracking-tight">Where to next?</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X size={14} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Trip name */}
          <div>
            <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">旅程名稱</label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKey}
              placeholder="例：2026 大阪行 🇯🇵"
              className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 placeholder:text-gray-300 focus:outline-none focus:border-neutral-800 transition-colors"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">出發日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-800 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.2em] text-gray-400 uppercase mb-2">回程日期</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-800 transition-colors"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!title.trim()}
          className={`w-full mt-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] rounded-none transition-all ${!title.trim() ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "text-white"}`} style={title.trim() ? { backgroundColor: 'var(--accent)' } : {}}
        >
          建立旅程
        </button>
      </div>
    </DialogWrapper>
  );
}

// ─── PROMPT DIALOG (for editing location name etc.) ──────────────────────────
interface PromptProps {
  isOpen: boolean;
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({ isOpen, title, message, defaultValue = "", placeholder = "", onConfirm, onCancel }: PromptProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 80);
    }
  }, [isOpen, defaultValue]);

  const handleConfirm = () => { if (value.trim()) onConfirm(value.trim()); };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onCancel();
  };

  if (!isOpen) return null;
  return (
    <DialogWrapper onBackdropClick={onCancel}>
      <div className="p-7">
        {title && <h3 className="font-serif font-bold text-base text-neutral-900 mb-1">{title}</h3>}
        <p className="text-sm text-neutral-500 mb-5">{message}</p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="w-full border-b border-gray-200 py-2 text-sm text-neutral-800 placeholder:text-gray-300 focus:outline-none focus:border-neutral-800 transition-colors"
        />
      </div>
      <div className="flex border-t border-gray-100">
        <button onClick={onCancel} className="flex-1 py-4 text-xs font-semibold tracking-widest text-neutral-400 uppercase hover:bg-gray-50 transition-colors border-r border-gray-100">取消</button>
        <button onClick={handleConfirm} className="flex-1 py-4 text-xs font-bold tracking-widest text-neutral-900 uppercase hover:bg-neutral-50 transition-colors">確認</button>
      </div>
    </DialogWrapper>
  );
}
