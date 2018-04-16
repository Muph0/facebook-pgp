// ==UserScript==
// @name         Facebook OpenPGP
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @require      https://raw.githubusercontent.com/Muph0/facebook-pgp/master/facebook-pgp.js
// @require      https://raw.githubusercontent.com/openpgpjs/openpgpjs/master/dist/openpgp.js
// @match        https://www.facebook.com/messages/*/*
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_listValues
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    let fbpgp = new FacebookPGP(openpgp);

})();
