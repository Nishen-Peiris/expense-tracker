#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="expense-tracker"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

echo "Fetching the latest source code..."
git pull --ff-only

echo
echo "Existing Docker image versions:"
echo "--------------------------------"

EXISTING_VERSIONS=$(
    docker images "${IMAGE_NAME}" \
        --format '{{.Tag}}' |
        awk '$0 != "<none>"' |
        sort -V
)

if [[ -n "${EXISTING_VERSIONS}" ]]; then
    echo "${EXISTING_VERSIONS}"
else
    echo "No existing versions found."
fi

echo
read -r -p "Enter the new version, for example 1.2.4: " NEW_VERSION

if [[ -z "${NEW_VERSION}" ]]; then
    echo "Error: Version cannot be empty."
    exit 1
fi

if [[ ! "${NEW_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
    echo "Error: Version must look like 1.2.4 or 1.2.4-rc.1."
    exit 1
fi

if docker image inspect "${IMAGE_NAME}:${NEW_VERSION}" >/dev/null 2>&1; then
    echo "Error: ${IMAGE_NAME}:${NEW_VERSION} already exists."
    exit 1
fi

echo
echo "Building ${IMAGE_NAME}:${NEW_VERSION}..."

docker build \
    --file backend/Dockerfile \
    --tag "${IMAGE_NAME}:${NEW_VERSION}" \
    .

echo
echo "Build completed successfully."
echo "Created image: ${IMAGE_NAME}:${NEW_VERSION}"
