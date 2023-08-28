provider "vault" {
}

provider "vultr" {
  api_key     = data.vault_generic_secret.vultr_auth.data["api_key"]
  rate_limit  = 100
  retry_limit = 3
}
