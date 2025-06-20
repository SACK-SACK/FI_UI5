sap.ui.define([], function () {
    "use strict";

    return {
        removeLeadingZeros: function (sValue) {
            if (!sValue) {
                return "";
            }
            return parseInt(sValue, 10).toString();
        },

        getDebitState: function (amount) {
            const val = parseFloat(amount);
            if (!val || val === 0) return "None";
            return "Information"; // 파란색
        },

        getCreditState: function (amount) {
            const val = parseFloat(amount);
            if (!val || val === 0) return "None";
            return "Error"; // 빨간색
        },

        isPositiveAmount: function (amount) {
            return !!(amount && parseFloat(amount) !== 0);
        },
    };
});
