'use strict';


function shortFingerprint(fingerprint, byteCount)
{
    return fingerprint.match(/.{2}/g).slice(0, byteCount).join(' ').toUpperCase();
}

function showInputBox(headline, text, placeholder)
{
    'use strict';
     let overlay = document.createElement('div');
     overlay.classList.add('inputbox-overlay');
     overlay.innerHTML = `
<div class="inputbox-overlay">
    <div class="inputbox-form">
        <h3>${headline}</h3>
        <p>${text.split('\n').join('<br>')}</p>
        <textarea class="mono" style="font-size: 10px"></textarea>
        <div class="ralign">
            <button>OK</button>
            <button>Cancel</button>
        </div>
    </div>
</div>`;

    let result = {
        button: null,
        text: null
    };

    let callback = null;
    let resolver = {
        done: function(_callback) {
            callback = _callback;
        }
    };

    let doCallback = function() {
        result.text = overlay.querySelector('textarea').value;

        document.body.removeChild(overlay);
        overlay = undefined;

        callback(result);
    };

    overlay.querySelector('button:nth-child(1)').addEventListener('click', function(evt) { result.button = 'OK'; doCallback(); });
    overlay.querySelector('button:nth-child(2)').addEventListener('click', function(evt) { result.button = 'Cancel'; doCallback(); });

    document.body.appendChild(overlay);

    return resolver;
}

function InfoMsg(headline, content, type)
{
    let self = this;

    self.kill = function()
    {
        self.msgdiv.classList.add('dead');
        setTimeout(function(){self.msgdiv.remove()}, 750);
    }
    self.show = function(interval_ms)
    {
        let interval = 6000;
        if (interval_ms && Number.isInteger(interval_ms))
            interval = interval_ms;

        self.infobar.appendChild(self.msgdiv);

        if (interval > 0)
            setTimeout(self.kill, interval);
    }

    self.closebtn = document.createElement('div');
    self.closebtn.classList.add('close');
    self.closebtn.innerHTML = 'x';
    self.closebtn.addEventListener('click', self.kill, true);

    self.msgdiv = document.createElement('div');
    self.msgdiv.classList.add('msg');
    if (type && typeof type === 'string')
        self.msgdiv.classList.add(type);

    //content = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g, '<br>');

    self.msgdiv.innerHTML += `<div>` + (headline ? `<b>${headline}</b><br />` : '') + `${content}</div>`;
    self.msgdiv.appendChild(self.closebtn);

    self.infobar = document.body.querySelector('.openpgp-infobar');
}


function SettingsMenu(menu)
{
    function SettingsState() {
        let self = this;

        let keys = [];
        let pkey_save = null;

        self.pkey = null;

        self.enabled = true;
        self.log_messages = false;

        let pkey_temp = null;

        self.removedKeys = false;
        self.getKeys = function() { return keys; };

        self.setPkey = function(key) {
        let pkey_temp = key.primaryKey.fingerprint;
            self.pkey = key.primaryKey.fingerprint;
            pkey_save = function() { GM_setValue('pkey', key.armor()); pkey_save = null;};
        };
        self.deletePkey = function(key) {
            pkey_save = function() { GM_setValue('pkey', undefined); pkey_save = null; self.pkey = null; }
        }

        self.addKey = function(key) {
            if (typeof key === 'string')
            {
                let key_obj = openpgp.key.readArmored(key).keys[0];
                keys.push(key_obj);
            }
            else
            {
                keys.push(key);
            }
        };
        self.hasKey = function(key) {
            for (let mykey of keys)
                if (typeof key === 'string')
                {
                    if (key.primaryKey.fingerprint === mykey.fingerprint)
                        return true;
                }
                else
                {
                    if (key === mykey.fingerprint)
                        return true;
                }

            return false;
        };
        self.removeKey = function(key) {
            for (let i = 0; i < keys.length; i++)
            {
                let mykey = keys[i];

                if (typeof key === 'string')
                {
                    if (key === mykey.primaryKey.fingerprint)
                    {
                        keys.splice(i, 1);
                        self.removedKeys = true;
                        return true;
                    }
                }
                else
                {
                    if (key.primaryKey.fingerprint === mykey.primaryKey.fingerprint)
                    {
                        keys.splice(i, 1);
                        self.removedKeys = true;
                        return true;
                    }
                }
            }

            return false;
        };
        self.getKeysByUserIds = function (userids_frag) {
            return keys.filter(function(k) {
                return k.getUserIds().some(function(uid) {
                    return userids_frag.some(function(fragment) {
                        return uid.toLowerCase().contains(fragment.toLowerCase());
                    });
                });
            });
        };
        self.getKeysByFingerprint = function (fp_fragment) {

            if (!fp_fragment) return [];
            fp_fragment = fp_fragment.replace(/[^0-9a-fA-F]/g, '');

            return keys.filter(function(k) {
                return k.primaryKey.fingerprint.contains(fp_fragment);
            });
        };
        self.getMyKey = function() {
            let result = self.getKeysByFingerprint(self.pkey)[0];

            if (result) return result;
            return null;
        };

        self.clearKeys = function() {
            keys = [];
            self.removedKeys = true;
        };

        self.save = function() {
            pkey_save && pkey_save();
            GM_setValue('settings', JSON.stringify(self));
            let keys_raw = keys.map(function(key) { return key.armor() });
            GM_setValue('keys', JSON.stringify(keys_raw));
        };
        self.load = function() {

            let data = GM_getValue('settings', JSON.stringify(self));
            let obj = JSON.parse(data);

            if (obj)
                for (let key in obj) {
                    self[key] = obj[key];
                }

            self.clearKeys();
            let loaded_keys = JSON.parse(GM_getValue('keys', 'null'));
            if (loaded_keys)
                for (let k of loaded_keys)
                    self.addKey(k);

            self.removedKeys = false;
        };
    }

    let self = this;

    function insertKeyRow(key) {
        let div = document.createElement('div');
        div.style.position = 'relative';
        div.classList.add('key');
        div.innerHTML = `
            <span class="fingerprint mono">${shortFingerprint(key.primaryKey.fingerprint, 16)}</span>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <span class="userid">${key.getUserIds().join(', ').replace(/\</g,'&lt;').replace(/\>/g,'&gt;')}</span>
            <div class="close">x</div>
        `;

        div.querySelector('.close').addEventListener('click', self.removeKeyEvent);
        div.querySelector('.fingerprint').setAttribute('data-fingerprint', key.primaryKey.fingerprint);
        self.DOM.keylist.appendChild(div);

        return div;
    }

    self.state = new SettingsState();
    self.DOM = {
        keylist: null,
    };

    self.visible = function() {
        return !menu.classList.contains('dead');
    };
    self.show = function() {
        if (!self.visible())
        {
            self.state.load();
            self.toggle();
            self.stateToDOM();
        }
    };
    self.hide = function() {
        if (!self.state.pkey_save || confirm('You have changed your private key. Do you wish to discard changes?'))
        {
            if (self.visible()) self.toggle();
            self.state.load();
        }
    };
    self.toggle = function() {
        menu.classList.toggle('dead');
    };

    self.saveAndClose = function() {
        if (!self.state.removedKeys || confirm('You have deleted some keys. Do you wish to save the settings anyways?'))
        {
            // checkboxes
            for (let c in self.DOM.checkboxes)
            {
                let elem = self.DOM.checkboxes[c];

                self.state[c] = !!elem.checked;
            }

            self.state.save();
            self.hide();
        }
    };

    self.removeKeyEvent = function(evt) {

        let row = evt.target.parentElement;
        let fp = row.querySelector('.fingerprint').getAttribute('data-fingerprint');

        self.state.removeKey(fp);
        row.parentElement.removeChild(row);
    };

    self.importPubKeysEvent = function(evt) {
        showInputBox('Please input the public key(s) you wish to import.', 'The key should look something like this:' +
            '<span class="mono">' + examplePublicKey + '</span>', '')
        .done(function(result) {

            if (result.button === 'OK')
            {
                let armored = result.text.match(/-----BEGIN .* BLOCK-----[\s\S]*?-----END .* BLOCK-----/g);
                let keys_imported = 0;

                for (let key_armor of armored)
                {
                    let key = openpgp.key.readArmored(result.text).keys[0];
                    if (key && key.getUserIds().length >= 1 && key.isPublic())
                    {
                        let msg = new InfoMsg('Public key imported',
                            shortFingerprint(key.primaryKey.fingerprint, 16) + '<br>' +
                            key.getUserIds().join(', ').replace(/\</g,'&lt;').replace(/\>/g,'&gt;')
                            );

                        msg.show(10000);

                        insertKeyRow(key);
                        self.state.addKey(key);

                        keys_imported++;
                    }

                    if (key.isPrivate())
                    {
                        let msg = new InfoMsg('Security notice',
                            'You have submitted a private key.  This key is not supposed to be shared therfore it won\'t be imported. Please keep your private key safe.',
                            'error');

                        msg.show(10000);
                    }
                }

                if (keys_imported === 0)
                {
                    let msg = new InfoMsg('Error',
                        'The string you have submitted didn\'t contain any supported public keys.',
                        'error');

                    msg.show(10000);
                }
            }
        });
    };

    self.importPrivKeyEvent = function(evt) {
        showInputBox('Please enter your private & public keypair.', 'A key should look something like this:' +
            '<span class="mono">' + examplePrivateKey + '</span>', '')
        .done(function(result) {

            if (result.button === 'OK')
            {
                let armored = result.text.match(/-----BEGIN .* BLOCK-----[\s\S]*?-----END .* BLOCK-----/g);
                let keys_imported = 0;

                let public_imported = false;
                let private_imported = false;

                for (let key_armor of armored)
                {
                    let key = openpgp.key.readArmored(key_armor).keys[0];

                    if (private_imported && public_imported) break;

                    if (key && key.getUserIds().length >= 1 && key.isPublic() && !public_imported)
                    {
                        let msg = new InfoMsg('Public key imported',
                            shortFingerprint(key.primaryKey.fingerprint, 16) + '<br>' +
                            key.getUserIds().join(', ')//.replace(/\</g,'&lt;').replace(/\>/g,'&gt;').replace(/\&/g,'&amp;')
                            );

                        msg.show(10000);

                        insertKeyRow(key);
                        self.state.addKey(key);

                        public_imported = true;
                        keys_imported++;
                    }

                    if (key && key.getUserIds().length >= 1 && key.isPrivate() && !private_imported)
                    {
                        let msg = new InfoMsg('Private key imported',
                            shortFingerprint(key.primaryKey.fingerprint, 16) + '<br>' +
                            key.getUserIds().join(', '),//.replace(/\</g,'&lt;').replace(/\>/g,'&gt;').replace(/\&/g,'&amp;'),
                            'success');

                        msg.show(10000);
                        self.state.setPkey(key);

                        private_imported = true;
                        keys_imported++;
                    }
                }

                if (keys_imported === 0)
                {
                    let msg = new InfoMsg('Error',
                        'The string you have submitted didn\'t contain any supported keys.',
                        'error');

                    msg.show(10000);
                }
            }

            self.stateToDOM();
        });
    };

    self.stateToDOM = function() {

        // Public keys
        let keys = self.DOM.keylist.querySelectorAll('.key');
        for (let k of keys) self.DOM.keylist.removeChild(k);

        for (let k of self.state.getKeys())
        {
            insertKeyRow(k);
        }

        // Private Key
        if (self.state.pkey)
        {
            self.DOM.priv_fp.innerText = shortFingerprint(self.state.pkey, 16);

            let pubkey = self.state.getMyKey();
            if (pubkey)
                self.DOM.me_info.innerText = pubkey.getUserIds().join(', ');
            else
                self.DOM.me_info.innerHTML = '<b class="text-error">Please, import your respective public key.</b>';

        }
        else
        {
            self.DOM.priv_fp.innerHTML = '<b class="text-error">Please, import your private key.</b>';
            self.DOM.me_info.innerHTML = '';
        }

        // checkboxes
        for (let c in self.DOM.checkboxes)
        {
            let elem = self.DOM.checkboxes[c];

            elem.checked = !!self.state[c];
        }
    };


    self.InitializeComponent = function() {

        menu.classList.add('openpgp-settings');
        menu.classList.add('dead');
        menu.innerHTML = settingsHTML;

        self.DOM.keylist = menu.querySelector('.keylist');
        self.DOM.priv_fp = menu.querySelector('.private .fingerprint');
        self.DOM.me_info = menu.querySelector('.me-info');
        self.DOM.checkboxes = {
            enabled: menu.querySelector('[name="enable-pgp"]'),
            log_messages: menu.querySelector('[name="msg-log-pgp"]')
        };


        menu.querySelector('#opgp_save_btn').addEventListener('click', self.saveAndClose);
        menu.querySelector('#opgp_cancel_btn').addEventListener('click', self.hide);

        menu.querySelector('#opgp_import_pub').addEventListener('click', self.importPubKeysEvent);
        menu.querySelector('#opgp_import_priv').addEventListener('click', self.importPrivKeyEvent);

        self.state.load();
    };
}


function FacebookPGP()
{
    let self = this;

    self.msgSending = false;
    self.infobar = null;
    let settings = null;
    self.DOM = {};

    let cleartext = '';
    let ciphertext = '';

    self.processMessage = function(msg)
    {
        if (msg !== cleartext)
        {
            cleartext = msg;
        }

        if (self.msgSending)
        {
            if (settings.state.log_messages)
            {
                let info = new InfoMsg('Message sent:', ciphertext);
                info.show(8000);
            }

            if (settings.state.enabled)
                msg = ciphertext;
        }

        return msg;
    }

    self.keydown = function(evt)
    {
        if (evt.code === 'Enter')
        {
            let peer = self.getPeerStatus();

            let my_pubkey = settings.state.getMyKey();
            let pkey = openpgp.key.readArmored(GM_getValue('pkey')).keys[0];

            if (my_pubkey && pkey && peer.pubkey && settings.state.enabled)
            {
                let options = {
                    data: cleartext,
                    privateKeys: [pkey],
                    publicKeys: [peer.pubkey, my_pubkey]
                };

                openpgp.encrypt(options).then(function(result) { ciphertext = result.data; });
            }
            else
            {
                ciphertext = cleartext;
            }
        }
    }
    self.click = function(evt)
    {

    }

    self.updateStatusBar = function() {
        let peer = self.getPeerStatus();

        if (peer.securable && settings.state.enabled)
        {
            self.DOM.statusBar.classList.add('pgp-on');
        }
        else
        {
            self.DOM.statusBar.classList.remove('pgp-on');
        }
    };

    self.getPeerStatus = function() {

        let username = self.DOM.username_link.innerText;
        let userid = self.DOM.userid_link.innerText.substr(21);
        let pubkey = settings.state.getKeysByUserIds([username, userid])[0];

        return {
            username: username,
            userid: userid,

            pubkey: pubkey,
            securable: !!pubkey
        };
    }

    self.Inject = function()
    {
        var argumentQueue = [];

        if (!unsafeWindow.real__D)
            unsafeWindow.real__D = null;

        var fake__D = function(name, components, _closure, e, f) {

            if (!unsafeWindow.real__D)
            {
                argumentQueue.push(arguments);
                //debugger;
                return null;
            }
            if (!!unsafeWindow.real__D && argumentQueue.length > 0)
            {
                //debugger;
                for (let args of argumentQueue)
                {
                    unsafeWindow.real__D.apply(this, args);
                }
            }

            if (name === 'MessengerComposerInput.react')
            {
                console.log(name);
                let wrapped_closure = function(a, b, c, d, e, f, g, h) {

                    let result_clos = _closure(a,b,c,d,e,f,g,h);

                    let real_class = e.exports;
                    let class_wrapper = function(a1,a2,a3,a4,a5,a6) {

                        let instance = new real_class(a1,a2,a3,a4,a5,a6);

                        let real_getValue = instance.getValue;
                        instance.getValue = function() {
                            let getValue_rst = real_getValue.apply(instance);

                            return self.processMessage(getValue_rst);
                        }

                        let real_$24 = instance.$24;
                        instance.$24 = function(a) {

                            self.msgSending = true;
                            let $24_rst = real_$24.apply(instance, [a]);
                            self.msgSending = false;

                            return $24_rst;
                        }

                        return instance;
                    }
                    e.exports = class_wrapper;
                    return result_clos;
                };
                return unsafeWindow.real__D.apply(this, [name, components, wrapped_closure, e, f]);
            }
            else
            {
                return unsafeWindow.real__D.apply(this, arguments);
            }
        };

        if (unsafeWindow.__d)
        {
            //debugger;
            unsafeWindow.real__D = unsafeWindow.__d;
        }
        unsafeWindow.__defineSetter__('__d', function (val) {
            //debugger;
            unsafeWindow.real__D = val;
        });
        unsafeWindow.__defineGetter__('__d', function () { return fake__D})

        console.log('injected');
    }

    self.ScannerRoutine = function() {

        self.updateStatusBar();

        let msgboxes = Array.from(document.body.querySelectorAll('[message] [attachments][body]'));

        for (let mbox of msgboxes)
        {
            if (mbox.getAttribute('pgp-done')) continue;

            let msg_body = mbox.getAttribute('body');
            let options = null;

            try
            {
                let pkey = openpgp.key.readArmored(GM_getValue('pkey')).keys[0];
                options = {
                    message: openpgp.message.readArmored(msg_body),     // parse armored message
                    privateKeys: [pkey]                   // for decryption
                };
            }
            catch (error)
            {
                // non armored message
            }

            if (options)
            {
                let carrier = mbox.querySelector('div > span');

                try
                {
                    //console.log(options, carrier);
                    openpgp.decrypt(options).then(function(result) {
                        let esc = result.data;
                            // .replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/\&/g, '&amp;')
                            // .replace(/\n/g, '<br>');

                        let icontray = document.createElement('div');
                        icontray.classList.add('icontray');

                        icontray.innerHTML += '<i class="pgpi pgp-lock"></i>';
                        //icontray.innerHTML += '<i class="pgpi pgp-verified"></i>';

                        carrier.innerText = esc;
                        carrier.appendChild(icontray);
                    });
                }
                catch (e)
                {
                    debugger;
                }
            }

            mbox.setAttribute('pgp-done', 1);
        }
    };

    self.InitializeComponent = function()
    {
        let scanner = setInterval(self.ScannerRoutine, 200);

        let style = document.createElement('style');
        style.innerHTML = styleCSS;

        self.infobar = document.createElement('div');
        self.infobar.classList.add('openpgp-infobar');

        let settingsbar = document.createElement('div');
        settings = new SettingsMenu(settingsbar);
        settings.InitializeComponent();

        let settingsbtn = document.createElement('div');
        settingsbtn.classList.add('openpgp-settings-btn');
        settingsbtn.innerHTML = 'OpenPGP settings';
        settingsbtn.addEventListener('click', function(evt) {
            settings.show();
        });

        let input_region = document.body.querySelector('div.notranslate[aria-autocomplete][role="combobox"]')
            .parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
        let statusBar = document.createElement('div');
        statusBar.classList.add('opgp-state-row');
        statusBar.classList.add('mono');
        input_region.insertBefore(statusBar, input_region.firstChild);
        self.DOM.statusBar = statusBar;

        document.body.appendChild(style);
        document.body.appendChild(self.infobar);
        document.body.appendChild(settingsbar);
        document.body.appendChild(settingsbtn);

        document.body.addEventListener('keydown', self.keydown);
        document.body.addEventListener('click', self.click);

        self.DOM.username_link = document.body.querySelector('a[uid]');
        self.DOM.userid_link = Array.from(document.body.querySelectorAll('a[href^="https://www.facebook.com/"]'))
            .filter(function(elem){return elem.innerText.substr(0,21) === 'https://facebook.com/'})[0];


        unsafeWindow.fpgp = self;
        unsafeWindow.openpgp = openpgp;
        //unsafeWindow.showInputBox = showInputBox;
        unsafeWindow.openpgp_settings = function() { settings.toggle(); return (settings.visible() ? 'Opening' : 'Closing') + ' settings...'; };

        self.infobar = document.body.querySelector('.openpgp-infobar');

        self.updateStatusBar();

        let hello = new InfoMsg(null, '<b>OpenPGP</b> loaded successfully.<br>Type <span class="mono">openpgp_settings()</span> to the console for settings.', 'success');
        hello.show(5000);
        console.log('initialized');
    }


    self.Inject();

    document.onreadystatechange = function () {
        if (document.readyState === "complete") {
            self.InitializeComponent();
        }
    }

}


// constants {

    var settingsHTML = `
    <h2>OpenPGP settings</h2>
    <div class="private">
        <b>My key:</b><br>
        <span class="fingerprint mono">E9 8E 13 B3 E5 9A 0C 0B 5C F7 8F B0 D7 BE 10 6D</span><br>
        <span class="me-info"></span><br>

        <div class="ralign">
            <button id="opgp_import_priv">Import private key</button>
        </div>
    </div>
    <hr>
    <div>
        <label><input type="checkbox" name="enable-pgp">Enable encryption</label>
        <label><input type="checkbox" name="msg-log-pgp">Log all messages</label>
    </div>
    <hr>
    <div class="public">
        <div class="relative">
            <br>
            <b>Public keys:</b>
            <span class="pullr">
                <button id="opgp_import_pub">Import</button>
                <button id="opgp_export_pub">Export</button>
            </span>
            <br>
        </div>
        <div class="keylist">
            <div class="placeholder calign">No keys installed</div>
        </div>
    </div>
    <div class="ralign">
        <button id="opgp_save_btn">OK</button>
        <button id="opgp_cancel_btn">Cancel</button>
    </div>
    `;

    var styleCSS = `
    .mono {
        font-family: monospace !important;
    }
    .ralign { text-align: right; }
    .calign { text-align: center; }
    .relative { position: relative; }
    .pullr {
        position: absolute;
        right: 0px;
    }

    .text-error {
        color: #C00;
    }

    .placeholder:not(:only-child) {
        display: none;
    }
    .placeholder {
        font-style: italic;
        color: #888;
        padding: 8px;
    }

    .openpgp-infobar {
    position: absolute;
    top: 0px;
    right: 0px;
    z-index: 1001;
    }

    .openpgp-infobar .msg {
    width: 400px;
    margin: 5px;
    padding: 10px;
    background-color: #AEF;
    color: #068;

    transition: opacity 1s;
    opacity: 1;

    position: relative;
    }
    .openpgp-infobar .msg.dead {
    opacity: 0;
    }
    .openpgp-infobar .msg .close:hover {
    cursor: pointer;
    background-color: #068;
    color: #AEF;
    }
    .openpgp-infobar .msg.success {
    background-color: #AFA;
    color: #060;
    }
    .openpgp-infobar .msg.success .close:hover {
    background-color: #060;
    color: #AFA;
    }
    .openpgp-infobar .msg.error {
    background-color: #FAA;
    color: #700;
    }
    .openpgp-infobar .msg.error .close:hover {
    background-color: #700;
    color: #FAA;
    }


    .openpgp-infobar .msg > div {
    display: inline-block;
    }
    .openpgp-infobar .close, .openpgp-settings .close {
        position: absolute;
        right: 0px;
        top: 0px;
        width: 15px;
        height: 15px;

        text-align: center;
        vertical-align: middle;
        font-family: monospace;
        font-weight: bold;
    }

    .openpgp-settings h2 {
        font-size: 26px;
        display: block;
        margin: 10px 0px;
    }
    .openpgp-settings h3, .inputbox-form h3 {
        font-size: 20px;
        display: block;
        margin: 10px 0px;
    }

    .openpgp-settings {

        position: absolute;
        left: 0px;
        top: 0px;
        bottom: 0px;
        border-right: 1px solid #DDD;
        z-index: 1000;

        transition: left 600ms;
        width: 700px;
        max-width: 99vw;
        background-color: white;

        padding: 30px;
    }
    .openpgp-settings.dead {
        left: calc(-710px - 60px);
    }

    .openpgp-settings-btn:hover { cursor: pointer; color: #06F; background-color: white; }
    .openpgp-settings-btn {

        position: absolute;
        left: 0px;
        top: 0px;
        background-color: white;
        z-index: 999;
        background-color: transparent;

        padding: 3px;
        font-weight: bold;
    }

    .openpgp-settings .keylist {
        margin:10px;
        border: 1px solid gray;
        width: calc(100% - 20px);
        min-height: 150px;
        max-height: 70vh;

        overflow-y: scroll;
    }

    .openpgp-settings .key {
        position: relative;
        vertical-align: middle;
        padding: 2px;
    }

    .openpgp-infobar .close, .openpgp-settings .close {
        position: absolute;
        right: 0px;
        top: 0px;
        width: 15px;
        height: 15px;

        text-align: center;
        vertical-align: middle;
        font-family: monospace;
        font-weight: bold;
    }

    .openpgp-settings .close:hover {
        cursor: pointer;
        color: white;
        background-color: #669;
    }

    .inputbox-overlay {
        position: absolute;
        z-index: 2000;
        left: 0px;
        right: 0px;
        top: 0px;
        bottom: 0px;

        background-color: rgba(0,0,0,0.6);
    }
    .inputbox-overlay > .inputbox-form {
        background-color: white;
        width: 500px;
        margin: 30px auto;
        padding: 30px 40px;
        border: 1px solid #DDD;
    }
    .inputbox-overlay textarea {
        width: calc(100% - 10px);
        height: 200px;
        overflow: scroll;
        resize: vertical;
    }

    .icontray {
        text-align: right;
        margin-right: -15px;
        margin-bottom: -12x;
        height: 0px;
    }

    .pgpi {
        display: inline-block;
        width: 15px;
        height: 15px;
        background-repeat: no-repeat;
        background-size: contain;
        background-position: center;

        position: relative;
        top: -3px;
    }

    .pgp-lock {
        background-image: url("https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Antu_mail-encrypted.svg/120px-Antu_mail-encrypted.svg.png");
    }

    .pgp-verified {
        background-image: url("https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Noun_Project_tick_icon_675776_cc.svg/120px-Noun_Project_tick_icon_675776_cc.svg.png");
    }

    .opgp-state-row {
        font-size: 11px;
        color: #C62;

        position: absolute;
        margin-top: -15px;
        padding-left: 6px;
    }
    .opgp-state-row::before {
        content: "No encryption.";
    }

    .opgp-state-row.pgp-on {
        color: #0A0;
    }
    .opgp-state-row.pgp-on::before {
        content: "Will be encrypted.";
    }

    `;

    var examplePublicKey = `

    -----BEGIN PGP PUBLIC KEY BLOCK-----
    Version: OpenPGP vX.X.XX
    Comment: ...

    xo0EWAME326tC+xvDi78MVzpZe0RmNz5v5NcbN8
    XmZQ4lygcdJdA9cjmB9QZYg/NV2Nh+GVOga2RoU
     . . .
    hu57nAAYFAlIQACcQP/Xehi+xcmI0wXohIxCSEr
    /naoHcBkBcKWahBQ5fxCFtPYQGVsE4=
    =x7oy
    -----END PGP PUBLIC KEY BLOCK-----

    `;

    var examplePrivateKey = `

    -----BEGIN PGP PRIVATE KEY BLOCK-----
    Version: OpenPGP vX.X.XX
    Comment: ...

    xo0EWAME326tC+xvDi78MVzpZe0RmNz5v5NcbN8
    XmZQ4lygcdJdA9cjmB9QZYg/NV2Nh+GVOga2RoU
     . . .
    hu57nAAYFAlIQACcQP/Xehi+xcmI0wXohIxCSEr
    /naoHcBkBcKWahBQ5fxCFtPYQGVsE4=
    =x7oy
    -----END PGP PRIVATE KEY BLOCK-----

    `;

// }