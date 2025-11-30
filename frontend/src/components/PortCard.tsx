import { Trash2, Terminal, Eye, EyeOff, Activity } from 'lucide-react';
import { PortInfo, usePortStore } from '../store/usePortStore';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface PortCardProps {
    port: number;
    info?: PortInfo; // If undefined, port is free
    isWatched: boolean;
}

export function PortCard({ port, info, isWatched }: PortCardProps) {
    const killProcess = usePortStore(state => state.killProcess);
    const removeWatchedPort = usePortStore(state => state.removeWatchedPort);

    const isFree = !info;

    return (
        <Card className={cn(
            "group relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4",
            isFree
                ? "border-l-green-500 hover:border-green-500/50"
                : "border-l-blue-500 hover:border-blue-500/50"
        )}>
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm transition-colors",
                            isFree
                                ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                        )}>
                            <Terminal size={18} />
                        </div>
                        <div>
                            <span className="block text-xl font-bold font-mono tracking-tight">{port}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isWatched && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-6 px-2 font-semibold">
                                <Eye size={10} className="mr-1.5" />
                                Watched
                            </Badge>
                        )}
                        {isWatched && isFree && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeWatchedPort(port)}
                                title="Stop watching"
                            >
                                <EyeOff size={14} className="text-muted-foreground hover:text-destructive" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 pt-3 space-y-4">
                {isFree ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wide">Available</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Ready for new processes</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span className="uppercase tracking-wider font-semibold">Process</span>
                                <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-[10px]">PID: {info.pid}</span>
                            </div>
                            <div className="font-medium text-sm truncate p-2 bg-secondary/30 rounded-md border border-border/50" title={info.process}>
                                {info.process}
                            </div>
                        </div>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full h-8 text-xs font-medium shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                            onClick={() => killProcess(info.pid)}
                        >
                            <Trash2 size={12} className="mr-2" />
                            Kill Process
                        </Button>
                    </>
                )}
            </CardContent>

            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:16px_16px] pointer-events-none" />
        </Card>
    );
}
