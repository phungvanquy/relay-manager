package state

import (
	"encoding/json"
	"os"
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
	defer s.mu.RUnlock()

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := s.path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.path)
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
	rules := make([]AppliedRule, len(s.AppliedRules))
	copy(rules, s.AppliedRules)
	return rules
}
