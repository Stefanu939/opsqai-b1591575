package main

import (
	"bufio"
	"errors"
	"io"
	"os"
	"strings"
)

// seedEnv copies .env.template to .env exactly once. Idempotent: leaves an
// existing .env untouched so re-running the installer never clobbers customer
// edits. Matches install.sh:seed_env().
func seedEnv() error {
	if _, err := os.Stat(".env"); err == nil {
		log(".env already exists — leaving it untouched (idempotent).")
		return nil
	}
	src, err := os.Open(".env.template")
	if err != nil {
		errln(".env.template is missing from this directory.")
		errln("Are you running the installer from inside the extracted ZIP?")
		return err
	}
	defer src.Close()
	dst, err := os.OpenFile(".env", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return err
	}
	defer dst.Close()
	if _, err := io.Copy(dst, src); err != nil {
		return err
	}
	log("Copied .env.template -> .env. Review and edit OPSQAI_PUBLIC_URL before opening the Setup Wizard.")
	return nil
}

// readEnvValue pulls one key out of .env without spawning a shell — the
// generic parser is deliberately narrow (KEY=VALUE, no exports, no quoting)
// because .env.template ships in that shape.
func readEnvValue(key string) (string, error) {
	f, err := os.Open(".env")
	if err != nil {
		return "", err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		eq := strings.IndexByte(line, '=')
		if eq < 0 {
			continue
		}
		if strings.TrimSpace(line[:eq]) == key {
			return strings.TrimSpace(line[eq+1:]), nil
		}
	}
	return "", errors.New("key not found: " + key)
}
