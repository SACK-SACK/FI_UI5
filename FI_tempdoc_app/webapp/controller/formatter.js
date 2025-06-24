// formatter.js
sap.ui.define([], function () {
    "use strict";

    return {
        formatStatusIcon: function (status) {
            // console.log("ICON:", status); // ← 추가
            if (!status) return "sap-icon://question-mark";
            switch (status.toUpperCase()) {
                case "S": return "sap-icon://bbyd-active-sales";
                case "A": return "sap-icon://accept";
                case "R": return "sap-icon://decline";
                default:  return "sap-icon://question-mark";
            }
        },
        formatStatusState: function (status) {
            switch (status) {
                case "S": return "Warning";
                case "A": return "Success";
                case "R": return "Error";
                default:  return "None";
            }
        },
        formatStatusText: function (status) {
            switch (status) {
                case "S": return "상신";
                case "A": return "승인";
                case "R": return "반려";
                default:  return status;
            }
        },
        // 차변: 전기키 끝이 1인 경우만 표시
        debitOnly: function (bschl, dmbtr) {
            if (!bschl || !dmbtr) return "";
            if (bschl.endsWith("1")) {
                return parseFloat(dmbtr).toLocaleString("ko-KR");  // 콤마 표시
            }
            return "";
        },
        // 대변: 전기키 끝이 2인 경우만 표시
        creditOnly: function (bschl, dmbtr) {
            if (!bschl || !dmbtr) return "";
            if (bschl.endsWith("2")) {
                return parseFloat(dmbtr).toLocaleString("ko-KR");  // 콤마 표시
            }
            return "";
        }

    };
});