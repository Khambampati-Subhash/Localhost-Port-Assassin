import { create } from 'zustand';
import { GetActivePorts, KillProcess, GetConfig, SaveConfig, KillProcessWithPassword } from '../../wailsjs/go/main/App';

// Define types based on Go structs
export interface PortInfo {
    port: number;
    pid: number;
    process: string;
}

interface Config {
    watched_ports: number[];
    notifications_enabled: boolean;
}

interface PortStore {
    ports: PortInfo[];
    watchedPorts: number[];
    notificationsEnabled: boolean;
    loading: boolean;
    error: string | null;
    favorites: number[];

    fetchPorts: () => Promise<void>;
    fetchConfig: () => Promise<void>;
    killProcess: (pid: number) => Promise<void>;
    killProcessWithPassword: (pid: number, password: string) => Promise<void>;
    addWatchedPort: (port: number) => Promise<void>;
    removeWatchedPort: (port: number) => Promise<void>;
    toggleNotifications: () => Promise<void>;
    toggleFavorite: (port: number) => void;
}

export const usePortStore = create<PortStore>((set, get) => ({
    ports: [],
    watchedPorts: [],
    notificationsEnabled: true,
    loading: false,
    error: null,
    favorites: [],

    fetchPorts: async () => {
        set({ loading: true });
        try {
            const ports = await GetActivePorts();
            set({ ports, loading: false });
        } catch (err) {
            set({ error: 'Failed to fetch ports', loading: false });
        }
    },

    fetchConfig: async () => {
        try {
            const config = await GetConfig();
            set({
                watchedPorts: config.watched_ports,
                notificationsEnabled: config.notifications_enabled
            });
        } catch (err) {
            console.error(err);
        }
    },

    killProcess: async (pid: number) => {
        try {
            await KillProcess(pid);
            await get().fetchPorts();
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to kill process');
        }
    },

    killProcessWithPassword: async (pid: number, password: string) => {
        try {
            await KillProcessWithPassword(pid, password);
            await get().fetchPorts();
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to kill process with sudo');
        }
    },

    addWatchedPort: async (port: number) => {
        const { watchedPorts, notificationsEnabled } = get();
        if (watchedPorts.includes(port)) return;

        const newWatched = [...watchedPorts, port];
        set({ watchedPorts: newWatched });

        await SaveConfig({
            watched_ports: newWatched,
            notifications_enabled: notificationsEnabled
        });
    },

    removeWatchedPort: async (port: number) => {
        const { watchedPorts, notificationsEnabled } = get();
        const newWatched = watchedPorts.filter(p => p !== port);
        set({ watchedPorts: newWatched });

        await SaveConfig({
            watched_ports: newWatched,
            notifications_enabled: notificationsEnabled
        });
    },

    toggleNotifications: async () => {
        const { watchedPorts, notificationsEnabled } = get();
        const newState = !notificationsEnabled;
        set({ notificationsEnabled: newState });

        await SaveConfig({
            watched_ports: watchedPorts,
            notifications_enabled: newState
        });
    },

    toggleFavorite: (port: number) => {
        const { favorites } = get();
        if (favorites.includes(port)) {
            set({ favorites: favorites.filter(p => p !== port) });
        } else {
            set({ favorites: [...favorites, port] });
        }
    }
}));
