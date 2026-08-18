# ============================================================
# Hualong dev-access manager  (Herman's admin tool)
#
# Needs your own SSH key for the ubuntu account on the VM.
#
# Small GUI over /home/devtunnel/.ssh/authorized_keys on the VM:
#   - lists who currently has dev-tunnel access
#   - Add: paste a teammate's public key (their wizard puts it in
#     their clipboard) and click Add
#   - Remove: select a row, click Remove, confirm
#
# Every key is written with restrictive options in front of it, so a
# stolen key still cannot open a shell or forward to anything except
# the one app port. See $KeyOptions in dev-access.config.ps1.
#
# The whole file travels base64-encoded in both directions, so keys
# with Chinese (or mojibake) comments survive quoting intact.
# ============================================================

# Deliberately NOT 'Stop'. ssh writes ordinary progress and failure text to
# stderr, and under 'Stop' PowerShell promotes that to a terminating exception
# which escapes the WinForms event loop and kills the app with a .NET crash
# dialog. A dropped link over the mainland route is routine; it must surface as
# a red status line, not a crash. Every ssh call below is wrapped instead.
$ErrorActionPreference = 'Continue'

# ---- settings --------------------------------------------------------
# Inline on purpose: this file is copied between folders, so it must run with
# nothing beside it except its .bat launcher.
$Server     = '106.55.2.218'          # Tencent Lighthouse, Guangzhou zone 4
$AdminUser  = 'ubuntu'                # your admin account on the VM
$RemotePort = 3001                    # the app port on the VM's loopback
$KeysFile   = '/home/devtunnel/.ssh/authorized_keys'

# Options written in front of every key we add. A second line of defence: even
# if the sshd Match block is lost in a rebuild, a key carrying these options
# still cannot open a shell or forward anywhere except the one app port.
$KeyOptions = "restrict,port-forwarding,permitopen=`"127.0.0.1:$RemotePort`""

$SshOpts = @(
    '-o', 'ConnectTimeout=10',
    '-o', 'ServerAliveInterval=5',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'BatchMode=yes'
)

# Optional override file beside this script. Absence is normal, never an error.
$cfg = Join-Path $PSScriptRoot 'dev-access.config.ps1'
if (Test-Path $cfg) { . $cfg }

$Target = "$AdminUser@$Server"

[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$script:Lines = @()   # current authorized_keys lines (source of truth after each fetch)

function Fetch-Keys {
    # Returns $null when the server could not be reached, an array otherwise
    # (an empty array is a legitimate answer: nobody is authorized yet).
    # base64 out so multibyte comments arrive undamaged.
    try {
        $b64 = ssh @SshOpts $Target "sudo base64 -w0 $KeysFile 2>/dev/null" 2>$null
        if ($LASTEXITCODE -ne 0) { return $null }
        if (-not $b64) { return @() }
        $text = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64))
        return @($text -split "`n" | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('#') })
    } catch {
        return $null
    }
}

function Push-Keys([string[]]$lines) {
    # Writes the whole file atomically via base64 (no quoting pitfalls).
    # Returns $false on any failure; the caller must leave the list untouched.
    try {
        $text = ($lines -join "`n") + "`n"
        $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text))
        $null = ssh @SshOpts $Target "echo $b64 | base64 -d | sudo tee $KeysFile >/dev/null && sudo chown devtunnel:devtunnel $KeysFile && sudo chmod 600 $KeysFile && echo PUSH_OK" 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Parse-KeyLine([string]$line) {
    # An authorized_keys line may start with an options field, so we cannot
    # assume the key type is the first token. Find the first token that looks
    # like a key type and read type / blob / comment from there.
    $parts = $line.Trim() -split '\s+'
    $i = 0
    while ($i -lt $parts.Count -and $parts[$i] -notmatch '^(ssh-(ed25519|rsa|dss)|ecdsa-sha2-\S+|sk-\S+)$') { $i++ }
    if ($i -ge $parts.Count) { return $null }
    return [pscustomobject]@{
        Options = if ($i -gt 0) { ($parts[0..($i-1)] -join ' ') } else { '' }
        Type    = $parts[$i]
        Blob    = if ($parts.Count -gt $i + 1) { $parts[$i + 1] } else { '' }
        Comment = if ($parts.Count -gt $i + 2) { ($parts[($i + 2)..($parts.Count - 1)] -join ' ') } else { '' }
    }
}

function Row-Label([string]$line) {
    $k = Parse-KeyLine $line
    if (-not $k) { return "(unreadable line) $line" }
    $comment = if ($k.Comment) { $k.Comment } else { '(no name)' }
    $tail    = if ($k.Blob.Length -gt 12) { $k.Blob.Substring($k.Blob.Length - 12) } else { $k.Blob }
    $locked  = if ($k.Options) { 'restricted' } else { 'NO OPTIONS' }
    return "$comment    [$($k.Type) ...$tail]  ($locked)"
}

function Get-Hwid([string]$comment) {
    # The wizard appends -xxxxxxxx (first 8 hex of the machine UUID) to the
    # key comment. Two rows with the same hwid mean a copied private key.
    if ($comment -match '-([0-9A-Fa-f]{8})$') { return $Matches[1].ToUpper() }
    return ''
}

# ---------------- UI ----------------

$form = New-Object Windows.Forms.Form
$form.Text = "Hualong dev access manager - devtunnel keys on $Server"
$form.Size = New-Object Drawing.Size(700, 500)
$form.StartPosition = 'CenterScreen'
$form.Font = New-Object Drawing.Font('Microsoft YaHei UI', 9)

$list = New-Object Windows.Forms.ListBox
$list.Location = New-Object Drawing.Point(12, 40)
$list.Size = New-Object Drawing.Size(660, 220)
$list.HorizontalScrollbar = $true

$lblTop = New-Object Windows.Forms.Label
$lblTop.Text = 'Machines that can open the DEV tunnel (one key = one computer):'
$lblTop.Location = New-Object Drawing.Point(12, 14)
$lblTop.AutoSize = $true

$lblAdd = New-Object Windows.Forms.Label
$lblAdd.Text = 'Paste a public key (one line, starts with ssh-ed25519 / ssh-rsa):'
$lblAdd.Location = New-Object Drawing.Point(12, 272)
$lblAdd.AutoSize = $true

$txtAdd = New-Object Windows.Forms.TextBox
$txtAdd.Location = New-Object Drawing.Point(12, 294)
$txtAdd.Size = New-Object Drawing.Size(660, 24)

$btnAdd = New-Object Windows.Forms.Button
$btnAdd.Text = 'Add key'
$btnAdd.Location = New-Object Drawing.Point(12, 328)
$btnAdd.Size = New-Object Drawing.Size(110, 32)

$btnRemove = New-Object Windows.Forms.Button
$btnRemove.Text = 'Remove selected'
$btnRemove.Location = New-Object Drawing.Point(132, 328)
$btnRemove.Size = New-Object Drawing.Size(130, 32)

$btnRefresh = New-Object Windows.Forms.Button
$btnRefresh.Text = 'Refresh'
$btnRefresh.Location = New-Object Drawing.Point(272, 328)
$btnRefresh.Size = New-Object Drawing.Size(90, 32)

$status = New-Object Windows.Forms.Label
$status.Location = New-Object Drawing.Point(12, 375)
$status.Size = New-Object Drawing.Size(660, 70)
$status.Text = 'Loading...'

$form.Controls.AddRange(@($lblTop, $list, $lblAdd, $txtAdd, $btnAdd, $btnRemove, $btnRefresh, $status))

function Set-Busy([bool]$busy, [string]$msg) {
    foreach ($b in @($btnAdd, $btnRemove, $btnRefresh)) { $b.Enabled = -not $busy }
    if ($msg) { $status.Text = $msg }
    $form.Refresh()
}

# Last-resort guard. Anything a handler throws lands here as a status line
# instead of a .NET crash dialog, so one dropped packet never ends the session.
function Invoke-Guarded([scriptblock]$body) {
    try { & $body }
    catch {
        $status.Text = "Unexpected error: $($_.Exception.Message)`r`nNothing was changed. Click Refresh to retry."
        foreach ($b in @($btnAdd, $btnRemove, $btnRefresh)) { $b.Enabled = $true }
    }
}

function Reload-List {
    Set-Busy $true 'Contacting server...'
    $fetched = Fetch-Keys
    if ($null -eq $fetched) {
        Set-Busy $false "Could not reach $Target — timed out or refused.`r`nUsual causes: the mainland link dropped, or your admin key is not on this PC.`r`nNothing was changed. Click Refresh to retry."
        return
    }
    $script:Lines = $fetched
    $list.Items.Clear()
    foreach ($l in $script:Lines) { [void]$list.Items.Add((Row-Label $l)) }

    # Warn about two rows that report the same machine - a copied private key.
    $hwids = @($script:Lines | ForEach-Object { Get-Hwid (Parse-KeyLine $_).Comment } | Where-Object { $_ })
    $dupes = @($hwids | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name })
    $warn = if ($dupes.Count) { "  WARNING: same machine id on more than one key: $($dupes -join ', ')" } else { '' }

    Set-Busy $false "$($script:Lines.Count) key(s) on $Server.`r`nTeammates get their key from tools\dev-access-wizard.bat (it lands in their clipboard).$warn"
}

$btnRefresh.Add_Click({ Invoke-Guarded { Reload-List } })

$btnAdd.Add_Click({ Invoke-Guarded {
    $key = $txtAdd.Text.Trim()
    if ($key -match 'PRIVATE KEY') {
        $status.Text = 'STOP: that is a PRIVATE key. Never accept one. Ask for the .pub contents.'
        return
    }
    $parsed = Parse-KeyLine $key
    if (-not $parsed -or $parsed.Blob -notmatch '^[A-Za-z0-9+/=]{20,}$') {
        $status.Text = 'That does not look like a public key line (must contain ssh-ed25519 / ssh-rsa + a long blob).'
        return
    }
    if ($script:Lines | Where-Object { $_ -match [regex]::Escape($parsed.Blob) }) {
        $status.Text = 'That key is already authorized.'
        return
    }
    # Rebuild the line ourselves so our own options always win, whatever the
    # teammate pasted.
    $clean = "$KeyOptions $($parsed.Type) $($parsed.Blob) $($parsed.Comment)".Trim()

    $hw = Get-Hwid $parsed.Comment
    if ($hw -and ($script:Lines | Where-Object { (Get-Hwid (Parse-KeyLine $_).Comment) -eq $hw })) {
        $ans = [Windows.Forms.MessageBox]::Show(
            "A key from machine id $hw is already authorized.`n`nThis usually means the same PC ran the wizard twice, or a private key was copied to a second PC.`n`nAdd it anyway?",
            'Duplicate machine id', 'YesNo', 'Warning')
        if ($ans -ne 'Yes') { return }
    }

    Set-Busy $true 'Adding...'
    if (Push-Keys (@($script:Lines) + $clean)) {
        $txtAdd.Text = ''
        Reload-List
        $status.Text = 'Added. Tell them: "added - run the wizard again".'
    } else {
        Set-Busy $false 'Add failed (server unreachable?). Nothing was changed - retry.'
    }
}})

$btnRemove.Add_Click({ Invoke-Guarded {
    $i = $list.SelectedIndex
    if ($i -lt 0) { $status.Text = 'Select a row first.'; return }
    $victim = Row-Label $script:Lines[$i]
    $ok = [Windows.Forms.MessageBox]::Show(
        "Remove access for:`n`n$victim`n`nTheir wizard will stop connecting immediately.",
        'Confirm removal', 'YesNo', 'Warning')
    if ($ok -ne 'Yes') { return }
    Set-Busy $true 'Removing...'
    $keep = @()
    for ($j = 0; $j -lt $script:Lines.Count; $j++) { if ($j -ne $i) { $keep += $script:Lines[$j] } }
    if (Push-Keys $keep) {
        Reload-List
        $status.Text = 'Removed.'
    } else {
        Set-Busy $false 'Remove failed (server unreachable?). Nothing was changed - retry.'
    }
}})

$form.Add_Shown({ Invoke-Guarded { Reload-List } })
[void]$form.ShowDialog()
