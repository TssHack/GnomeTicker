import St from 'gi://St';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const API_URL = 'https://catplus.ir/api/tgju';

const TRANSLATIONS = {
    "طلا": "Gold",
    "سکه": "Coins",
    "ارزهای فیات": "Fiat Currencies",
    "شاخص‌ها و فلزات جهانی": "Global Indices & Metals",
    "اونس طلا (دلار)": "Gold Ounce (USD)",
    "مثقال طلا": "Gold Mithqal",
    "طلای ۱۸ عیار": "18K Gold",
    "طلای ۲۴ عیار": "24K Gold",
    "طلای آبشده": "Melted Gold",
    "طلای ۱۷ عیار": "17K Gold",
    "طلای ۷۴۰/۱۸ عیار": "740/18K Gold",
    "سکه امامی": "Emami Coin",
    "سکه بهار آزادی": "Bahar Azadi Coin",
    "نیم سکه": "Half Coin",
    "ربع سکه": "Quarter Coin",
    "سکه گرمی": "Gram Coin",
    "دلار آمریکا": "US Dollar",
    "یورو": "Euro",
    "پوند انگلیس": "British Pound",
    "درهم امارات": "UAE Dirham",
    "لیر ترکیه": "Turkish Lira",
    "یوان چین": "Chinese Yuan",
    "ین ژاپن": "Japanese Yen",
    "فرانک سوئیس": "Swiss Franc",
    "دلار کانادا": "Canadian Dollar",
    "دلار استرالیا": "Australian Dollar",
    "روبل روسیه": "Russian Ruble",
    "روپیه هند": "Indian Rupee",
    "دینار عراق": "Iraqi Dinar",
    "افغانی افغانستان": "Afghan Afghani",
    "ریال عربستان": "Saudi Riyal",
    "دینار کویت": "Kuwaiti Dinar",
    "ریال قطر": "Qatari Riyal",
    "ریال عمان": "Omani Rial",
    "دینار بحرین": "Bahraini Dinar",
    "کرون سوئد": "Swedish Krona",
    "کرون نروژ": "Norwegian Krone",
    "کرون دانمارک": "Danish Krone",
    "رینگیت مالزی": "Malaysian Ringgit",
    "بات تایلند": "Thai Baht",
    "دلار هنگ کنگ": "Hong Kong Dollar",
    "دلار سنگاپور": "Singapore Dollar",
    "درام ارمنستان": "Armenian Dram",
    "منات آذربایجان": "Azerbaijani Manat",
    "لاری گرجستان": "Georgian Lari",
    "نفت خام WTI (دلار)": "WTI Crude Oil (USD)",
    "نفت برنت (دلار)": "Brent Oil (USD)",
    "نقره جهانی (دلار)": "Global Silver (USD)",
    "پلاتین جهانی (دلار)": "Global Platinum (USD)",
    "پالادیوم جهانی (دلار)": "Global Palladium (USD)"
};

function formatCompact(str) {
    let num = parseInt(str.replace(/,/g, ''));
    if (isNaN(num)) return str;
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return str;
}

function parsePrice(str) {
    return parseInt(str.replace(/,/g, ''));
}

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'GnomeTicker', false);

        // --- Topbar ---
        this._topBox = new St.BoxLayout({ style_class: 'gticker-top-box', y_align: Clutter.ActorAlign.CENTER });
        this.add_child(this._topBox);

        this._topBox.add_child(new St.Icon({ icon_name: 'emblem-money-symbolic', icon_size: 16, style_class: 'gticker-top-icon' }));
        this._dollarLabel = new St.Label({ text: 'USD: ...', style_class: 'gticker-top-label', y_align: Clutter.ActorAlign.CENTER });
        this._goldLabel = new St.Label({ text: '18K: ...', style_class: 'gticker-top-label', y_align: Clutter.ActorAlign.CENTER });
        
        this._topBox.add_child(this._dollarLabel);
        this._topBox.add_child(new St.Label({ text: '|', style_class: 'gticker-separator', y_align: Clutter.ActorAlign.CENTER }));
        this._topBox.add_child(this._goldLabel);

        // --- Menu Container ---
        this._menuContainer = new St.BoxLayout({ vertical: true, style_class: 'gticker-main-box' });
        this.menu.box.add_child(this._menuContainer);

        // --- Pages ---
        this._buildMarketPage();
        this._buildAboutPage();

        // --- State ---
        this._prevData = {};
        this._session = new Soup.Session();
        this._allRows = []; 
        this._refreshData();
        
        this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 300, () => {
            this._refreshData();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _buildMarketPage() {
        this._marketPage = new St.BoxLayout({ vertical: true, style_class: 'gticker-page' });

        // Header
        let headerBox = new St.BoxLayout({ style_class: 'gticker-header' });
        let title = new St.Label({ text: 'GnomeTicker', style_class: 'gticker-title', x_expand: true, y_align: Clutter.ActorAlign.CENTER });
        
        let btnBox = new St.BoxLayout({ style_class: 'gticker-btn-box', x_align: Clutter.ActorAlign.END });
        
        this._refreshBtn = new St.Button({ style_class: 'gticker-icon-btn', child: new St.Icon({ icon_name: 'view-refresh-symbolic', icon_size: 16 }) });
        this._refreshBtn.connect('clicked', () => this._refreshData());
        
        this._settingsBtn = new St.Button({ style_class: 'gticker-icon-btn', child: new St.Icon({ icon_name: 'emblem-system-symbolic', icon_size: 16 }) });
        this._settingsBtn.connect('clicked', () => this._switchPage('about'));

        btnBox.add_child(this._refreshBtn);
        btnBox.add_child(this._settingsBtn);
        headerBox.add_child(title);
        headerBox.add_child(btnBox);
        this._marketPage.add_child(headerBox);

        // Search Bar
        this._searchEntry = new St.Entry({ name: 'search', hint_text: 'Search market...', style_class: 'gticker-search', can_focus: true });
        this._searchEntry.clutter_text.connect('text-changed', () => this._filterRows());
        this._marketPage.add_child(this._searchEntry);

        // Scrollable Content
        this._scrollView = new St.ScrollView({ style_class: 'gticker-scroll' });
        this._contentBox = new St.BoxLayout({ vertical: true, style_class: 'gticker-content' });
        this._scrollView.add_child(this._contentBox);
        this._marketPage.add_child(this._scrollView);

        // Footer
        this._updatedLabel = new St.Label({ text: 'Waiting for data...', style_class: 'gticker-updated-label', x_align: Clutter.ActorAlign.END });
        this._marketPage.add_child(this._updatedLabel);

        this._menuContainer.add_child(this._marketPage);
    }

    _buildAboutPage() {
        this._aboutPage = new St.BoxLayout({ vertical: true, style_class: 'gticker-page', style: 'padding: 20px;' });

        // Back Button & Title
        let headerBox = new St.BoxLayout({ style_class: 'gticker-header' });
        let backBtn = new St.Button({ style_class: 'gticker-back-btn', child: new St.Icon({ icon_name: 'go-previous-symbolic', icon_size: 16 }) });
        backBtn.connect('clicked', () => this._switchPage('market'));
        let title = new St.Label({ text: 'About', style_class: 'gticker-title', x_expand: true, y_align: Clutter.ActorAlign.CENTER });
        
        headerBox.add_child(backBtn);
        headerBox.add_child(title);
        this._aboutPage.add_child(headerBox);

        // Developer Info
        let infoBox = new St.BoxLayout({ vertical: true, style_class: 'gticker-about-info', x_expand: true });
        
        let devLabel = new St.Label({ text: 'Developer', style_class: 'gticker-about-header' });
        let devName = new St.Label({ text: 'Ehsan Fazli', style_class: 'gticker-about-text' });
        
        let webBtn = new St.Button({ style_class: 'gticker-link-btn', child: new St.Label({ text: '🌐 ehsanfazli.ir' }) });
        webBtn.connect('clicked', () => Gio.AppInfo.launch_default_for_uri('https://ehsanfazli.ir', null));

        let gitBtn = new St.Button({ style_class: 'gticker-link-btn', child: new St.Label({ text: '💻 github.com/tsshack/GnomeTicker' }) });
        gitBtn.connect('clicked', () => Gio.AppInfo.launch_default_for_uri('https://github.com/tsshack/GnomeTicker', null));

        infoBox.add_child(devLabel);
        infoBox.add_child(devName);
        infoBox.add_child(webBtn);
        infoBox.add_child(gitBtn);
        
        this._aboutPage.add_child(infoBox);
        
        this._aboutPage.hide();
        this._menuContainer.add_child(this._aboutPage);
    }

    _switchPage(page) {
        if (page === 'about') {
            this._marketPage.hide();
            this._aboutPage.show();
        } else {
            this._aboutPage.hide();
            this._marketPage.show();
        }
    }

    _filterRows() {
        let query = this._searchEntry.get_text().toLowerCase();
        for (let row of this._allRows) {
            let visible = row.name.toLowerCase().includes(query) || row.category.toLowerCase().includes(query);
            row.actor.visible = visible;
        }
    }

    _refreshData() {
        this._refreshBtn.add_style_pseudo_class('busy');
        let message = Soup.Message.new('GET', API_URL);

        this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (session, res) => {
            this._refreshBtn.remove_style_pseudo_class('busy');
            if (message.get_status() === Soup.Status.OK) {
                try {
                    let bytes = session.send_and_read_finish(res);
                    let decoder = new TextDecoder();
                    let data = JSON.parse(decoder.decode(bytes.get_data()));
                    this._updateUI(data);
                    this._prevData = data;
                } catch (e) {
                    log('GnomeTicker JSON Parse Error: ' + e);
                    this._updatedLabel.set_text('Error parsing data!');
                }
            } else {
                log('GnomeTicker API Error: ' + message.get_status());
                this._updatedLabel.set_text('Network error!');
            }
        });
    }

    _updateUI(data) {
        let usdRaw = data['ارزهای فیات']['دلار آمریکا'];
        let goldRaw = data['طلا']['طلای ۱۸ عیار'];
        
        this._dollarLabel.set_text(`USD: ${formatCompact(usdRaw)}`);
        this._goldLabel.set_text(`18K: ${formatCompact(goldRaw)}`);

        this._contentBox.destroy_all_children();
        this._allRows = [];

        for (let faCategory in data) {
            let enCategory = TRANSLATIONS[faCategory] || faCategory;
            
            let catHeader = new St.Label({ text: enCategory, style_class: 'gticker-cat-header' });
            this._contentBox.add_child(catHeader);

            let listContainer = new St.BoxLayout({ vertical: true, style_class: 'gticker-list-container' });

            for (let faItem in data[faCategory]) {
                let enItem = TRANSLATIONS[faItem] || faItem;
                let currentPriceStr = data[faCategory][faItem];
                let currentPriceNum = parsePrice(currentPriceStr);

                let trendIcon = '';
                let trendClass = 'trend-neutral';
                
                if (this._prevData[faCategory] && this._prevData[faCategory][faItem]) {
                    let prevPriceNum = parsePrice(this._prevData[faCategory][faItem]);
                    if (currentPriceNum > prevPriceNum) { trendIcon = '▲'; trendClass = 'trend-up'; }
                    else if (currentPriceNum < prevPriceNum) { trendIcon = '▼'; trendClass = 'trend-down'; }
                    else { trendIcon = '–'; trendClass = 'trend-neutral'; }
                }

                let row = new St.Button({ style_class: 'gticker-row', x_expand: true });
                let rowLayout = new St.BoxLayout({ x_expand: true, y_align: Clutter.ActorAlign.CENTER });

                let nameBox = new St.BoxLayout({ x_expand: true });
                let trendLabel = new St.Label({ text: trendIcon, style_class: `gticker-trend ${trendClass}` });
                let itemLabel = new St.Label({ text: enItem, style_class: 'gticker-item-name' });
                nameBox.add_child(trendLabel);
                nameBox.add_child(itemLabel);

                let priceLabel = new St.Label({ text: currentPriceStr, style_class: 'gticker-item-price' });

                rowLayout.add_child(nameBox);
                rowLayout.add_child(priceLabel);
                row.set_child(rowLayout);

                row.connect('clicked', () => {
                    let clipboard = St.Clipboard.get_default();
                    clipboard.set_text(St.ClipboardType.CLIPBOARD, currentPriceNum.toString());
                    priceLabel.add_style_class_name('gticker-copied');
                    GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
                        priceLabel.remove_style_class_name('gticker-copied');
                        return GLib.SOURCE_REMOVE;
                    });
                });

                listContainer.add_child(row);
                this._allRows.push({ actor: row, name: enItem, category: enCategory });
            }
            this._contentBox.add_child(listContainer);
        }

        let now = new Date();
        let timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        this._updatedLabel.set_text(`Last updated: ${timeStr}`);
    }

    _onDestroy() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        super._onDestroy();
    }
});

export default class GnomeTickerExtension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea('gnometicker-indicator', this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
