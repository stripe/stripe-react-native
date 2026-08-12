#!/usr/bin/env python3
"""
Parses the GitHub Models response from /tmp/ai_fix.txt and writes each
FILE: ... ``` ... ``` block to disk. Protected files are never overwritten.
"""
import re, os, sys

PROTECTED = {
    "stripe-react-native.podspec",
    "android/gradle.properties",
    "example/ios/Podfile.lock",
}

with open("/tmp/ai_fix.txt") as f:
    response = f.read()

if re.search(r'^NO_CHANGES:', response, re.MULTILINE):
    print("Model flagged no changes needed:")
    for line in response.splitlines():
        if line.startswith("NO_CHANGES:"):
            print(line)
    sys.exit(0)

pattern = re.compile(
    r'^FILE:\s*(.+?)\s*\n```[^\n]*\n(.*?)```',
    re.MULTILINE | re.DOTALL,
)

matches = pattern.findall(response)
if not matches:
    print("No FILE: blocks found — nothing to apply.")
    sys.exit(0)

for path, content in matches:
    path = path.strip()
    if path in PROTECTED or any(path.endswith(p) for p in PROTECTED):
        print(f"Skipping protected file: {path}")
        continue
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
    print(f"Wrote {path}")
