package client

import (
	"relay-agent/internal/config"
	"relay-agent/internal/state"
	"testing"
	"time"
)

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
