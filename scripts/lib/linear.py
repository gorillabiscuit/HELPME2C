"""Small Linear client for scripts/card and scripts/ship.

    python3 -I scripts/lib/linear.py card HEL-13 OUT.md       write the card file, print a JSON summary
    python3 -I scripts/lib/linear.py comment HEL-13 BODY.md   post BODY.md as a comment on the card
    python3 -I scripts/lib/linear.py state HEL-13 "In Review" move the card to that state

The API key is read from ~/.config/linear/helpme2c-token (a personal key made in the helpme2c
workspace) and handed to curl on standard input, so it never appears in a process list or a log.
curl does the HTTPS because this Mac's python.org Python has no certificate store.

Queries stay small on purpose: Linear rejects a query whose "complexity" is over 10,000 with
HTTP 400. That is what broke the old dispatcher's board reads in October 2026.
"""

import json
import os
import subprocess
import sys
import tempfile

API = "https://api.linear.app/graphql"
TOKEN_FILE = os.path.expanduser("~/.config/linear/helpme2c-token")


def fail(msg):
    print(f"linear: {msg}", file=sys.stderr)
    sys.exit(1)


def gql(query, variables=None):
    try:
        with open(TOKEN_FILE) as f:
            token = f.read().strip()
    except OSError:
        fail(f"no Linear key at {TOKEN_FILE}. HelpME2C cards run only on the Mac that has it.")
    config = f'header = "Authorization: {token}"\nheader = "Content-Type: application/json"\n'
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as body:
        json.dump({"query": query, "variables": variables or {}}, body)
    try:
        proc = subprocess.run(
            ["curl", "-sS", "--max-time", "60", "-K", "-", "--data-binary", "@" + body.name,
             "-w", "\n%{http_code}", API],
            input=config, capture_output=True, text=True,
        )
    finally:
        os.unlink(body.name)
    if proc.returncode != 0:
        fail(f"curl failed: {proc.stderr.strip()}")
    text, _, code = proc.stdout.rpartition("\n")
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        fail(f"HTTP {code}, not JSON: {text[:300]}")
    if data.get("errors"):
        fail(f"HTTP {code}: " + "; ".join(e.get("message", "?") for e in data["errors"]))
    return data["data"]


CARD_QUERY = """query($id: String!) { issue(id: $id) {
  id identifier title url description
  state { name type }
  labels(first: 20) { nodes { name } }
  inverseRelations(first: 20) { nodes { type issue { identifier state { name type } } } }
} }"""


def card(ident, out_path):
    issue = gql(CARD_QUERY, {"id": ident})["issue"]
    if not issue:
        fail(f"no card {ident}")
    labels = [n["name"] for n in issue["labels"]["nodes"]]
    open_blockers = [
        f'{r["issue"]["identifier"]} ({r["issue"]["state"]["name"]})'
        for r in issue["inverseRelations"]["nodes"]
        if r["type"] == "blocks" and r["issue"]["state"]["type"] not in ("completed", "canceled")
    ]
    description = issue["description"] or ""
    with open(out_path, "w") as f:
        f.write(f'# {issue["identifier"]}: {issue["title"]}\n\n')
        f.write(f'Card: {issue["url"]}\nState: {issue["state"]["name"]}\nLabels: {", ".join(labels)}\n\n')
        f.write(description.rstrip() + "\n")
    print(json.dumps({
        "uuid": issue["id"], "identifier": issue["identifier"], "title": issue["title"],
        "url": issue["url"], "state": issue["state"]["name"], "state_type": issue["state"]["type"],
        "labels": labels, "open_blockers": open_blockers, "base": section_first_line(description, "Base"),
    }))


def section_first_line(markdown, heading):
    """First non-empty line under '## <heading>', or ''."""
    lines = markdown.splitlines()
    for i, line in enumerate(lines):
        if line.strip().lower() == f"## {heading.lower()}":
            for nxt in lines[i + 1:]:
                if nxt.startswith("#"):
                    return ""
                if nxt.strip():
                    return nxt.strip().strip("`")
    return ""


def issue_uuid(ident):
    issue = gql("query($id: String!) { issue(id: $id) { id team { id } } }", {"id": ident})["issue"]
    if not issue:
        fail(f"no card {ident}")
    return issue


def comment(ident, body_path):
    with open(body_path) as f:
        body = f.read()
    uuid = issue_uuid(ident)["id"]
    res = gql("mutation($i: String!, $b: String!) { commentCreate(input: {issueId: $i, body: $b}) { success } }",
              {"i": uuid, "b": body})
    if not res["commentCreate"]["success"]:
        fail(f"comment on {ident} was not saved")


def state(ident, name):
    issue = issue_uuid(ident)
    states = gql("query($t: String!) { team(id: $t) { states(first: 30) { nodes { id name } } } }",
                 {"t": issue["team"]["id"]})["team"]["states"]["nodes"]
    match = [s["id"] for s in states if s["name"].lower() == name.lower()]
    if not match:
        fail(f'no state "{name}"; the team has: {", ".join(s["name"] for s in states)}')
    res = gql("mutation($i: String!, $s: String!) { issueUpdate(id: $i, input: {stateId: $s}) { success } }",
              {"i": issue["id"], "s": match[0]})
    if not res["issueUpdate"]["success"]:
        fail(f"{ident} was not moved")


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 3 and args[0] == "card":
        card(args[1], args[2])
    elif len(args) == 3 and args[0] == "comment":
        comment(args[1], args[2])
    elif len(args) == 3 and args[0] == "state":
        state(args[1], args[2])
    else:
        fail(__doc__.strip().splitlines()[2].strip() + " (see the top of this file)")
