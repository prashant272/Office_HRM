import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-primary/10 selection:text-primary">
            {/* Soft background glow */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[100px]" />
            </div>

            {/* Mobile backdrop overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
                    aria-hidden="true"
                />
            )}

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="lg:ml-72 ml-0 flex flex-col min-h-screen relative w-full min-w-0 overflow-x-hidden transition-all duration-300">
                <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} isSidebarOpen={sidebarOpen} />
                <div className="p-4 sm:p-6 lg:p-10 flex-1 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out w-full max-w-full overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
