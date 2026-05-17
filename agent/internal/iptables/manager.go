package iptables

import (
	"fmt"
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
	protocols := protocolList(rule.Protocol)
	for _, proto := range protocols {
		if err := m.addDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort); err != nil {
			return fmt.Errorf("add DNAT %s: %w", proto, err)
		}
		if err := m.addMASQUERADE(proto, rule.DestinationIP, rule.DestinationPort); err != nil {
			return fmt.Errorf("add MASQUERADE %s: %w", proto, err)
		}
	}
	return nil
}

func (m *Manager) RemoveRule(rule state.AppliedRule) error {
	protocols := protocolList(rule.Protocol)
	for _, proto := range protocols {
		m.removeDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort)
		m.removeMASQUERADE(proto, rule.DestinationIP, rule.DestinationPort)
	}
	return nil
}

func (m *Manager) RuleExists(rule state.AppliedRule) bool {
	protocols := protocolList(rule.Protocol)
	for _, proto := range protocols {
		if !m.checkDNAT(proto, rule.SourcePort, rule.DestinationIP, rule.DestinationPort) {
			return false
		}
	}
	return true
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

func (m *Manager) removeDNAT(proto string, srcPort int, dstIP string, dstPort int) {
	run("iptables", "-t", "nat", "-D", "PREROUTING",
		"-p", proto, "--dport", fmt.Sprintf("%d", srcPort),
		"-j", "DNAT", "--to-destination", fmt.Sprintf("%s:%d", dstIP, dstPort))
}

func (m *Manager) removeMASQUERADE(proto string, dstIP string, dstPort int) {
	run("iptables", "-t", "nat", "-D", "POSTROUTING",
		"-p", proto, "-d", dstIP, "--dport", fmt.Sprintf("%d", dstPort),
		"-j", "MASQUERADE")
}

func (m *Manager) checkDNAT(proto string, srcPort int, dstIP string, dstPort int) bool {
	err := run("iptables", "-t", "nat", "-C", "PREROUTING",
		"-p", proto, "--dport", fmt.Sprintf("%d", srcPort),
		"-j", "DNAT", "--to-destination", fmt.Sprintf("%s:%d", dstIP, dstPort))
	return err == nil
}

func protocolList(protocol string) []string {
	switch strings.ToLower(protocol) {
	case "tcp":
		return []string{"tcp"}
	case "udp":
		return []string{"udp"}
	default:
		return []string{"tcp", "udp"}
	}
}

func run(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s %s: %s", name, strings.Join(args, " "), strings.TrimSpace(string(out)))
	}
	return nil
}

func writeFile(path string, data []byte) error {
	return os.WriteFile(path, data, 0644)
}
