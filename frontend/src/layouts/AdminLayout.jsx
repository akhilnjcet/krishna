import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { 
    LayoutDashboard, 
    Layers, 
    Image as ImageIcon, 
    FileText, 
    BookOpen, 
    BarChart3, 
    Users, 
    ClipboardList, 
    BadgeIndianRupee, 
    MessageSquare, 
    Inbox,
    MessagesSquare,
    Settings,
    LogOut,
    Bell,
    Search,
    User,
    X,
    Menu
} from 'lucide-react';
import useAuthStore from '../stores/authStore';

const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = React.useState(false);

    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        window.location.replace('/login');
    };

    const menuGroups = [
        {
            label: "Core Operations",
            items: [
                { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
                { name: 'Active Projects', path: '/admin/projects', icon: Layers },
                { name: 'Project Gallery', path: '/admin/portfolio', icon: ImageIcon },
                { name: 'Quote Requests', path: '/admin/quotes', icon: FileText },
            ]
        },
        {
            label: "Management",
            items: [
                { name: 'Staff Directory', path: '/admin/staff', icon: Users },
                { name: 'Attendance Logs', path: '/admin/logs', icon: ClipboardList },
                { name: 'Production Feed', path: '/admin/progress', icon: BarChart3 },
                { name: 'Financial Hub', path: '/admin/finance', icon: BadgeIndianRupee },
            ]
        },
        {
            label: "Engagement",
            items: [
                { name: 'Knowledge Base', path: '/admin/blog', icon: BookOpen },
                { name: 'Support Tickets', path: '/admin/support', icon: Inbox },
                { name: 'Live Channels', path: '/admin/live-chat', icon: MessagesSquare },
                { name: 'AI Assistant', path: '/admin/chat', icon: MessageSquare },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-dark-bg flex font-sans overflow-x-hidden transition-colors duration-300">
            
            {/* Sidebar - Desktop */}
            <aside className="w-72 bg-[#0F172A] dark:bg-dark-surface text-white hidden md:flex flex-col fixed h-full z-40 border-r border-slate-800 dark:border-dark-border shadow-2xl">
                <div className="p-8 border-b border-slate-800 dark:border-dark-border bg-[#0B1222] dark:bg-dark-bg">
                    <Link to="/" className="flex items-center gap-3 group">
                        <img 
                            src="/logo512.png" 
                            alt="KEW Admin" 
                            className="w-12 h-12 object-contain rounded-xl shadow-lg group-hover:scale-105 transition-transform" 
                        />
                        <div className="flex flex-col">
                            <span className="text-xl font-bold tracking-tight text-white font-poppins">KRISHNA</span>
                            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-blue-400 leading-none mt-1 opacity-80">Command Module</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-2">
                            <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">{group.label}</h3>
                            {group.items.map(item => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                                            isActive
                                                ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-950/50'
                                                : 'text-slate-400 hover:bg-[#1E293B] dark:hover:bg-blue-900/20 hover:text-white'
                                        }`}
                                    >
                                        <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${
                                            isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'
                                        }`} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer / User Profile */}
                <div className="p-4 border-t border-slate-800 space-y-4">
                    <div className="bg-[#1E293B]/50 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white border-2 border-slate-700">
                            {user?.name?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{user?.name}</p>
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Super Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600/20 hover:text-rose-500 text-slate-400 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out System
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar - Mobile */}
            <aside className={`w-72 bg-[#0F172A] dark:bg-dark-surface text-white flex md:hidden flex-col fixed h-full z-[50] border-r border-slate-800 dark:border-dark-border transition-transform duration-300 transform ${
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                <div className="p-8 border-b border-slate-800 dark:border-dark-border bg-[#0B1222] dark:bg-dark-bg flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                        <div className="bg-[#2563EB] w-10 h-10 flex items-center justify-center font-bold text-white text-xl rounded-xl shadow-lg">K</div>
                        <span className="text-xl font-bold tracking-tight text-white font-poppins text-left">KRISHNA</span>
                    </Link>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto">
                    {menuGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-2 text-left">
                            <h3 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">{group.label}</h3>
                            {group.items.map(item => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.path}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                            isActive ? 'bg-[#2563EB] text-white shadow-xl' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <item.icon className="w-5 h-5 flex-shrink-0" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-slate-800 text-slate-400 py-3 rounded-xl text-xs font-bold transition-all">
                        <LogOut className="w-4 h-4" /> Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-72 flex flex-col min-h-screen relative bg-[#F8FAFC] dark:bg-dark-bg transition-all duration-300">
                {/* Modern Header */}
                <header className="bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] dark:from-[#0B1222] dark:to-[#1E3A8A] h-20 px-8 flex items-center justify-between sticky top-0 z-30 shadow-lg">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden sm:block w-1.5 h-8 bg-blue-300/40 rounded-full"></div>
                        <h1 className="text-lg md:text-xl font-bold text-white tracking-tight font-poppins capitalize">
                            {location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 w-64 xl:w-96 gap-3 group focus-within:border-white/30 transition-all">
                            <Search className="w-4 h-4 text-blue-200 group-focus-within:text-white" />
                            <input type="text" placeholder="Command Search..." className="bg-transparent text-sm text-white placeholder-blue-200 outline-none w-full" />
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
                            <button className="relative p-2 text-blue-100 hover:bg-white/10 rounded-xl transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 border-2 border-[#2563EB] rounded-full"></span>
                            </button>
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md border border-white/20">
                                <User className="w-4 h-4 md:w-5 md:h-5" />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
