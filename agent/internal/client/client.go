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
	"relay-agent/internal/iptables"
	"relay-agent/internal/state"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	cfg        *config.Config
	cfgPath    string
	state      *state.State
	ipt        *iptables.Manager
	conn       *websocket.Conn
	attempt    int
}

func New(cfg *config.Config, cfgPath string, st *state.State, ipt *iptables.Manager) *Client {
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
		HandshakeTimeout: 10 * time.Second,
	}

	conn, _, err := dialer.DialContext(ctx, c.cfg.DashboardURL, header)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	c.conn = conn
	defer conn.Close()

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

	var ack HelloAckMessage
	if err := c.conn.ReadJSON(&ack); err != nil {
		return fmt.Errorf("read hello ack: %w", err)
	}

	if len(ack.CatchUpEvents) > 0 {
		log.Printf("Catching up: %d events", len(ack.CatchUpEvents))
		for _, event := range ack.CatchUpEvents {
			c.applyEvent(event)
		}
	}

	log.Printf("Connected. Version: %d", c.state.GetVersion())

	heartbeatTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()

	done := make(chan error, 1)
	go func() {
		for {
			_, message, err := c.conn.ReadMessage()
			if err != nil {
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
				c.applyEvent(event)
			case TypeHeartbeatAck:
				// OK
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			c.conn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
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
			if err := c.conn.WriteJSON(hb); err != nil {
				return fmt.Errorf("send heartbeat: %w", err)
			}
		}
	}
}

func (c *Client) applyEvent(event SyncEvent) {
	var err error

	switch event.Action {
	case "add":
		err = c.ipt.AddRule(event.Rule)
		if err == nil {
			c.state.AddRule(event.Rule)
		}

	case "remove":
		existing := c.state.FindByID(event.Rule.ID)
		if existing != nil {
			err = c.ipt.RemoveRule(*existing)
			if err == nil {
				c.state.RemoveByID(event.Rule.ID)
			}
		}

	case "update":
		existing := c.state.FindByID(event.Rule.ID)
		if existing != nil {
			c.ipt.RemoveRule(*existing)
		}
		err = c.ipt.AddRule(event.Rule)
		if err == nil {
			c.state.UpdateRule(event.Rule)
		}
	}

	result := ApplyResultMessage{
		Type:    TypeApplyResult,
		Version: event.Version,
		Success: err == nil,
	}
	if err != nil {
		result.Error = err.Error()
		log.Printf("Failed to apply event v%d (%s): %v", event.Version, event.Action, err)
	} else {
		log.Printf("Applied event v%d: %s rule %s (port %d)", event.Version, event.Action, event.Rule.Name, event.Rule.SourcePort)
	}

	c.state.SetVersion(event.Version)
	c.state.Save()
	c.ipt.SavePersistent()

	if c.conn != nil {
		c.conn.WriteJSON(result)
	}
}

func (c *Client) backoff() time.Duration {
	base := math.Pow(2, float64(c.attempt))
	if base > 60 {
		base = 60
	}
	jitter := rand.Float64() * base * 0.1
	return time.Duration(base+jitter) * time.Second
}
