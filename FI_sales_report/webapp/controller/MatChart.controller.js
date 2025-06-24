sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sync/ca/fi/salesreport/controller/formatter"
], function (Controller, JSONModel, formatter) {
  "use strict";

  return Controller.extend("sync.ca.fi.salesreport.controller.MatChart", {
    onInit: function () {

  // 1. 자재별 매출 집계 (bp_sum → bp_sum 모델) -> 매출 순 정렬
    const oMatModel = this.getOwnerComponent().getModel("mat_sum_one");
    oMatModel.read("/ZCA_CDS_V_003", {
  success: (oData) => {
    const aSorted = oData.results.sort((a, b) =>
      parseFloat(b.MatnrSum) - parseFloat(a.MatnrSum) // 💡 내림차순 정렬
    );

    // ✅ 순위 필드 추가
    aSorted.forEach((item, index) => {
      item.Rank = index + 1;
    });

    this.getView().setModel(new JSONModel({ ZCA_CDS_V_003: aSorted }), "mat_sum_one");
  },
  error: (err) => console.error("자재별 매출 조회 실패", err)
});

  const oModel = this.getOwnerComponent().getModel("bp_sum");

  oModel.read("/ZCA_CDS_V_001", {
    success: (oData) => {
      const aRaw = oData.results;

      // Month 파싱
      aRaw.forEach(entry => {
        const oDate = new Date(entry.Budat);
        entry.Month = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, "0")}`;
      });

      // 🔥 Grouping: Matnr + Month 기준 집계
      const oGrouped = {};
      aRaw.forEach(entry => {
        const key = `${entry.Matnr}||${entry.Month}`;
        if (!oGrouped[key]) {
          oGrouped[key] = {
            Matnr: entry.Matnr,
            Month: entry.Month,
            SumAmount: 0
          };
        }
        oGrouped[key].SumAmount += parseFloat(entry.SumAmount);
      });

      // 차트 데이터 배열로 변환
      const aChartData = Object.values(oGrouped);

      // View에 두 개 모델로 세팅
      const oProcessedModel = new JSONModel({
        ZCA_CDS_V_001: aRaw,
        ChartData: aChartData
      });
      this.getView().setModel(oProcessedModel, "bp_sum");
    },

    error: (oError) => {
      console.error("자재별 매출 상세 조회 실패", oError);
    }
  });
},
    formatter: formatter,
  onNavBackToMain: function () {
  const oRouter = this.getOwnerComponent().getRouter();
  oRouter.navTo("Main"); // Main 으로 이동
},


  });
});