package iptables

import (
	"errors"
	"relay-agent/internal/state"
	"strings"
	"testing"
)

func TestProtocolList(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
		wantErr  bool
	}{
		{"tcp", []string{"tcp"}, false},
		{"udp", []string{"udp"}, false},
		{"both", []string{"tcp", "udp"}, false},
		{"TCP", []string{"tcp"}, false},
		{"", nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result, err := protocolList(tt.input)
			if (err != nil) != tt.wantErr {
				t.Fatalf("protocolList(%q) error = %v, wantErr=%v", tt.input, err, tt.wantErr)
			}
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
	origCheckRule := checkRule
	run = func(name string, args ...string) error {
		capturedCommands = append(capturedCommands, name+" "+strings.Join(args, " "))
		return nil
	}
	checkRule = func(_ string, _ ...string) (bool, error) { return false, nil }
	defer func() {
		run = origRun
		checkRule = origCheckRule
	}()

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
	origCheckRule := checkRule
	run = func(name string, args ...string) error {
		capturedCommands = append(capturedCommands, name+" "+strings.Join(args, " "))
		return nil
	}
	checkRule = func(_ string, _ ...string) (bool, error) { return true, nil }
	defer func() {
		run = origRun
		checkRule = origCheckRule
	}()

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

func TestRemoveRulePropagatesDeleteFailure(t *testing.T) {
	origRun := run
	origCheckRule := checkRule
	checkRule = func(_ string, _ ...string) (bool, error) { return true, nil }
	run = func(_ string, _ ...string) error { return errors.New("delete failed") }
	defer func() {
		run = origRun
		checkRule = origCheckRule
	}()

	err := New().RemoveRule(state.AppliedRule{
		SourcePort: 443, DestinationIP: "192.168.1.1", DestinationPort: 8443, Protocol: "tcp",
	})
	if err == nil || !strings.Contains(err.Error(), "delete failed") {
		t.Fatalf("RemoveRule error = %v, want delete failure", err)
	}
}

func TestRuleExistsChecksDNATAndMasquerade(t *testing.T) {
	origCheckRule := checkRule
	var checks []string
	checkRule = func(name string, args ...string) (bool, error) {
		checks = append(checks, name+" "+strings.Join(args, " "))
		return true, nil
	}
	defer func() { checkRule = origCheckRule }()

	exists, err := New().RuleExists(state.AppliedRule{
		SourcePort: 443, DestinationIP: "192.168.1.1", DestinationPort: 8443, Protocol: "tcp",
	})
	if err != nil || !exists {
		t.Fatalf("RuleExists = %v, %v; want true, nil", exists, err)
	}
	if len(checks) != 2 || !strings.Contains(checks[0], "PREROUTING") || !strings.Contains(checks[1], "POSTROUTING") {
		t.Fatalf("RuleExists checks = %v, want DNAT and MASQUERADE", checks)
	}
}

func TestAddRuleBothProtocol(t *testing.T) {
	origRun := run
	origCheckRule := checkRule
	run = func(name string, args ...string) error {
		capturedCommands = append(capturedCommands, name+" "+strings.Join(args, " "))
		return nil
	}
	checkRule = func(_ string, _ ...string) (bool, error) { return false, nil }
	defer func() {
		run = origRun
		checkRule = origCheckRule
	}()

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
