// ==UserScript==
// @name         Facebook OpenPGP
// @namespace    https://github.com/Muph0/facebook-pgp
// @version      0.12
// @description  try to take over the world!
// @author       You
// @require      https://raw.githubusercontent.com/Muph0/facebook-pgp/master/facebook-pgp.js
// @require      https://raw.githubusercontent.com/openpgpjs/openpgpjs/master/dist/openpgp.js
// @match        https://www.facebook.com/messages/*/*
// @downloadURL  https://raw.githubusercontent.com/Muph0/facebook-pgp/master/dist/tampermonkey-userscript.js
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_listValues
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    let fbpgp = new FacebookPGP(openpgp);

})();
