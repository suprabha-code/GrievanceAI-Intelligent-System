import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard, Users, Building2,
    Database, Brain, Lock, CheckCircle, AlertOctagon,
    Activity, Shield, Trash2, ShieldCheck, LogOut, UserPlus, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
    AreaChart, Area, CartesianGrid, Tooltip, ResponsiveContainer,
    XAxis
} from "recharts";

const AdminDashboard = () => {
    const { user, grievances, users, logout, deleteUser, refreshData, addUser } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [activeView, setActiveView] = useState<"overview" | "users" | "assigned-authority" | "add-authority" | "departments" | "system">("overview");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Initial Data Refresh
    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (!user || user.role !== "admin") return null;

    // --- Real-time Calculations ---

    // 1. Sector Sync (Department Stats & Latency)
    const deptStats = useMemo(() => {
        const stats: Record<string, { count: number; resolved: number; totalResolutionTime: number }> = {};
        const departments = [
            "Roads & Infrastructure", "Water Supply", "Electricity", "Sanitation",
            "Public Transport", "Healthcare", "Education", "Law & Order"
        ];

        departments.forEach(d => stats[d] = { count: 0, resolved: 0, totalResolutionTime: 0 });

        (Array.isArray(grievances) ? grievances : []).forEach(g => {
            const dept = g.assignedDepartment || g.category;
            if (stats[dept]) {
                stats[dept].count++;
                if (g.status === 'resolved') {
                    stats[dept].resolved++;
                    if (g.resolvedAt && g.createdAt) {
                        const timeDiff = new Date(g.resolvedAt).getTime() - new Date(g.createdAt).getTime();
                        stats[dept].totalResolutionTime += timeDiff;
                    }
                }
            }
        });

        // Calculate efficiency and average latency
        return Object.entries(stats).map(([name, data]) => {
            const avgLatencyMs = data.resolved > 0 ? data.totalResolutionTime / data.resolved : 0;
            // Convert ms to Hours, if 0 return "N/A"
            const avgLatencyHours = avgLatencyMs > 0 ? Math.round(avgLatencyMs / (1000 * 60 * 60)) : 0;

            return {
                name: name,
                shortName: name.split(' ')[0],
                count: data.count,
                resolved: data.resolved,
                efficiency: data.count > 0 ? Math.round((data.resolved / data.count) * 100) : 100,
                latency: avgLatencyHours > 0 ? `${avgLatencyHours}h` : 'Pending',
                rawLatency: avgLatencyMs
            };
        }).sort((a, b) => b.count - a.count);
    }, [grievances]);

    // 2. Global Matrix (Packet Flow - Weekly Activity)
    const trendData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d;
        });

        return last7Days.map(date => {
            const dayName = days[date.getDay()];
            const dayGrievances = grievances.filter(g => {
                const gDate = new Date(g.createdAt);
                return gDate.getDate() === date.getDate() && gDate.getMonth() === date.getMonth();
            });
            const count = dayGrievances.length;
            return { name: dayName, load: count, capacity: Math.max(count * 1.5, 10) };
        });
    }, [grievances]);

    // 3. Neural Health Details
    const neuralStats = useMemo(() => {
        const total = grievances.length;
        if (total === 0) return { sentimentScore: "100.0", criticalCount: 0, avgUrgency: "0.0", graphData: [] };

        const criticalCount = grievances.filter(g => g.priority === 'critical').length;
        const avgUrgency = grievances.reduce((acc, g) => acc + (g.urgencyScore || 0), 0) / total;

        // "Sentiment Score" Logic
        const sentimentScore = Math.max(0, 100 - (criticalCount * 5) - (avgUrgency * 2));

        // Generate Graph Data for "Sentiment Accuracy Pulse" based on recent grievance priority
        // simulating a pulse over the last 12 "moments" (grievances)
        const recentGrievances = [...grievances].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12).reverse();

        const graphData: number[] = recentGrievances.map(g => {
            // Lower priority = higher "health" bar
            const height = g.priority === 'critical' ? 30 : g.priority === 'high' ? 50 : g.priority === 'medium' ? 75 : 95;
            return height;
        });

        // Fill with default high health if not enough data
        while (graphData.length < 12) {
            graphData.unshift(90 + Math.random() * 10);
        }

        return {
            sentimentScore: sentimentScore.toFixed(1),
            criticalCount,
            avgUrgency: avgUrgency.toFixed(1),
            graphData
        };
    }, [grievances]);

    // 4. Administrative Logs
    const activityLogs = useMemo(() => {
        const logs: any[] = [];
        // Grievance logs
        grievances.forEach(g => {
            logs.push({
                type: 'grievance',
                msg: `New packet: ${g.category}`,
                time: new Date(g.createdAt),
                id: g.id || (g as any)._id,
                details: g.priority.toUpperCase()
            });
            if (g.status === 'resolved') {
                logs.push({
                    type: 'resolution',
                    msg: `Resolved: ${g.category}`,
                    time: new Date(g.resolvedAt || g.updatedAt),
                    id: `${g.id}_res`,
                    details: 'Done'
                });
            }
        });
        // User logs
        users.forEach(u => {
            logs.push({
                type: 'security',
                msg: `New Identity: ${u.role}`,
                time: new Date(u.createdAt),
                id: u.id,
                details: u.name
            });
        });

        return logs.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 15);
    }, [grievances, users]);

    // 5. User Status Logic
    const enrichedUsers = useMemo(() => {
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        return (Array.isArray(users) ? users : []).map(u => {
            // A user is "Active" if they have created or interacted with a grievance in the last 24 hours
            // Or if they are the current user
            // Since we don't have detailed login logs, we infer "Active" from grievance activity or account creation date

            let lastActive = new Date(u.createdAt).getTime();

            // Check grievance activity
            grievances.forEach(g => {
                if (g.citizenId === u.id || g.assignedTo === u.id) {
                    const gTime = new Date(g.updatedAt).getTime();
                    if (gTime > lastActive) lastActive = gTime;
                }
            });

            const isActive = (now - lastActive) < oneDay || u.id === user.id;

            return {
                ...u,
                status: isActive ? "Active" : "Inactive",
                lastLogin: new Date(lastActive) // Using derived last active time
            };
        });
    }, [users, grievances, user]);


    const handleDeleteUser = async (uId: string) => {
        if (confirm("Terminate this identity node? This action is irreversible.")) {
            await deleteUser(uId);
            toast({ title: "Node Terminated", description: `Identity ${uId} has been purged.` });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-600 flex overflow-hidden font-sans selection:bg-rose-500/10 selection:text-rose-600">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-slate-200 hidden lg:flex flex-col relative z-20 shadow-xl shadow-slate-200/50">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center gap-4 group">
                        <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-rose-600 to-rose-400 flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.2)] group-hover:scale-110 transition-transform duration-500">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-black text-xl text-slate-800 tracking-tighter uppercase italic">Grievance<span className="text-rose-500">Admin</span></h1>
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]`} />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">{isRefreshing ? 'SYNCING...' : 'CORE MAINFRAME LIVE'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-6 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 px-4">Executive Control</p>
                    {[
                        { id: "overview", label: "Global Matrix", icon: LayoutDashboard },
                        { id: "assigned-authority", label: "Assigned Authority", icon: UserCheck },
                        { id: "users", label: "Identity Nodes", icon: Users },
                        { id: "add-authority", label: "Add Authority", icon: UserPlus },
                        { id: "departments", label: "Sector Sync", icon: Building2 },
                        { id: "system", label: "Neural Health", icon: Brain },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as any)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${activeView === item.id
                                ? "bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-100 translate-x-2"
                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent"
                                }`}
                        >
                            <item.icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${activeView === item.id ? "text-rose-500" : ""}`} />
                            <span className="font-bold text-sm tracking-wide">{item.label}</span>
                            {activeView === item.id && (
                                <motion.div layoutId="activeDot" className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-8 border-t border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-rose-500 font-black">
                            {user?.name?.[0] || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">{user?.name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Super Admin</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => { logout(); navigate("/"); }}
                        className="w-full justify-start gap-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl border border-rose-100"
                    >
                        <LogOut className="h-4 w-4" />
                        Terminate
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen relative overflow-hidden bg-slate-50">
                {/* Background FX */}
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

                <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-10 py-6 flex items-center justify-between z-10 sticky top-0 shadow-sm">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-1 italic">Global <span className="text-rose-500">Command</span></h2>
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-slate-100 text-slate-400 border border-slate-200 uppercase tracking-widest">v4.0.2 Stable</span>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Secure Connection
                            </span>
                        </div>
                    </div>

                    {/* Right Header Area - Emptied as requested */}
                    <div className="flex items-center gap-6">
                        {/* Icons removed */}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10">
                    <AnimatePresence mode="wait">

                        {/* VIEW: OVERVIEW */}
                        {activeView === "overview" && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="space-y-10"
                            >
                                {/* KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { label: "Active Identities", value: users.length, icon: Users, color: "rose", sub: " Nodes" },
                                        { label: "Global Packets", value: grievances.length, icon: Database, color: "indigo", sub: " Total" },
                                        { label: "Neural Health", value: `${neuralStats.sentimentScore}%`, icon: CheckCircle, color: "emerald", sub: " Stable" },
                                        { label: "Critical Alerts", value: neuralStats.criticalCount, icon: AlertOctagon, color: "amber", sub: " Priority" },
                                    ].map((stat, i) => (
                                        <motion.div
                                            key={stat.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="bg-white border border-slate-200 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-rose-200 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:bg-slate-100 transition-colors" />
                                            <div className="flex items-center justify-between mb-6 relative z-10">
                                                <div className={`w-12 h-12 rounded-2xl bg-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color}-50 flex items-center justify-center text-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color}-500 border border-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color}-100`}>
                                                    <stat.icon className="h-6 w-6" />
                                                </div>
                                                <Activity className={`h-5 w-5 text-${stat.color === 'emerald' ? 'emerald' : stat.color === 'amber' ? 'amber' : stat.color}-400 opacity-50`} />
                                            </div>
                                            <div className="relative z-10">
                                                <h3 className="text-4xl font-black text-slate-800 tracking-tighter mb-1">{stat.value}</h3>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Chart */}
                                    <div className="lg:col-span-2 bg-white border border-slate-200 p-10 rounded-[3rem] relative overflow-hidden shadow-sm">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic">Packet Flow Analysis</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Weekly Grievance Influx</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Volume</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={trendData}>
                                                    <defs>
                                                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1} />
                                                            <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="5 5" stroke="#f1f5f9" vertical={false} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }} dy={10} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        itemStyle={{ color: '#e11d48', fontSize: '11px', fontWeight: 'bold' }}
                                                    />
                                                    <Area type="monotone" dataKey="load" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Recent Packet List */}
                                    <div className="bg-white border border-slate-200 p-8 rounded-[3rem] overflow-hidden flex flex-col shadow-sm">
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic mb-6">Recent Propagation</h3>
                                        <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[400px]">
                                            {grievances.slice(0, 5).map((g, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-2 h-2 rounded-full ${g.priority === 'critical' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-700 truncate w-32">{g.category}</p>
                                                            <p className="text-[9px] font-mono text-slate-400 uppercase">{g.id?.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${g.status === 'resolved' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-200/50'}`}>
                                                        {g.status}
                                                    </span>
                                                </div>
                                            ))}
                                            {grievances.length === 0 && (
                                                <p className="text-center text-xs text-slate-300 py-10 uppercase tracking-widest">No Data Packets Found</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* VIEW: USERS */}
                        {activeView === "users" && (
                            <motion.div
                                key="users"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-8"
                            >
                                <div>
                                    <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter italic">Identity Nodes</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Active user entities in the matrix</p>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                            <tr>
                                                <th className="px-10 py-8">Entity</th>
                                                <th className="px-6 py-8">Status</th>
                                                <th className="px-6 py-8">Last Login</th>
                                                <th className="px-6 py-8">Role</th>
                                                <th className="px-6 py-8">Sector</th>
                                                <th className="px-10 py-8 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {enrichedUsers.map((u, i) => (
                                                <motion.tr
                                                    key={u.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black text-rose-500 shadow-sm uppercase">
                                                                {u.name?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{u.name}</p>
                                                                <p className="text-[9px] font-mono text-slate-400 tracking-wider">ID: {u.id.slice(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {u.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                            {u.lastLogin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            <br />
                                                            <span className="text-slate-300">{u.lastLogin.toLocaleDateString()}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-rose-50 border-rose-100 text-rose-600' : u.role === 'authority' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {u.department || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* VIEW: ASSIGNED AUTHORITY */}
                        {activeView === "assigned-authority" && (
                            <motion.div
                                key="assigned-authority"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-8"
                            >
                                <div>
                                    <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter italic">Authority Command</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Designated personnel with sector clearance</p>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                            <tr>
                                                <th className="px-10 py-8">Officer</th>
                                                <th className="px-6 py-8">Status</th>
                                                <th className="px-6 py-8">Last Comms</th>
                                                <th className="px-6 py-8">Clearance</th>
                                                <th className="px-6 py-8">Sector</th>
                                                <th className="px-10 py-8 text-right">Protocol</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {enrichedUsers.filter(u => u.role === 'authority').map((u, i) => (
                                                <motion.tr
                                                    key={u.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <td className="px-10 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-500 shadow-sm uppercase">
                                                                {u.name?.[0]}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{u.name}</p>
                                                                <p className="text-[9px] font-mono text-slate-400 tracking-wider">ID: {u.id.slice(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                {u.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                            {u.lastLogin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            <br />
                                                            <span className="text-slate-300">{u.lastLogin.toLocaleDateString()}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border bg-indigo-50 border-indigo-100 text-indigo-600">
                                                            AUTHORITY
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-6">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {u.department || "UNASSIGNED"}
                                                        </span>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-300 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                            {enrichedUsers.filter(u => u.role === 'authority').length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="text-center py-10 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Authority Nodes Active</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {/* VIEW: DEPARTMENTS */}
                        {activeView === "departments" && (
                            <motion.div
                                key="departments"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-10"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter italic">Sector Sync</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Departmental bandwidth and latency metrics</p>
                                    </div>
                                    <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> All Clusters Operational
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {deptStats.map((dept, i) => (
                                        <motion.div
                                            key={dept.name}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="bg-white border border-slate-200 p-8 rounded-[3rem] relative overflow-hidden group hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"
                                        >
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-500">
                                                    <Building2 className="h-6 w-6" />
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Avg Resolution</p>
                                                    <p className="text-xl font-black text-slate-800 italic">{dept.latency}</p>
                                                </div>
                                            </div>

                                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6 truncate">{dept.name}</h4>

                                            <div className="space-y-6">
                                                <div>
                                                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-2">
                                                        <span>Operational Efficiency</span>
                                                        <span className={dept.efficiency > 70 ? 'text-emerald-500' : 'text-amber-500'}>{dept.efficiency}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${dept.efficiency}%` }}
                                                            className={`h-full ${dept.efficiency > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Packets</p>
                                                        <p className="text-lg font-black text-slate-800">{dept.count}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Auth Nodes</p>
                                                        <p className="text-lg font-black text-indigo-500">{users.filter(u => u.department === dept.name).length}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button className="w-full mt-6 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 h-12 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">
                                                Oversee Sector
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* VIEW: SYSTEM / NEURAL HEALTH */}
                        {activeView === "system" && (
                            <motion.div
                                key="system"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-10"
                            >
                                {/* Neural Health Stats */}
                                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] relative overflow-hidden shadow-sm">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl opacity-50" />
                                    <div className="flex items-center gap-6 mb-10 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center">
                                            <Brain className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">AI Neural Health</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Self-correction and learning sequence stats</p>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 mb-8 relative z-10">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                                            <Activity className="h-4 w-4 text-rose-500" /> Sentiment Accuracy Pulse
                                        </p>
                                        <div className="flex items-end gap-2 h-32">
                                            {neuralStats.graphData.map((h, i) => (
                                                <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-indigo-100 to-indigo-50" style={{ height: `${h}%` }}>
                                                    <div className={`w-full h-full rounded-t-lg opacity-50 ${h < 60 ? 'bg-rose-400' : 'bg-transparent'}`} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center mt-6">
                                            <div className="flex items-center gap-3">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Optimization Active</span>
                                            </div>
                                            <span className="text-3xl font-black text-slate-800 tracking-tighter">{neuralStats.sentimentScore}<span className="text-sm text-slate-400">%</span></span>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 relative z-10">
                                        <div className="flex-1 p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem]">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Crit Packet Rate</p>
                                            <p className="text-2xl font-black text-slate-800">{neuralStats.criticalCount}</p>
                                        </div>
                                        <div className="flex-1 p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem]">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Urgency</p>
                                            <p className="text-2xl font-black text-indigo-500">{neuralStats.avgUrgency}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Administrative Logs */}
                                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] flex flex-col relative overflow-hidden shadow-sm max-h-[600px]">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,rgba(99,102,241,0.03),transparent_40%)]" />
                                    <div className="flex items-center gap-6 mb-10 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center">
                                            <Lock className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Administrative Logs</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Global audit trail and security sequences</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                        {activityLogs.map((log, i) => (
                                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                                <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center border  
                                                    ${log.type === 'grievance' ? 'bg-indigo-50 border-indigo-100 text-indigo-500' :
                                                        log.type === 'resolution' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' :
                                                            'bg-rose-50 border-rose-100 text-rose-500'}`}>
                                                    {log.type === 'grievance' ? <Database className="h-4 w-4" /> :
                                                        log.type === 'resolution' ? <CheckCircle className="h-4 w-4" /> :
                                                            <Shield className="h-4 w-4" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{log.msg}</p>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{log.time.toLocaleTimeString()}</span>
                                                        <span className="text-[9px] font-black text-slate-400 uppercase">{log.details}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {activityLogs.length === 0 && <p className="text-center text-xs text-slate-300 mt-10">No recent sequences logged.</p>}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* VIEW: ADD AUTHORITY */}
                        {activeView === "add-authority" && (
                            <motion.div
                                key="add-authority"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="max-w-2xl mx-auto"
                            >
                                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl opacity-50 pointer-events-none" />

                                    <div className="flex items-center gap-6 mb-10 relative z-10">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center">
                                            <UserPlus className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">New Authority Node</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Initiate clearance for new personnel</p>
                                        </div>
                                    </div>

                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const data = Object.fromEntries(formData);
                                        // Basic validation
                                        if (!data.email || !data.password || !data.name) {
                                            toast({ title: "Error", description: "Missing critical clearance fields.", variant: "destructive" });
                                            return;
                                        }

                                        const res = await addUser({
                                            name: data.name as string,
                                            email: data.email as string,
                                            password: data.password as string,
                                            role: 'authority',
                                            department: data.department as string,
                                            phone: data.phone as string
                                        });

                                        if (res.success) {
                                            toast({ title: "Node Initialized", description: `Authority access granted for ${data.email}. Ready for next entry.` });
                                            (e.target as HTMLFormElement).reset();
                                        } else {
                                            toast({ title: "Initialization Failed", description: res.message, variant: "destructive" });
                                        }
                                    }} className="space-y-6 relative z-10">

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Officer Name</label>
                                                <input name="name" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-300 transition-all" placeholder="EX: JOHN DOE" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Secure Email</label>
                                                <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-300 transition-all" placeholder="OFFICER@GOV.IN" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Assigned Sector</label>
                                            <div className="relative">
                                                <select name="department" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none transition-all cursor-pointer">
                                                    <option value="" disabled selected>SELECT CLEARANCE SECTOR</option>
                                                    {[
                                                        "Roads & Infrastructure", "Water Supply", "Electricity", "Sanitation",
                                                        "Public Transport", "Healthcare", "Education", "Law & Order"
                                                    ].map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                                                </select>
                                                <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Access Key (Password)</label>
                                                <input name="password" type="password" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-300 transition-all" placeholder="••••••••" minLength={6} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact Protocol</label>
                                                <input name="phone" type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-300 transition-all" placeholder="+91 XXXXX XXXXX" />
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end gap-4">
                                            <Button type="button" onClick={() => setActiveView('users')} variant="ghost" className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 font-bold uppercase tracking-widest text-xs h-12 px-6 rounded-xl">Cancel</Button>
                                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/20">Init Node</Button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
