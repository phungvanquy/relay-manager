package config

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
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
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) Save(path string) error {
	if err := c.Validate(); err != nil {
		return err
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := path + ".tmp"
	file, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	cleanup := func() {
		_ = file.Close()
		_ = os.Remove(tmpPath)
	}
	if err := file.Chmod(0600); err != nil {
		cleanup()
		return err
	}
	if _, err := file.Write(data); err != nil {
		cleanup()
		return err
	}
	if err := file.Sync(); err != nil {
		cleanup()
		return err
	}
	if err := file.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}
	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(tmpPath)
		return err
	}

	dir, err := os.Open(filepath.Dir(path))
	if err != nil {
		return err
	}
	defer dir.Close()
	return dir.Sync()
}

func (c *Config) IsBootstrap() bool {
	return c.BootstrapToken != "" && c.APIKey == ""
}

func (c *Config) Validate() error {
	dashboardURL, err := url.Parse(c.DashboardURL)
	if err != nil || dashboardURL.Host == "" || (dashboardURL.Scheme != "ws" && dashboardURL.Scheme != "wss") {
		return fmt.Errorf("dashboard_url must be an absolute ws:// or wss:// URL")
	}
	if c.BootstrapToken == "" && (c.APIKey == "" || c.NodeID == "") {
		return fmt.Errorf("config must contain either bootstrap_token or both node_id and api_key")
	}
	return nil
}
