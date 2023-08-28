data "vault_generic_secret" "vultr_auth" {
  path = "terraform/vultr/aascmed"
}

variable "public_keys" {
  type = list(string)
}

variable "vultr_region_name" {
  type    = string
  default = "Chicago"
}

variable "vultr_instance_monthly_cost" {
  type    = number
  default = 5
}

variable "os_template_name" {
  type    = string
  default = "Fedora CoreOS Stable"
}

variable "instance_count" {
  type    = number
  default = 1
}

variable "instance_host_prefix" {
  type = string
}

variable "instance_tags" {
  type = list(string)
}
