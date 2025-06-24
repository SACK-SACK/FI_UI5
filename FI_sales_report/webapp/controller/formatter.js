sap.ui.define([], function () {
  "use strict";

  return {
    /**
     * "2025-05" → "5"로 변환
     * @param {string} sMonthKey - e.g. "2025-05"
     * @returns {string} 변환된 월, e.g. "5"
     */
    formatMonthText: function (sMonthKey) {
      if (!sMonthKey) return "";
      const [, month] = sMonthKey.split("-");
      return String(parseInt(month)); // "05" → 5 → "5"
    },

    /**
     * 천 단위 콤마 포맷
     * @param {string|number} value 
     * @returns {string}
     */
    formatNumberWithComma: function (value) {
      if (!value) return "0";
      return parseFloat(value).toLocaleString(); // 1234567 → "1,234,567"
    },

    formatDate: function (sDate) {
      if (!sDate) return "";
      const oDate = new Date(sDate);
      return oDate.toISOString().split("T")[0]; // e.g. "2025-04-14"
    }
  };
});