package client

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"relay-agent/internal/config"
	"relay-agent/internal/state"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	maxBackoffSeconds = 60
	handshakeTimeout  = 10 * time.Second
	heartbeatInterval = 30 * time.Second
	serverReadTimeout = 90 * time.Second
	writeTimeout      = 10 * time.Second
)

type Client struct {
	cfg     *config.Config
	cfgPath string
	state   *state.State
	ipt     firewall
	conn    *websocket.Conn
	writeMu sync.Mutex
	attempt int
}

type firewall interface {
	AddRule(state.AppliedRule) error
	RemoveRule(state.AppliedRule) error
	RuleExists(state.AppliedRule) (bool, error)
	SavePersistent() error
}

func New(cfg *config.Config, cfgPath string, st *state.State, ipt firewall) *Client {
	return &Client{
		cfg:     cfg,
		cfgPath: cfgPath,
		state:   st,
		ipt:     ipt,
	}
}

func (c *Client) Run(ctx context.Context) {
	for {
		err := c.connect(ctx)
		if err != nil {
			c.attempt++
			wait := c.backoff()
			log.Printf("Connection failed: %v. Retrying in %v", err, wait)
			select {
			case <-time.After(wait):
			case <-ctx.Done():
				return
			}
		} else {
			c.attempt = 0
		}
	}
}

func (c *Client) connect(ctx context.Context) error {
	header := http.Header{}
	dialer := websocket.Dialer{
		HandshakeTimeout: handshakeTimeout,
	}

	conn, _, err := dialer.DialContext(ctx, c.cfg.DashboardURL, header)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	c.conn = conn
	defer conn.Close()
	if err := conn.SetReadDeadline(time.Now().Add(handshakeTimeout)); err != nil {
		return fmt.Errorf("set handshake deadline: %w", err)
	}

	if c.cfg.IsBootstrap() {
		return c.handleBootstrap()
	}

	return c.handleNormalConnection(ctx)
}

func (c *Client) handleBootstrap() error {
	msg := BootstrapMessage{
		Type:  TypeBootstrap,
		Token: c.cfg.BootstrapToken,
	}
	if err := c.conn.WriteJSON(msg); err != nil {
		return fmt.Errorf("send bootstrap: %w", err)
	}

	var ack BootstrapAckMessage
	if err := c.conn.ReadJSON(&ack); err != nil {
		return fmt.Errorf("read bootstrap ack: %w", err)
	}

	if ack.Type != TypeBootstrapAck {
		return fmt.Errorf("unexpected message type: %s", ack.Type)
	}

	c.cfg.APIKey = ack.APIKey
	c.cfg.NodeID = ack.NodeID
	c.cfg.BootstrapToken = ""
	if err := c.cfg.Save(c.cfgPath); err != nil {
		return fmt.Errorf("save config: %w", err)
	}

	log.Printf("Bootstrap complete. Node ID: %s", ack.NodeID)
	return nil
}

func (c *Client) handleNormalConnection(ctx context.Context) error {
	hello := HelloMessage{
		Type:          TypeHello,
		NodeID:        c.cfg.NodeID,
		APIKey:        c.cfg.APIKey,
		ConfigVersion: c.state.GetVersion(),
	}
	if err := c.conn.WriteJSON(hello); err != nil {
		return fmt.Errorf("send hello: %w", err)
	}

	ack, bufferedEvents, err := c.readHelloAck()
	if err != nil {
		return err
	}

	if ack.DesiredRules != nil {
		if err := c.reconcileDesired(*ack.DesiredRules, ack.ConfigVersion); err != nil {
			_ = c.sendApplyResult(ack.ConfigVersion, err)
			return fmt.Errorf("reconcile desired state: %w", err)
		}
		if err := c.sendApplyResult(ack.ConfigVersion, nil); err != nil {
			return fmt.Errorf("acknowledge desired state: %w", err)
		}
	} else if len(ack.CatchUpEvents) > 0 {
		log.Printf("Catching up: %d events", len(ack.CatchUpEvents))
		for _, event := range ack.CatchUpEvents {
			if err := c.applyEvent(event); err != nil {
				return fmt.Errorf("apply catch-up event v%d: %w", event.Version, err)
			}
		}
	}
	for _, event := range bufferedEvents {
		if err := c.applyEvent(event); err != nil {
			return fmt.Errorf("apply event buffered during handshake v%d: %w", event.Version, err)
		}
	}

	log.Printf("Connected. Version: %d", c.state.GetVersion())
	if err := c.conn.SetReadDeadline(time.Now().Add(serverReadTimeout)); err != nil {
		return fmt.Errorf("set server read deadline: %w", err)
	}

	heartbeatTicker := time.NewTicker(heartbeatInterval)
	defer heartbeatTicker.Stop()

	done := make(chan error, 1)
	go func() {
		for {
			_, message, err := c.conn.ReadMessage()
			if err != nil {
				done <- err
				return
			}
			if err := c.conn.SetReadDeadline(time.Now().Add(serverReadTimeout)); err != nil {
				done <- err
				return
			}

			var generic GenericMessage
			if err := json.Unmarshal(message, &generic); err != nil {
				continue
			}

			switch generic.Type {
			case TypeSyncEvent:
				var event SyncEvent
				if err := json.Unmarshal(message, &event); err != nil {
					log.Printf("Failed to parse sync event: %v", err)
					continue
				}
				if err := c.applyEvent(event); err != nil {
					done <- fmt.Errorf("apply sync event v%d: %w", event.Version, err)
					return
				}
			case TypeHeartbeatAck:
				// OK
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			c.writeClose()
			return nil
		case err := <-done:
			return fmt.Errorf("read: %w", err)
		case <-heartbeatTicker.C:
			hb := HeartbeatMessage{
				Type:          TypeHeartbeat,
				NodeID:        c.cfg.NodeID,
				ConfigVersion: c.state.GetVersion(),
				Timestamp:     time.Now().UnixMilli(),
			}
			if err := c.writeJSON(hb); err != nil {
				return fmt.Errorf("send heartbeat: %w", err)
			}
		}
	}
}

func (c *Client) readHelloAck() (HelloAckMessage, []SyncEvent, error) {
	var bufferedEvents []SyncEvent
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			return HelloAckMessage{}, nil, fmt.Errorf("read hello ack: %w", err)
		}

		var generic GenericMessage
		if err := json.Unmarshal(message, &generic); err != nil {
			return HelloAckMessage{}, nil, fmt.Errorf("parse handshake message: %w", err)
		}

		switch generic.Type {
		case TypeHelloAck:
			var ack HelloAckMessage
			if err := json.Unmarshal(message, &ack); err != nil {
				return HelloAckMessage{}, nil, fmt.Errorf("parse hello ack: %w", err)
			}
			return ack, bufferedEvents, nil
		case TypeSyncEvent:
			var event SyncEvent
			if err := json.Unmarshal(message, &event); err != nil {
				return HelloAckMessage{}, nil, fmt.Errorf("parse buffered sync event: %w", err)
			}
			bufferedEvents = append(bufferedEvents, event)
		default:
			return HelloAckMessage{}, nil, fmt.Errorf("unexpected handshake message type %q", generic.Type)
		}
	}
}

func (c *Client) applyEvent(event SyncEvent) error {
	currentVersion := c.state.GetVersion()
	if event.Version <= currentVersion {
		return c.sendApplyResult(event.Version, nil)
	}
	if event.Version != currentVersion+1 {
		err := fmt.Errorf("version gap: current=%d received=%d", currentVersion, event.Version)
		_ = c.sendApplyResult(event.Version, err)
		return err
	}

	rules := c.state.GetAllRules()
	index := findRuleIndex(rules, event.Rule.ID)
	var err error

	switch event.Action {
	case "add":
		if index >= 0 && rules[index] != event.Rule {
			err = fmt.Errorf("add event conflicts with existing rule %s", event.Rule.ID)
			break
		}
		err = c.ensureRule(event.Rule)
		if err == nil && index < 0 {
			rules = append(rules, event.Rule)
		}

	case "remove":
		if index >= 0 {
			err = c.ipt.RemoveRule(rules[index])
			if err == nil {
				rules = append(rules[:index], rules[index+1:]...)
			}
		}

	case "update":
		if index >= 0 && rules[index] != event.Rule {
			existing := rules[index]
			err = c.ipt.RemoveRule(existing)
			if err == nil {
				err = c.ensureRule(event.Rule)
			}
			if err != nil {
				_ = c.ipt.AddRule(existing)
			} else {
				rules[index] = event.Rule
			}
		} else {
			err = c.ensureRule(event.Rule)
			if err == nil && index < 0 {
				rules = append(rules, event.Rule)
			}
		}

	default:
		err = fmt.Errorf("unsupported action %q", event.Action)
	}

	if err == nil {
		err = c.state.Commit(event.Version, rules)
	}
	if err != nil {
		log.Printf("Failed to apply event v%d (%s): %v", event.Version, event.Action, err)
	} else {
		log.Printf("Applied event v%d: %s rule %s (port %d)", event.Version, event.Action, event.Rule.Name, event.Rule.SourcePort)
		c.saveFirewallSnapshot()
	}

	if sendErr := c.sendApplyResult(event.Version, err); sendErr != nil && err == nil {
		err = sendErr
	}
	return err
}

func (c *Client) reconcileDesired(desired []state.AppliedRule, version int) error {
	current := c.state.GetAllRules()
	desiredByID := make(map[string]state.AppliedRule, len(desired))
	for _, rule := range desired {
		if rule.ID == "" {
			return fmt.Errorf("desired rule has empty id")
		}
		if _, exists := desiredByID[rule.ID]; exists {
			return fmt.Errorf("duplicate desired rule id %s", rule.ID)
		}
		desiredByID[rule.ID] = rule
	}

	for _, existing := range current {
		desiredRule, exists := desiredByID[existing.ID]
		if exists && desiredRule == existing {
			continue
		}
		if err := c.ipt.RemoveRule(existing); err != nil {
			return fmt.Errorf("remove stale rule %s: %w", existing.ID, err)
		}
	}

	for _, rule := range desired {
		if err := c.ensureRule(rule); err != nil {
			return fmt.Errorf("ensure desired rule %s: %w", rule.ID, err)
		}
	}

	if err := c.state.Commit(version, desired); err != nil {
		return fmt.Errorf("persist desired state: %w", err)
	}
	c.saveFirewallSnapshot()
	return nil
}

func (c *Client) ensureRule(rule state.AppliedRule) error {
	exists, err := c.ipt.RuleExists(rule)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	return c.ipt.AddRule(rule)
}

func (c *Client) saveFirewallSnapshot() {
	if err := c.ipt.SavePersistent(); err != nil {
		log.Printf("Warning: failed to save persistent firewall state: %v", err)
	}
}

func (c *Client) sendApplyResult(version int, applyErr error) error {
	result := ApplyResultMessage{
		Type:    TypeApplyResult,
		Version: version,
		Success: applyErr == nil,
	}
	if applyErr != nil {
		result.Error = applyErr.Error()
	}
	if c.conn == nil {
		return nil
	}
	return c.writeJSON(result)
}

func findRuleIndex(rules []state.AppliedRule, id string) int {
	for i := range rules {
		if rules[i].ID == id {
			return i
		}
	}
	return -1
}

func (c *Client) writeJSON(v any) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if err := c.conn.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
		return err
	}
	return c.conn.WriteJSON(v)
}

func (c *Client) writeClose() error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if err := c.conn.SetWriteDeadline(time.Now().Add(writeTimeout)); err != nil {
		return err
	}
	return c.conn.WriteMessage(websocket.CloseMessage,
		websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
}

func (c *Client) backoff() time.Duration {
	base := math.Pow(2, float64(c.attempt))
	if base > maxBackoffSeconds {
		base = maxBackoffSeconds
	}
	jitter := rand.Float64() * base * 0.1
	return time.Duration(base+jitter) * time.Second
}
