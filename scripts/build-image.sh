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

KEEP_OLD_VERSION=$(
    printf '%s\n' "${EXISTING_VERSIONS}" |
        awk '/^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$/' |
        tail -n 1
)

if [[ -z "${KEEP_OLD_VERSION}" ]]; then
    KEEP_OLD_VERSION=$(printf '%s\n' "${EXISTING_VERSIONS}" | tail -n 1)
fi

echo
if [[ -n "${KEEP_OLD_VERSION}" ]]; then
    echo "Keeping rollback image: ${IMAGE_NAME}:${KEEP_OLD_VERSION}"
else
    echo "No previous image exists to keep for rollback."
fi

while IFS= read -r OLD_VERSION; do
    if [[ -z "${OLD_VERSION}" || "${OLD_VERSION}" == "${KEEP_OLD_VERSION}" ]]; then
        continue
    fi

    echo "Removing old image: ${IMAGE_NAME}:${OLD_VERSION}"

    if ! docker image rm "${IMAGE_NAME}:${OLD_VERSION}"; then
        echo "Warning: Could not remove ${IMAGE_NAME}:${OLD_VERSION}; it may be used by a container." >&2
    fi
done <<< "${EXISTING_VERSIONS}"

echo
echo "Image retention complete."
echo "Current image: ${IMAGE_NAME}:${NEW_VERSION}"

if [[ -n "${KEEP_OLD_VERSION}" ]]; then
    echo "Rollback image: ${IMAGE_NAME}:${KEEP_OLD_VERSION}"
fi
