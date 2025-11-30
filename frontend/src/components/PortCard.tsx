import { Trash2, Terminal, Eye, EyeOff } from 'lucide-react';
import { PortInfo, usePortStore } from '../store/usePortStore';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

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
            "group transition-all duration-200",
            isFree
                ? "bg-card hover:border-green-500/40"
                : "bg-secondary/10 hover:border-blue-500/40"
        )}>
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center border",
                            isFree
                                ? "bg-green-500/10 border-green-500/20 text-green-500"
                                : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                        )}>
                            <Terminal size={14} />
                        </div>
                        <div>
                            <span className="block text-lg font-mono font-medium">{port}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isWatched && (
                            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5 px-1.5">
                                <Eye size={10} className="mr-1" />
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

            <CardContent className="p-4 pt-2 space-y-3">
                {isFree ? (
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-green-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-xs font-medium">Available</span>
                        </div>
                        <p className="text-xs text-muted-foreground">No process running</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Process</span>
                                <span className="font-mono">PID: {info.pid}</span>
                            </div>
                            <div className="font-medium text-sm truncate" title={info.process}>
                                {info.process}
                            </div>
                        </div>

                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => killProcess(info.pid)}
                        >
                            <Trash2 size={12} className="mr-2" />
                            Kill Process
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
