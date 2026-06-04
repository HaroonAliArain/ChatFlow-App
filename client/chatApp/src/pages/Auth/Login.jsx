import { useState } from "react";
import { loginUser } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { useNavigate, Link } from "react-router-dom";
import { IoAlertCircle } from "react-icons/io5";

const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const res = await loginUser(formData);
      login(res.user, res.token);
      navigate("/chat");
    } catch (err) { setError(err.response?.data?.message || "Something went wrong, please try again."); }
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
          <h2 className="text-xl font-semibold text-app">Welcome Back!</h2>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-5">
            <IoAlertCircle size={18} className="flex-shrink-0" /><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-app-secondary mb-1.5">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com"
              className="w-full px-4 py-3 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" required />
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium text-app-secondary mb-1.5">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your password"
              className="w-full px-4 py-3 bg-app-input border border-app-secondary rounded-lg text-sm text-app focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-all" required />
          </div>
          <div className="text-right mb-5">
            <Link to="/otp" className="text-sm text-accent hover:underline font-medium">Forgot password?</Link>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: "var(--accent)" }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>Signing in...
              </span>
            ) : "Login"}
          </button>
        </form>
        <p className="text-center text-sm text-app-tertiary mt-5">
          Don't have an account?<Link to="/register" className="text-accent font-medium hover:underline ml-1">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;