package state

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type AppliedRule struct {
	ID              string `json:"id"`
	GroupID         string `json:"group_id"`
	Name            string `json:"name"`
	SourcePort      int    `json:"source_port"`
	DestinationIP   string `json:"destination_ip"`
	DestinationPort int    `json:"destination_port"`
	Protocol        string `json:"protocol"`
}

type State struct {
	ConfigVersion int           `json:"config_version"`
	AppliedRules  []AppliedRule `json:"applied_rules"`
	mu            sync.RWMutex
	path          string
}

func Load(path string) (*State, error) {
	s := &State{path: path}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			s.AppliedRules = []AppliedRule{}
			return s, nil
		}
		return nil, err
	}

	if err := json.Unmarshal(data, s); err != nil {
		return nil, err
	}

	if s.AppliedRules == nil {
		s.AppliedRules = []AppliedRule{}
	}

	return s, nil
}

func (s *State) Save() error {
	s.mu.RLock()
	version := s.ConfigVersion
	rules := cloneRules(s.AppliedRules)
	s.mu.RUnlock()

	return writeSnapshot(s.path, version, rules)
}

// Commit persists a complete state snapshot before making it visible in memory.
// Callers can safely report success only after this method returns nil.
func (s *State) Commit(version int, rules []AppliedRule) error {
	rules = cloneRules(rules)
	if err := writeSnapshot(s.path, version, rules); err != nil {
		return err
	}

	s.mu.Lock()
	s.ConfigVersion = version
	s.AppliedRules = rules
	s.mu.Unlock()
	return nil
}

func (s *State) AddRule(rule AppliedRule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.AppliedRules = append(s.AppliedRules, rule)
}

func (s *State) RemoveByID(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, r := range s.AppliedRules {
		if r.ID == id {
			s.AppliedRules = append(s.AppliedRules[:i], s.AppliedRules[i+1:]...)
			return
		}
	}
}

func (s *State) FindByID(id string) *AppliedRule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, r := range s.AppliedRules {
		if r.ID == id {
			return &r
		}
	}
	return nil
}

func (s *State) UpdateRule(rule AppliedRule) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, r := range s.AppliedRules {
		if r.ID == rule.ID {
			s.AppliedRules[i] = rule
			return
		}
	}
	s.AppliedRules = append(s.AppliedRules, rule)
}

func (s *State) SetVersion(v int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ConfigVersion = v
}

func (s *State) GetVersion() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.ConfigVersion
}

func (s *State) GetAllRules() []AppliedRule {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneRules(s.AppliedRules)
}

func cloneRules(rules []AppliedRule) []AppliedRule {
	cloned := make([]AppliedRule, len(rules))
	copy(cloned, rules)
	return cloned
}

func writeSnapshot(path string, version int, rules []AppliedRule) error {
	payload := struct {
		ConfigVersion int           `json:"config_version"`
		AppliedRules  []AppliedRule `json:"applied_rules"`
	}{
		ConfigVersion: version,
		AppliedRules:  rules,
	}

	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := path + ".tmp"
	file, err := os.OpenFile(tmpPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	if err := file.Chmod(0600); err != nil {
		_ = file.Close()
		_ = os.Remove(tmpPath)
		return err
	}

	cleanup := func() {
		_ = file.Close()
		_ = os.Remove(tmpPath)
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
		return fmt.Errorf("open state directory: %w", err)
	}
	defer dir.Close()
	if err := dir.Sync(); err != nil {
		return fmt.Errorf("sync state directory: %w", err)
	}
	return nil
}
