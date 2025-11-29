import { useState } from 'react';
import { Trash2, Terminal, Eye, EyeOff, Star } from 'lucide-react';
import { PortInfo, usePortStore } from '../store/usePortStore';
import { twMerge } from 'tailwind-merge';
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
    const [attemptedKillWithPassword, setAttemptedKillWithPassword] = useState(false);

    const isFree = !info;
    const isFavorite = favorites.includes(port);

    const handleKillProcess = async () => {
        if (!info) return;

        setIsLoading(true);
        try {
            await killProcess(info.pid);
            onShowToast('success', 'Process Killed', `Successfully killed ${info.process} (PID: ${info.pid})`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to kill process';
            if (errorMsg.includes('Permission denied') || errorMsg.includes('Operation not permitted')) {
                onShowToast('error', 'Permission Denied', 'Need admin privileges. Try using sudo password.');
                setAttemptedKillWithPassword(true);
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
            onShowToast('success', 'Process Killed', `Successfully killed ${info.process} (PID: ${info.pid}) with sudo`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to kill process';
            if (errorMsg.includes('password') || errorMsg.includes('denied') || errorMsg.includes('incorrect')) {
                throw new Error('Incorrect password or sudo failed');
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className={twMerge(
                "group relative p-4 rounded-lg border transition-all duration-200 hover:shadow-lg",
                isFree
                    ? "bg-surface/30 border-surfaceHighlight hover:border-success/40"
                    : "bg-surface/50 border-surfaceHighlight hover:border-accent/40"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={twMerge(
                            "w-8 h-8 rounded flex items-center justify-center border",
                            isFree
                                ? "bg-success/10 border-success/20 text-success"
                                : "bg-accent/10 border-accent/20 text-accent"
                        )}>
                            <Terminal size={14} />
                        </div>
                        <div>
                            <span className="block text-lg font-mono font-medium text-primary">{port}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleFavorite(port)}
                            className={twMerge(
                                "p-1 rounded transition-colors",
                                isFavorite
                                    ? "text-yellow-400 hover:text-yellow-300"
                                    : "text-secondary hover:text-yellow-400 opacity-0 group-hover:opacity-100"
                            )}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                        </button>

                        {isWatched && (
                            <div className="px-1.5 py-0.5 rounded bg-surfaceHighlight border border-white/5 flex items-center gap-1">
                                <Eye size={10} className="text-secondary" />
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-secondary">Watched</span>
                            </div>
                        )}
                        {isWatched && isFree && (
                            <button
                                onClick={() => removeWatchedPort(port)}
                                className="p-1 rounded hover:bg-surfaceHighlight text-secondary hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                                title="Stop watching"
                            >
                                <EyeOff size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {isFree ? (
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-success">
                                <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                                <span className="text-xs font-medium">Available</span>
                            </div>
                            <p className="text-xs text-secondary">No process running</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs text-secondary">
                                    <span>Process</span>
                                    <span className="font-mono">PID: {info.pid}</span>
                                </div>
                                <div className="font-medium text-sm text-primary truncate" title={info.process}>
                                    {info.process}
                                </div>
                            </div>

                            <button
                                onClick={handleKillProcess}
                                disabled={isLoading}
                                className={twMerge(
                                    "w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-surface border border-surfaceHighlight text-secondary hover:text-danger hover:border-danger/30 hover:bg-danger/5 transition-all duration-200 text-xs font-medium",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                <Trash2 size={12} />
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
                onCancel={() => {
                    setShowPasswordModal(false);
                    setAttemptedKillWithPassword(false);
                }}
            />
        </>
    );
}
