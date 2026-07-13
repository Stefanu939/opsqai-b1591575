package main

import (
	"errors"
	"fmt"
	"net/http"
	"time"
)

// waitHealthy polls /health on the configured port until 2xx or 120 s elapses.
// Matches install.sh:wait_healthy() (60 tries * 2 s).
func waitHealthy() error {
	port := "3000"
	if p, err := readEnvValue("OPSQAI_PORT"); err == nil && p != "" {
		port = p
	}
	url := fmt.Sprintf("http://localhost:%s/health", port)
	log(fmt.Sprintf("Waiting for the app to report healthy at %s ...", url))
	client := &http.Client{Timeout: 3 * time.Second}
	const tries = 60
	for i := 1; i <= tries; i++ {
		resp, err := client.Get(url)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				log(fmt.Sprintf("App is healthy after %d check(s).", i))
				return nil
			}
		}
		time.Sleep(2 * time.Second)
	}
	return errors.New("App did not report healthy after 120s.")
}
