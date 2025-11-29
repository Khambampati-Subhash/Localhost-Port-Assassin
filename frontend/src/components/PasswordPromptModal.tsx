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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-background border border-surfaceHighlight rounded-lg p-6 w-full max-w-sm shadow-2xl animate-slide-up">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-md bg-surface border border-surfaceHighlight text-amber-400">
                        <Lock size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-primary">Admin Password Required</h2>
                        <p className="text-secondary text-xs">To kill this process</p>
                    </div>
                </div>

                <div className="bg-surface/50 border border-surfaceHighlight rounded p-3 mb-5">
                    <p className="text-xs text-secondary mb-1">Process Details:</p>
                    <p className="text-sm font-mono text-primary">
                        {processName} <span className="text-secondary">(PID: {pid})</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-xs font-medium text-secondary uppercase mb-1.5">
                            Your Password
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
                            className="w-full px-3 py-2 rounded-md bg-surface border border-surfaceHighlight text-primary focus:outline-none focus:border-accent transition-colors font-mono text-sm disabled:opacity-50"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-400 mt-1.5">{error}</p>
                        )}
                    </div>

                    <p className="text-xs text-secondary mb-4">
                        Your password is only used to authenticate the sudo command and is never stored.
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
                            className="flex-1 px-3 py-2 rounded-md bg-surface border border-surfaceHighlight text-secondary hover:text-primary transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-3 py-2 rounded-md bg-white text-black text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader size={14} className="animate-spin" />}
                            <span>{isLoading ? 'Processing...' : 'Confirm'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
