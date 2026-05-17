package config

import (
	"encoding/json"
	"os"
)

const DefaultConfigPath = "/etc/relay-agent/config.json"

type Config struct {
	DashboardURL   string `json:"dashboard_url"`
	APIKey         string `json:"api_key,omitempty"`
	NodeID         string `json:"node_id,omitempty"`
	BootstrapToken string `json:"bootstrap_token,omitempty"`
	StateFile      string `json:"state_file"`
	LogLevel       string `json:"log_level"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	if cfg.StateFile == "" {
		cfg.StateFile = "/etc/relay-agent/state.json"
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}

	return &cfg, nil
}

func (c *Config) Save(path string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0600)
}

func (c *Config) IsBootstrap() bool {
	return c.BootstrapToken != "" && c.APIKey == ""
}
