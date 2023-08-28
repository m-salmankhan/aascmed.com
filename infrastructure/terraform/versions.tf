terraform {
  required_version = ">= 1.1.7"

  backend "s3" {
    bucket                      = "terraform"
    key                         = "aascmed.tfstate"
    region                      = "eu-west-1"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }

  required_providers {
    vultr = {
      source  = "vultr/vultr"
      version = "2.15.1"
    }

    vault = {
      source  = "hashicorp/vault"
      version = "3.13.0"
    }

    ignition = {
      source  = "community-terraform-providers/ignition"
      version = "2.1.4"
    }
  }
}
