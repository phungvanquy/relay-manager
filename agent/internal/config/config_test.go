package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadAndSaveRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	original := &Config{
		DashboardURL: "https://example.com",
		APIKey:       "test-key-123",
		NodeID:       "node-1",
		StateFile:    "/tmp/state.json",
		LogLevel:     "debug",
	}

	if err := original.Save(path); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	if loaded.DashboardURL != original.DashboardURL {
		t.Errorf("DashboardURL = %q, want %q", loaded.DashboardURL, original.DashboardURL)
	}
	if loaded.APIKey != original.APIKey {
		t.Errorf("APIKey = %q, want %q", loaded.APIKey, original.APIKey)
	}
	if loaded.NodeID != original.NodeID {
		t.Errorf("NodeID = %q, want %q", loaded.NodeID, original.NodeID)
	}
	if loaded.StateFile != original.StateFile {
		t.Errorf("StateFile = %q, want %q", loaded.StateFile, original.StateFile)
	}
	if loaded.LogLevel != original.LogLevel {
		t.Errorf("LogLevel = %q, want %q", loaded.LogLevel, original.LogLevel)
	}
}

func TestLoadMissingFileReturnsError(t *testing.T) {
	_, err := Load("/nonexistent/path/config.json")
	if err == nil {
		t.Fatal("expected error for missing file, got nil")
	}
	if !os.IsNotExist(err) {
		t.Fatalf("expected not-exist error, got: %v", err)
	}
}

func TestLoadAppliesDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	if err := os.WriteFile(path, []byte(`{"dashboard_url":"http://localhost"}`), 0644); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	if cfg.StateFile != "/etc/relay-agent/state.json" {
		t.Errorf("StateFile default = %q, want /etc/relay-agent/state.json", cfg.StateFile)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("LogLevel default = %q, want info", cfg.LogLevel)
	}
}

func TestIsBootstrap(t *testing.T) {
	tests := []struct {
		name     string
		cfg      Config
		expected bool
	}{
		{"bootstrap mode", Config{BootstrapToken: "tok", APIKey: ""}, true},
		{"normal mode", Config{BootstrapToken: "", APIKey: "key"}, false},
		{"both set", Config{BootstrapToken: "tok", APIKey: "key"}, false},
		{"neither set", Config{BootstrapToken: "", APIKey: ""}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.cfg.IsBootstrap(); got != tt.expected {
				t.Errorf("IsBootstrap() = %v, want %v", got, tt.expected)
			}
		})
	}
}

func TestSaveCreatesFileWithRestrictedPermissions(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg := &Config{DashboardURL: "http://localhost"}
	if err := cfg.Save(path); err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("Stat failed: %v", err)
	}

	perm := info.Mode().Perm()
	if perm != 0600 {
		t.Errorf("file permissions = %o, want 0600", perm)
	}
}
