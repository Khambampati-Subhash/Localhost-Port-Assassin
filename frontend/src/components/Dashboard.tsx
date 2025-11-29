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
            <div className="min-h-screen bg-background text-primary p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-surfaceHighlight pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Zap size={28} className="text-yellow-400" />
                            <h1 className="text-3xl font-bold tracking-tight">Port Assassin</h1>
                        </div>
                        <p className="text-secondary text-sm">⚡ Instantly kill localhost processes. Essential for every developer.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-surface border border-surfaceHighlight">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success"></div>
                                <span className="text-sm font-medium">{activeCount}</span>
                            </div>
                            <div className="w-px h-4 bg-surfaceHighlight"></div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-accent"></div>
                                <span className="text-sm font-medium">{watchedCount}</span>
                            </div>
                            <div className="w-px h-4 bg-surfaceHighlight"></div>
                            <div className="flex items-center gap-2">
                                <Star size={14} className="text-yellow-400" />
                                <span className="text-sm font-medium">{favoriteCount}</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleNotifications}
                            className={`p-2 rounded-md border transition-colors ${notificationsEnabled
                                    ? 'bg-surface border-surfaceHighlight text-primary hover:bg-surfaceHighlight'
                                    : 'bg-transparent border-transparent text-secondary hover:text-primary'
                                }`}
                            title={notificationsEnabled ? "Notifications On" : "Notifications Off"}
                        >
                            {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                        </button>

                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-md bg-white text-black font-medium hover:bg-gray-200 transition-colors text-sm"
                        >
                            <Plus size={16} />
                            <span>Add Port</span>
                        </button>
                    </div>
                </header>

                {/* Controls Bar */}
                <div className="flex flex-wrap items-center gap-3 mb-8">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                        <input
                            type="text"
                            placeholder="Search ports, processes, PIDs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-md bg-surface border border-surfaceHighlight text-sm text-primary placeholder:text-secondary focus:outline-none focus:border-secondary transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => setFilterFavorites(!filterFavorites)}
                        className={`p-2 rounded-md border transition-colors ${filterFavorites
                                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                                : 'bg-surface border-surfaceHighlight text-secondary hover:text-primary'
                            }`}
                        title="Filter Favorites"
                    >
                        <Star size={16} fill={filterFavorites ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={() => fetchPorts()}
                        className={`p-2 rounded-md bg-surface border border-surfaceHighlight text-secondary hover:text-primary transition-colors ${loading ? 'animate-spin' : ''}`}
                        title="Refresh Ports"
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
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
                        <div className="bg-background border border-surfaceHighlight rounded-lg p-6 w-full max-w-sm shadow-2xl animate-slide-up">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2 rounded-md bg-surface border border-surfaceHighlight text-primary">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-primary">Watch Port</h2>
                                    <p className="text-secondary text-xs">Add a port to monitor</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddPort}>
                                <div className="mb-5">
                                    <label className="block text-xs font-medium text-secondary uppercase mb-1.5">Port Number</label>
                                    <input
                                        type="number"
                                        placeholder="3000"
                                        value={newPort}
                                        onChange={(e) => setNewPort(e.target.value)}
                                        className="w-full px-3 py-2 rounded-md bg-surface border border-surfaceHighlight text-primary focus:outline-none focus:border-accent transition-colors font-mono text-sm"
                                        autoFocus
                                        min="1"
                                        max="65535"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-3 py-2 rounded-md bg-surface border border-surfaceHighlight text-secondary hover:text-primary transition-colors text-sm font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-3 py-2 rounded-md bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors"
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
