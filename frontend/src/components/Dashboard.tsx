import { useEffect, useState } from 'react';
import { usePortStore } from '../store/usePortStore';
import { PortCard } from './PortCard';
import { Plus, Search, RefreshCw, Bell, BellOff, Shield, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';

export function Dashboard() {
    const {
        ports,
        watchedPorts,
        notificationsEnabled,
        loading,
        fetchPorts,
        fetchConfig,
        addWatchedPort,
        toggleNotifications
    } = usePortStore();

    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newPort, setNewPort] = useState('');

    useEffect(() => {
        fetchConfig();
        fetchPorts();

        // Poll every 2 seconds
        const interval = setInterval(fetchPorts, 2000);
        return () => clearInterval(interval);
    }, []);

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
        .sort((a, b) => a[0] - b[0]) // Sort by port number
        .filter(([port, data]) => {
            if (!search) return true;
            const term = search.toLowerCase();
            return port.toString().includes(term) ||
                data.info?.process.toLowerCase().includes(term) ||
                data.info?.pid.toString().includes(term);
        });

    const activeCount = ports.length;
    const watchedCount = watchedPorts.length;

    const handleAddPort = (e: React.FormEvent) => {
        e.preventDefault();
        const port = parseInt(newPort);
        if (port > 0 && port < 65536) {
            addWatchedPort(port);
            setNewPort('');
            setIsAddModalOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-6 md:p-10 max-w-7xl mx-auto animate-fade-in">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Port Assassin</h1>
                    <p className="text-muted-foreground mt-1">Manage localhost processes and ports</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/50 border mr-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-sm font-medium">{activeCount} Active</span>
                        </div>
                        <div className="w-px h-4 bg-border"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium">{watchedCount} Watched</span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleNotifications}
                        title={notificationsEnabled ? "Notifications On" : "Notifications Off"}
                    >
                        {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                    </Button>

                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                        <Plus size={16} />
                        Add Port
                    </Button>
                </div>
            </header>

            {/* Controls Bar */}
            <div className="flex items-center gap-3 mb-8">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                        type="text"
                        placeholder="Search ports..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button variant="outline" size="icon">
                    <Filter size={16} />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fetchPorts()}
                    className={loading ? 'animate-spin' : ''}
                    title="Refresh Ports"
                >
                    <RefreshCw size={16} />
                </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedPorts.map(([port, data], index) => (
                    <div key={port} className="animate-slide-up" style={{ animationDelay: `${index * 30}ms` }}>
                        <PortCard
                            port={port}
                            info={data.info}
                            isWatched={data.isWatched}
                        />
                    </div>
                ))}

                {sortedPorts.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground border border-dashed rounded-xl bg-secondary/20">
                        <Search size={32} className="mb-3 opacity-50" />
                        <p className="text-sm">No ports found matching your criteria</p>
                    </div>
                )}
            </div>

            {/* Add Port Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                    <Card className="w-full max-w-sm shadow-2xl animate-slide-up">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-secondary text-primary">
                                    <Shield size={18} />
                                </div>
                                <div>
                                    <CardTitle>Watch Port</CardTitle>
                                    <CardDescription>Monitor a specific port</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddPort}>
                                <div className="mb-5">
                                    <label className="block text-xs font-medium text-muted-foreground uppercase mb-1.5">Port Number</label>
                                    <Input
                                        type="number"
                                        placeholder="3000"
                                        value={newPort}
                                        onChange={(e) => setNewPort(e.target.value)}
                                        className="font-mono"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setIsAddModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        Add Port
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
