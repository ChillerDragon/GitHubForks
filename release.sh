#!/bin/bash

VERSION=invalid

if [ ! -x "$(command -v jqx)" ]
then
	VERSION="$(grep -F '"version": "' manifest.json | head -n 1 | awk -F'"' '{ print $4 }')"
else
	VERSION="$(jq .version manifest.json | xargs)"
fi

echo "Releasing version $VERSION"

zip -r -FS GitHubForks-"$VERSION".zip ./* --exclude '*.git*'

