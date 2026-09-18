package iptables

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"relay-agent/internal/state"
	"strings"
)

type Manager struct{}

func New() *Manager {
	return &Manager{}
}

func (m *Manager) AddRule(rule state.AppliedRule) error {
	protocols, err := validateRule(rule)
	if err != nil {
		return err
	}
	var added []addedComponents
	for _, proto := range protocols {
		components := addedComponents{protocol: proto}
		dnatExists, err := m.checkDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort)
		if err != nil {
			m.rollbackAdded(added, rule)
			return fmt.Errorf("check DNAT %s: %w", proto, err)
		}
		if !dnatExists {
			if err := m.addDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort); err != nil {
				m.rollbackAdded(added, rule)
				return fmt.Errorf("add DNAT %s: %w", proto, err)
			}
			components.dnat = true
		}

		masqueradeExists, err := m.checkMASQUERADE(proto, rule.DestinationIP, rule.DestinationPort)
		if err != nil {
			m.rollbackAdded(append(added, components), rule)
			return fmt.Errorf("check MASQUERADE %s: %w", proto, err)
		}
		// A new DNAT rule gets its own MASQUERADE entry even when another
		// forwarding rule shares the same destination. Removal can then delete
		// one matching entry without breaking the other rule.
		if !dnatExists || !masqueradeExists {
			if err := m.addMASQUERADE(proto, rule.DestinationIP, rule.DestinationPort); err != nil {
				m.rollbackAdded(append(added, components), rule)
				return fmt.Errorf("add MASQUERADE %s: %w", proto, err)
			}
			components.masquerade = true
		}
		added = append(added, components)
	}
	return nil
}

type addedComponents struct {
	protocol   string
	dnat       bool
	masquerade bool
}

func (m *Manager) rollbackAdded(components []addedComponents, rule state.AppliedRule) {
	for _, component := range components {
		if component.dnat {
			_ = m.removeDNAT(component.protocol, rule.SourcePort, rule.DestinationIP, rule.DestinationPort)
		}
		if component.masquerade {
			_ = m.removeMASQUERADE(component.protocol, rule.DestinationIP, rule.DestinationPort)
		}
	}
}

func (m *Manager) RemoveRule(rule state.AppliedRule) error {
	protocols, err := validateRule(rule)
	if err != nil {
		return err
	}
	for _, proto := range protocols {
		if err := m.removeDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort); err != nil {
			return fmt.Errorf("remove DNAT %s: %w", proto, err)
		}
		if err := m.removeMASQUERADE(proto, rule.DestinationIP, rule.DestinationPort); err != nil {
			return fmt.Errorf("remove MASQUERADE %s: %w", proto, err)
		}
	}
	return nil
}

func (m *Manager) RuleExists(rule state.AppliedRule) (bool, error) {
	protocols, err := validateRule(rule)
	if err != nil {
		return false, err
	}
	for _, proto := range protocols {
		dnatExists, err := m.checkDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort)
		if err != nil {
			return false, fmt.Errorf("check DNAT %s: %w", proto, err)
		}
		masqueradeExists, err := m.checkMASQUERADE(proto, rule.DestinationIP, rule.DestinationPort)
		if err != nil {
			return false, fmt.Errorf("check MASQUERADE %s: %w", proto, err)
		}
		if !dnatExists || !masqueradeExists {
			return false, nil
		}
	}
	return true, nil
}

func (m *Manager) EnsureIPForward() error {
	return exec.Command("sysctl", "-w", "net.ipv4.ip_forward=1").Run()
}

func (m *Manager) SavePersistent() error {
	if path, err := exec.LookPath("netfilter-persistent"); err == nil {
		return exec.Command(path, "save").Run()
	}
	cmd := exec.Command("iptables-save")
	out, err := cmd.Output()
	if err != nil {
		return err
	}
	if err := os.MkdirAll("/etc/iptables", 0755); err != nil {
		return err
	}
	return writeFile("/etc/iptables/rules.v4", out)
}

func (m *Manager) addDNAT(proto string, srcPort int, dstIP string, dstPort int) error {
	return run("iptables", "-t", "nat", "-A", "PREROUTING",
		"-p", proto, "--dport", fmt.Sprintf("%d", srcPort),
		"-j", "DNAT", "--to-destination", fmt.Sprintf("%s:%d", dstIP, dstPort))
}

func (m *Manager) addMASQUERADE(proto string, dstIP string, dstPort int) error {
	return run("iptables", "-t", "nat", "-A", "POSTROUTING",
		"-p", proto, "-d", dstIP, "--dport", fmt.Sprintf("%d", dstPort),
		"-j", "MASQUERADE")
}

func (m *Manager) removeDNAT(proto string, srcPort int, dstIP string, dstPort int) error {
	exists, err := m.checkDNAT(proto, srcPort, dstIP, dstPort)
	if err != nil || !exists {
		return err
	}
	return run("iptables", "-t", "nat", "-D", "PREROUTING",
		"-p", proto, "--dport", fmt.Sprintf("%d", srcPort),
		"-j", "DNAT", "--to-destination", fmt.Sprintf("%s:%d", dstIP, dstPort))
}

func (m *Manager) removeMASQUERADE(proto string, dstIP string, dstPort int) error {
	exists, err := m.checkMASQUERADE(proto, dstIP, dstPort)
	if err != nil || !exists {
		return err
	}
	return run("iptables", "-t", "nat", "-D", "POSTROUTING",
		"-p", proto, "-d", dstIP, "--dport", fmt.Sprintf("%d", dstPort),
		"-j", "MASQUERADE")
}

func (m *Manager) checkDNAT(proto string, srcPort int, dstIP string, dstPort int) (bool, error) {
	return checkRule("iptables", "-t", "nat", "-C", "PREROUTING",
		"-p", proto, "--dport", fmt.Sprintf("%d", srcPort),
		"-j", "DNAT", "--to-destination", fmt.Sprintf("%s:%d", dstIP, dstPort))
}

func (m *Manager) checkMASQUERADE(proto string, dstIP string, dstPort int) (bool, error) {
	return checkRule("iptables", "-t", "nat", "-C", "POSTROUTING",
		"-p", proto, "-d", dstIP, "--dport", fmt.Sprintf("%d", dstPort),
		"-j", "MASQUERADE")
}

func validateRule(rule state.AppliedRule) ([]string, error) {
	if rule.SourcePort < 1 || rule.SourcePort > 65535 {
		return nil, fmt.Errorf("source port must be between 1 and 65535")
	}
	if rule.DestinationPort < 1 || rule.DestinationPort > 65535 {
		return nil, fmt.Errorf("destination port must be between 1 and 65535")
	}
	if ip := net.ParseIP(rule.DestinationIP); ip == nil || ip.To4() == nil {
		return nil, fmt.Errorf("destination IP must be a valid IPv4 address")
	}
	return protocolList(rule.Protocol)
}

func protocolList(protocol string) ([]string, error) {
	switch strings.ToLower(protocol) {
	case "tcp":
		return []string{"tcp"}, nil
	case "udp":
		return []string{"udp"}, nil
	case "both":
		return []string{"tcp", "udp"}, nil
	default:
		return nil, fmt.Errorf("unsupported protocol %q", protocol)
	}
}

var run = func(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s %s: %s", name, strings.Join(args, " "), strings.TrimSpace(string(out)))
	}
	return nil
}

var checkRule = func(name string, args ...string) (bool, error) {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err == nil {
		return true, nil
	}
	if exitErr, ok := err.(*exec.ExitError); ok && exitErr.ExitCode() == 1 {
		return false, nil
	}
	return false, fmt.Errorf("%s %s: %s", name, strings.Join(args, " "), strings.TrimSpace(string(out)))
}

func writeFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0644)
}
