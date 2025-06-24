sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sync/ca/fi/salesreport/controller/formatter",
  "sap/ui/model/json/JSONModel"
], (Controller, formatter, JSONModel) => {
  "use strict";

  return Controller.extend("sync.ca.fi.salesreport.controller.Main", {
    onInit() {
      // 1. 월별 매출 집계 (bp_sum → chartModel, summaryModel)
      const oSalesModel = this.getOwnerComponent().getModel("bp_sum");
      this.getView().setModel(oSalesModel, "bp_sum");

      oSalesModel.read("/ZCA_CDS_V_001", {
        success: (oData) => {
          const aResults = oData.results;
          const oMonthMap = {};

          aResults.forEach((entry) => {
            const dateObj = new Date(entry.Budat);
            if (!isNaN(dateObj)) {
              const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
              oMonthMap[monthKey] = (oMonthMap[monthKey] || 0) + parseFloat(entry.SumAmount);
            } else {
              console.warn("Invalid Budat:", entry.Budat);
            }
          });

          const aChartData = Object.entries(oMonthMap).map(([month, sum]) => ({
            Month: month,
            TotalSales: sum
          }));
          this.getView().setModel(new JSONModel(aChartData), "chartModel");

          // KPI 계산
          let total = 0, topMonth = "", topAmount = 0;
          aChartData.forEach(({ Month, TotalSales }) => {
            total += TotalSales;
            if (TotalSales > topAmount) {
              topAmount = TotalSales;
              topMonth = Month;
            }
          });

          this.getView().setModel(new JSONModel({
            totalSalesFormatted: total.toLocaleString(),
            topMonth,
            topAmountFormatted: topAmount.toLocaleString()
          }), "summaryModel");
        },
        error: (err) => console.error("월별 매출 조회 실패", err)
      });

      /// 2. 자재별 매출 정렬 → Top 3만 추출
      const oMatModel = this.getOwnerComponent().getModel("mat_sum_one");
      oMatModel.read("/ZCA_CDS_V_003", {
        success: (oData) => {
          const aSorted = oData.results
            .sort((a, b) => parseFloat(b.MatnrSum) - parseFloat(a.MatnrSum))
            .slice(0, 3); // ✅ 상위 3개만
          this.getView().setModel(new JSONModel({ ZCA_CDS_V_003: aSorted }), "mat_sum_one");
        },
        error: (err) => console.error("자재별 매출 조회 실패", err)
      });

      // 3. 고객별 매출 정렬 → Top 3만 추출
      const oBpSumModel = this.getOwnerComponent().getModel("bp_sum_one");
      oBpSumModel.read("/ZCA_CDS_V_004", {
        success: (oData) => {
          const aSorted = oData.results
            .sort((a, b) => parseFloat(b.SalesSum) - parseFloat(a.SalesSum))
            .slice(0, 3); // ✅ 상위 3개만
          this.getView().setModel(new JSONModel({ ZCA_CDS_V_004: aSorted }), "bp_sum_one");
        },
        error: (err) => console.error("고객별 매출 조회 실패", err)
      });
    },
    formatter: formatter,
    onMatPress() {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("MatChart");
    },

    onBpPress() {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("BpChart");
    },
    
  });
});