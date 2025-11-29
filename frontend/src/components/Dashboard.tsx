import { useEffect, useState } from 'react';
import { usePortStore } from '../store/usePortStore';
import { PortCard } from './PortCard';
import { ToastContainer, ToastMessage } from './Toast';
import { Plus, Search, RefreshCw, Bell, BellOff, Shield, Filter, Code2, Zap, Star } from 'lucide-react';

export function Dashboard() {
    const {
        ports,
        watchedPorts,
        notificationsEnabled,
        loading,
        favorites,
        fetchPorts,
        fetchConfig,
        addWatchedPort,
        toggleNotifications
    } = usePortStore();

    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPort, setNewPort] = useState('');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [filterFavorites, setFilterFavorites] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchPorts();

        // Poll every 2 seconds
        const interval = setInterval(fetchPorts, 2000);
        return () => clearInterval(interval);
    }, []);

    const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toast: ToastMessage = { id, type, title, message, duration: 5000 };
        setToasts(prev => [...prev, toast]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    // Combine ports
    const allPortsMap = new Map<number, any>();

    // Add active ports
    ports.forEach(p => {
        allPortsMap.set(p.port, { info: p, isWatched: watchedPorts.includes(p.port) });
    });

    // Add watched ports that are inactive
    watchedPorts.forEach(p => {
        if (!allPortsMap.has(p)) {
            allPortsMap.set(p, { info: undefined, isWatched: true });
        }
    });

    const sortedPorts = Array.from(allPortsMap.entries())
        .sort((a, b) => {
            // Prioritize favorites
            const aIsFav = favorites.includes(a[0]);
            const bIsFav = favorites.includes(b[0]);
            if (aIsFav !== bIsFav) return bIsFav ? 1 : -1;
            return a[0] - b[0];
        })
        .filter(([port, data]) => {
            if (filterFavorites && !favorites.includes(port)) return false;
            if (!search) return true;
            const term = search.toLowerCase();
            return port.toString().includes(term) ||
                data.info?.process.toLowerCase().includes(term) ||
                data.info?.pid.toString().includes(term);
        });

    const activeCount = ports.length;
    const watchedCount = watchedPorts.length;
    const favoriteCount = favorites.length;

    const handleAddPort = (e: React.FormEvent) => {
        e.preventDefault();
        const port = parseInt(newPort);
        if (port > 0 && port < 65536) {
            addWatchedPort(port);
            showToast('success', 'Port Added', `Now watching port ${port}`);
            setNewPort('');
            setIsAddModalOpen(false);
        } else {
            showToast('error', 'Invalid Port', 'Port must be between 1 and 65535');
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-primary p-6 md:p-10 max-w-7xl mx-auto animate-fade-in relative overflow-hidden">
                {/* Grid Background Pattern */}
                <div className="fixed inset-0 opacity-5 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}></div>

                {/* Header Section */}
                <header className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-cyan-500/30">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <Zap size={32} className="text-cyan-400 drop-shadow-lg" style={{textShadow: '0 0 20px rgba(0, 217, 255, 0.8)'}} />
                            </div>
                            <h1 className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-300" style={{letterSpacing: '0.05em'}}>
                                PORT
                            </h1>
                            <h1 className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-pink-400" style={{letterSpacing: '0.05em'}}>
                                ASSASSIN
                            </h1>
                        </div>
                        <p className="text-cyan-300/70 text-sm font-mono tracking-wider">[ LOCALHOST PROCESS TERMINATOR ]</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Stats Panel */}
                        <div className="flex items-center gap-6 px-5 py-3 rounded border border-cyan-500/50 bg-slate-900/80 backdrop-blur-sm" style={{boxShadow: '0 0 20px rgba(0, 217, 255, 0.15), inset 0 0 20px rgba(0, 217, 255, 0.05)'}}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></div>
                                <span className="text-xs font-mono text-lime-400 font-bold">{activeCount} ACTIVE</span>
                            </div>
                            <div className="w-px h-5 bg-cyan-500/30"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                                <span className="text-xs font-mono text-cyan-400 font-bold">{watchedCount} WATCH</span>
                            </div>
                            <div className="w-px h-5 bg-cyan-500/30"></div>
                            <div className="flex items-center gap-2">
                                <Star size={12} className="text-pink-400 fill-pink-400" />
                                <span className="text-xs font-mono text-pink-400 font-bold">{favoriteCount} FAVES</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleNotifications}
                            className={`p-2.5 rounded border transition-all ${notificationsEnabled
                                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/20'
                                    : 'border-slate-700 bg-slate-800 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30'
                                }`}
                            title={notificationsEnabled ? "Notifications On" : "Notifications Off"}
                            style={notificationsEnabled ? {textShadow: '0 0 10px rgba(0, 217, 255, 0.6)'} : {}}
                        >
                            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                        </button>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded border-2 border-pink-500 bg-pink-500/10 text-pink-400 font-bold text-sm transition-all hover:bg-pink-500/20 hover:shadow-lg hover:shadow-pink-500/20 uppercase tracking-wide"
                            style={{textShadow: '0 0 10px rgba(255, 0, 110, 0.4)'}}
                        >
                            <Plus size={16} />
                            <span>Add Port</span>
                        </button>
                    </div>
                </header>

                {/* Controls Bar */}
                <div className="relative z-10 flex flex-wrap items-center gap-3 mb-10">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" size={16} />
                        <input
                            type="text"
                            placeholder="SEARCH PORTS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 rounded border border-cyan-500/50 bg-slate-900/80 text-sm text-cyan-100 placeholder:text-cyan-500/50 focus:outline-none focus:border-cyan-400 focus:bg-slate-900 transition-all font-mono"
                            style={{boxShadow: 'inset 0 0 10px rgba(0, 217, 255, 0.05)'}}
                        />
                    </div>
                    <button
                        onClick={() => setFilterFavorites(!filterFavorites)}
                        className={`p-2.5 rounded border transition-all ${filterFavorites
                                ? 'border-pink-500/50 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:shadow-lg hover:shadow-pink-500/20'
                                : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-pink-500/30 hover:text-pink-400'
                            }`}
                        title="Filter Favorites"
                        style={filterFavorites ? {textShadow: '0 0 10px rgba(255, 0, 110, 0.4)'} : {}}
                    >
                        <Star size={16} fill={filterFavorites ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={() => fetchPorts()}
                        className={`p-2.5 rounded border border-lime-500/50 bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 hover:shadow-lg hover:shadow-lime-500/20 transition-all ${loading ? 'animate-spin' : ''}`}
                        title="Refresh Ports"
                        style={{textShadow: '0 0 10px rgba(57, 255, 20, 0.4)'}}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Grid */}
                {sortedPorts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedPorts.map(([port, data], index) => (
                            <div key={port} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                                <PortCard
                                    port={port}
                                    info={data.info}
                                    isWatched={data.isWatched}
                                    onShowToast={showToast}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 text-secondary border border-dashed border-surfaceHighlight rounded-xl bg-surface/30">
                        <Search size={32} className="mb-3 opacity-50" />
                        <p className="text-sm">{filterFavorites ? 'No favorite ports yet' : 'No ports found matching your criteria'}</p>
                    </div>
                )}

                {/* Add Port Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                        <div className="border border-pink-500/50 rounded p-6 w-full max-w-sm shadow-2xl animate-slide-up bg-gradient-to-br from-slate-950 to-slate-900" style={{boxShadow: '0 0 40px rgba(255, 0, 110, 0.2), inset 0 0 20px rgba(255, 0, 110, 0.05)'}}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded border border-pink-400/60 bg-pink-400/10 text-pink-400">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-pink-400 uppercase tracking-wide">Add Port</h2>
                                    <p className="text-pink-300/60 text-xs font-mono">[ NEW TARGET ]</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddPort}>
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-pink-400 uppercase mb-2 tracking-wide">Port Number</label>
                                    <input
                                        type="number"
                                        placeholder="3000"
                                        value={newPort}
                                        onChange={(e) => setNewPort(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded border border-pink-500/50 bg-slate-900/80 text-pink-100 placeholder:text-pink-500/40 focus:outline-none focus:border-pink-400 focus:bg-slate-900 transition-all font-mono text-sm"
                                        style={{boxShadow: 'inset 0 0 10px rgba(255, 0, 110, 0.05)'}}
                                        autoFocus
                                        min="1"
                                        max="65535"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-3 py-2 rounded border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors text-sm font-bold uppercase tracking-wide"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-3 py-2 rounded border-2 border-pink-500 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 hover:shadow-lg hover:shadow-pink-500/20 transition-all text-sm font-bold uppercase tracking-wide"
                                        style={{textShadow: '0 0 10px rgba(255, 0, 110, 0.4)'}}
                                    >
                                        Add Port
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </>
    );
}
