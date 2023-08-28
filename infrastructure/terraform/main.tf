data "vultr_region" "deployment_region" {
  filter {
    name   = "city"
    values = [var.vultr_region_name]
  }
}

data "vultr_os" "deployment_os" {
  filter {
    name   = "name"
    values = [var.os_template_name]
  }
}

data "vultr_plan" "deployment_plan" {
  filter {
    name   = "monthly_cost"
    values = [var.vultr_instance_monthly_cost]
  }
}

data "ignition_user" "core" {
  name                = "core"
  password_hash       = ""
  ssh_authorized_keys = var.public_keys
}

data "ignition_config" "base" {
  users = [
    data.ignition_user.core.rendered,
  ]
}

resource "vultr_instance" "webserver" {
  label             = "${var.instance_host_prefix}${format("%02d", count.index)}"
  hostname          = "${var.instance_host_prefix}${format("%02d", count.index)}"
  count             = var.instance_count
  region            = data.vultr_region.deployment_region.id
  plan              = data.vultr_plan.deployment_plan.id
  os_id             = data.vultr_os.deployment_os.id
  tags              = var.instance_tags
  user_data         = data.ignition_config.base.rendered
  firewall_group_id = module.webserver_firewall.firewall_group.id
}

module "webserver_firewall" {
  source      = "./modules/vultr_firewall"
  description = "Web Servers Firewall Group"
  ports = [
    "22/tcp",
    "80/tcp",
    "443/tcp",
    "443/udp"
  ]
}
