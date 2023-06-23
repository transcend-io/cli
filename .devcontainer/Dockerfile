# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT=16-bullseye
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

USER root

# Set zsh as the main shell
RUN chsh -s /usr/bin/zsh

# Preserve Shell history
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.zsh_history" \
    && echo $SNIPPET >> "/root/.zshrc"

# install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
      shellcheck \
      software-properties-common \
      tldr \
      tree \
      zsh-autosuggestions \
    && mkdir -p /root/.local/share && tldr -u

# Ensure the root folder referenced here is accessible to the user that will run the container
RUN sudo chown root -R /root
