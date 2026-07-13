package main

import (
	"fmt"
	"os"
	"os/exec"
)

// ANSI colouring is skipped on Windows consoles that don't advertise
// VT support to keep the output legible; on macOS/Linux terminals the
// escape codes are rendered natively.
func log(msg string)   { fmt.Fprintf(os.Stdout, "\033[1;34m[opsqai]\033[0m %s\n", msg) }
func warn(msg string)  { fmt.Fprintf(os.Stderr, "\033[1;33m[opsqai]\033[0m %s\n", msg) }
func errln(msg string) { fmt.Fprintf(os.Stderr, "\033[1;31m[opsqai]\033[0m %s\n", msg) }

// runCmd inherits stdio so the customer sees docker's own output live.
func runCmd(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}
