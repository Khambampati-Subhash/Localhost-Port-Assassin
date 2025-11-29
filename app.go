package main

import (
	"context"
	"localhost-port-assassin/pkg/config"
	"localhost-port-assassin/pkg/sys"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	go a.startWatcher()
}

func (a *App) startWatcher() {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// Keep track of previous state of watched ports
	// Map port -> PID (or 0 if free)
	lastState := make(map[int]int)

	for {
		select {
		case <-a.ctx.Done():
			return
		case <-ticker.C:
			cfg, err := config.LoadConfig()
			if err != nil || !cfg.NotificationsEnabled {
				continue
			}

			ports, err := sys.GetActivePorts()
			if err != nil {
				continue
			}

			currentMap := make(map[int]sys.PortInfo)
			for _, p := range ports {
				currentMap[p.Port] = p
			}

			for _, watchedPort := range cfg.WatchedPorts {
				pInfo, currentlyTaken := currentMap[watchedPort]
				lastPid, wasTaken := lastState[watchedPort]

				if currentlyTaken && !wasTaken {
					// Port just got taken
					runtime.EventsEmit(a.ctx, "port-taken", pInfo)
				} else if !currentlyTaken && wasTaken {
					// Port just got freed
					runtime.EventsEmit(a.ctx, "port-freed", map[string]interface{}{"port": watchedPort, "lastPid": lastPid})
				} else if currentlyTaken && wasTaken && pInfo.PID != lastPid {
					// Port changed hands (rare but possible)
					runtime.EventsEmit(a.ctx, "port-changed", pInfo)
				}

				if currentlyTaken {
					lastState[watchedPort] = pInfo.PID
				} else {
					delete(lastState, watchedPort)
				}
			}
		}
	}
}

// GetActivePorts returns all active ports
func (a *App) GetActivePorts() ([]sys.PortInfo, error) {
	return sys.GetActivePorts()
}

// KillProcess kills a process by PID
func (a *App) KillProcess(pid int) error {
	return sys.KillProcess(pid)
}

// KillProcessWithPassword kills a process by PID using sudo with password
func (a *App) KillProcessWithPassword(pid int, password string) error {
	return sys.KillProcessWithPassword(pid, password)
}

// GetConfig loads the user configuration
func (a *App) GetConfig() (*config.Config, error) {
	return config.LoadConfig()
}

// SaveConfig saves the user configuration
func (a *App) SaveConfig(cfg *config.Config) error {
	return config.SaveConfig(cfg)
}
