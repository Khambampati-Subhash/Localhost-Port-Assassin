import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
}

interface ToastProps extends ToastMessage {
    onClose: (id: string) => void;
}

const Toast = ({ id, type, title, message, duration = 5000, onClose }: ToastProps) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => onClose(id), duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, onClose]);

    const typeConfig = {
        success: {
            bgColor: 'bg-lime-500/10',
            borderColor: 'border-lime-500/50',
            titleColor: 'text-lime-400',
            messageColor: 'text-lime-300',
            icon: CheckCircle,
            shadowColor: 'rgba(57, 255, 20, 0.2)',
        },
        error: {
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/50',
            titleColor: 'text-red-400',
            messageColor: 'text-red-300',
            icon: AlertCircle,
            shadowColor: 'rgba(239, 68, 68, 0.2)',
        },
        info: {
            bgColor: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/50',
            titleColor: 'text-cyan-400',
            messageColor: 'text-cyan-300',
            icon: AlertCircle,
            shadowColor: 'rgba(0, 217, 255, 0.2)',
        },
    };

    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <div
            className={twMerge(
                'animate-slide-up rounded border p-4 backdrop-blur-sm flex gap-3 items-start font-mono',
                config.bgColor,
                config.borderColor
            )}
            style={{boxShadow: `0 0 20px ${config.shadowColor}, inset 0 0 20px ${config.shadowColor.replace('0.2', '0.05')}`}}
        >
            <Icon className={twMerge('w-5 h-5 flex-shrink-0 mt-0.5', config.titleColor)} />
            <div className="flex-1">
                <h3 className={twMerge('font-bold text-sm uppercase tracking-wide', config.titleColor)}>{title}</h3>
                <p className={twMerge('text-xs mt-1 font-mono', config.messageColor)}>{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 text-slate-600 hover:text-slate-400 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

interface ToastContainerProps {
    toasts: ToastMessage[];
    onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md pointer-events-auto">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast {...toast} onClose={onClose} />
                </div>
            ))}
        </div>
    );
};
