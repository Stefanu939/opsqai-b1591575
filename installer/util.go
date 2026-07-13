package main

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"runtime"
)

// ANSI colouring is skipped on Windows consoles that don't advertise
// VT support to keep the output legible; on macOS/Linux terminals the
// escape codes are rendered natively.
func log(msg string)   { writeLine(os.Stdout, "\033[1;34m", msg) }
func warn(msg string)  { writeLine(os.Stderr, "\033[1;33m", msg) }
func errln(msg string) { writeLine(os.Stderr, "\033[1;31m", msg) }

func writeLine(f *os.File, colour string, msg string) {
	if runtime.GOOS == "windows" {
		fmt.Fprintf(f, "[opsqai] %s\n", msg)
		return
	}
	fmt.Fprintf(f, "%s[opsqai]\033[0m %s\n", colour, msg)
}

func pauseBeforeExit(exitCode int) {
	if runtime.GOOS != "windows" {
		return
	}
	if exitCode == 0 {
		fmt.Fprintln(os.Stdout)
		fmt.Fprint(os.Stdout, "Press Enter to close this window...")
	} else {
		fmt.Fprintln(os.Stderr)
		fmt.Fprint(os.Stderr, "Installer stopped. Press Enter to close this window...")
	}
	_, _ = bufio.NewReader(os.Stdin).ReadString('\n')
}

// runCmd inherits stdio so the customer sees docker's own output live.
func runCmd(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}
