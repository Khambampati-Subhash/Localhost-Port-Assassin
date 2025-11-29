import { useState } from 'react';
import { Trash2, Eye, EyeOff, Star, Circle } from 'lucide-react';
import { PortInfo, usePortStore } from '../store/usePortStore';
import { PasswordPromptModal } from './PasswordPromptModal';

interface PortCardProps {
    port: number;
    info?: PortInfo;
    isWatched: boolean;
    onShowToast: (type: 'success' | 'error', title: string, message: string) => void;
}

export function PortCard({ port, info, isWatched, onShowToast }: PortCardProps) {
    const killProcess = usePortStore(state => state.killProcess);
    const killProcessWithPassword = usePortStore(state => state.killProcessWithPassword);
    const removeWatchedPort = usePortStore(state => state.removeWatchedPort);
    const toggleFavorite = usePortStore(state => state.toggleFavorite);
    const favorites = usePortStore(state => state.favorites);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const isFree = !info;
    const isFavorite = favorites.includes(port);

    const handleKillProcess = async () => {
        if (!info) return;
        setIsLoading(true);
        try {
            await killProcess(info.pid);
            onShowToast('success', 'Process Killed', `${info.process} (PID: ${info.pid})`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to kill process';
            if (errorMsg.includes('Permission denied') || errorMsg.includes('Operation not permitted')) {
                onShowToast('error', 'Permission Denied', 'Need admin privileges');
                setShowPasswordModal(true);
            } else {
                onShowToast('error', 'Kill Failed', errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKillWithPassword = async (password: string) => {
        if (!info) return;
        setIsLoading(true);
        try {
            await killProcessWithPassword(info.pid, password);
            setShowPasswordModal(false);
            onShowToast('success', 'Process Killed', `${info.process} (PID: ${info.pid}) with sudo`);
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Failed to kill process');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={`group relative rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
                isFree
                    ? 'border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 hover:border-emerald-400/50 hover:shadow-lg hover:shadow-emerald-200/30'
                    : 'border-orange-200/50 bg-gradient-to-br from-orange-50/50 to-rose-50/30 hover:border-orange-400/50 hover:shadow-lg hover:shadow-orange-200/30'
            }`}>
                {/* Header */}
                <div className="p-5 border-b border-white/30">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">{port}</span>
                            <span className="text-xs font-medium text-gray-500 pb-1">port</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => toggleFavorite(port)}
                                className={`p-2 rounded-lg transition-all ${isFavorite
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                                    : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50'
                                }`}
                            >
                                <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                            </button>
                            {isWatched && (
                                <button
                                    onClick={() => removeWatchedPort(port)}
                                    className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <EyeOff size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        <Circle size={8} className={`fill-current ${isFree ? 'text-emerald-500' : 'text-orange-500'}`} />
                        <span className={`text-xs font-bold uppercase tracking-wide ${isFree ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {isFree ? 'Available' : 'In Use'}
                        </span>
                        {isWatched && (
                            <span className="ml-auto px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700 flex items-center gap-1">
                                <Eye size={12} /> Watch
                            </span>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {isFree ? (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-500">No process running</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 bg-white/40 rounded-lg p-3">
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span>Process</span>
                                    <span className="font-mono text-orange-600">PID {info.pid}</span>
                                </div>
                                <div className="font-semibold text-sm text-gray-800 truncate" title={info.process}>
                                    {info.process}
                                </div>
                            </div>

                            <button
                                onClick={handleKillProcess}
                                disabled={isLoading}
                                className="w-full py-3 rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 size={18} />
                                <span>{isLoading ? 'Killing...' : 'Kill Process'}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <PasswordPromptModal
                isOpen={showPasswordModal}
                isLoading={isLoading}
                processName={info?.process || 'Unknown'}
                pid={info?.pid || 0}
                onConfirm={handleKillWithPassword}
                onCancel={() => setShowPasswordModal(false)}
            />
        </>
    );
}
