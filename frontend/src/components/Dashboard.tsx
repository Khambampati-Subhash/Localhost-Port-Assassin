import { useEffect, useState } from 'react';
import { usePortStore } from '../store/usePortStore';
import { PortCard } from './PortCard';
import { Plus, Search, RefreshCw, Bell, BellOff, Shield, Filter, Activity, Eye, Server } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Layout } from './Layout';
import { motion, AnimatePresence } from 'framer-motion';

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
        <Layout>
            <div className="space-y-8">
                {/* Header & Stats */}
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                            <p className="text-muted-foreground">Overview of your localhost environment</p>
                        </div>
                        <div className="flex items-center gap-2">
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
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Ports</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{activeCount}</div>
                                <p className="text-xs text-muted-foreground">Currently listening</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Watched Ports</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{watchedCount}</div>
                                <p className="text-xs text-muted-foreground">Monitored for activity</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
                                <Server className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{activeCount}</div>
                                <p className="text-xs text-muted-foreground">Running instances</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Filters & Grid */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search ports, PIDs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => fetchPorts()}
                            className={loading ? 'animate-spin' : ''}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    <motion.div
                        layout
                        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                        <AnimatePresence>
                            {sortedPorts.map(([port, data]) => (
                                <motion.div
                                    key={port}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <PortCard
                                        port={port}
                                        info={data.info}
                                        isWatched={data.isWatched}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>

                    {sortedPorts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                            <Search className="h-8 w-8 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">No ports found</h3>
                            <p className="text-sm">Try adjusting your search or add a new port to watch.</p>
                        </div>
                    )}
                </div>

                {/* Add Port Modal */}
                <AnimatePresence>
                    {isAddModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-md"
                            >
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Watch New Port</CardTitle>
                                        <CardDescription>
                                            Enter a port number to monitor for activity.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleAddPort} className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    Port Number
                                                </label>
                                                <Input
                                                    type="number"
                                                    placeholder="e.g. 3000"
                                                    value={newPort}
                                                    onChange={(e) => setNewPort(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setIsAddModalOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button type="submit">
                                                    Start Watching
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </Layout>
    );
}
