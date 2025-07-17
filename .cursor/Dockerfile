# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT=18-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:22-${VARIANT}

USER root

# Create a non-root user for background agents
RUN useradd -m -s /bin/zsh ubuntu && \
    usermod -aG sudo ubuntu

# Set zsh as the main shell for the ubuntu user
RUN chsh -s /usr/bin/zsh ubuntu

# Preserve Shell history for the ubuntu user
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.zsh_history" \
    && echo $SNIPPET >> "/home/ubuntu/.zshrc"

# Install additional OS packages including Python, Git, and build tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
      build-essential \
      git \
      python3 \
      python3-pip \
      python3-venv \
      shellcheck \
      software-properties-common \
      tldr \
      tree \
      zsh-autosuggestions \
    && mkdir -p /home/ubuntu/.local/share \
    && mkdir -p /root/.local/share \
    && tldr -u

# Install pnpm globally
RUN npm i -g corepack@latest
RUN corepack enable
RUN corepack install

# Install pre-commit globally (this doesn't need the repo to be present)
RUN pip3 install pre-commit

# Ensure the ubuntu user has proper permissions
RUN chown -R ubuntu:ubuntu /home/ubuntu

# Switch to the ubuntu user and set working directory
USER ubuntu
WORKDIR /home/ubuntu

# The agent will handle:
# 1. Cloning the repository
# 2. Running `pnpm install`
# 3. Running `pnpm exec tsc --build`
# 4. Setting up pre-commit hooks
