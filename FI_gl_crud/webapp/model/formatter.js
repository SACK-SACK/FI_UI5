// webapp/formatter/formatter.js
sap.ui.define([], function () {
    "use strict";

    return {
        infoText: function (lvorm, catMajor, catDetail) {
            // debugger;
            if (lvorm === true) {
                return "삭제됨";
            }
            return catDetail ? `${catMajor} (${catDetail})` : catMajor;
        },
    };
});
