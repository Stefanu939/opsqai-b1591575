package main

import (
	"fmt"
	"os/exec"
	"runtime"
)

// printAndOpenWizard prints the wizard URL and — on desktop OS — opens it in
// the default browser. Falls back to just printing on servers where no
// browser opener is expected.
func printAndOpenWizard() {
	public, err := readEnvValue("OPSQAI_PUBLIC_URL")
	if err != nil || public == "" || public == "https://opsqai.example.com" {
		port, perr := readEnvValue("OPSQAI_PORT")
		if perr != nil || port == "" {
			port = "3000"
		}
		public = "http://localhost:" + port
	}
	target := public + "/first-run"
	fmt.Println()
	log("Setup complete. Open this URL in a browser to begin the Setup Wizard:")
	fmt.Println()
	fmt.Println("    " + target)
	fmt.Println()
	openBrowser(target)
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", "", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		if _, err := exec.LookPath("xdg-open"); err != nil {
			return // headless server — just print
		}
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start() // best-effort; ignore errors
}
