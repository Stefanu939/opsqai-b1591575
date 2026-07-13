package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"
)

// restoreFlow implements DR runbook 5.5.4:
//
//	docker compose down
//	docker compose run --rm opsqai opsqai restore --archive <path>
//	docker compose up -d
//	wait for /health
//
// Refuses to run without an existing .env — restore is not a fresh install.
func restoreFlow() error {
	log("OPSQAI restore mode — following DR runbook 5.5.4.")
	log("Prerequisites: existing .env pointing at the SAME install_id as the backup.")
	if _, err := os.Stat(".env"); err != nil {
		errln("No .env found. Restore must run against an existing installation directory.")
		errln("For a fresh install run the installer without --restore.")
		return err
	}
	fmt.Print("Path to backup archive (.tar.zst): ")
	reader := bufio.NewReader(os.Stdin)
	line, err := reader.ReadString('\n')
	if err != nil {
		return err
	}
	archive := strings.TrimSpace(line)
	if _, err := os.Stat(archive); err != nil {
		errln("File not found: " + archive)
		return errors.New("archive not found")
	}
	log("Stopping stack ...")
	if err := runCmd("docker", "compose", "down"); err != nil {
		return err
	}
	log("Restoring " + archive + " — see docs/engineering/runbooks/dr-verify-v1.0.0.md for the full procedure.")
	log("This installer defers the actual volume rehydration to 'opsqai restore', which knows how to")
	log("unpack Config (including secrets.env), Database and Storage scopes into the correct volumes.")
	if err := runCmd("docker", "compose", "run", "--rm", "opsqai", "opsqai", "restore", "--archive", archive); err != nil {
		return err
	}
	log("Starting stack ...")
	if err := runCmd("docker", "compose", "up", "-d"); err != nil {
		return err
	}
	if err := waitHealthy(); err != nil {
		return err
	}
	log("Restore complete. Run 'docker compose exec opsqai opsqai doctor' to verify.")
	return nil
}
