sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sync/ca/fi/documentapp/controller/formatter",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, formatter, Fragment, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("sync.ca.fi.documentapp.controller.Detail", {
        onInit: function () {},

        _onRouteMatched: function (oEvent) {
            const oArgs = oEvent.getParameter("arguments");
            const sPath = `/ZCA_CDS_V_005(Belnr='${oArgs.Belnr}',Bukrs='${oArgs.Bukrs}',Gjahr='${oArgs.Gjahr}')`;

            const oView = this.getView();
            oView.bindElement({
                path: sPath,
                parameters: {
                    expand: "toi"
                }
            });

            const oFCL = oView.getParent().getParent();
            if (oFCL.setLayout) {
                oFCL.setLayout("TwoColumnsMidExpanded");
            }
        },

        formatter: formatter,

        onNavBack: function () {
            const oFCL = this.getView().getParent().getParent();
            if (oFCL && oFCL.setLayout) {
                oFCL.setLayout("OneColumn");
            }
        },

        onFullScreen: function () {
            const oFCL = this.getView().getParent().getParent();
            if (oFCL && oFCL.getLayout && oFCL.setLayout) {
                const sCurrentLayout = oFCL.getLayout();
                oFCL.setLayout(
                    sCurrentLayout === "MidColumnFullScreen"
                        ? "TwoColumnsMidExpanded"
                        : "MidColumnFullScreen"
                );
            }
        },

        openDialog: function () {
            const oView = this.getView();

            if (!this._pApproveDialog) {
                this._pApproveDialog = Fragment.load({
                    id: oView.getId(),
                    name: "sync.ca.fi.documentapp.view.ApproveDialog",
                    controller: this
                }).then(function (oDialog) {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }

            this._pApproveDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onUpdate: function () {
            const oView = this.getView();
            const oContext = oView.getBindingContext();

            if (!oContext) return;

            const oData = {
                Belnr: oContext.getProperty("Belnr"),
                Bukrs: oContext.getProperty("Bukrs"),
                Gjahr: oContext.getProperty("Gjahr"),
                Budat: oContext.getProperty("Budat"),
                Bltxt: oContext.getProperty("Bltxt"),
                Recipient: oContext.getProperty("Recipient"),
                RecDate: oContext.getProperty("RecDate"),
                AppStatus: oContext.getProperty("AppStatus"),
                Opinion: oContext.getProperty("Opinion"),
                Approver: oContext.getProperty("Approver"),
                AppDate: oContext.getProperty("AppDate")
            };

            const oModel = new sap.ui.model.json.JSONModel(oData);
            oView.setModel(oModel, "updateModel");

            this.openDialog();
        },

        onCancelApproval: function () {
            this._pApproveDialog.then(function (oDialog) {
                oDialog.close();
            });
        },

    onConfirmApproval: function () {
        const oView = this.getView();
        const oModel = oView.getModel();
        const oUpdateModel = oView.getModel("updateModel");
        const oData = oUpdateModel.getData();

        const sAppStatus = oUpdateModel.getProperty("/AppStatus");

        if (!sAppStatus) {
            MessageBox.warning("결재 상태를 선택하세요.");
            return;
        }

        const oToday = new Date();
        const sUserId = sap.ushell.Container.getUser().getId();
        const sComment = sap.ui.core.Fragment.byId(oView.getId(), "approvalComment").getValue();

        const sPath = oModel.createKey("/ZCA_CDS_V_005", {
            Belnr: oData.Belnr,
            Bukrs: oData.Bukrs,
            Gjahr: oData.Gjahr
        });

        const oUpdatedEntry = {
            AppStatus: sAppStatus,
            Opinion: sComment,
            Approver: sUserId,
            AppDate: oToday
        };

    oModel.update(sPath, oUpdatedEntry, {
        merge: true,
        success: () => {
            this._pApproveDialog.then(oDialog => oDialog.close());

            // ✅ 반려인 경우는 전표 생성 X
            if (sAppStatus === "R") {
                MessageToast.show("반려 처리되었습니다.");
            } else if (sAppStatus === "A") {
                MessageToast.show("승인 완료되었습니다. 전표를 생성합니다.");
                this._createFinalDocument(oData); // 전표 생성 로직
            }

            oModel.refresh(true);
        },
        error: (oError) => {
            MessageBox.error("결재 처리 중 오류가 발생했습니다.");
            console.error(oError);
        }
    });
}

,

        onSelectApprove: function () {
            this.getView().getModel("updateModel").setProperty("/AppStatus", "A");
        },

        onSelectReject: function () {
            this.getView().getModel("updateModel").setProperty("/AppStatus", "R");
        }
    });
});