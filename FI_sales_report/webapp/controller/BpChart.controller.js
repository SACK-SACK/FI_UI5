sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel"
], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("sync.ca.fi.salesreport.controller.BpChart", {
    onInit: function () {
      const oModel = this.getOwnerComponent().getModel("bp_sum_one");

      oModel.read("/ZCA_CDS_V_004", {
        success: (oData) => {
          let aResults = oData.results;

          // 💡 총 매출 내림차순 정렬
          aResults.sort((a, b) => parseFloat(b.SalesSum) - parseFloat(a.SalesSum));

          // 💡 Rank 부여
          aResults.forEach((entry, index) => {
            entry.Rank = index + 1; // 1부터 시작하는 순위
          });

          // 정렬된 데이터만 모델에 세팅
          const oSortedModel = new JSONModel({ ZCA_CDS_V_004: aResults });
          this.getView().setModel(oSortedModel, "bp_sum_one");

          console.log("✅ 고객별 매출 정렬 및 순위 매김 완료", aResults);
        },
        error: (oError) => {
          console.error("❌ 고객별 매출 데이터 조회 실패", oError);
        }
      });
    },
    onNavBackToMain: function () {
      var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
      oRouter.navTo("Main"); // "Main"은 메인 페이지의 route 이름
    }
    
  });
});