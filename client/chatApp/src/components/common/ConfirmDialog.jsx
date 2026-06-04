import { IoWarning, IoClose } from "react-icons/io5";

/**
 * Confirm dialog component — sleek overlay modal replacing window.confirm().
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *   <ConfirmDialog config={confirm} />
 *   setConfirm({
 *     title: "Delete Chat",
 *     message: 'Are you sure you want to delete "John"?',
 *     confirmText: "Delete",
 *     cancelText: "Cancel",
 *     variant: "danger",        // "danger" | "warning"
 *     onConfirm: () => { ... },
 *     onCancel: () => setConfirm(null),
 *   });
 */
const ConfirmDialog = ({ config }) => {
  if (!config) return null;

  const {
    title = "Are you sure?",
    message = "",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    onConfirm,
    onCancel,
  } = config;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="bg-app rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-scale-in"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDanger ? "bg-red-100 dark:bg-red-950/30" : "bg-yellow-100 dark:bg-yellow-950/30"
              }`}
            >
              <IoWarning
                size={22}
                className={isDanger ? "text-red-500" : "text-yellow-500"}
              />
            </div>
            <h3 className="text-base font-bold text-app">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-app-hover rounded-full transition-colors cursor-pointer"
          >
            <IoClose size={18} className="text-app-secondary" />
          </button>
        </div>

        {/* Body */}
        {message && (
          <p className="px-5 py-3 text-sm text-app-secondary leading-relaxed">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-app bg-app-input border border-app-secondary rounded-xl hover:bg-app-hover transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm?.();
              onCancel?.();
            }}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer ${
              isDanger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
