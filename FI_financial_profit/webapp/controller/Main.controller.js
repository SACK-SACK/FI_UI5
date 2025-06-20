sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/model/json/JSONModel",
        "sync/ca/fi/financial/model/formatter",
    ],
    (Controller, Filter, FilterOperator, JSONModel, formatter) => {
        "use strict";

        return Controller.extend("sync.ca.fi.financial.controller.Main", {
            formatter: formatter,
            _currentFilter: {
                Pyear: null,
                Pmonth: null,
                Pweek: null,
            },
            onInit: function () {
                // Format.numericFormatter(ChartFormatter.getInstance());
                const oFilterModel = new JSONModel({
                    Pyear: null,
                    Pmonth: null,
                    Pweek: null,
                });
                this.getView().setModel(oFilterModel, "filters");

                const oModel = new JSONModel({
                    ratios: [],
                    debtRatio: 0.0,
                    equityRatio: 0.0,
                });
                this.getView().setModel(oModel, "view");

                const oSmartTable = this.byId("smartTreeTable");

                if (oSmartTable && oSmartTable.attachInitialise) {
                    oSmartTable.attachInitialise(() => {
                        this._loadDefaultFilterAndBind();
                    });
                } else {
                    console.warn("테이블이 아직 생성되지 않음 ");
                }
                const oVizFrame = this.byId("idDonutChart");
                const oPopover = this.byId("idChartPopover");
                oPopover.connect(oVizFrame.getVizUid());

                oVizFrame.setVizProperties({
                    plotArea: {
                        showCenterLabel: true,
                        dataLabel: {
                            visible: true,
                            type: "percentage",
                        },
                        colorPalette: ["#f0ab00", "#107e3e"],
                    },
                    legend: {
                        visible: true,
                        position: "bottom",
                    },
                    tooltip: {
                        visible: true,
                    },
                    title: {
                        visible: false,
                    },
                });
            },

            onSearch: function () {
                const oFilterData = this.getView()
                    .getModel("filters")
                    .getData();

                this._currentFilter = {
                    Pyear: oFilterData.Pyear,
                    Pmonth: oFilterData.Pmonth,
                    Pweek: oFilterData.Pweek,
                };

                // console.log("현재 필터 상태:", this._currentFilter);

                this._bindTreeTable();
                this._checkBalanceFromModel();
            },
            _checkBalanceFromModel: function () {
                const oModel = this.getOwnerComponent().getModel("total_sum");
                const oView = this.getView();
                const { Pyear, Pmonth, Pweek } = oView
                    .getModel("filters")
                    .getData();

                oModel.read("/ZCA_CDS_V_008_TOTAL", {
                    filters: [
                        new Filter("Pyear", FilterOperator.EQ, Pyear),
                        new Filter("Pmonth", FilterOperator.EQ, Pmonth),
                        new Filter("Pweek", FilterOperator.EQ, Pweek),
                    ],
                    success: (oData) => {
                        let asset = 0,
                            debt = 0,
                            equity = 0,
                            waers = "";

                        oData.results.forEach((row) => {
                            const total = parseFloat(row.ResultTotal || 0);
                            if (row.Category === "자산") asset = total;
                            if (row.Category === "부채") debt = total;
                            if (row.Category === "자본") equity = total;
                            if (row.Waers) waers = row.Waers;
                        });

                        oView
                            .byId("idAssetTotal")
                            .setNumber(asset.toLocaleString());
                        oView
                            .byId("idDebtTotal")
                            .setNumber(debt.toLocaleString());
                        oView
                            .byId("idEquityTotal")
                            .setNumber(equity.toLocaleString());

                        const oStatus = oView.byId("idBalanceStatus");
                        if (asset === debt + equity) {
                            oStatus.setText("재무 상태 일치");
                            oStatus.setIcon("sap-icon://sys-enter-2");
                            oStatus.setState("Success");
                        } else {
                            oStatus.setText("재무 상태 불일치");
                            oStatus.setIcon("sap-icon://error");
                            oStatus.setState("Error");
                        }
                        this._updateMicroChart(debt, equity);
                    },
                    error: () => {
                        const oStatus = oView.byId("idBalanceStatus");
                        oStatus.setText("데이터 오류");
                        oStatus.setIcon("sap-icon://message-error");
                        oStatus.setState("Error");
                    },
                });
            },

            _loadDefaultFilterAndBind: async function () {
                const oSmartFilterBar = this.byId("smartFilterBar");
                const oModel = this.getOwnerComponent().getModel("max_week");

                await oModel.metadataLoaded();

                oModel.read("/ZCA_CDS_V_011", {
                    success: (oData) => {
                        const aWeeks = oData.results;

                        // 정렬: 최신 주차가 가장 위로
                        aWeeks.sort((a, b) => {
                            if (a.Pyear !== b.Pyear) return b.Pyear - a.Pyear;
                            if (a.Pmonth !== b.Pmonth)
                                return b.Pmonth - a.Pmonth;
                            return b.Pweek - a.Pweek;
                        });

                        const oLatest = aWeeks[0]; // 실제 존재하는 최신 주차
                        if (!oLatest) return;
                        // filters 모델에 초기값 세팅
                        const oFilterModel = this.getView().getModel("filters");
                        oFilterModel.setData({
                            Pyear: oLatest.Pyear,
                            Pmonth: oLatest.Pmonth,
                            Pweek: oLatest.Pweek,
                        });

                        // SmartFilterBar에도 초기값 설정 (Pyear만 적용됨)
                        oSmartFilterBar.setFilterData({
                            Pyear: oLatest.Pyear,
                            Pmonth: oLatest.Pmonth,
                            Pweek: oLatest.Pweek,
                        });

                        // 필터 값 저장
                        this._currentFilter = {
                            Pyear: oLatest.Pyear,
                            Pmonth: oLatest.Pmonth,
                            Pweek: oLatest.Pweek,
                        };

                        // 바인딩 수행
                        this._bindTreeTable(); // 최초 바인딩은 수동 수행
                        this._checkBalanceFromModel(); // 자산-부채-자본 계산
                    },
                });
            },

            _bindTreeTable: function () {
                // SmartTable 및 내부 TreeTable 객체 가져오기
                const oSmartTable = this.byId("smartTreeTable");
                const oTreeTable = oSmartTable.getTable();

                // 현재 필터 조건 (년도, 월, 주차)
                const { Pyear, Pmonth, Pweek } = this._currentFilter;

                // 상위 계정 (HierarchyLevel < 2) 필터 생성
                const oParentFilter = new Filter(
                    "HierarchyLevel",
                    FilterOperator.LT,
                    2
                );

                // 리프 노드 (HierarchyLevel === 2) + 해당 주차 조건 필터 생성
                const oLeafFilter = new Filter(
                    [
                        new Filter("HierarchyLevel", FilterOperator.EQ, 2),
                        new Filter("Pyear", FilterOperator.EQ, Pyear),
                        new Filter("Pmonth", FilterOperator.EQ, Pmonth),
                        new Filter("Pweek", FilterOperator.EQ, Pweek),
                    ],
                    true // AND 조건
                );

                // 전체 트리 필터: 상위 노드 또는 조건 만족하는 리프 노드 (OR 조건)
                const oFinalFilter = new Filter(
                    [oParentFilter, oLeafFilter],
                    false // OR 조건
                );

                // 트리 테이블 바인딩 설정
                oTreeTable.bindRows({
                    path: "/ZCA_CDS_V_008", // CDS View 엔티티셋 경로
                    filters: oFinalFilter,
                    parameters: {
                        numberOfExpandedLevels: 1, // 초기 확장 수준
                        treeAnnotationProperties: {
                            hierarchyNodeFor: "NodeID",
                            hierarchyParentNodeFor: "ParentNodeID",
                            hierarchyLevelFor: "HierarchyLevel",
                            hierarchyDrillStateFor: "DrillState",
                        },
                    },
                });

                console.log(oTreeTable);

                // 컬럼별 템플릿 설정 (차변/대변/최종 잔액 컬럼은 ObjectNumber로 커스터마이징)
                const aColumns = oTreeTable.getColumns();
                aColumns.forEach((col) => {
                    const sLabel = col.getLabel()?.getText();

                    if (sLabel === "차변 잔액") {
                        col.setTemplate(
                            new sap.m.ObjectNumber({
                                number: {
                                    parts: ["BalanceDebit", "Waers"],
                                    type: "sap.ui.model.type.Currency",
                                    formatOptions: {
                                        showMeasure: false,
                                        currencyCode: false,
                                    },
                                },
                                unit: { path: "Waers" },
                                state: {
                                    path: "BalanceDebit",
                                    formatter: formatter.getDebitState,
                                },
                                visible: {
                                    path: "BalanceDebit",
                                    formatter: formatter.isPositiveAmount,
                                },
                                textAlign: "End",
                            })
                        );
                    }

                    if (sLabel === "대변 잔액") {
                        col.setTemplate(
                            new sap.m.ObjectNumber({
                                number: {
                                    parts: ["BalanceCredit", "Waers"],
                                    type: "sap.ui.model.type.Currency",
                                    formatOptions: {
                                        showMeasure: false,
                                        currencyCode: false,
                                    },
                                },
                                unit: { path: "Waers" },
                                state: {
                                    path: "BalanceCredit",
                                    formatter: formatter.getCreditState,
                                },
                                visible: {
                                    path: "BalanceCredit",
                                    formatter: formatter.isPositiveAmount,
                                },
                                textAlign: "End",
                            })
                        );
                    }

                    if (sLabel === "최종 잔액") {
                        col.setTemplate(
                            new sap.m.ObjectNumber({
                                number: {
                                    parts: ["FinalAmount", "Waers"],
                                    type: "sap.ui.model.type.Currency",
                                    formatOptions: {
                                        showMeasure: false,
                                        currencyCode: false,
                                    },
                                },
                                unit: { path: "Waers" },
                                visible: {
                                    path: "FinalAmount",
                                    formatter: formatter.isPositiveAmount,
                                },
                                textAlign: "End",
                            })
                        );
                    }
                });

                // 셀 클릭 시 G/L 계정 또는 손익 연결 처리
                oTreeTable.attachCellClick((oEvent) => {
                    const iRowIndex = oEvent.getParameter("rowIndex");
                    const iColIndex = oEvent.getParameter("columnIndex");
                    const oContext = oTreeTable.getContextByIndex(iRowIndex);
                    const oData = oContext?.getObject();

                    // 계정 클릭 시 상세 페이지로 이동
                    if (
                        oData &&
                        oData.HierarchyLevel === 2 &&
                        oData.NodeID != 9999999999
                    ) {
                        const sNodeID = oData.NodeID;
                        const sGlName = oData.Gltxt;
                        const sPyear = oData.Pyear;
                        const sPmonth = oData.Pmonth;
                        const sPweek = oData.Pweek;

                        sap.m.MessageToast.show(`Gl 계정: ${sGlName} 선택`);

                        var oUIState = this.getOwnerComponent()
                            .getFlexibleLayoutInfo()
                            .getNextUIState(1);

                        var oRouter = this.getOwnerComponent().getRouter();
                        oRouter.navTo("RouteDetail", {
                            NodeID: sNodeID,
                            Pyear: sPyear,
                            Pweek: sPweek,
                            Pmonth: sPmonth,
                            layout: sap.f.LayoutType.MidColumnFullScreen,
                        });
                    }

                    // 손익계산서 노드 클릭 시 손익 화면으로 이동
                    if (
                        oData &&
                        oData.HierarchyLevel === 2 &&
                        oData.NodeID == 9999999999
                    ) {
                        this.onNavigateToIncome();
                    }
                });

                // 트리 테이블에서 선택 모드 제거 (선택 불가)
                oTreeTable.setSelectionMode(sap.ui.table.SelectionMode.None);

                // 행 강조 색상 설정 (HierarchyLevel 0 이면서 카테고리별 색상 다르게)
                const oRowSettings = new sap.ui.table.RowSettings({
                    highlight: {
                        parts: ["HierarchyLevel", "CategorySort"],
                        formatter: (iLevel, iSort) => {
                            if (iLevel === 0) {
                                if (iSort === 1) return "Information"; // 자산
                                if (iSort === 2) return "Warning"; // 부채
                                if (iSort === 3) return "Success"; // 자본
                            }
                            return "None";
                        },
                    },
                });
                oTreeTable.setRowSettingsTemplate(oRowSettings);
            },

            _updateMicroChart: function (debt, equity) {
                const total = debt + equity;
                const debtRatio = total === 0 ? 0 : (debt / total) * 100;
                const equityRatio = total === 0 ? 0 : (equity / total) * 100;

                const oViewModel = this.getView().getModel("view");
                oViewModel.setProperty("/debtRatio", debtRatio);
                oViewModel.setProperty("/equityRatio", equityRatio);

                oViewModel.setProperty("/ratios", [
                    { label: "부채", value: debtRatio },
                    { label: "자본", value: equityRatio },
                ]);
            },
            onNavigateToIncome: function () {
                const oFilterModel = this.getView().getModel("filters");
                const sYear = oFilterModel.getProperty("/Pyear") || "2025";
                const sMonth = oFilterModel.getProperty("/Pmonth") || "01";
                const sWeek = oFilterModel.getProperty("/Pweek") || "1";

                this.getOwnerComponent().getRouter().navTo("RouteIncome", {
                    Pyear: sYear,
                    Pmonth: sMonth,
                    Pweek: sWeek,
                    layout: sap.f.LayoutType.MidColumnFullScreen,
                });
            },
        });
    }
);
