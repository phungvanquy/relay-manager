package version

import "fmt"

var (
	Version   = "dev"
	Commit    = ""
	BuildDate = ""
)

func String() string {
	s := fmt.Sprintf("relay-agent %s", Version)
	if Commit != "" {
		s += fmt.Sprintf(" (%s)", Commit)
	}
	if BuildDate != "" {
		s += fmt.Sprintf(" built %s", BuildDate)
	}
	return s
}
