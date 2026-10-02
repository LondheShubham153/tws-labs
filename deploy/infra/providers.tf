terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.66"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Remote state: required the moment a second actor (the CI/CD pipeline,
  # not just a human) needs the same state - a local-state CI run starts
  # from a blank checkout every time, so without this, "terraform apply" in
  # CI tries to recreate every resource from scratch each run.
  #
  backend "s3" {
    # bucket is supplied at init (it embeds the AWS account ID, which stays out of the repo):
    #   terraform init -backend-config="bucket=climb-terraform-state-$(aws sts get-caller-identity --query Account --output text)"
    key            = "climb/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "climb-terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}
