package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"relay-agent/internal/client"
	"relay-agent/internal/config"
	"relay-agent/internal/iptables"
	"relay-agent/internal/state"
	"relay-agent/internal/version"
	"syscall"
)

func main() {
	if len(os.Args) > 1 && (os.Args[1] == "--version" || os.Args[1] == "-v") {
		fmt.Println(version.String())
		os.Exit(0)
	}

	log.SetFlags(log.LstdFlags | log.Lshortfile)

	cfgPath := config.DefaultConfigPath
	if len(os.Args) > 1 {
		cfgPath = os.Args[1]
	}

	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Fatalf("Failed to load config from %s: %v", cfgPath, err)
	}

	st, err := state.Load(cfg.StateFile)
	if err != nil {
		log.Fatalf("Failed to load state from %s: %v", cfg.StateFile, err)
	}

	ipt := iptables.New()

	if err := ipt.EnsureIPForward(); err != nil {
		log.Printf("Warning: failed to enable IP forwarding: %v", err)
	}

	// Reconcile: ensure iptables matches state file
	reconcile(st, ipt)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigCh
		log.Println("Shutting down...")
		cancel()
	}()

	log.Printf("Relay agent starting. Dashboard: %s", cfg.DashboardURL)
	if cfg.IsBootstrap() {
		log.Println("Mode: bootstrap (first connection)")
	} else {
		log.Printf("Mode: normal. Node: %s, Version: %d", cfg.NodeID, st.GetVersion())
	}

	c := client.New(cfg, cfgPath, st, ipt)
	c.Run(ctx)
}

func reconcile(st *state.State, ipt *iptables.Manager) {
	rules := st.GetAllRules()

	restored := 0
	for _, rule := range rules {
		exists, err := ipt.RuleExists(rule)
		if err != nil {
			log.Printf("Warning: failed to inspect rule %s: %v", rule.Name, err)
			continue
		}
		if !exists {
			log.Printf("Reconciling: re-adding rule %s (port %d)", rule.Name, rule.SourcePort)
			if err := ipt.AddRule(rule); err != nil {
				log.Printf("Warning: failed to reconcile rule %s: %v", rule.Name, err)
			} else {
				restored++
			}
		}
	}

	if restored > 0 {
		log.Printf("Reconciliation complete: restored %d rules", restored)
		if err := ipt.SavePersistent(); err != nil {
			log.Printf("Warning: failed to save persistent firewall state: %v", err)
		}
	}
}
