package state

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCommitPersistsBeforeUpdatingMemory(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "missing", "state.json")
	st, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	rule := AppliedRule{ID: "r1", SourcePort: 80, DestinationIP: "10.0.0.1", DestinationPort: 80, Protocol: "tcp"}

	if err := st.Commit(1, []AppliedRule{rule}); err == nil {
		t.Fatal("Commit succeeded with missing parent directory")
	}
	if st.GetVersion() != 0 || len(st.GetAllRules()) != 0 {
		t.Fatalf("memory changed after failed commit: version=%d rules=%v", st.GetVersion(), st.GetAllRules())
	}

	if err := os.Mkdir(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err := st.Commit(1, []AppliedRule{rule}); err != nil {
		t.Fatal(err)
	}

	reloaded, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if reloaded.GetVersion() != 1 || len(reloaded.GetAllRules()) != 1 || reloaded.GetAllRules()[0] != rule {
		t.Fatalf("unexpected reloaded state: version=%d rules=%v", reloaded.GetVersion(), reloaded.GetAllRules())
	}
}

func TestCommitUsesPrivateFilePermissions(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	st, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := st.Commit(0, nil); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != 0600 {
		t.Fatalf("state permissions = %o, want 600", got)
	}
}
