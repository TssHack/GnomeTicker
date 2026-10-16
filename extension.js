import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import {
    API_URL, MAX_PINNED,
    tr, makeKey, splitKey, displayName, shortName,
    parseNumber, formatNumber, formatPercent, trendOf,
} from './data.js';

const RETRY_SECONDS = 60;
const STALE_ON_OPEN_SECONDS = 120;
const REQUEST_TIMEOUT_SECONDS = 15;

const Indicator = GObject.registerClass(
class GnomeTickerIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'GnomeTicker', false);

        this._ext = extension;
        this._settings = extension.getSettings();
        this._destroyed = false;
        this._busy = false;
        this._failed = false;
        this._lastUpdate = 0;       // unix seconds
        this._data = {};            // faCategory -> faItem -> raw value
        this._values = {};          // key -> {cur, prev}
        this._rows = [];            // [{key, actor, ...}]
        this._categories = [];      // [{header, list, rows}]
        this._sources = new Set();  // active GLib sources
        this._refreshTimer = 0;
        this._statusTimer = 0;

        this._cacheFile = Gio.File.new_for_path(GLib.build_filenamev([
            GLib.get_user_cache_dir(), 'gnometicker@tsshack', 'cache.json',
        ]));

        this._session = new Soup.Session({timeout: REQUEST_TIMEOUT_SECONDS});
        this._session.user_agent = 'GnomeTicker/1.1';
        this._cancellable = null;

        this._buildTopBar();
        this._buildMenu();

        this._settingsIds = [];
        for (const key of ['language', 'pinned', 'compact-topbar', 'show-trend-topbar']) {
            this._settingsIds.push(this._settings.connect(`changed::${key}`, () => {
                this._applyStrings();
                this._renderAll();
            }));
        }
        this._settingsIds.push(this._settings.connect('changed::refresh-minutes',
            () => this._scheduleRefresh()));

        this.menu.connect('open-state-changed', (_menu, open) => this._onMenuToggle(open));

        this._applyStrings();
        this._renderAll();
        this._loadCache();
        this._refresh();
    }

    // ---------------------------------------------------------------- helpers
    get _lang() {
        return this._settings.get_string('language');
    }

    _t(id, ...args) {
        return tr(this._lang, id, ...args);
    }

    _pinned() {
        return this._settings.get_strv('pinned');
    }

    _later(ms, fn) {
        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            this._sources.delete(id);
            if (!this._destroyed)
                fn();
            return GLib.SOURCE_REMOVE;
        });
        this._sources.add(id);
        return id;
    }

    _cancelLater(id) {
        if (!id)
            return;
        if (this._sources.delete(id))
            GLib.source_remove(id);
    }

    _timeString(unixSeconds) {
        return GLib.DateTime.new_from_unix_local(unixSeconds).format('%H:%M');
    }

    // ---------------------------------------------------------------- top bar
    _buildTopBar() {
        this._topBox = new St.BoxLayout({
            style_class: 'gticker-top-box',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._topBox);
    }

    _renderTopBar() {
        this._topBox.destroy_all_children();
        this._topBox.add_child(new St.Icon({
            gicon: Gio.icon_new_for_string(`${this._ext.path}/icons/gnometicker-symbolic.svg`),
            style_class: 'gticker-top-icon',
            y_align: Clutter.ActorAlign.CENTER,
        }));

        const compact = this._settings.get_boolean('compact-topbar');
        const showTrend = this._settings.get_boolean('show-trend-topbar');

        this._pinned().forEach((key, i) => {
            const [, faItem] = splitKey(key);
            const v = this._values[key];
            const trend = v ? trendOf(v.cur, v.prev) : trendOf(0, 0);

            if (i > 0) {
                this._topBox.add_child(new St.Label({
                    text: '·',
                    style_class: 'gticker-separator',
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            }
            this._topBox.add_child(new St.Label({
                text: shortName(faItem),
                style_class: 'gticker-top-name',
                y_align: Clutter.ActorAlign.CENTER,
            }));
            this._topBox.add_child(new St.Label({
                text: v ? formatNumber(v.cur, this._lang, compact) : '…',
                style_class: 'gticker-top-value',
                y_align: Clutter.ActorAlign.CENTER,
            }));
            if (showTrend && trend.pct !== null) {
                this._topBox.add_child(new St.Label({
                    text: trend.arrow,
                    style_class: `gticker-top-trend ${trend.cls}`,
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            }
        });
    }

    // ------------------------------------------------------------------- menu
    _buildMenu() {
        this._page = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'gticker-page'});
        const item = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, x_expand: true});
        item.add_child(this._page);
        this.menu.box.add_child(item);

        // Header
        const header = new St.BoxLayout({style_class: 'gticker-header'});
        this._title = new St.Label({
            text: 'GnomeTicker',
            style_class: 'gticker-title',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const btnBox = new St.BoxLayout({style_class: 'gticker-btn-box'});

        this._refreshIcon = new St.Icon({icon_name: 'view-refresh-symbolic', icon_size: 16});
        this._refreshIcon.set_pivot_point(0.5, 0.5);
        this._refreshBtn = new St.Button({
            style_class: 'gticker-icon-btn',
            can_focus: true,
            child: this._refreshIcon,
        });
        this._refreshBtn.connect('clicked', () => this._refresh(true));

        this._settingsBtn = new St.Button({
            style_class: 'gticker-icon-btn',
            can_focus: true,
            child: new St.Icon({icon_name: 'emblem-system-symbolic', icon_size: 16}),
        });
        this._settingsBtn.connect('clicked', () => {
            this.menu.close();
            this._ext.openPreferences();
        });

        btnBox.add_child(this._refreshBtn);
        btnBox.add_child(this._settingsBtn);
        header.add_child(this._title);
        header.add_child(btnBox);
        this._page.add_child(header);

        // Pinned summary cards
        this._summary = new St.BoxLayout({style_class: 'gticker-summary'});
        this._page.add_child(this._summary);

        // Search
        this._searchEntry = new St.Entry({
            style_class: 'gticker-search',
            can_focus: true,
            x_expand: true,
        });
        const searchIcon = new St.Icon({icon_name: 'edit-find-symbolic', style_class: 'gticker-search-icon'});
        this._searchEntry.set_primary_icon(searchIcon);
        this._searchEntry.clutter_text.connect('text-changed', () => this._filterRows());
        this._searchEntry.clutter_text.connect('key-press-event', (_actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape && this._searchEntry.get_text() !== '') {
                this._searchEntry.set_text('');
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._page.add_child(this._searchEntry);

        // List
        this._scrollView = new St.ScrollView({
            style_class: 'gticker-scroll',
            hscrollbar_policy: St.PolicyType.NEVER,
            vscrollbar_policy: St.PolicyType.AUTOMATIC,
            overlay_scrollbars: true,
            x_expand: true,
        });
        this._contentBox = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'gticker-content'});
        this._scrollView.add_child(this._contentBox);
        this._page.add_child(this._scrollView);

        // Footer
        const footer = new St.BoxLayout({style_class: 'gticker-footer', orientation: Clutter.Orientation.VERTICAL});
        this._statusLabel = new St.Label({style_class: 'gticker-status-label'});
        this._hintLabel = new St.Label({style_class: 'gticker-hint-label'});
        footer.add_child(this._statusLabel);
        footer.add_child(this._hintLabel);
        this._page.add_child(footer);
    }

    _applyStrings() {
        this._searchEntry.hint_text = this._t('search');
        this._refreshBtn.accessible_name = this._t('refresh');
        this._settingsBtn.accessible_name = this._t('settings');
        this._hintLabel.set_text(this._t('hint'));
        this._renderStatus();
    }

    _onMenuToggle(open) {
        if (open) {
            this._later(60, () => this._searchEntry.clutter_text.grab_key_focus());
            const age = GLib.get_real_time() / 1e6 - this._lastUpdate;
            if (!this._busy && age > STALE_ON_OPEN_SECONDS)
                this._refresh();
        } else {
            this._searchEntry.set_text('');
        }
    }

    // ----------------------------------------------------------------- render
    _renderAll() {
        this._renderTopBar();
        this._renderSummary();
        this._renderList();
        this._renderStatus();
    }

    _renderSummary() {
        this._summary.destroy_all_children();
        const pinned = this._pinned();

        if (pinned.length === 0) {
            this._summary.add_child(new St.Label({
                text: this._t('pinEmpty'),
                style_class: 'gticker-summary-empty',
                x_expand: true,
            }));
            return;
        }

        pinned.forEach((key, i) => {
            const [, faItem] = splitKey(key);
            const v = this._values[key];
            const trend = v ? trendOf(v.cur, v.prev) : trendOf(0, 0);

            const card = new St.BoxLayout({
                orientation: Clutter.Orientation.VERTICAL,
                x_expand: true,
                style_class: `gticker-summary-card${i === 0 ? ' gticker-summary-card--accent' : ''}`,
            });
            const label = new St.Label({
                text: shortName(faItem),
                style_class: 'gticker-summary-label',
            });
            const value = new St.Label({
                text: v ? formatNumber(v.cur, this._lang) : '…',
                style_class: 'gticker-summary-value',
            });
            const change = new St.Label({
                text: trend.pct === null ? ' ' : `${trend.arrow} ${formatPercent(trend.pct, this._lang)}`,
                style_class: `gticker-summary-change ${trend.cls}`,
            });
            value.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
            card.add_child(label);
            card.add_child(value);
            card.add_child(change);
            this._summary.add_child(card);
        });
    }

    _clearList() {
        for (const row of this._rows)
            this._cancelLater(row.copyTimer);
        this._rows = [];
        this._categories = [];
        this._noResults = null;
        this._contentBox.destroy_all_children();
    }

    _scrollValue() {
        try {
            return this._scrollView.vscroll.adjustment.value;
        } catch (_e) {
            return 0;
        }
    }

    _restoreScroll(value) {
        if (!value)
            return;
        this._later(0, () => {
            try {
                const adj = this._scrollView.vscroll.adjustment;
                adj.value = Math.min(value, Math.max(0, adj.upper - adj.page_size));
            } catch (_e) { /* ignore */ }
        });
    }

    _renderList() {
        const scroll = this._scrollValue();
        this._clearList();

        const categories = Object.keys(this._data);
        if (categories.length === 0) {
            this._renderPlaceholder();
            return;
        }

        const lang = this._lang;
        const pinned = new Set(this._pinned());

        for (const faCat of categories) {
            const items = this._data[faCat];
            const header = new St.Label({
                text: displayName(lang, faCat),
                style_class: 'gticker-cat-header',
            });
            const list = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, style_class: 'gticker-list-container'});
            const cat = {header, list, rows: []};

            for (const faItem of Object.keys(items)) {
                const key = makeKey(faCat, faItem);
                const row = this._makeRow(key, faCat, faItem, pinned.has(key));
                list.add_child(row.actor);
                cat.rows.push(row);
                this._rows.push(row);
            }

            this._contentBox.add_child(header);
            this._contentBox.add_child(list);
            this._categories.push(cat);
        }

        this._noResults = new St.Label({style_class: 'gticker-empty', visible: false});
        this._contentBox.add_child(this._noResults);

        this._filterRows();
        this._restoreScroll(scroll);
    }

    _renderPlaceholder() {
        const box = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            x_expand: true,
            style_class: 'gticker-placeholder',
        });
        if (this._failed && !this._busy) {
            box.add_child(new St.Icon({icon_name: 'network-offline-symbolic', icon_size: 32, style_class: 'gticker-placeholder-icon'}));
            box.add_child(new St.Label({text: this._t('noData'), style_class: 'gticker-placeholder-title'}));
            box.add_child(new St.Label({text: this._t('noDataHint'), style_class: 'gticker-placeholder-sub'}));
            const retry = new St.Button({
                style_class: 'gticker-retry-btn',
                can_focus: true,
                x_align: Clutter.ActorAlign.CENTER,
                label: this._t('retry'),
            });
            retry.connect('clicked', () => this._refresh(true));
            box.add_child(retry);
        } else {
            box.add_child(new St.Label({text: this._t('loading'), style_class: 'gticker-placeholder-title'}));
        }
        this._contentBox.add_child(box);
    }

    _makeRow(key, faCat, faItem, isPinned) {
        const lang = this._lang;
        const name = displayName(lang, faItem);
        const v = this._values[key] ?? {cur: 0, prev: 0};
        const trend = trendOf(v.cur, v.prev);

        const actor = new St.BoxLayout({style_class: 'gticker-row', x_expand: true});

        const starIcon = new St.Icon({
            icon_name: isPinned ? 'starred-symbolic' : 'non-starred-symbolic',
            icon_size: 14,
        });
        const star = new St.Button({
            style_class: `gticker-star${isPinned ? ' gticker-star--on' : ''}`,
            can_focus: true,
            child: starIcon,
            y_align: Clutter.ActorAlign.CENTER,
        });
        star.connect('clicked', () => this._togglePin(key));

        const main = new St.Button({
            style_class: 'gticker-row-btn',
            can_focus: true,
            x_expand: true,
        });
        const layout = new St.BoxLayout({x_expand: true, y_align: Clutter.ActorAlign.CENTER});

        const arrow = new St.Label({
            text: trend.arrow,
            style_class: `gticker-trend ${trend.cls}`,
            y_align: Clutter.ActorAlign.CENTER,
        });
        const nameLabel = new St.Label({
            text: name,
            style_class: 'gticker-item-name',
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        nameLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
        const priceText = formatNumber(v.cur, lang);
        const price = new St.Label({
            text: priceText,
            style_class: 'gticker-item-price',
            y_align: Clutter.ActorAlign.CENTER,
        });
        const pct = new St.Label({
            text: trend.pct === null ? '' : formatPercent(trend.pct, lang),
            style_class: `gticker-item-pct ${trend.cls}`,
            y_align: Clutter.ActorAlign.CENTER,
        });

        layout.add_child(arrow);
        layout.add_child(nameLabel);
        layout.add_child(price);
        layout.add_child(pct);
        main.set_child(layout);
        main.accessible_name = `${name} ${priceText}`;

        const row = {
            key, actor, name,
            copyTimer: 0,
            search: [
                name, faItem, displayName('en', faItem),
                displayName(lang, faCat), faCat, displayName('en', faCat),
            ].join(' ').toLowerCase(),
        };

        main.connect('clicked', () => {
            if (!v.cur)
                return;
            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, String(v.cur));
            price.set_text(this._t('copied'));
            price.add_style_class_name('gticker-copied');
            this._cancelLater(row.copyTimer);
            row.copyTimer = this._later(1400, () => {
                row.copyTimer = 0;
                price.set_text(priceText);
                price.remove_style_class_name('gticker-copied');
            });
        });

        actor.add_child(star);
        actor.add_child(main);
        return row;
    }

    _renderStatus() {
        this._statusLabel.remove_style_class_name('gticker-status-warn');
        if (this._busy) {
            this._statusLabel.set_text(this._t('refreshing'));
        } else if (this._failed && this._lastUpdate) {
            this._statusLabel.add_style_class_name('gticker-status-warn');
            this._statusLabel.set_text(this._t('offline', this._timeString(this._lastUpdate)));
        } else if (this._lastUpdate) {
            this._statusLabel.set_text(this._t('updated', this._timeString(this._lastUpdate)));
        } else {
            this._statusLabel.set_text(this._failed ? this._t('noData') : this._t('loading'));
        }
    }

    _flashStatus(text) {
        this._cancelLater(this._statusTimer);
        this._statusLabel.add_style_class_name('gticker-status-warn');
        this._statusLabel.set_text(text);
        this._statusTimer = this._later(3500, () => {
            this._statusTimer = 0;
            this._renderStatus();
        });
    }

    _filterRows() {
        const query = this._searchEntry.get_text().trim().toLowerCase();
        let any = false;

        for (const cat of this._categories) {
            let catVisible = false;
            for (const row of cat.rows) {
                const visible = !query || row.search.includes(query);
                row.actor.visible = visible;
                catVisible ||= visible;
            }
            cat.header.visible = catVisible;
            cat.list.visible = catVisible;
            any ||= catVisible;
        }

        if (this._noResults) {
            this._noResults.visible = !any && query !== '';
            this._noResults.set_text(this._t('noResults', this._searchEntry.get_text().trim()));
        }
    }

    // ------------------------------------------------------------------- pins
    _togglePin(key) {
        const pinned = this._pinned();
        const idx = pinned.indexOf(key);
        if (idx >= 0) {
            pinned.splice(idx, 1);
        } else {
            if (pinned.length >= MAX_PINNED) {
                this._flashStatus(this._t('pinLimit', MAX_PINNED));
                return;
            }
            pinned.push(key);
        }
        // Triggers changed::pinned, which re-renders everything.
        this._settings.set_strv('pinned', pinned);
    }

    // ----------------------------------------------------------------- network
    _setBusy(busy) {
        this._busy = busy;
        if (busy) {
            this._refreshBtn.add_style_pseudo_class('busy');
            this._spin();
        } else {
            this._refreshBtn.remove_style_pseudo_class('busy');
            this._refreshIcon.remove_all_transitions();
            this._refreshIcon.rotation_angle_z = 0;
        }
        this._renderStatus();
    }

    _spin() {
        if (!this._busy || this._destroyed)
            return;
        this._refreshIcon.rotation_angle_z = 0;
        this._refreshIcon.ease({
            rotation_angle_z: 360,
            duration: 900,
            mode: Clutter.AnimationMode.LINEAR,
            onComplete: () => this._later(30, () => this._spin()),
        });
    }

    _scheduleRefresh(seconds = null) {
        if (this._refreshTimer) {
            GLib.source_remove(this._refreshTimer);
            this._sources.delete(this._refreshTimer);
            this._refreshTimer = 0;
        }
        const secs = seconds ?? Math.max(1, this._settings.get_int('refresh-minutes')) * 60;
        const id = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, secs, () => {
            this._sources.delete(id);
            this._refreshTimer = 0;
            this._refresh();
            return GLib.SOURCE_REMOVE;
        });
        this._sources.add(id);
        this._refreshTimer = id;
    }

    _refresh(manual = false) {
        if (this._destroyed)
            return;
        if (this._busy) {
            if (!manual)
                return;
            this._cancellable?.cancel();
        }

        this._setBusy(true);
        const cancellable = new Gio.Cancellable();
        this._cancellable = cancellable;

        const message = Soup.Message.new('GET', API_URL);
        message.request_headers.append('Accept', 'application/json');

        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, (session, res) => {
            let bytes;
            try {
                bytes = session.send_and_read_finish(res);
            } catch (e) {
                if (cancellable.is_cancelled() || this._destroyed)
                    return;
                this._onFailure(`request failed: ${e.message}`);
                return;
            }
            if (cancellable.is_cancelled() || this._destroyed)
                return;

            if (message.get_status() !== Soup.Status.OK) {
                this._onFailure(`HTTP ${message.get_status()}`);
                return;
            }

            let payload;
            try {
                payload = JSON.parse(new TextDecoder().decode(bytes.get_data()));
            } catch (e) {
                this._onFailure(`invalid JSON: ${e.message}`);
                return;
            }
            if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
                Object.keys(payload).length === 0) {
                this._onFailure('unexpected payload');
                return;
            }
            this._onSuccess(payload);
        });
    }

    _onFailure(reason) {
        console.warn(`GnomeTicker: ${reason}`);
        this._failed = true;
        this._setBusy(false);
        this._scheduleRefresh(RETRY_SECONDS);
        if (Object.keys(this._data).length === 0)
            this._renderList();
    }

    _onSuccess(payload) {
        this._failed = false;
        this._ingest(payload);
        this._lastUpdate = Math.floor(GLib.get_real_time() / 1e6);
        this._setBusy(false);
        this._scheduleRefresh();
        this._renderAll();
        this._saveCache();
    }

    // Normalise the payload, tracking the last price *change* per item so the
    // trend stays visible even when a refresh brings no movement.
    _ingest(payload) {
        const data = {};
        const values = {};
        for (const [faCat, items] of Object.entries(payload)) {
            if (!items || typeof items !== 'object' || Array.isArray(items))
                continue;
            data[faCat] = {};
            for (const [faItem, raw] of Object.entries(items)) {
                const key = makeKey(faCat, faItem);
                const cur = parseNumber(raw);
                const old = this._values[key];
                let prev = 0;
                if (old)
                    prev = (cur !== old.cur && old.cur) ? old.cur : old.prev;
                data[faCat][faItem] = raw;
                values[key] = {cur, prev};
            }
        }
        this._data = data;
        this._values = values;
    }

    // ------------------------------------------------------------------ cache
    _loadCache() {
        this._cacheFile.load_contents_async(null, (file, res) => {
            if (this._destroyed)
                return;
            try {
                const [, contents] = file.load_contents_finish(res);
                const cache = JSON.parse(new TextDecoder().decode(contents));
                // Only use the cache if a live refresh hasn't already landed.
                if (this._lastUpdate || !cache?.data || !cache?.values)
                    return;
                this._data = cache.data;
                this._values = cache.values;
                this._lastUpdate = Number(cache.time) || 0;
                this._renderAll();
            } catch (_e) { /* no cache yet */ }
        });
    }

    _saveCache() {
        try {
            const dir = this._cacheFile.get_parent();
            if (!dir.query_exists(null))
                dir.make_directory_with_parents(null);
            const json = JSON.stringify({
                time: this._lastUpdate,
                data: this._data,
                values: this._values,
            });
            this._cacheFile.replace_contents_async(
                new TextEncoder().encode(json), null, false,
                Gio.FileCreateFlags.REPLACE_DESTINATION, null,
                (file, res) => {
                    try {
                        file.replace_contents_finish(res);
                    } catch (e) {
                        console.warn(`GnomeTicker: cache write failed: ${e.message}`);
                    }
                });
        } catch (e) {
            console.warn(`GnomeTicker: cache write failed: ${e.message}`);
        }
    }

    // ---------------------------------------------------------------- teardown
    _onDestroy() {
        this._destroyed = true;
        this._cancellable?.cancel();
        this._session?.abort();
        this._session = null;

        for (const id of this._sources)
            GLib.source_remove(id);
        this._sources.clear();

        for (const id of this._settingsIds)
            this._settings.disconnect(id);
        this._settingsIds = [];
        this._settings = null;

        super._onDestroy();
    }
});

export default class GnomeTickerExtension extends Extension {
    enable() {
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
