# Multi Monitors Add-On

Extension inspired by https://github.com/darkxst/multiple-monitor-panels
and rewritten from scratch for gnome-shell version 3.10.4. Adds panels
and thumbnails for additional monitors. Settings changes are applied
in dynamic fashion, no restart needed.

# Versions

- Branch [master](https://github.com/breizhhardware/multi-monitors-add-on/tree/master) contains extension for GNOME 42, 43, 44 and 45

# Installation from git

```sh
# clone repo
git clone git@github.com:breizhhardware/multi-monitors-add-on.git
# cd into cloned repo
cd multi-monitors-add-on
# create a local shared gnome shell extensions dir
mkdir -p ~/.local/share/gnome-shell/extensions
# create a symbolic link in the extensions dir to this extension
ln -sr multi-monitors-add-on@breizhhardware ~/.local/share/gnome-shell/extensions
```

Restart the shell and then enable the extension.

# License

Multi Monitors Add-On extension is distributed under the terms of the
GNU General Public License, version 2 or later. See the LICENSE file for details.
