sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/ui/core/UIComponent",
        "sap/m/MessageToast",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
    ],
    function (
        Controller,
        JSONModel,
        UIComponent,
        MessageToast,
        Filter,
        FilterOperator
    ) {
        "use strict";

        return Controller.extend("sync.ca.fi.financial.controller.Income", {
            onInit: function () {
                UIComponent.getRouterFor(this)
                    .getRoute("RouteIncome")
                    .attachPatternMatched(this._onPatternMatched, this);
                const oVizFrame = this.byId("idIncomeChart");
                const oPopover = this.byId("idIncomeChartPopover");

                if (oPopover && oVizFrame) {
                    oPopover.connect(oVizFrame.getVizUid());
                }

                oVizFrame.setVizProperties({
                    plotArea: {
                        dataLabel: { visible: true },
                        colorPalette: ["#2b7d2b"], // 초록 하나만!
                    },
                    valueAxis: {
                        title: { visible: false },
                    },
                    categoryAxis: {
                        label: { rotation: "auto" },
                        title: { visible: false },
                    },
                    legend: {
                        visible: true,
                        position: "bottom",
                    },
                    tooltip: {
                        visible: true,
                    },
                    title: {
                        visible: true,
                        text: "주차별 당기순이익",
                    },
                });

                const oVizFram2 = this.byId("idStackedComboChart");
                const oPopover2 = this.byId("idComboChartPopover");
                if (oPopover2 && oVizFram2) {
                    oPopover2.connect(oVizFram2.getVizUid());
                }
                oVizFram2.setVizProperties({
                    plotArea: {
                        showCenterLabel: true,
                        dataLabel: {
                            visible: true,
                        },
                        dataShape: {
                            primaryAxis: ["bar", "bar"], // 매출액, 매출원가
                            secondaryAxis: ["line"], // 당기순이익
                        },
                        colorPalette: ["#64b5f6", "#f06292", "#43a047"],
                    },
                    valueAxis: {
                        title: { visible: false },
                    },
                    categoryAxis: {
                        title: { visible: false },
                        label: { rotation: "auto" },
                    },
                    legend: {
                        isScrollable: false,
                        title: { visible: false },
                    },
                    tooltip: {
                        visible: true,
                    },
                    title: {
                        visible: true,
                        text: "매출/원가 + 당기순이익 추이",
                    },
                });
            },

            _onPatternMatched: function (oEvent) {
                const oArgs = oEvent.getParameter("arguments");
                const { Pyear, Pmonth, Pweek } = oArgs;

                this.Pyear = Pyear;
                this.Pmonth = Pmonth;
                this.Pweek = Pweek;

                const oViewModel = new JSONModel({
                    weeklyIncome: [],
                    weeklyCombo: [],
                    weeklySummary: [],
                });
                this.getView().setModel(oViewModel, "view");

                this._loadWeeklyIncome();
            },

            _loadWeeklyIncome: function () {
                const oModel = this.getView().getModel("income");

                const oFinalFilter = new Filter(
                    [
                        new Filter(
                            [
                                new Filter(
                                    "Pyear",
                                    FilterOperator.EQ,
                                    this.Pyear
                                ),
                                new Filter(
                                    "Pmonth",
                                    FilterOperator.LT,
                                    this.Pmonth
                                ),
                            ],
                            true
                        ),

                        new Filter(
                            [
                                new Filter(
                                    "Pyear",
                                    FilterOperator.EQ,
                                    this.Pyear
                                ),
                                new Filter(
                                    "Pmonth",
                                    FilterOperator.EQ,
                                    this.Pmonth
                                ),
                                new Filter(
                                    "Pweek",
                                    FilterOperator.LE,
                                    this.Pweek
                                ),
                            ],
                            true
                        ),
                    ],
                    false
                ); // 전체 OR

                oModel.read("/ZCA_CDS_V_014", {
                    filters: [oFinalFilter],
                    success: (oData) => {
                        const aResults = oData.results || [];

                        // Waterfall chart용: NetIncome만 추출
                        const aWaterfall = aResults.map((entry) => ({
                            Week: `${parseInt(entry.Pmonth)}월 ${parseInt(
                                entry.Pweek
                            )}주차`,
                            Type: "regular",
                            Amount: entry.NetIncome,
                        }));
                        this.getView()
                            .getModel("view")
                            .setProperty("/weeklyIncome", aWaterfall);

                        // 혼합 차트용: 원본 그대로 전달
                        const aComboData = oData.results.map((entry) => ({
                            Week: `${parseInt(entry.Pmonth)}월 ${parseInt(
                                entry.Pweek
                            )}주차`,
                            Sales: entry.Sales,
                            Cogs: entry.Cogs,
                            NetIncome: entry.NetIncome,
                            Waers: entry.Waers,
                        }));
                        this.getView()
                            .getModel("view")
                            .setProperty("/weeklyCombo", aComboData);

                        // 요약 카드용 데이터 + ID 추가
                        const aSummaries = aResults.map((entry, i) => ({
                            id: "carouselPage" + i,
                            Pmonth: entry.Pmonth,
                            Pweek: entry.Pweek,
                            Sales: entry.Sales,
                            Cogs: entry.Cogs,
                            Sga: entry.Sga,
                            NonOpIncome: entry.NonOpIncome,
                            NonOpExpense: entry.NonOpExpense,
                            GrossProfit: entry.GrossProfit, // 매출총이익
                            OperatingProfit: entry.OperatingProfit, // 영업이익
                            PreTaxIncome: entry.PreTaxIncome, // 법인세차감전순이익
                            NetIncome: entry.NetIncome,
                            Waers: entry.Waers,
                        }));

                        // 최신 주차 데이터를 맨 앞으로 이동 (기존 마지막 인덱스 → 0번 인덱스로)
                        if (aSummaries.length > 1) {
                            const latest = aSummaries.pop(); // 마지막 주차 꺼냄
                            aSummaries.unshift(latest); // 배열 맨 앞에 삽입
                        }

                        // 모델에 다시 세팅
                        this.getView()
                            .getModel("view")
                            .setProperty("/weeklySummary", aSummaries);

                        // activePage 설정도 0번 페이지로 명시
                        this.byId("summaryCarousel").setActivePage(
                            "carouselPage0"
                        );
                        // debugger;
                    },
                    error: () => {
                        MessageToast.show(
                            "차트용 손익 데이터를 불러오지 못했습니다."
                        );
                    },
                });
            },

            onNavBack: function () {
                const oRouter = UIComponent.getRouterFor(this);
                oRouter.navTo("RouteMain");
            },
        });
    }
);
