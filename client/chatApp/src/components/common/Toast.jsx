import { useState, useEffect } from "react";
import { IoCheckmarkCircle, IoAlertCircle, IoClose } from "react-icons/io5";

/**
 * Toast / Snackbar notification component — slides in from bottom-center,
 * features a countdown progress bar, glassmorphism, and full dark-theme compatibility.
 */
const Toast = ({ toast, onClose, duration = 4000 }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;

    const animFrame = requestAnimationFrame(() => {
      setExiting(false);
      setVisible(true);
    });

    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(timer);
    };
  }, [toast, duration, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300);
  };

  if (!visible || !toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 ease-out ${
        exiting ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      <div className="flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-app-lg min-w-[300px] max-w-[420px] bg-app border-app relative overflow-hidden backdrop-blur-md">
        
        {/* Status Icon */}
        {isSuccess ? (
          <IoCheckmarkCircle className="text-green-500 flex-shrink-0" size={20} />
        ) : (
          <IoAlertCircle className="text-red-500 flex-shrink-0" size={20} />
        )}
        
        {/* Message */}
        <p className="text-sm text-app font-semibold flex-1 leading-snug">{toast.message}</p>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="text-app-secondary hover:text-app p-1 rounded-full hover:bg-app-hover transition-colors cursor-pointer"
        >
          <IoClose size={16} />
        </button>

        {/* Progress bar countdown */}
        <div
          className={`absolute bottom-0 left-0 h-[3px] ${
            isSuccess ? "bg-green-500" : "bg-red-500"
          }`}
          style={{
            animation: `progressShrink ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  );
};

export default Toast;
