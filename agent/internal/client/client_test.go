package client

import (
	"errors"
	"os"
	"path/filepath"
	"relay-agent/internal/config"
	"relay-agent/internal/state"
	"testing"
	"time"
)

type fakeFirewall struct {
	rules   map[string]state.AppliedRule
	addErr  error
	adds    int
	removes int
}

func newFakeFirewall(initial ...state.AppliedRule) *fakeFirewall {
	f := &fakeFirewall{rules: make(map[string]state.AppliedRule)}
	for _, rule := range initial {
		f.rules[rule.ID] = rule
	}
	return f
}

func (f *fakeFirewall) AddRule(rule state.AppliedRule) error {
	if f.addErr != nil {
		return f.addErr
	}
	f.adds++
	f.rules[rule.ID] = rule
	return nil
}

func (f *fakeFirewall) RemoveRule(rule state.AppliedRule) error {
	f.removes++
	delete(f.rules, rule.ID)
	return nil
}

func (f *fakeFirewall) RuleExists(rule state.AppliedRule) (bool, error) {
	existing, ok := f.rules[rule.ID]
	return ok && existing == rule, nil
}

func (f *fakeFirewall) SavePersistent() error { return nil }

func TestBackoffExponentialGrowth(t *testing.T) {
	c := &Client{}

	c.attempt = 0
	d0 := c.backoff()

	c.attempt = 1
	d1 := c.backoff()

	c.attempt = 2
	d2 := c.backoff()

	if d1 <= d0 {
		t.Errorf("backoff should grow: attempt 0=%v, attempt 1=%v", d0, d1)
	}
	if d2 <= d1 {
		t.Errorf("backoff should grow: attempt 1=%v, attempt 2=%v", d1, d2)
	}
}

func TestBackoffCapsAt60Seconds(t *testing.T) {
	c := &Client{}
	c.attempt = 10

	d := c.backoff()
	max := 66 * time.Second // 60 + 10% jitter
	if d > max {
		t.Errorf("backoff at attempt 10 = %v, should be capped near 60s", d)
	}
}

func TestBackoffAttemptZeroIsOneSecond(t *testing.T) {
	c := &Client{}
	c.attempt = 0

	d := c.backoff()
	// 2^0 = 1 second + up to 10% jitter
	if d < 1*time.Second || d > 1100*time.Millisecond {
		t.Errorf("backoff at attempt 0 = %v, expected ~1s", d)
	}
}

func TestHelloMessageIncludesVersion(t *testing.T) {
	dir := t.TempDir()
	st, err := state.Load(dir + "/state.json")
	if err != nil {
		t.Fatal(err)
	}
	st.SetVersion(42)

	cfg := &config.Config{
		NodeID: "node-test",
		APIKey: "key-test",
	}

	c := New(cfg, "/dev/null", st, nil)

	hello := HelloMessage{
		Type:          TypeHello,
		NodeID:        c.cfg.NodeID,
		APIKey:        c.cfg.APIKey,
		ConfigVersion: c.state.GetVersion(),
	}

	if hello.ConfigVersion != 42 {
		t.Errorf("HelloMessage.ConfigVersion = %d, want 42", hello.ConfigVersion)
	}
	if hello.NodeID != "node-test" {
		t.Errorf("HelloMessage.NodeID = %q, want node-test", hello.NodeID)
	}
}

func TestAttemptResetsOnSuccess(t *testing.T) {
	c := &Client{}
	c.attempt = 5

	// Simulate what Run() does on successful connect
	c.attempt = 0

	d := c.backoff()
	if d > 2*time.Second {
		t.Errorf("after reset, backoff = %v, expected ~1s", d)
	}
}

func TestApplyEventFailureDoesNotAdvanceVersion(t *testing.T) {
	st, err := state.Load(filepath.Join(t.TempDir(), "state.json"))
	if err != nil {
		t.Fatal(err)
	}
	fw := newFakeFirewall()
	fw.addErr = errors.New("iptables unavailable")
	c := New(&config.Config{}, "/dev/null", st, fw)
	rule := state.AppliedRule{ID: "r1", SourcePort: 80, DestinationIP: "10.0.0.1", DestinationPort: 80, Protocol: "tcp"}

	err = c.applyEvent(SyncEvent{Version: 1, Action: "add", Rule: rule})
	if err == nil {
		t.Fatal("applyEvent succeeded, want failure")
	}
	if st.GetVersion() != 0 || len(st.GetAllRules()) != 0 {
		t.Fatalf("state advanced after failure: version=%d rules=%v", st.GetVersion(), st.GetAllRules())
	}

	fw.addErr = nil
	err = c.applyEvent(SyncEvent{Version: 2, Action: "add", Rule: rule})
	if err == nil {
		t.Fatal("out-of-order event succeeded, want version-gap failure")
	}
	if st.GetVersion() != 0 {
		t.Fatalf("version after gap = %d, want 0", st.GetVersion())
	}
}

func TestReconcileDesiredReplacesStaleGroupRules(t *testing.T) {
	statePath := filepath.Join(t.TempDir(), "state.json")
	st, err := state.Load(statePath)
	if err != nil {
		t.Fatal(err)
	}
	stale := state.AppliedRule{ID: "old", GroupID: "group-a", SourcePort: 80, DestinationIP: "10.0.0.1", DestinationPort: 80, Protocol: "tcp"}
	desired := state.AppliedRule{ID: "new", GroupID: "group-b", SourcePort: 443, DestinationIP: "10.0.0.2", DestinationPort: 443, Protocol: "tcp"}
	if err := st.Commit(3, []state.AppliedRule{stale}); err != nil {
		t.Fatal(err)
	}
	fw := newFakeFirewall(stale)
	c := New(&config.Config{}, "/dev/null", st, fw)

	if err := c.reconcileDesired([]state.AppliedRule{desired}, 7); err != nil {
		t.Fatal(err)
	}
	if st.GetVersion() != 7 || len(st.GetAllRules()) != 1 || st.GetAllRules()[0] != desired {
		t.Fatalf("unexpected reconciled state: version=%d rules=%v", st.GetVersion(), st.GetAllRules())
	}
	if _, exists := fw.rules[stale.ID]; exists {
		t.Fatal("stale firewall rule was not removed")
	}
	if fw.rules[desired.ID] != desired {
		t.Fatal("desired firewall rule was not installed")
	}
}

func TestApplyEventRetriesAfterStatePersistenceFailureWithoutDuplicateRule(t *testing.T) {
	root := t.TempDir()
	statePath := filepath.Join(root, "missing", "state.json")
	st, err := state.Load(statePath)
	if err != nil {
		t.Fatal(err)
	}
	fw := newFakeFirewall()
	c := New(&config.Config{}, "/dev/null", st, fw)
	rule := state.AppliedRule{ID: "r1", SourcePort: 53, DestinationIP: "10.0.0.53", DestinationPort: 53, Protocol: "udp"}
	event := SyncEvent{Version: 1, Action: "add", Rule: rule}

	if err := c.applyEvent(event); err == nil {
		t.Fatal("applyEvent succeeded with missing state directory")
	}
	if st.GetVersion() != 0 {
		t.Fatalf("version after persistence failure = %d, want 0", st.GetVersion())
	}
	if fw.adds != 1 {
		t.Fatalf("firewall adds after first attempt = %d, want 1", fw.adds)
	}

	if err := os.Mkdir(filepath.Dir(statePath), 0700); err != nil {
		t.Fatal(err)
	}
	if err := c.applyEvent(event); err != nil {
		t.Fatalf("retry failed: %v", err)
	}
	if fw.adds != 1 {
		t.Fatalf("retry duplicated firewall rule: adds=%d", fw.adds)
	}
	if st.GetVersion() != 1 {
		t.Fatalf("version after retry = %d, want 1", st.GetVersion())
	}
}
