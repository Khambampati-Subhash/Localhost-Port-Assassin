import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

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
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            titleColor: 'text-emerald-900',
            messageColor: 'text-emerald-700',
            icon: CheckCircle2,
            iconColor: 'text-emerald-600',
        },
        error: {
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            titleColor: 'text-red-900',
            messageColor: 'text-red-700',
            icon: AlertCircle,
            iconColor: 'text-red-600',
        },
        info: {
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            titleColor: 'text-blue-900',
            messageColor: 'text-blue-700',
            icon: Info,
            iconColor: 'text-blue-600',
        },
    };

    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <div
            className={`animate-slide-up rounded-xl border-2 p-4 shadow-lg flex gap-4 items-start ${config.bgColor} ${config.borderColor}`}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
            <div className="flex-1">
                <h3 className={`font-bold text-sm ${config.titleColor}`}>{title}</h3>
                <p className={`text-sm mt-1 ${config.messageColor}`}>{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X size={18} />
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
