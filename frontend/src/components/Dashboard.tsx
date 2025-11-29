import { useEffect, useState } from 'react';
import { usePortStore } from '../store/usePortStore';
import { PortCard } from './PortCard';
import { ToastContainer, ToastMessage } from './Toast';
import { Search, Plus, RefreshCw, Bell, BellOff, Star, Zap } from 'lucide-react';

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

    const allPortsMap = new Map<number, any>();
    ports.forEach(p => {
        allPortsMap.set(p.port, { info: p, isWatched: watchedPorts.includes(p.port) });
    });
    watchedPorts.forEach(p => {
        if (!allPortsMap.has(p)) {
            allPortsMap.set(p, { info: undefined, isWatched: true });
        }
    });

    const sortedPorts = Array.from(allPortsMap.entries())
        .sort((a, b) => {
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
            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-orange-100/50">
                    <div className="max-w-7xl mx-auto px-6 py-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                                    <Zap className="text-white" size={24} strokeWidth={3} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">Port Assassin</h1>
                                    <p className="text-sm text-orange-600/70 font-medium">Kill localhost processes instantly</p>
                                </div>
                            </div>
                            <button
                                onClick={toggleNotifications}
                                className={`p-3 rounded-lg transition-all ${notificationsEnabled
                                    ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                                title={notificationsEnabled ? "Notifications On" : "Notifications Off"}
                            >
                                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="px-4 py-2 rounded-lg bg-orange-100/50 text-orange-700 font-semibold text-sm">
                                <span className="text-lg">{activeCount}</span> Active
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-blue-100/50 text-blue-700 font-semibold text-sm">
                                <span className="text-lg">{watchedCount}</span> Watched
                            </div>
                            <div className="px-4 py-2 rounded-lg bg-rose-100/50 text-rose-700 font-semibold text-sm flex items-center gap-1">
                                <Star size={16} className="fill-current" /> <span className="text-lg">{favoriteCount}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Controls */}
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 max-w-md relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search ports, processes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg border border-orange-200/50 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <button
                            onClick={() => setFilterFavorites(!filterFavorites)}
                            className={`p-3 rounded-lg transition-all ${filterFavorites
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                : 'bg-white border border-orange-200/50 text-gray-600 hover:bg-orange-50'
                            }`}
                        >
                            <Star size={20} fill={filterFavorites ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => fetchPorts()}
                            disabled={loading}
                            className="p-3 rounded-lg bg-white border border-orange-200/50 text-orange-600 hover:bg-orange-50 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/30 transition-all"
                        >
                            <Plus size={20} />
                            Add Port
                        </button>
                    </div>
                </div>

                {/* Grid */}
                <div className="max-w-7xl mx-auto px-6 pb-12">
                    {sortedPorts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sortedPorts.map(([port, data], index) => (
                                <div key={port} style={{ animationDelay: `${index * 30}ms` }} className="animate-fade-in">
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
                        <div className="text-center py-16">
                            <Search size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">{filterFavorites ? 'No favorite ports yet' : 'No ports found'}</p>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-slide-up">
                            <h2 className="text-2xl font-black mb-2 bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">Add Port to Watch</h2>
                            <p className="text-gray-600 text-sm mb-6">Monitor a specific port for changes</p>

                            <form onSubmit={handleAddPort}>
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Port Number</label>
                                    <input
                                        type="number"
                                        placeholder="3000"
                                        value={newPort}
                                        onChange={(e) => setNewPort(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-orange-200/50 bg-orange-50/30 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                        autoFocus
                                        min="1"
                                        max="65535"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all"
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
