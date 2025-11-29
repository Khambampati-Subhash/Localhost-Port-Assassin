import { useState } from 'react';
import { Lock, AlertCircle, Loader } from 'lucide-react';

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
            setError(err instanceof Error ? err.message : 'Authentication failed');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-8 py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Lock className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Admin Required</h2>
                            <p className="text-white/80 text-sm">Enter your password to continue</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8">
                    {/* Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex gap-3">
                        <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-900">This process requires admin privileges</p>
                            <p className="text-amber-700/80 text-xs mt-1">{processName} (PID: {pid})</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all disabled:opacity-50 disabled:bg-gray-50"
                                autoFocus
                            />
                            {error && (
                                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                    <span>✕</span> {error}
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                            Your password is only used for sudo authentication and is never stored or logged.
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    onCancel();
                                    setPassword('');
                                    setError('');
                                }}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader size={18} className="animate-spin" />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <span>Authenticate</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
