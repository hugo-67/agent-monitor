#!/usr/bin/env bash
# Path-scoped AppArmor exception for Agent Monitor AppImages on Ubuntu 24.04+.
# Does not disable AppArmor or system-wide user namespace restrictions.
set -euo pipefail

profile=/etc/apparmor.d/agent-monitor-appimage
marker="# Managed by Agent Monitor AppImage setup (path-scoped userns)"

if [[ $# -gt 0 && "$1" == "--remove" ]]; then
  if [[ ! -e "$profile" ]]; then
    echo "No Agent Monitor AppImage profile to remove."
    exit 0
  fi
  if ! sudo grep -Fxq "$marker" "$profile"; then
    echo "Refusing to delete a profile not created by this script." >&2
    exit 1
  fi
  sudo apparmor_parser -R "$profile" || true
  sudo rm -- "$profile"
  echo "Removed the Agent Monitor AppImage profile."
  exit 0
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: bash $0 /absolute/path/to/agent-monitor-*.AppImage" >&2
  echo "Uninstall: bash $0 --remove" >&2
  exit 2
fi
if ! command -v apparmor_parser >/dev/null 2>&1; then
  echo "AppArmor parser unavailable. Install it on Ubuntu: sudo apt install apparmor" >&2
  exit 1
fi

image=$(realpath -e -- "$1")
if [[ ! -f "$image" || ! -x "$image" ]]; then
  echo "Expected an existing executable AppImage at $image" >&2
  exit 1
fi
case "$(basename -- "$image")" in
  *agent-monitor*.AppImage) ;;
  *) echo "Expected an Agent Monitor .AppImage filename." >&2; exit 1 ;;
esac
# Refuse path characters that could be interpreted as profile syntax or globs.
if [[ "$image" == *'"'* || "$image" == *'\'* ||
      "$image" == *'*'* || "$image" == *'?'* ||
      "$image" == *'['* || "$image" == *']'* ||
      "$image" == *'{'* || "$image" == *'}'* ||
      "$image" == *$'\n'* || "$image" == *$'\r'* ]]; then
  echo "Special characters in AppImage path. Move it to a simpler path." >&2
  exit 1
fi
if [[ -e "$profile" ]] && ! sudo grep -Fxq "$marker" "$profile"; then
  echo "Refusing to overwrite an unrelated system AppArmor profile: $profile" >&2
  exit 1
fi

temp=$(mktemp)
trap 'rm -f -- "$temp"' EXIT
chmod 600 "$temp"
{
  printf '%s\n' "$marker"
  printf '%s\n' 'abi <abi/4.0>,' 'include <tunables/global>' ''
  printf 'profile agent-monitor-appimage "%s" flags=(unconfined) {\n' "$image"
  printf '%s\n' '  userns,' '  include if exists <local/agent-monitor-appimage>' '}'
} > "$temp"

# Check syntax before any privileged write. sudo is used only to install policy.
apparmor_parser -Q "$temp"
sudo install -o root -g root -m 0644 "$temp" "$profile"
sudo apparmor_parser -r "$profile"
echo "Installed a narrow AppArmor userns allowance for $image"
echo "Now launch: $image"
echo "Re-run setup after moving/renaming the AppImage."
echo "Undo: bash $0 --remove"
