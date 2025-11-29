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
            bgColor: 'bg-emerald-500/20',
            borderColor: 'border-emerald-500/30',
            titleColor: 'text-emerald-400',
            messageColor: 'text-emerald-300',
            icon: CheckCircle,
        },
        error: {
            bgColor: 'bg-red-500/20',
            borderColor: 'border-red-500/30',
            titleColor: 'text-red-400',
            messageColor: 'text-red-300',
            icon: AlertCircle,
        },
        info: {
            bgColor: 'bg-blue-500/20',
            borderColor: 'border-blue-500/30',
            titleColor: 'text-blue-400',
            messageColor: 'text-blue-300',
            icon: AlertCircle,
        },
    };

    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <div
            className={twMerge(
                'animate-slide-up rounded-lg border p-4 backdrop-blur-sm flex gap-3 items-start',
                config.bgColor,
                config.borderColor
            )}
        >
            <Icon className={twMerge('w-5 h-5 flex-shrink-0 mt-0.5', config.titleColor)} />
            <div className="flex-1">
                <h3 className={twMerge('font-semibold text-sm', config.titleColor)}>{title}</h3>
                <p className={twMerge('text-xs mt-1', config.messageColor)}>{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 text-secondary hover:text-primary transition-colors"
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
