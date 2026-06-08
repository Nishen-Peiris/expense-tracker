#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/backend"
STATIC_DIR="$BACKEND_DIR/src/main/resources/static"
DEPLOYMENT_JAR="$REPO_ROOT/../Deployment/expense-tracker.jar"
DEPLOYMENT_DIR="$(dirname "$DEPLOYMENT_JAR")"

echo "======================================="
echo "Building React Frontend"
echo "======================================="

cd "$FRONTEND_DIR"

npm install
npm run build

echo "======================================="
echo "Copying Frontend into Spring Boot"
echo "======================================="

rm -rf "$STATIC_DIR"/*
cp -R dist/* "$STATIC_DIR/"

echo "======================================="
echo "Building Spring Boot JAR"
echo "======================================="

cd "$BACKEND_DIR"

mvn clean package

echo "======================================="
echo "Copying JAR to Windows Server via NAS"
echo "======================================="

mkdir -p "$DEPLOYMENT_DIR"
cp target/expense-tracker-1.0.0-SNAPSHOT.jar "$DEPLOYMENT_JAR"

echo "======================================="
echo "Deployment Completed"
echo "======================================="
