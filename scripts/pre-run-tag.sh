#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="pre-run-$TIMESTAMP"
git tag "$TAG"
echo "✓ Rollback tag created: $TAG"
echo "  To rollback: git reset --hard $TAG"
