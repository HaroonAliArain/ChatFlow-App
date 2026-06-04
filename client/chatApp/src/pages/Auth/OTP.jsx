import { useState } from "react";
import { requestOTP, verifyOTP, resetPassword } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import { IoAlertCircle, IoCheckmarkCircle } from "react-icons/io5";

const OTP = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRequestOTP = async (e) => {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const data = await requestOTP(email);
      setMessage(data.message || "OTP sent to your email!");
      setStep("verify");
    } catch (err) { setError(err.response?.data?.message || "Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const data = await verifyOTP({ email, otp });
      setMessage("Email verified successfully! Please enter your new password.");
      setResetToken(data.resetToken);
      setStep("reset");
    } catch (err) { setError(err.response?.data?.message || "Invalid OTP"); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true); setError(""); setMessage("");
    try {
      const data = await resetPassword({ resetToken, newPassword });
      setMessage(data.message || "Password reset successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) { setError(err.response?.data?.message || "Failed to reset password"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-tertiary transition-colors duration-300 px-4">
      <div className="w-full max-w-md bg-app rounded-2xl shadow-app-lg p-6 sm:p-8 animate-fade-in transition-colors duration-300">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/chatflow-logo.svg" alt="ChatFlow" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-app">ChatFlow</h1>
          </div>
          <h2 className="text-xl font-semibold text-app">
            {step === "request" ? "Verify Email" : step === "verify" ? "Enter OTP" : "Reset Password"}
          </h2>
          <p className="text-sm text-app-tertiary mt-1">
            {step === "request" 
              ? "Enter your email to receive a verification code" 
              : step === "verify" 
                ? `We sent a 6-digit code to ${email}` 
                : "Enter your new password below"}
          </p>
        </div>

        {message && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg mb-5">
            <IoCheckmarkCircle size={18} className="flex-shrink-0" /><span>{message}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">
            <IoAlertCircle size={18} className="flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={handleRequestOTP}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-app-secondary mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com"
                className="w-full px-4 py-3 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
              style={{ background: "var(--accent)" }}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : step === "verify" ? (
          <form onSubmit={handleVerifyOTP}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-app-secondary mb-1.5">OTP Code</label>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" maxLength={6}
                className="w-full px-4 py-3 bg-app-input border border-app-secondary rounded-lg text-sm text-app text-center tracking-[0.5em] font-mono focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
              style={{ background: "var(--accent)" }}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button type="button" onClick={() => setStep("request")}
              className="w-full mt-3 text-sm text-accent hover:underline text-center cursor-pointer">Change email</button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-app-secondary mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters"
                className="w-full px-4 py-3 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" required />
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-app-secondary mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                className="w-full px-4 py-3 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-60 cursor-pointer"
              style={{ background: "var(--accent)" }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
        <div className="mt-5 text-center">
          <button onClick={() => navigate("/login")} className="text-sm text-app-tertiary hover:text-app-secondary cursor-pointer">← Back to Login</button>
        </div>
      </div>
    </div>
  );
};

export default OTP;
