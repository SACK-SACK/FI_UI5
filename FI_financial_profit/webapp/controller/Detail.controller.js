sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/UIComponent",
        "sync/ca/fi/financial/model/formatter",
    ],
    (Controller, JSONModel, UIComponent, formatter) => {
        "use strict";

        return Controller.extend("sync.ca.fi.financial.controller.Detail", {
            formatter: formatter,
            onInit: function () {
                // Router 객체 가져와서 pattern matched 이벤트 연결
                var oRouter = UIComponent.getRouterFor(this);
                oRouter
                    .getRoute("RouteDetail")
                    .attachPatternMatched(this._onPatternMatched, this);
            },

            _onPatternMatched: function (oEvent) {
                // 라우트 파라미터(키)로 바인딩
                var oArgs = oEvent.getParameter("arguments");
                debugger;
                this.sPyear = oArgs.Pyear;
                this.sPweek = oArgs.Pweek;
                this.sPmonth = oArgs.Pmonth;
                // this.sNodeID = parseInt(oArgs.NodeID);
                this.sNodeID = oArgs.NodeID;

                // OData 엔터티 키 바인딩
                var sPath = `/ZCA_CDS_V_008(NodeID=${this.sNodeID}l,Pyear='${this.sPyear}',Pmonth='${this.sPmonth}',Pweek='${this.sPweek}')`;
                this.getView().bindElement({
                    path: sPath,
                    parameters: {
                        expand: "to_Items", // 네비게이션 자동 expand
                    },
                });
                // 배치 그룹 설정
                var oModel = this.getView().getModel();
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["textBatch"]);
            },

            // 닫기 버튼: 메인으로 이동
            onClose: function () {
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteMain");
            },
            // 전체화면 전환 버튼
            onDetailFullScreen: function () {
                var oModelApp = this.getOwnerComponent().getModel("app");
                var sNextLayout = oModelApp.getProperty(
                    "/actionButtonsInfo/midColumn/fullScreen"
                );
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteDetail", {
                    layout: sNextLayout,
                    NodeID: this.sNodeID,
                    Pyear: this.sPyear,
                    Pweek: this.sPweek,
                    Pmonth: this.sPmonth,
                });
            },

            // 전체화면 나가기 버튼
            onDetailExitFullScreen: function () {
                var oModelApp = this.getOwnerComponent().getModel("app");
                var sNextLayout = oModelApp.getProperty(
                    "/actionButtonsInfo/midColumn/exitFullScreen"
                );
                var oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteDetail", {
                    layout: sNextLayout,
                    NodeID: this.sNodeID,
                    Pyear: this.sPyear,
                    Pweek: this.sPweek,
                    Pmonth: this.sPmonth,
                });
            },
        });
    }
);
