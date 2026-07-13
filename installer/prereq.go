package main

import (
	"errors"
	"os/exec"
	"runtime"
)

// checkPrereqs verifies docker + `docker compose` (plugin v2) are available.
// Symmetric with install.sh:check_prereqs() — same error text, same links.
func checkPrereqs() error {
	missing := false
	if _, err := exec.LookPath("docker"); err != nil {
		errln("docker is not installed or not on PATH.")
		switch runtime.GOOS {
		case "windows", "darwin":
			errln("Install Docker Desktop: https://www.docker.com/products/docker-desktop/")
		default:
			errln("Install Docker Engine: https://docs.docker.com/engine/install/")
		}
		missing = true
	}
	if err := exec.Command("docker", "compose", "version").Run(); err != nil {
		errln("The Docker Compose plugin (v2) is not available.")
		errln("Install it: https://docs.docker.com/compose/install/")
		if runtime.GOOS == "linux" {
			errln("On Debian/Ubuntu: 'sudo apt-get install docker-compose-plugin'.")
		}
		missing = true
	}
	if missing {
		return errors.New("Fix the prerequisites above and re-run the installer.")
	}
	log("Prerequisites OK (docker + compose plugin present).")
	return nil
}
