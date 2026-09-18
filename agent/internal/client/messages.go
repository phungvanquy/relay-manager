package client

import "relay-agent/internal/state"

type MessageType string

const (
	TypeHello        MessageType = "hello"
	TypeHelloAck     MessageType = "hello_ack"
	TypeBootstrap    MessageType = "bootstrap"
	TypeBootstrapAck MessageType = "bootstrap_ack"
	TypeSyncEvent    MessageType = "sync_event"
	TypeApplyResult  MessageType = "apply_result"
	TypeHeartbeat    MessageType = "heartbeat"
	TypeHeartbeatAck MessageType = "heartbeat_ack"
)

type HelloMessage struct {
	Type          MessageType `json:"type"`
	NodeID        string      `json:"node_id"`
	APIKey        string      `json:"api_key"`
	ConfigVersion int         `json:"config_version"`
}

type HelloAckMessage struct {
	Type          MessageType          `json:"type"`
	NodeID        string               `json:"node_id"`
	GroupID       string               `json:"group_id"`
	ConfigVersion int                  `json:"config_version"`
	DesiredRules  *[]state.AppliedRule `json:"desired_rules,omitempty"`
	CatchUpEvents []SyncEvent          `json:"catch_up_events"`
}

type BootstrapMessage struct {
	Type  MessageType `json:"type"`
	Token string      `json:"token"`
}

type BootstrapAckMessage struct {
	Type    MessageType `json:"type"`
	NodeID  string      `json:"node_id"`
	APIKey  string      `json:"api_key"`
	GroupID string      `json:"group_id"`
}

type SyncEvent struct {
	Type    MessageType       `json:"type,omitempty"`
	GroupID string            `json:"group_id,omitempty"`
	Version int               `json:"version"`
	Action  string            `json:"action"`
	Rule    state.AppliedRule `json:"rule"`
}

type ApplyResultMessage struct {
	Type    MessageType `json:"type"`
	Version int         `json:"version"`
	Success bool        `json:"success"`
	Error   string      `json:"error,omitempty"`
}

type HeartbeatMessage struct {
	Type          MessageType `json:"type"`
	NodeID        string      `json:"node_id"`
	ConfigVersion int         `json:"config_version"`
	Timestamp     int64       `json:"timestamp"`
}

type HeartbeatAckMessage struct {
	Type       MessageType `json:"type"`
	ServerTime int64       `json:"server_time"`
}

type GenericMessage struct {
	Type MessageType `json:"type"`
}
