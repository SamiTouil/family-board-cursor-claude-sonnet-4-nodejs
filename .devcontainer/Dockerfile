FROM node:18-alpine

# Install dev tools and dependencies
RUN apk add --no-cache \
    git \
    bash \
    bash-completion \
    curl \
    wget \
    openssh-client \
    postgresql-client \
    python3 \
    make \
    g++ \
    build-base \
    openssl \
    openssl-dev \
    sudo \
    # For VS Code
    libstdc++ \
    # Common tools
    vim \
    nano \
    jq \
    htop

# Install global npm packages
RUN npm install -g \
    typescript \
    tsx \
    prisma \
    npm-check-updates \
    concurrently \
    wait-on

# Create non-root user with sudo access
ARG USERNAME=developer
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN addgroup -g $USER_GID $USERNAME \
    && adduser -D -u $USER_UID -G $USERNAME $USERNAME \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# Create workspace directory
RUN mkdir -p /workspaces \
    && chown -R $USERNAME:$USERNAME /workspaces

# Set bash as default shell
RUN sed -i "s/bin\/ash/bin\/bash/g" /etc/passwd

# Switch to non-root user
USER $USERNAME

# Set working directory
WORKDIR /workspaces

# Set shell
SHELL ["/bin/bash", "-c"]

# Keep container running
CMD ["sleep", "infinity"]