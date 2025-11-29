import { useState } from 'react';
import { Lock, Loader } from 'lucide-react';

interface PasswordPromptModalProps {
    isOpen: boolean;
    isLoading: boolean;
    onConfirm: (password: string) => Promise<void>;
    onCancel: () => void;
    processName: string;
    pid: number;
}

export function PasswordPromptModal({
    isOpen,
    isLoading,
    onConfirm,
    onCancel,
    processName,
    pid,
}: PasswordPromptModalProps) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password.trim()) {
            setError('Password is required');
            return;
        }

        try {
            await onConfirm(password);
            setPassword('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to kill process');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="border border-cyan-500/50 rounded p-6 w-full max-w-sm shadow-2xl animate-slide-up bg-gradient-to-br from-slate-950 to-slate-900" style={{boxShadow: '0 0 40px rgba(0, 217, 255, 0.2), inset 0 0 20px rgba(0, 217, 255, 0.05)'}}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded border border-cyan-400/60 bg-cyan-400/10 text-cyan-400">
                        <Lock size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-cyan-400 uppercase tracking-wide">Admin Access</h2>
                        <p className="text-cyan-300/60 text-xs font-mono">[ PASSWORD REQUIRED ]</p>
                    </div>
                </div>

                <div className="bg-slate-900/80 border border-pink-500/30 rounded p-3 mb-6">
                    <p className="text-xs text-pink-400 mb-1.5 font-mono font-bold">TARGET:</p>
                    <p className="text-sm font-mono text-cyan-300 truncate" title={processName}>
                        {processName} <span className="text-pink-400 text-xs">[ PID: {pid} ]</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-cyan-400 uppercase mb-2 tracking-wide">
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            disabled={isLoading}
                            className="w-full px-3 py-2.5 rounded border border-cyan-500/50 bg-slate-900/80 text-cyan-100 placeholder:text-cyan-500/40 focus:outline-none focus:border-cyan-400 focus:bg-slate-900 transition-all font-mono text-sm disabled:opacity-50"
                            style={{boxShadow: 'inset 0 0 10px rgba(0, 217, 255, 0.05)'}}
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-400 mt-2 font-mono">[ ERROR ] {error}</p>
                        )}
                    </div>

                    <p className="text-xs text-slate-500 font-mono mb-5">
                        [ Password used for sudo auth only. Never stored. ]
                    </p>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                onCancel();
                                setPassword('');
                                setError('');
                            }}
                            disabled={isLoading}
                            className="flex-1 px-3 py-2 rounded border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300 transition-colors text-sm font-bold uppercase tracking-wide disabled:opacity-50"
                        >
                            Abort
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-3 py-2 rounded border-2 border-cyan-500 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 hover:shadow-lg hover:shadow-cyan-500/20 transition-all text-sm font-bold uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
                            style={{textShadow: '0 0 10px rgba(0, 217, 255, 0.4)'}}
                        >
                            {isLoading && <Loader size={14} className="animate-spin" />}
                            <span>{isLoading ? 'PROCESSING...' : 'EXECUTE'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
