FROM node:24.21.0-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global @openai/codex@0.160.0
COPY scripts /opt/repair/scripts
RUN mkdir -p /work /output && chown node:node /work /output
USER node
WORKDIR /work
CMD ["sleep", "infinity"]
