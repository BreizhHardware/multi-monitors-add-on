/*
Copyright (C) 2014  spin83

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, visit https://www.gnu.org/licenses/.
*/

import Clutter from "gi://Clutter";
import Gio from "gi://Gio";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import { ANIMATION_TIME } from "resource:///org/gnome/shell/ui/overview.js";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

import * as Config from "resource:///org/gnome/shell/misc/config.js";
const GNOME_SHELL_VERSION = Config.PACKAGE_VERSION.split(".");

import * as Convenience from "./convenience.js";

import * as MMLayout from "./mmlayout.js";
import * as MMOverview from "./mmoverview.js";
import * as MMIndicator from "./indicator.js";

const OVERRIDE_SCHEMA = "org.gnome.shell.overrides";
const MUTTER_SCHEMA = "org.gnome.mutter";
const WORKSPACES_ONLY_ON_PRIMARY_ID = "workspaces-only-on-primary";

const SHOW_INDICATOR_ID = "show-indicator";
const THUMBNAILS_SLIDER_POSITION_ID = "thumbnails-slider-position";

export function copyClass(s, d) {
	//    global.log(s.name +" > "+ d.name);
	if (!s) throw Error(`copyClass s undefined for d ${d.name}`);
	let propertyNames = Reflect.ownKeys(s.prototype);
	for (let pName of propertyNames.values()) {
		//        global.log(" ) "+pName.toString());
		if (typeof pName === "symbol") continue;
		if (d.prototype.hasOwnProperty(pName)) continue;
		if (pName === "prototype") continue;
		if (pName === "constructor") continue;
		//        global.log(pName);
		let pDesc = Reflect.getOwnPropertyDescriptor(s.prototype, pName);
		//        global.log(typeof pDesc);
		if (typeof pDesc !== "object") continue;
		Reflect.defineProperty(d.prototype, pName, pDesc);
	}
}

export function gnomeShellVersion() {
	return GNOME_SHELL_VERSION;
}

export class MultiMonitorsAddOn extends Extension {
	constructor() {
		this._settings = Convenience.getSettings();
		//        this._ov_settings = new Gio.Settings({ schema: OVERRIDE_SCHEMA });
		this._mu_settings = new Gio.Settings({ schema: MUTTER_SCHEMA });

		this.mmIndicator = null;
		Main.mmOverview = null;
		Main.mmLayoutManager = null;

		this._mmMonitors = 0;
		this.syncWorkspacesActualGeometry = null;
	}

	_showIndicator() {
		if (this._settings.get_boolean(SHOW_INDICATOR_ID)) {
			if (!this.mmIndicator) {
				this.mmIndicator = Main.panel.addToStatusArea(
					"MultiMonitorsAddOn",
					new MMIndicator.MultiMonitorsIndicator(),
				);
			}
		} else {
			this._hideIndicator();
		}
	}

	_hideIndicator() {
		if (this.mmIndicator) {
			this.mmIndicator.destroy();
			this.mmIndicator = null;
		}
	}

	_showThumbnailsSlider() {
		if (this._settings.get_string(THUMBNAILS_SLIDER_POSITION_ID) === "none") {
			this._hideThumbnailsSlider();
			return;
		}

		//		if(this._ov_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID))
		//			this._ov_settings.set_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID, false);
		if (this._mu_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID))
			this._mu_settings.set_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID, false);

		if (Main.mmOverview) return;

		Main.mmOverview = [];
		for (let idx = 0; idx < Main.layoutManager.monitors.length; idx++) {
			if (idx != Main.layoutManager.primaryIndex) {
				Main.mmOverview[idx] = new MMOverview.MultiMonitorsOverview(idx);
			}
		}

		this.syncWorkspacesActualGeometry =
			Main.overview.searchController._workspacesDisplay._syncWorkspacesActualGeometry;
		Main.overview.searchController._workspacesDisplay._syncWorkspacesActualGeometry =
			function () {
				if (this._inWindowFade) return;

				const primaryView = this._getPrimaryView();
				if (primaryView) {
					primaryView.ease({
						...this._actualGeometry,
						duration: Main.overview.animationInProgress ? ANIMATION_TIME : 0,
						mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					});
				}

				for (let idx = 0; idx < Main.mmOverview.length; idx++) {
					if (!Main.mmOverview[idx]) continue;
					if (!Main.mmOverview[idx]._overview) continue;
					const mmView =
						Main.mmOverview[idx]._overview._controls._workspacesViews;
					if (!mmView) continue;

					const mmGeometry = Main.mmOverview[idx].getWorkspacesActualGeometry();
					mmView.ease({
						...mmGeometry,
						duration: Main.overview.animationInProgress ? ANIMATION_TIME : 0,
						mode: Clutter.AnimationMode.EASE_OUT_QUAD,
					});
				}
			};
	}

	_hideThumbnailsSlider() {
		if (!Main.mmOverview) return;

		for (let idx = 0; idx < Main.mmOverview.length; idx++) {
			if (Main.mmOverview[idx]) Main.mmOverview[idx].destroy();
		}
		Main.mmOverview = null;
		Main.overview.searchController._workspacesDisplay._syncWorkspacesActualGeometry =
			this.syncWorkspacesActualGeometry;
	}

	_relayout() {
		if (this._mmMonitors != Main.layoutManager.monitors.length) {
			this._mmMonitors = Main.layoutManager.monitors.length;
			global.log("pi:" + Main.layoutManager.primaryIndex);
			for (let i = 0; i < Main.layoutManager.monitors.length; i++) {
				let monitor = Main.layoutManager.monitors[i];
				global.log(
					"i:" +
					i +
					" x:" +
					monitor.x +
					" y:" +
					monitor.y +
					" w:" +
					monitor.width +
					" h:" +
					monitor.height,
				);
			}
			this._hideThumbnailsSlider();
			this._showThumbnailsSlider();
		}
	}

	_switchOffThumbnails() {
		if (
			//            this._ov_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID) ||
			this._mu_settings.get_boolean(WORKSPACES_ONLY_ON_PRIMARY_ID)
		) {
			this._settings.set_string(THUMBNAILS_SLIDER_POSITION_ID, "none");
		}
	}

	enable(version) {
		global.log("Enable Multi Monitors Add-On (" + version + ")...");

		if (Main.panel.statusArea.MultiMonitorsAddOn) disable();

		this._mmMonitors = 0;

		//		this._switchOffThumbnailsOvId = this._ov_settings.connect('changed::'+WORKSPACES_ONLY_ON_PRIMARY_ID,
		//																	this._switchOffThumbnails.bind(this));
		this._switchOffThumbnailsMuId = this._mu_settings.connect(
			"changed::" + WORKSPACES_ONLY_ON_PRIMARY_ID,
			this._switchOffThumbnails.bind(this),
		);

		this._showIndicatorId = this._settings.connect(
			"changed::" + SHOW_INDICATOR_ID,
			this._showIndicator.bind(this),
		);
		this._showIndicator();

		Main.mmLayoutManager = new MMLayout.MultiMonitorsLayoutManager();
		this._showPanelId = this._settings.connect(
			"changed::" + MMLayout.SHOW_PANEL_ID,
			Main.mmLayoutManager.showPanel.bind(Main.mmLayoutManager),
		);
		Main.mmLayoutManager.showPanel();

		this._thumbnailsSliderPositionId = this._settings.connect(
			"changed::" + THUMBNAILS_SLIDER_POSITION_ID,
			this._showThumbnailsSlider.bind(this),
		);
		this._relayoutId = Main.layoutManager.connect(
			"monitors-changed",
			this._relayout.bind(this),
		);
		this._relayout();
	}

	disable() {
		Main.layoutManager.disconnect(this._relayoutId);
		//		this._ov_settings.disconnect(this._switchOffThumbnailsOvId);
		this._mu_settings.disconnect(this._switchOffThumbnailsMuId);

		this._settings.disconnect(this._showPanelId);
		this._settings.disconnect(this._thumbnailsSliderPositionId);
		this._settings.disconnect(this._showIndicatorId);

		this._hideIndicator();

		Main.mmLayoutManager.hidePanel();
		Main.mmLayoutManager = null;

		this._hideThumbnailsSlider();
		this._mmMonitors = 0;

		global.log("Disable Multi Monitors Add-On ...");
	}
}

var multiMonitorsAddOn = null;
var version = null;

export function init() {
	Convenience.initTranslations();

	// fix bug in panel: Destroy function many time added to this same indicator.
	Main.panel._ensureIndicator = function (role) {
		let indicator = this.statusArea[role];
		if (indicator) {
			indicator.container.show();
			return null;
		} else {
			let constructor = PANEL_ITEM_IMPLEMENTATIONS[role];
			if (!constructor) {
				// This icon is not implemented (this is a bug)
				return null;
			}
			indicator = new constructor(this);
			this.statusArea[role] = indicator;
		}
		return indicator;
	};

	const metaVersion = MultiMonitors.metadata["version"];
	if (Number.isFinite(metaVersion)) {
		version = "v" + Math.trunc(metaVersion);
		switch (Math.round((metaVersion % 1) * 10)) {
			case 0:
				break;
			case 1:
				version += "+bugfix";
				break;
			case 2:
				version += "+develop";
				break;
			default:
				version += "+modified";
				break;
		}
	} else version = metaVersion;
}

export function enable() {
	if (multiMonitorsAddOn !== null) return;

	multiMonitorsAddOn = new MultiMonitorsAddOn();
	multiMonitorsAddOn.enable(version);
}

export function disable() {
	if (multiMonitorsAddOn == null) return;

	multiMonitorsAddOn.disable();
	multiMonitorsAddOn = null;
}
