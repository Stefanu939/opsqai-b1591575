// OPSQAI Self-Hosted host-side installer.
//
// Runs ON THE HOST (not inside the container). Mirrors install.sh 1:1 so the
// admin guide stays authoritative regardless of which entrypoint the customer
// launches. Cross-compiled from CI Linux for Windows / macOS (universal) /
// Linux — see scripts/build-installer.sh.
//
// Reproducible builds:
//
//	go build -trimpath -ldflags="-s -w -buildid=" ./installer
//
// No secrets are embedded in the binary — everything comes from the sibling
// files in the extracted ZIP (.env.template, activation-bundle.json).
package main

import (
	"flag"
	"fmt"
	"os"
)

const usage = `OPSQAI Self-Hosted installer

  install                    Fresh install: checks prerequisites, seeds .env
                             from .env.template, starts the stack, waits for
                             the app to report healthy, then prints (and opens)
                             the URL for the Setup Wizard.
  install --restore          Disaster-recovery mode: prompts for a backup
                             archive path and follows the DR runbook (5.5.4)
                             instead of writing a fresh .env / starting a new
                             stack. Does NOT overwrite an existing .env.
  install --help             This message.
`

func main() {
	exitCode, noPause := run(os.Args[1:])
	if !noPause {
		pauseBeforeExit(exitCode)
	}
	os.Exit(exitCode)
}

func run(args []string) (int, bool) {
	fs := flag.NewFlagSet("install", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	restore := fs.Bool("restore", false, "restore from a backup archive (DR runbook 5.5.4)")
	help := fs.Bool("help", false, "show usage")
	noPause := fs.Bool("no-pause", false, "do not wait for Enter before closing on Windows")
	fs.Usage = func() { fmt.Fprint(os.Stderr, usage) }
	if err := fs.Parse(args); err != nil {
		return 2, *noPause
	}

	if *help {
		fmt.Print(usage)
		return 0, *noPause
	}

	if err := checkPrereqs(); err != nil {
		errln(err.Error())
		return 1, *noPause
	}

	if *restore {
		if err := restoreFlow(); err != nil {
			errln(err.Error())
			return 1, *noPause
		}
		return 0, *noPause
	}

	if err := seedEnv(); err != nil {
		errln(err.Error())
		return 1, *noPause
	}
	log("Starting stack with 'docker compose up -d' ...")
	if err := runCmd("docker", "compose", "up", "-d"); err != nil {
		errln("docker compose up failed: " + err.Error())
		return 1, *noPause
	}
	if err := waitHealthy(); err != nil {
		errln(err.Error())
		errln("Inspect logs with: docker compose logs --tail=200 opsqai")
		return 1, *noPause
	}
	printAndOpenWizard()
	return 0, *noPause
}
