package sys

import (
	"testing"
)

func TestGetActivePorts(t *testing.T) {
	ports, err := GetActivePorts()
	if err != nil {
		t.Fatalf("GetActivePorts failed: %v", err)
	}
	t.Logf("Found %d active ports", len(ports))
	for _, p := range ports {
		t.Logf("Port: %d, PID: %d, Process: %s", p.Port, p.PID, p.Process)
	}
}
