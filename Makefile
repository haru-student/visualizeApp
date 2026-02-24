.PHONY: decrypt-env run

DOTNET ?= dotnet
ENV_FILE ?= .env
ENV_ENC_FILE ?= .env.enc

decrypt-env:
	@if [ ! -f "$(ENV_ENC_FILE)" ]; then \
		echo "[decrypt-env] $(ENV_ENC_FILE) not found. Skip."; \
	elif [ -z "$$ENV_FILE_PASSPHRASE" ]; then \
		echo "[decrypt-env] ENV_FILE_PASSPHRASE is not set."; \
		exit 1; \
	else \
		openssl enc -d -aes-256-cbc -pbkdf2 -salt -a \
			-in "$(ENV_ENC_FILE)" \
			-out "$(ENV_FILE)" \
			-pass env:ENV_FILE_PASSPHRASE; \
		echo "[decrypt-env] Decrypted $(ENV_ENC_FILE) -> $(ENV_FILE)"; \
	fi

run: decrypt-env
	@$(DOTNET) run
