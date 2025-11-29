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
                "group relative p-4 rounded border transition-all duration-300",
                isFree
                    ? "border-lime-500/40 bg-lime-500/5 hover:border-lime-500/60 hover:bg-lime-500/10 hover:shadow-lg hover:shadow-lime-500/20"
                    : "border-pink-500/40 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 hover:shadow-lg hover:shadow-pink-500/20"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={twMerge(
                            "w-8 h-8 rounded flex items-center justify-center border font-mono text-xs font-bold",
                            isFree
                                ? "border-lime-400/60 bg-lime-400/10 text-lime-400"
                                : "border-pink-400/60 bg-pink-400/10 text-pink-400"
                        )}>
                            <span>{port.toString().slice(0, 1)}</span>
                        </div>
                        <div>
                            <span className={twMerge(
                                "block text-2xl font-mono font-black tracking-wider",
                                isFree ? "text-lime-400" : "text-pink-400"
                            )} style={{textShadow: isFree ? '0 0 10px rgba(57, 255, 20, 0.3)' : '0 0 10px rgba(255, 0, 110, 0.3)'}}>{port}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleFavorite(port)}
                            className={twMerge(
                                "p-1 rounded transition-all",
                                isFavorite
                                    ? "text-pink-400 hover:text-pink-300 opacity-100"
                                    : "text-slate-600 hover:text-pink-400 opacity-0 group-hover:opacity-100"
                            )}
                            style={isFavorite ? {textShadow: '0 0 10px rgba(255, 0, 110, 0.4)'} : {}}
                            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                            <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                        </button>

                        {isWatched && (
                            <div className="px-2 py-0.5 rounded border border-cyan-400/50 bg-cyan-400/10 flex items-center gap-1">
                                <Eye size={10} className="text-cyan-400" />
                                <span className="text-[10px] uppercase tracking-wider font-bold text-cyan-400">Watch</span>
                            </div>
                        )}
                        {isWatched && isFree && (
                            <button
                                onClick={() => removeWatchedPort(port)}
                                className="p-1 rounded text-slate-600 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100"
                                title="Stop watching"
                            >
                                <EyeOff size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {isFree ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-lime-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></div>
                                <span className="text-xs font-mono font-bold">AVAILABLE</span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono">[ NO PROCESS ]</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                                    <span>PROCESS</span>
                                    <span className="text-pink-400">PID: {info.pid}</span>
                                </div>
                                <div className="font-mono text-sm text-cyan-300 truncate tracking-tight" title={info.process}>
                                    {info.process}
                                </div>
                            </div>

                            <button
                                onClick={handleKillProcess}
                                disabled={isLoading}
                                className={twMerge(
                                    "w-full flex items-center justify-center gap-2 px-3 py-2 rounded border-2 border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-200 text-xs font-bold uppercase tracking-wide",
                                    isLoading && "opacity-50 cursor-not-allowed"
                                )}
                                style={{textShadow: '0 0 10px rgba(239, 68, 68, 0.3)'}}
                            >
                                <Trash2 size={12} />
                                <span>{isLoading ? 'KILLING...' : 'KILL'}</span>
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
