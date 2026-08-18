# Dev access tools

Two double-clickable tools that give the team a private way into the Hualong
DEV instance. The DEV app is never exposed on the public internet; the only
route in is an SSH tunnel to `127.0.0.1` on the server.

| File | Who runs it | What it does |
| --- | --- | --- |
| `dev-access-wizard.bat` | every teammate | Creates a personal SSH key, copies the public half to the clipboard, opens the tunnel, launches the browser, and keeps the tunnel alive. |
| `dev-access-manager.bat` | Herman only | GUI list of authorized machines, with Add and Remove. |

Each `.ps1` is **self-contained**: settings sit in a `# ---- settings ----` block at the top of the file. Copy a `.ps1` and its `.bat` anywhere and they work. Nothing else is required beside them.

If you would rather keep settings in one place across both tools, drop a `dev-access.config.ps1` next to them; each script loads it *if it exists* and its values win. Its absence is normal and is never an error.

## Server side

The tools assume this setup on `106.55.2.218` (Tencent Lighthouse, Guangzhou):

- account `devtunnel`, shell `/usr/sbin/nologin`, key-only
- `/etc/ssh/sshd_config.d/10-hardening.conf` — no password login, no root login
- `/etc/ssh/sshd_config.d/90-devtunnel.conf`:

  ```
  Match User devtunnel
      AllowTcpForwarding local
      PermitOpen 127.0.0.1:3001
      X11Forwarding no
      PermitTTY no
      AllowAgentForwarding no
      ForceCommand /usr/sbin/nologin
  ```

Verified behaviour of a `devtunnel` key:

- forward to `127.0.0.1:3001` — allowed
- forward to any other port — refused
- interactive shell — refused with `This account is currently not available.`

If you change `$RemotePort`, change it in **both** scripts and change
`PermitOpen` on the server to match, or every tunnel is refused.

## Onboarding a teammate

1. They run `dev-access-wizard.bat`. It fails on the first run and puts their
   public key in their clipboard.
2. They send you that key over any channel. A public key is not a secret.
3. You run `dev-access-manager.bat`, paste the key, click **Add**.
4. You reply "added". They run the wizard again.

## Notes

- The wizard writes the machine's hardware id into the key comment. Two rows
  with the same id in the manager mean a private key was copied to a second PC.
  The manager warns about this on Add and after each Refresh.
- The manager writes `restrict,port-forwarding,permitopen="127.0.0.1:3001"` in
  front of every key. That is a second line of defence, independent of the
  server's `Match` block.
- Never accept a private key from anyone. The manager refuses text containing
  `PRIVATE KEY`.

## Relationship to the older tools

`China Teacher Resources Development Platform/tools/` holds the first version of
these scripts, pointed at a different server. This set is a separate copy, not a
shared library: the two projects can move independently. Fixes worth having in
both must be applied twice.
