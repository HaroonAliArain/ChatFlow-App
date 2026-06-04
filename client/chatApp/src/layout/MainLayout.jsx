import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="h-screen flex bg-gray-50">

      {/* Sidebar Area (left) */}
      <div className="w-75 border-r bg-white">
        {/* Later: Sidebar Component */}
        <div className="p-4 font-semibold border-b">
          Chats
        </div>

        <div className="p-4 text-sm text-gray-500">
          Sidebar will be here
        </div>
      </div>

      {/* Main Content Area (right) */}
      <div className="flex-1 flex flex-col">

        {/* Top Header */}
        <div className="h-16 border-b bg-white flex items-center px-4">
          <h2 className="font-semibold">
            Chat App
          </h2>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

      </div>
    </div>
  );
};

export default MainLayout;