package sys

import (
	"bytes"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// PortInfo represents a process listening on a port
type PortInfo struct {
	Port    int    `json:"port"`
	PID     int    `json:"pid"`
	Process string `json:"process"`
}

// GetActivePorts returns a list of processes listening on TCP ports
func GetActivePorts() ([]PortInfo, error) {
	// lsof -iTCP -sTCP:LISTEN -P -n -F pcn
	// -F pcn: Output PID (p), Command (c), Name (n)
	cmd := exec.Command("lsof", "-iTCP", "-sTCP:LISTEN", "-P", "-n", "-F", "pcn")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
			return []PortInfo{}, nil
		}
		return nil, err
	}

	lines := strings.Split(out.String(), "\n")
	var ports []PortInfo

	var currentPID int
	var currentCmd string

	for _, line := range lines {
		if len(line) == 0 {
			continue
		}

		prefix := line[0]
		content := line[1:]

		switch prefix {
		case 'p':
			pid, err := strconv.Atoi(content)
			if err == nil {
				currentPID = pid
			}
		case 'c':
			currentCmd = content
		case 'n':
			// n*:3000 or n127.0.0.1:8080
			// We only care if we have a valid PID and Cmd
			if currentPID == 0 {
				continue
			}

			// Parse port
			if strings.Contains(content, ":") {
				parts := strings.Split(content, ":")
				portStr := parts[len(parts)-1]
				port, err := strconv.Atoi(portStr)
				if err == nil {
					ports = append(ports, PortInfo{
						Port:    port,
						PID:     currentPID,
						Process: currentCmd,
					})
				}
			}
		}
	}

	return ports, nil
}

// KillProcess attempts to kill a process by PID
func KillProcess(pid int) error {
	cmd := exec.Command("kill", "-9", strconv.Itoa(pid))
	return cmd.Run()
}

// KillProcessWithPassword attempts to kill a process using sudo with password
func KillProcessWithPassword(pid int, password string) error {
	// Use echo to pass password to sudo via stdin
	cmdStr := fmt.Sprintf("kill -9 %d", pid)
	cmd := exec.Command("bash", "-c", fmt.Sprintf("echo '%s' | sudo -S %s", escapeShellString(password), cmdStr))

	var out bytes.Buffer
	var errOut bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &errOut

	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to kill process with sudo: %v, stderr: %s", err, errOut.String())
	}
	return nil
}

// escapeShellString escapes a string for use in shell commands
func escapeShellString(s string) string {
	// Escape single quotes by replacing ' with '\''
	return "'" + strings.ReplaceAll(s, "'", "'\\''") + "'"
}
