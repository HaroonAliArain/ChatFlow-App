import { Outlet } from "react-router-dom";

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      
      {/* Center Card */}
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
        
        {/* App Title / Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-600">
            Chat App
          </h1>
          <p className="text-sm text-gray-500">
            Welcome back! Please login to continue
          </p>
        </div>

        {/* Render Auth Pages */}
        <Outlet />

      </div>
    </div>
  );
};

export default AuthLayout;