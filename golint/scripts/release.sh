#!/usr/bin/env bash
# Releases the Go lint module. Without --push it is a dry run: it checks the
# module and the version, and it changes nothing. With --push it tags the
# version of golint/VERSION and pushes the tag. A module in a subdirectory of a
# repository takes the directory as the prefix of its tag, thus the tag is
# golint/vX.Y.Z, and `go get` names the version as vX.Y.Z.
set -euo pipefail
cd "$(dirname "$0")/.."

push=false
case "${1:-}" in
  --push) push=true ;;
  "") ;;
  *)
    echo "usage: $0 [--push]" >&2
    exit 2
    ;;
esac

version=$(tr -d '[:space:]' < VERSION)
if ! [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "release: golint/VERSION must hold X.Y.Z, not '$version'" >&2
  exit 1
fi
tag="golint/v$version"

if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null; then
  echo "release: the tag $tag exists, nothing to do"
  exit 0
fi

if $push; then
  # A release comes from the commit that main holds, with nothing on top.
  if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
    [ "${GITHUB_REF:-}" = "refs/heads/main" ] || { echo "release: push from main" >&2; exit 1; }
  else
    [ "$(git branch --show-current)" = "main" ] || { echo "release: push from main" >&2; exit 1; }
  fi
  [ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "release: the working tree has changes" >&2; exit 1; }
  head=$(git rev-parse HEAD)
  remote_main=$(git ls-remote origin refs/heads/main | cut -f1)
  [ "$head" = "$remote_main" ] || { echo "release: HEAD ($head) is not origin/main ($remote_main)" >&2; exit 1; }
fi

if $push; then echo "release: $tag"; else echo "release: $tag (dry run)"; fi
unformatted=$(gofmt -l .)
if [ -n "$unformatted" ]; then
  echo "release: these files are not gofmt-clean:" >&2
  echo "$unformatted" >&2
  exit 1
fi
go vet ./...
go test -count=1 ./...
go build ./cmd/...

if ! $push; then
  echo "release: dry run done. Run with --push to tag and push $tag."
  exit 0
fi

git tag "$tag" HEAD
git push origin "refs/tags/$tag"
echo "release: $tag is out"
