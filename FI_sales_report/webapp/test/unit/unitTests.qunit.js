/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"synccafi/sales_report/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
