import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {tr, splitKey, displayName} from './data.js';

const LANGUAGES = [['en', 'English'], ['fa', 'فارسی']];

export default class GnomeTickerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings; // keep alive for the window's lifetime
        window.set_default_size(560, 640);

        const lang = () => settings.get_string('language');
        const t = (id, ...a) => tr(lang(), id, ...a);

        const page = new Adw.PreferencesPage({
            title: 'GnomeTicker',
            icon_name: 'view-list-symbolic',
        });
        window.add(page);

        // ---- General
        const general = new Adw.PreferencesGroup({title: t('prefGeneral')});
        page.add(general);

        const interval = new Adw.SpinRow({
            title: t('prefRefresh'),
            subtitle: t('prefRefreshSub'),
            adjustment: new Gtk.Adjustment({
                lower: 1, upper: 60, step_increment: 1, page_increment: 5,
                value: settings.get_int('refresh-minutes'),
            }),
        });
        settings.bind('refresh-minutes', interval, 'value', Gio.SettingsBindFlags.DEFAULT);
        general.add(interval);

        const language = new Adw.ComboRow({
            title: t('prefLanguage'),
            subtitle: t('prefLanguageSub'),
            model: Gtk.StringList.new(LANGUAGES.map(l => l[1])),
        });
        language.selected = Math.max(0, LANGUAGES.findIndex(l => l[0] === lang()));
        language.connect('notify::selected', () => {
            settings.set_string('language', LANGUAGES[language.selected][0]);
        });
        general.add(language);

        const compact = new Adw.SwitchRow({
            title: t('prefCompact'),
            subtitle: t('prefCompactSub'),
        });
        settings.bind('compact-topbar', compact, 'active', Gio.SettingsBindFlags.DEFAULT);
        general.add(compact);

        const trend = new Adw.SwitchRow({title: t('prefTrend')});
        settings.bind('show-trend-topbar', trend, 'active', Gio.SettingsBindFlags.DEFAULT);
        general.add(trend);

        // ---- Pinned items
        const pinnedGroup = new Adw.PreferencesGroup({
            title: t('prefPinned'),
            description: t('prefPinnedSub'),
        });
        page.add(pinnedGroup);

        let pinnedRows = [];
        const renderPinned = () => {
            for (const row of pinnedRows)
                pinnedGroup.remove(row);
            pinnedRows = [];

            const pinned = settings.get_strv('pinned');
            if (pinned.length === 0) {
                const empty = new Adw.ActionRow({title: t('prefPinnedEmpty'), sensitive: false});
                pinnedGroup.add(empty);
                pinnedRows.push(empty);
                return;
            }

            for (const key of pinned) {
                const [faCat, faItem] = splitKey(key);
                const row = new Adw.ActionRow({
                    title: displayName(lang(), faItem),
                    subtitle: displayName(lang(), faCat),
                });
                const remove = new Gtk.Button({
                    icon_name: 'user-trash-symbolic',
                    valign: Gtk.Align.CENTER,
                    tooltip_text: t('prefRemove'),
                    css_classes: ['flat'],
                });
                remove.connect('clicked', () => {
                    settings.set_strv('pinned', settings.get_strv('pinned').filter(k => k !== key));
                });
                row.add_suffix(remove);
                pinnedGroup.add(row);
                pinnedRows.push(row);
            }
        };
        renderPinned();
        const pinnedId = settings.connect('changed::pinned', renderPinned);
        window.connect('close-request', () => settings.disconnect(pinnedId));

        // ---- About
        const about = new Adw.PreferencesGroup({title: t('prefAbout')});
        page.add(about);

        about.add(new Adw.ActionRow({title: t('prefDeveloper'), subtitle: 'Ehsan Fazli'}));
        about.add(this._linkRow(t('prefWebsite'), 'https://ehsanfazli.ir'));
        about.add(this._linkRow(t('prefSource'), 'https://github.com/tsshack/GnomeTicker'));
    }

    _linkRow(title, uri) {
        const row = new Adw.ActionRow({title, subtitle: uri, activatable: true});
        row.add_suffix(new Gtk.Image({icon_name: 'adw-external-link-symbolic'}));
        row.connect('activated', () => Gio.AppInfo.launch_default_for_uri(uri, null));
        return row;
    }
}
