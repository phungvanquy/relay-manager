package iptables

import (
	"relay-agent/internal/state"
	"strings"
	"testing"
)

func TestProtocolList(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"tcp", []string{"tcp"}},
		{"udp", []string{"udp"}},
		{"both", []string{"tcp", "udp"}},
		{"TCP", []string{"tcp"}},
		{"", []string{"tcp", "udp"}},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := protocolList(tt.input)
			if len(result) != len(tt.expected) {
				t.Fatalf("protocolList(%q) = %v, want %v", tt.input, result, tt.expected)
			}
			for i, v := range result {
				if v != tt.expected[i] {
					t.Fatalf("protocolList(%q)[%d] = %q, want %q", tt.input, i, v, tt.expected[i])
				}
			}
		})
	}
}

var capturedCommands []string

func TestAddRuleGeneratesCorrectCommands(t *testing.T) {
	origRun := run
	run = func(name string, args ...string) error {
		capturedCommands = append(capturedCommands, name+" "+strings.Join(args, " "))
		return nil
	}
	defer func() { run = origRun }()

	capturedCommands = nil
	m := New()
	rule := state.AppliedRule{
		ID:              "r1",
		Name:            "test",
		SourcePort:      8080,
		DestinationIP:   "10.0.0.1",
		DestinationPort: 80,
		Protocol:        "tcp",
	}

	err := m.AddRule(rule)
	if err != nil {
		t.Fatalf("AddRule failed: %v", err)
	}

	if len(capturedCommands) != 2 {
		t.Fatalf("expected 2 commands, got %d: %v", len(capturedCommands), capturedCommands)
	}

	if !strings.Contains(capturedCommands[0], "-A PREROUTING") {
		t.Errorf("expected PREROUTING command, got: %s", capturedCommands[0])
	}
	if !strings.Contains(capturedCommands[0], "--dport 8080") {
		t.Errorf("expected --dport 8080, got: %s", capturedCommands[0])
	}
	if !strings.Contains(capturedCommands[0], "--to-destination 10.0.0.1:80") {
		t.Errorf("expected --to-destination 10.0.0.1:80, got: %s", capturedCommands[0])
	}

	if !strings.Contains(capturedCommands[1], "-A POSTROUTING") {
		t.Errorf("expected POSTROUTING command, got: %s", capturedCommands[1])
	}
	if !strings.Contains(capturedCommands[1], "MASQUERADE") {
		t.Errorf("expected MASQUERADE, got: %s", capturedCommands[1])
	}
}

func TestRemoveRuleGeneratesDeleteCommands(t *testing.T) {
	origRun := run
	run = func(name string, args ...string) error {
		capturedCommands = append(capturedCommands, name+" "+strings.Join(args, " "))
		return nil
	}
	defer func() { run = origRun }()

	capturedCommands = nil
	m := New()
	rule := state.AppliedRule{
		ID:              "r1",
		Name:            "test",
		SourcePort:      443,
		DestinationIP:   "192.168.1.1",
		DestinationPort: 8443,
		Protocol:        "tcp",
	}

	_ = m.RemoveRule(rule)

	if len(capturedCommands) != 2 {
		t.Fatalf("expected 2 commands, got %d: %v", len(capturedCommands), capturedCommands)
	}

	if !strings.Contains(capturedCommands[0], "-D PREROUTING") {
		t.Errorf("expected -D PREROUTING, got: %s", capturedCommands[0])
	}
	if !strings.Contains(capturedCommands[1], "-D POSTROUTING") {
		t.Errorf("expected -D POSTROUTING, got: %s", capturedCommands[1])
	}
}

func TestAddRuleBothProtocol(t *testing.T) {
	origRun := run
	run = func(name string, args ...string) error {
		capturedCommands = append(capturedCommands, name+" "+strings.Join(args, " "))
		return nil
	}
	defer func() { run = origRun }()

	capturedCommands = nil
	m := New()
	rule := state.AppliedRule{
		ID:              "r1",
		Name:            "test",
		SourcePort:      53,
		DestinationIP:   "10.0.0.53",
		DestinationPort: 53,
		Protocol:        "both",
	}

	err := m.AddRule(rule)
	if err != nil {
		t.Fatalf("AddRule failed: %v", err)
	}

	// both = tcp + udp, each needs DNAT + MASQUERADE = 4 commands
	if len(capturedCommands) != 4 {
		t.Fatalf("expected 4 commands for 'both', got %d: %v", len(capturedCommands), capturedCommands)
	}

	if !strings.Contains(capturedCommands[0], "-p tcp") {
		t.Errorf("first command should be tcp, got: %s", capturedCommands[0])
	}
	if !strings.Contains(capturedCommands[2], "-p udp") {
		t.Errorf("third command should be udp, got: %s", capturedCommands[2])
	}
}
