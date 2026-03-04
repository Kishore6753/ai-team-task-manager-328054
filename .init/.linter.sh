#!/bin/bash
cd /home/kavia/workspace/code-generation/ai-team-task-manager-328054/express_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

